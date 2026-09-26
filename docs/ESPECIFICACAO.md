# OrganizaAi — Especificação viva

> Documento de referência do projeto. Descreve **como o app é hoje**, **o modelo de dados**, **cada módulo** e o **backlog numerado** das próximas melhorias.
> A especificação original de produto está em [`BRIEFING.md`](../BRIEFING.md); este documento a complementa e prevalece quando os dois divergirem.

---

## 0. Como usar este documento

**Para pedir uma melhoria**, cite o ID do backlog (seção 7). Exemplos:

- "Implemente o **F-04**."
- "Faça a **Fase 7** inteira, com commit e push no fim."
- "Mude o critério de aceite do **T-04** para incluir recorrência quinzenal e implemente."

**Para uma ideia nova que não está aqui**, peça: "Adicione ao backlog: …". O item entra na seção 7 com ID, motivo, critérios de aceite e arquivos afetados antes de ser implementado.

**Convenções dos itens do backlog**

| Campo | Significado |
|---|---|
| **ID** | Prefixo do módulo + número. `T` tarefas, `H` hoje, `F` finanças, `I` importação, `W` trabalho, `P` projetos, `E` estudos, `S` saúde, `R` revisão, `C` configurações/backup, `B` busca/organização, `IA` inteligência, `Q` qualidade. |
| **Status** | ✅ feito · 🔨 em andamento · 📋 planejado · 💭 ideia (precisa de decisão) · ⛔ fora do escopo |
| **Tamanho** | P (até ~1 h de trabalho do agente, 1–3 arquivos) · M (vários arquivos, talvez migração) · G (módulo novo) |
| **Critérios de aceite** | O que precisa ser verdade para o item estar pronto. Viram testes quando envolvem cálculo. |

**Regras que valem para toda mudança** (herdadas do briefing, não negociáveis):

1. Registrar qualquer coisa em até **3 toques e 10 segundos**.
2. **Metas semanais**, nada de culpa, sem vermelho gritando.
3. **Dinheiro em centavos inteiros**; datas `YYYY-MM-DD`; semana de segunda a domingo; fuso `America/Sao_Paulo`.
4. Todo registro tem `id`, `createdAt`, `updatedAt`.
5. **Tudo que o app conclui sozinho (regra ou IA) pode ser corrigido** e aponta para a origem (qual regra, qual linha do extrato, qual sugestão de IA).
6. Nada sai do navegador sem o usuário pedir (ver seção 6 — IA).
7. Cálculo novo = função pura em `src/lib/` **com teste** no Vitest.
8. Fim de fase = testes verdes, `npm run build` ok, verificação no navegador, commit em português e push.

---

## 1. Visão

Painel pessoal para acompanhar 6 meses em **5 pilares** — Finanças (prioridade), Trabalho, Projetos, Estudos e Saúde — com a sensação de um **caderno rápido**. A tela **Hoje** é a porta de entrada; os pilares são alimentados pelos registros rápidos.

**Direção de crescimento escolhida (set/2026):** mais funções dentro do app + inteligência (IA) opcional. **Não** escolhidos por enquanto: nuvem/celular e virar produto multiusuário (ver seção 8).

---

## 2. Arquitetura atual

### 2.1 Stack

| Parte | Escolha | Versão instalada |
|---|---|---|
| Build | Vite + React + TypeScript | Vite 8, React 19, TS 7 |
| Estilo | Tailwind CSS v4 (tokens em `src/styles/tokens.css`) | 4.3 |
| Dados | IndexedDB via Dexie + `useLiveQuery` | Dexie 4 |
| Rotas | React Router | 8 |
| Gráficos | Recharts | 3 |
| Datas | date-fns (`pt-BR`) | 4 |
| CSV | PapaParse | 5 |
| Ícones | lucide-react | 1 |
| Animação | framer-motion (só no `ChecklistHoje`) | 13 |
| Testes | Vitest + fake-indexeddb | 5 |

### 2.2 Fluxo de dados

```
Tela (React) ──lê──▶ useLiveQuery(db.tabela…)   ◀── atualiza sozinho quando o banco muda
     │
     └─chama──▶ src/db/acoes.ts (criar/atualizar/apagar, devolve "desfazer")
                     │
                     └──▶ Dexie (IndexedDB, só no navegador)

Cálculos (projeção, hábitos, médias…) = funções puras em src/lib/*.ts, com testes.
```

- **Sem estado global** (Redux/Zustand): o banco é a fonte de verdade.
- **Gravações** passam por `src/db/acoes.ts`. Exceção documentada: telas de cadastro em `features/configuracoes/` gravam direto nas tabelas.
- **Desfazer**: toda ação que cria algo devolve uma função `Desfazer`, usada pelo toast (`src/ui/Toast.tsx`).

### 2.3 Estrutura de pastas

```
src/
  app/            App.tsx (rotas, atalho N/Ctrl+K), Layout.tsx (navegação), tema.ts
  db/             types.ts (modelo), db.ts (schema Dexie), seed.ts (dados iniciais),
                  acoes.ts (gravações), hooks.ts (useSettings…), backup.ts
  features/
    hoje/         Hoje, ChecklistHoje (componente do Bencho), CaixaIdeias,
                  FaixaFinancas, SemanaAndamento
    captura/      Captura (painel do +), FormsFinancas, FormTreino, FormFoco
    tarefas/      (Fase 6) lista e edição de tarefas
    financas/     Financas, Lancamentos, Importacao, SugestaoRegra, useFinancas
    trabalho/     Trabalho
    projetos/     Projetos, ProjetoDetalhe
    estudos/      Estudos
    saude/        Saude, useHabitos
    revisao/      Revisao, useResumoSemana
    onboarding/   BoasVindas
    configuracoes/Configuracoes, ConfigFinancas, ConfigHabitos
  lib/            datas, dinheiro, id, financas, importacao, habitos, trabalho,
                  estudos, revisao (+ *.test.ts)
  ui/             ui.tsx (Painel, Botao, Chip, Barra, Indicador…), Toast,
                  GraficoBarras, GraficoDuplo
  styles/         tokens.css (cores e fontes, claro/escuro)
```

### 2.4 Rotas

| Rota | Tela |
|---|---|
| `/` | Hoje (redireciona para `/boas-vindas` no primeiro uso) |
| `/tarefas` | Tarefas em aberto (Fase 6) |
| `/financas`, `/financas/importar` | Finanças, importação de extrato |
| `/trabalho` | Trabalho |
| `/projetos`, `/projetos/:id` | Projetos e página do projeto |
| `/estudos` | Estudos |
| `/saude` | Saúde |
| `/revisao` | Revisão semanal |
| `/configuracoes` | Configurações (âncoras: `#poupanca`) |
| `/boas-vindas` | Onboarding |
| `*` | Redireciona para `/` |

---

## 3. Modelo de dados

### 3.1 Tabelas atuais (Dexie, `src/db/db.ts`)

| Tabela | Campos principais | Índices |
|---|---|---|
| `tasks` | `title`, `pillar`, `projectId?`, `kind? (acumulado/novo)`, `workArea?`, `dueDate?`, `plannedFor?`, `doneAt?`, `repeat?`, `notes?` | plannedFor, pillar, projectId, dueDate, doneAt, kind, createdAt |
| `ideas` | `text`, `status (inbox/movida/descartada)`, `movedTo?` | status, createdAt |
| `goals` | metas de 6 meses por pilar (ainda sem tela — ver **R-03**) | pillar |
| `habits` | `title`, `pillar`, `weeklyTarget`, `unit (vezes/minutos)`, `active`, `link?` | pillar, link |
| `habitLogs` | `habitId`, `date`, `amount` | habitId, date |
| `transactions` | `date`, `amount (centavos, − saída)`, `description`, `categoryId`, `source?`, `origin (manual/import)`, `importHash?` | date, categoryId, source, importHash |
| `categories` | `name`, `type (entrada/saida)`, `weeklyLimit?`, `color` | type, name |
| `categoryRules` | `contains`, `categoryId`, `priority` | categoryId |
| `savingsGoals` | `name`, `targetAmount`, `deadline?`, `autoTarget?` | — |
| `savingsDeposits` | `goalId`, `date`, `amount (− retirada)`, `note?` | goalId, date |
| `importMappings` | colunas e formato por banco | bankName |
| `subjects` / `assessments` / `courses` | faculdade e cursos | status / subjectId, date / — |
| `projects` | `name`, `status`, `description?`, `nextStep?` | status |
| `focusSessions` | `pillar (projetos/estudos)`, `projectId?`, `date`, `minutes` | pillar, projectId, date |
| `workouts` | `date`, `type (academia/jiujitsu)`, `focus?` | date, type |
| `weeklyReviews` | `weekStart`, 3 respostas, `snapshot` por pilar | weekStart |
| `settings` | linha única `id: "app"` | — |

### 3.2 Versões do schema e migrações

| Versão | Fase | Mudança |
|---|---|---|
| 1 | 0 | Todas as tabelas acima. |
| 2 | 6 | `categoryRules.priority` (migração preenche pela ordem de criação); `tasks.repeat`, `tasks.notes` (sem índice). |
| 3 | 7 (planejado) | Tabelas `accounts`, `recurringBills`, `budgets`; `transactions.accountId`, `transactions.installment`, `transactions.recurringId`, `transactions.categorySource`. |
| 4 | 9 (planejado) | Tabela `aiLog`; `settings.ai`. |

**Regra de migração:** nunca alterar uma versão já publicada. Toda mudança de índice ou de formato cria `this.version(N+1).stores({...}).upgrade(tx => …)` em `db.ts`, com teste em `src/db/*.test.ts`. O backup JSON guarda `versao` e o import rejeita versões mais novas do que o app.

### 3.3 Modelo ampliado (planejado — Fases 7 a 9)

```ts
// Fase 7 — finanças avançadas
interface Account extends Base {            // conta corrente ou cartão
  name: string;                              // "Nubank", "Cartão Inter"
  type: "conta" | "cartao";
  closingDay?: number;                       // cartão: dia de fechamento da fatura
  dueDay?: number;                           // cartão: dia de vencimento
  limit?: Cents;
  archivedAt?: string;
}
interface RecurringBill extends Base {      // conta fixa (aluguel, internet, assinatura)
  description: string;
  amount: Cents;                             // valor esperado (negativo)
  categoryId: ID;
  dayOfMonth: number;                        // 1–31 (31 = último dia)
  accountId?: ID;
  active: boolean;
}
interface Budget extends Base {             // orçamento mensal por categoria
  categoryId: ID;
  month: string | null;                      // "2026-10" ou null = padrão todo mês
  amount: Cents;
}
// novos campos em Transaction
accountId?: ID;
installment?: { n: number; total: number; groupId: ID };   // parcela 2/10
recurringId?: ID;                                           // veio de uma conta fixa
categorySource?: "regra" | "manual" | "ia" | "padrao";      // rastreabilidade

// Fase 9 — IA
interface AiLog extends Base {              // o que foi enviado à IA e o que voltou
  feature: "categorizar" | "captura" | "resumo" | "plano" | "pergunta";
  model: string;
  sentSummary: string;                       // descrição do que saiu (não o conteúdo cru)
  inputTokens: number;
  outputTokens: number;
  accepted?: boolean;                        // o usuário aceitou a sugestão?
}
// em Settings
ai?: {
  enabled: boolean;
  model: string;                             // padrão "claude-opus-5"
  features: Record<AiLog["feature"], boolean>;
  monthlyTokenCap?: number;
};
```

---

## 4. Módulos — estado atual

Cada módulo lista: **o que faz**, **arquivos**, **regras**, **testes** e **lacunas conhecidas** (com o ID do backlog que as resolve).

### 4.1 Hoje (`features/hoje/`)

- **Faz:** faixa de finanças (viagem, reserva, guardado no mês); tarefas do dia com `ChecklistHoje` (limite de 5, cor do pilar, animação de "fim do dia"); botão **Puxar tarefas** (atrasadas e com prazo em até 3 dias); caixa de ideias (virar tarefa, mover para projeto, descartar); semana em andamento; lembretes de treino, backup (> 7 dias) e revisão (sexta a domingo).
- **Regras:** 6ª tarefa para hoje fica sem dia e o toast avisa. Ordem de criação é mantida no checklist (não mover feitas para o fim).
- **Testes:** `db/acoes.test.ts` (limite, desfazer, sugestões, ideia→tarefa).
- **Lacunas:** arrastar ideias (**H-01**); limites semanais de outras categorias (**F-08**).

### 4.2 Captura rápida (`features/captura/`)

- **Faz:** painel do **+** / `N` / `Ctrl+K`, com teclas `1`–`6`: Gasto, Entrada, Ideia, Tarefa, Treino, Foco. Esc volta um passo.
  - Gasto: valor → toque na categoria salva (Enter = primeira). Chips = 6 mais usadas em 90 dias.
  - Entrada: valor → toque na origem salva; VoIP pergunta se guarda na meta configurada.
  - Tarefa: texto + pilar + "para hoje"; prazo e repetição em "detalhes" (Fase 6).
  - Treino: 1 toque; comemora quando bate a meta da semana.
  - Foco: Projeto/Estudo → 30/60/90 → projeto (automático se só há um).
- **Lacunas:** foco preso no painel para teclado (**Q-02**); captura em linguagem natural (**IA-02**).

### 4.3 Tarefas (`features/tarefas/`, Fase 6)

- **Faz:** lista de tudo em aberto, agrupada (atrasadas, hoje, próximos dias, sem data); filtro por pilar; edição de título, pilar, prazo, dia planejado, repetição e notas; tarefas repetidas geram a próxima ao concluir.
- **Regras:** `src/lib/tarefas.ts` → `proximaOcorrencia(tarefa, concluidaEm)`.

### 4.4 Finanças (`features/financas/`)

- **Faz:** resumo do mês (entradas por origem); metas de poupança com barra, aporte médio, **projeção** e, com data desejada, **quanto guardar por mês** (Fase 6); histórico de aportes com edição (Fase 6); meta mensal = base + VoIP; comer fora (semana × limite, 8 semanas); gastos por categoria × média dos 3 meses anteriores; lançamentos com filtros, troca de categoria (oferece criar regra), edição de valor/descrição/data (Fase 6).
- **Regras (`lib/financas.ts`):** `metaMensalPoupanca`, `projecaoMeta` (média dos aportes dos últimos 3 meses desde o primeiro aporte), `gastoMedioMensal` (3 meses fechados, só com os 3 com dados), `alvoDaMeta` (reserva = N × gasto médio), `aporteNecessario` (Fase 6), `categorizar` (regra de menor prioridade que bate), `importHash`, `palavraChave`.
- **Testes:** `lib/financas.test.ts`.
- **Lacunas:** contas fixas (**F-04**), orçamento por categoria (**F-05**), cartão/fatura (**F-06**), parcelas (**F-07**), metas extras (**F-09**).

### 4.5 Importação de extrato (`features/financas/Importacao.tsx`, `lib/importacao.ts`)

- **Faz:** CSV (detecta separador, relê em Latin-1 se preciso) e OFX; na 1ª vez de um banco, mapeia colunas e salva; prévia com categoria sugerida pela regra (mostra qual regra), **duplicadas esmaecidas** (mesmo `importHash` no banco ou no arquivo), linhas com problema apontadas pelo número.
- **Testes:** `lib/importacao.test.ts`.
- **Lacunas:** colunas separadas de débito/crédito (**I-01**); escolher manualmente o formato salvo (**I-02**); sugestão por IA para linhas sem regra (**IA-01**).

### 4.6 Trabalho (`features/trabalho/`, `lib/trabalho.ts`)

- **Faz:** colunas Acumulado / Novo, filtro por área, balanço da semana (resolvidos, entraram, entregas novas), "boa semana" = acumulado diminuiu + entrega nova; gráfico do tamanho do acumulado (8 semanas).
- **Testes:** `lib/trabalho.test.ts`.

### 4.7 Projetos (`features/projetos/`)

- **Faz:** cards com **próximo passo** e minutos na semana; filtro por status; meta semanal de foco; minutos por semana no período; página do projeto (próximo passo, descrição, tarefas, ideias movidas, sessões de foco com +30/60/90).
- **Lacunas:** cronômetro de foco (**P-01**).

### 4.8 Estudos (`features/estudos/`, `lib/estudos.ts`)

- **Faz:** próximas avaliações (destaque em 7 dias), matérias com média ponderada e situação, cursos com +1 aula (conclui sozinho na última), estudo × projetos (8 semanas).
- **Testes:** `lib/estudos.test.ts`.

### 4.9 Saúde (`features/saude/`, `lib/habitos.ts`)

- **Faz:** semana atual por hábito; sequência de semanas batendo a meta; sugestão de subir meta após 3 semanas fechadas cumpridas (até 4× academia / 2× jiu); calendário de 13 semanas; treinos recentes.
- **Regras:** um hábito soma `HabitLog` + registros ligados pelo `link` (`treino:academia`, `foco:projetos`…).
- **Testes:** `lib/habitos.test.ts`.
- **Lacunas:** a sequência usa a meta atual para semanas antigas (**S-01**).

### 4.10 Revisão semanal (`features/revisao/`, `lib/revisao.ts`)

- **Faz:** 3 passos (resultado por pilar → 3 perguntas → esvaziar caixa de ideias); salva `WeeklyReview` com snapshot; evolução em pequenos múltiplos; histórico.
- **Regras do snapshot (hipótese documentada em `lib/revisao.ts`):** saúde/projetos/estudos = média dos hábitos do pilar; trabalho = 1 / 0,5 / 0; finanças = aderência ao limite de comer fora (ou meta do mês).
- **Lacunas:** metas de 6 meses por pilar (**R-03**); resumo escrito por IA (**IA-03**).

### 4.11 Configurações, backup e onboarding

- **Configurações:** tema; período; hábitos; lembretes de treino; áreas do trabalho; poupança (metas, base mensal, VoIP); categorias (cor, limite, apagar — Fase 6); regras (prioridade — Fase 6); formatos de extrato; backup.
- **Backup (`db/backup.ts`):** JSON `{ app, versao, exportadoEm, tabelas }`; importação valida antes e substitui tudo numa transação. Testado em `db/backup.test.ts`.
- **Onboarding (`features/onboarding/`):** 5 passos puláveis; marca `settings.onboardedAt`.

---

## 5. Design (resumo)

Caderno digital com abas de marca-texto. Tokens em `src/styles/tokens.css` (papel, folha, grafite, lápis, linha + cor por pilar). Fontes: Bricolage Grotesque (títulos/números, `tabular-nums`) e Instrument Sans (texto). Único destaque: **faixa de finanças da Hoje**. Raios: painel 16 px > botão 10 px > chip 8 px. Gráficos: uma série na cor do pilar; duas séries só com legenda escrita (par Estudos/Projetos validado para daltonismo). Sem CAIXA ALTA, sem gradiente decorativo, `prefers-reduced-motion` respeitado.

---

## 6. Inteligência (IA) — desenho

### 6.1 Princípios

1. **Opcional e desligada por padrão.** Nada é enviado sem o usuário ligar a IA em Configurações e escolher quais funções usar.
2. **Regras primeiro, IA depois.** A IA só entra onde as regras não resolvem (ex.: lançamento sem regra). Quando o usuário aceita uma sugestão de categoria, o app **oferece criar uma regra**, para a próxima vez não precisar de IA.
3. **Sugestão, nunca decisão.** Toda saída da IA aparece como sugestão com botão Aceitar/Corrigir; o registro guarda `categorySource: "ia"` para rastrear.
4. **Mínimo de dados.** Envia só o necessário (ex.: descrição e valor do lançamento, nunca o extrato inteiro); resumos usam agregados (totais por pilar), não listas completas.
5. **Transparência.** Cada chamada gera um `AiLog` (função, modelo, resumo do que saiu, tokens). Tela "O que foi enviado" em Configurações.
6. **Custo sob controle.** Teto mensal de tokens opcional; o app mostra o gasto estimado do mês.

### 6.2 Arquitetura

- **Chamada:** SDK oficial `@anthropic-ai/sdk` direto do navegador, com a **chave de API do próprio usuário** (guardada só no IndexedDB, nunca no código nem no backup). Chamadas diretas do navegador exigem a opção de acesso direto do SDK — confirmar o nome exato da opção na implementação (**IA-00**) usando a referência atual do SDK.
- **Modelo padrão:** `claude-opus-5` (configurável). Saídas estruturadas via `output_config.format` com JSON Schema, para o app validar a resposta antes de mostrar.
- **Recusa:** tratar `stop_reason: "refusal"` sem quebrar a tela; habilitar o fallback do lado do servidor conforme a referência atual.
- **Módulo:** `src/ia/` com `cliente.ts` (cria o SDK com a chave), `funcoes/*.ts` (uma por recurso, cada uma com prompt fixo + schema), `registro.ts` (grava `AiLog`), `useIa.ts` (estado de carregando/erro na tela).
- **Testes:** as funções recebem o cliente por parâmetro; nos testes, um cliente falso devolve respostas fixas (nenhuma chamada real em teste).

### 6.3 Recursos planejados

| ID | Recurso | Entrada enviada | Saída (schema) |
|---|---|---|---|
| IA-01 | Categorizar lançamentos sem regra (importação e lista) | descrição, valor, lista de nomes de categorias | `{ categoria, confianca, palavraChave }` |
| IA-02 | Captura em linguagem natural ("gastei 45 no ifood", "prova de cálculo dia 10 peso 2") | a frase digitada + nomes de categorias/matérias/projetos | um dos tipos da captura, pré-preenchido para confirmar |
| IA-03 | Resumo da revisão semanal | snapshot, totais e as 3 respostas | 3–5 frases + 1 sugestão de foco |
| IA-04 | Plano do dia | tarefas abertas (título, pilar, prazo), metas da semana | até 5 tarefas sugeridas com motivo |
| IA-05 | Perguntar ao painel ("quanto gastei com transporte em agosto?") | a pergunta + agregados calculados localmente | resposta curta citando os números usados |

---

## 7. Backlog

### Fase 6 — Tarefas completas e correções ✅

| ID | Item | Status | Tam. | Critérios de aceite |
|---|---|---|---|---|
| T-01 | Prazo na tarefa | ✅ | P | Captura de Tarefa tem "detalhes" com prazo; tarefas com prazo aparecem em "Puxar tarefas" quando faltam ≤ 3 dias. |
| T-02 | Tela Tarefas (`/tarefas`) | ✅ | M | Lista todas as tarefas abertas, agrupadas em Atrasadas / Hoje / Próximos 7 dias / Depois / Sem data; filtro por pilar; item no menu; nada fica "invisível". |
| T-03 | Editar tarefa | ✅ | M | Editar título, pilar, prazo, dia planejado, repetição e notas; apagar com desfazer. |
| T-04 | Tarefa que se repete | ✅ | M | Repetir a cada N dias/semanas/meses; ao concluir, cria a próxima com as datas avançadas; função pura testada (inclui fim de mês). |
| F-01 | Histórico de aportes | ✅ | P | Cada meta mostra os aportes e retiradas; é possível apagar um (com desfazer). |
| F-02 | Editar lançamento | ✅ | P | Editar valor, descrição e data de um lançamento na lista. |
| F-03 | Quanto guardar por mês até a data | ✅ | P | Meta com data desejada mostra "guarde R$ X/mês até mm/aaaa"; função pura testada (data passada, meta batida). |
| C-01 | Apagar categoria | ✅ | P | Lançamentos dela vão para "Sem categoria"; regras dela são apagadas; categorias-sistema ("Sem categoria", "Outras entradas") não podem ser apagadas. |
| C-02 | Prioridade das regras | ✅ | P | Regras com botões subir/descer; `categorizar` usa a menor prioridade; migração v2 preenche pela ordem de criação; testado. |

### Fase 7 — Finanças avançadas 📋

| ID | Item | Status | Tam. | Critérios de aceite |
|---|---|---|---|---|
| F-04 | Contas fixas | 📋 | M | Cadastrar conta fixa (valor, dia, categoria); Finanças mostra "a pagar este mês" com botão "Paguei" que cria o lançamento com `recurringId`; importação reconhece o pagamento pelo valor ±5% e descrição e não duplica. |
| F-05 | Orçamento mensal por categoria | 📋 | M | Definir orçamento padrão e por mês; barra gasto × orçamento; aviso discreto aos 80%; total orçado × renda do mês. |
| F-06 | Cartão de crédito e faturas | 📋 | G | Contas do tipo cartão com fechamento/vencimento; compras no cartão caem na fatura do ciclo certo (função pura testada); fatura aberta/fechada; pagamento da fatura não conta como gasto duplicado. |
| F-07 | Compras parceladas | 📋 | M | Lançar "10× de R$ 50" gera 10 lançamentos ligados por `groupId`; apagar o grupo inteiro; projeção de parcelas futuras no resumo. |
| F-08 | Limites semanais na Hoje | 📋 | P | Todas as categorias com limite semanal aparecem na "Semana em andamento", não só Comer fora. |
| F-09 | Metas de poupança extras | 📋 | P | Criar, renomear e arquivar metas além de Viagem e Reserva; escolher quais aparecem na faixa da Hoje (máx. 2). |
| F-10 | Contas e saldo | 💭 | M | Saldo por conta a partir de um saldo inicial + lançamentos. *Decidir:* vale o esforço sem Open Finance? |
| I-01 | Débito/crédito em colunas separadas | 📋 | P | Mapeamento aceita duas colunas de valor; testado. |
| I-02 | Escolher o formato salvo | 📋 | P | Na importação, lista de formatos salvos para escolher manualmente. |

### Fase 8 — Organização e rotina 📋

| ID | Item | Status | Tam. | Critérios de aceite |
|---|---|---|---|---|
| B-01 | Busca global | 📋 | M | `Ctrl+/` abre busca em tarefas, ideias, lançamentos, projetos, matérias e revisões; resultado leva ao item. |
| H-01 | Arrastar ideias | 📋 | M | Arrastar uma ideia para "Tarefas de hoje" ou para um projeto; teclado continua funcionando pelo menu. |
| H-02 | Lembretes com notificação | 💭 | M | Notificação do navegador (com permissão) para treino e prazos, enquanto o app está aberto. *Decidir:* o briefing deixou notificações fora do MVP. |
| P-01 | Cronômetro de foco | 📋 | M | Iniciar/pausar cronômetro na captura ou no projeto; ao parar, registra a sessão com os minutos reais; sobrevive a recarregar a página. |
| S-01 | Histórico da meta de treino | 📋 | P | Guardar a meta vigente em cada semana; sequência e revisão usam a meta da época; testado. |
| S-02 | Foco muscular no treino | 📋 | P | Chips opcionais (peito, costas, perna…) depois do toque em Academia, sem aumentar o caminho mínimo. |
| E-01 | Calendário de avaliações | 📋 | P | Visão mensal com provas/trabalhos; exportar `.ics` para o calendário do celular. |
| R-03 | Metas de 6 meses por pilar | 📋 | M | Tela para as metas (`goals`) de cada pilar; progresso automático quando ligadas a um número (ex.: cursos concluídos, valor guardado). |

### Fase 9 — Inteligência (opcional) 📋

| ID | Item | Status | Tam. | Critérios de aceite |
|---|---|---|---|---|
| IA-00 | Infraestrutura de IA | 📋 | M | Configurações: ligar IA, colar chave, escolher funções, teto mensal; `AiLog` e tela "O que foi enviado"; chave fora do backup; cliente falso nos testes. |
| IA-01 | Categorização sugerida | 📋 | M | Na prévia da importação e na lista, "Sugerir categorias" para linhas sem regra; mostra confiança; aceitar oferece criar regra; `categorySource: "ia"`. |
| IA-02 | Captura em linguagem natural | 📋 | M | Campo "Escreva o que aconteceu" na captura; a IA devolve o tipo e os campos; o usuário confirma antes de salvar. |
| IA-03 | Resumo da revisão | 📋 | P | Botão "Resumir minha semana" no passo 1; texto editável salvo junto da revisão. |
| IA-04 | Plano do dia | 📋 | M | Na Hoje, "Sugerir plano": até 5 tarefas com motivo; aceitar puxa para hoje. |
| IA-05 | Perguntar ao painel | 💭 | G | Perguntas em português respondidas com base em agregados locais; mostra os números usados. |

### Fase 10 — Qualidade 📋

| ID | Item | Status | Tam. | Critérios de aceite |
|---|---|---|---|---|
| Q-01 | Carregar telas sob demanda | 📋 | P | Rotas com `lazy`; pacote inicial < 250 KB gzip… de preferência bem menos; sem aviso de chunk grande no build. |
| Q-02 | Foco preso nos painéis | 📋 | P | Captura e "Mais" prendem o Tab; foco volta ao botão que abriu. |
| Q-03 | Teste de ponta a ponta | 📋 | M | Playwright: primeiro uso → captura de gasto → aparece na Hoje → importa CSV → duplicadas esmaecidas. |
| Q-04 | Backup automático em pasta | 💭 | M | Com permissão, salvar o JSON numa pasta escolhida a cada 7 dias (File System Access API, só Chrome/Edge). |
| Q-05 | Teste das migrações | 📋 | P | Para cada versão do schema, teste que abre um banco da versão anterior e confere os dados migrados. |

---

## 8. Fora do escopo (por decisão)

| Item | Motivo | Quando reavaliar |
|---|---|---|
| Nuvem, login e sincronização (Supabase) | Não escolhido em set/2026; dados ficam locais. | Se precisar usar em dois aparelhos. |
| App de celular / PWA instalável | Idem. O layout já é responsivo. | Junto com nuvem. |
| Open Finance (integração bancária) | Custo, segurança e dependência de agregador. | Depois de F-06 estável. |
| Multiusuário / produto para terceiros | Não escolhido; mudaria privacidade, arquitetura e onboarding. | Se a ideia virar negócio. |
| Sono, mente, peso e medidas | Decisão do briefing. | — |

---

## 9. Histórico

| Data | Fase | Resumo |
|---|---|---|
| 2026-09-26 | 0–5 | MVP do briefing: fundação, Hoje/captura, finanças/importação, saúde/trabalho, projetos/estudos, revisão/onboarding. |
| 2026-09-26 | Doc | Esta especificação; direção: mais funções + IA. |
| 2026-09-26 | 6 | Tarefas completas (prazo, lista, edição, repetição) e correções de finanças/configurações. |
