# Painel da Vida — Briefing para desenvolvimento

> Coloque este arquivo na raiz do projeto e diga ao Claude Code:
> "Leia o BRIEFING.md inteiro e comece pela Fase 0. Não avance de fase sem eu aprovar."

---

## 1. Contexto

Sou estudante de Ciências da Computação (5º período), trabalho com design, social media e suporte na empresa da família e tenho projetos próprios. Sou iniciante em programação, então **quero entender o que está sendo construído**: explique cada decisão em 2–3 frases, sem aula longa.

Quero um painel pessoal para acompanhar 6 meses da minha vida em 5 pilares. O que funcionou para mim no passado foi um **caderno**: eu anotava o que tinha que fazer no dia e as ideias que surgiam. O app precisa ter essa sensação de caderno rápido, não de sistema pesado.

### Objetivos dos 6 meses
1. **Finanças (prioridade máxima):** juntar dinheiro para uma viagem no ano que vem e montar uma reserva de emergência.
2. Ter mais tempo para meus projetos próprios.
3. Constância nos treinos (academia + jiu-jitsu).
4. Passar em todas as matérias e terminar pelo menos um curso.
5. No trabalho: resolver o acumulado ao mesmo tempo em que crio coisas novas.

### Minha rotina (para decidir quando o app é usado)
- Acordo 8:30–9h. Durmo por volta de 1h.
- Seg, ter, sex: trabalho remoto até ~14:50, depois academia ou jiu-jitsu, tempo livre/trabalho até 18h.
- Qua, qui: vou para a empresa (10h–18:30), academia no almoço.
- Faculdade de 18h às 22h.
- Fim de semana livre, às vezes uso para projetos.

**Momentos de uso esperados:** de manhã (planejar o dia, ~1 min), ao longo do dia (capturar ideia, gasto, treino, ~10 s cada), domingo (revisão semanal, ~5 min).

---

## 2. Princípios do produto

1. **Registrar qualquer coisa em até 3 toques/cliques e 10 segundos.** Se algo exige mais, está errado.
2. **A tela "Hoje" é a porta de entrada.** Os pilares ficam por trás e são alimentados pelos registros rápidos.
3. **Metas semanais, não diárias.** Semana ruim não "quebra" nada; o app mostra o quanto falta para a meta da semana.
4. **Nada de culpa.** Sem mensagens negativas, sem vermelho gritando. Dia vazio = convite para agir.
5. **Finanças sempre visíveis.** O progresso da viagem e da reserva aparece na Hoje.
6. **Tudo configurável pelo app** (valores de metas, metas semanais, categorias), sem precisar mexer no código.

### Estrutura de cada pilar
Todo pilar segue o mesmo esqueleto (é o pedido original):
- **Metas** — o que quero atingir em 6 meses.
- **Hábitos** — o que faço toda semana para chegar lá (com meta semanal).
- **Próximos passos** — tarefas concretas ligadas ao pilar.
- **Evolução** — gráfico/histórico semanal.

---

## 3. Escopo do MVP

### Dentro
- Tela **Hoje** com tarefas do dia, caixa de ideias e resumo dos pilares.
- **Captura rápida** global (gasto, entrada, ideia, tarefa, treino, sessão de foco).
- Pilares: **Finanças, Trabalho, Projetos, Estudos, Saúde**.
- **Importação de extrato bancário (CSV/OFX)** com categorização automática por regras.
- **Revisão semanal**.
- **Configurações** (metas, categorias, regras, backup).
- Backup: exportar/importar tudo em JSON.
- Tema claro e escuro.

### Fora (fica para depois)
- Sono e Mente (decidi não acompanhar).
- Peso e medidas.
- Login, nuvem e sincronização entre dispositivos.
- Integração automática com banco (Open Finance).
- Notificações.

### Onde roda
MVP roda **no navegador do computador**, localmente. Mas o layout **já deve ser responsivo** (mobile-first nos componentes de captura), porque a Fase 6 vai levar o app para o celular.

---

## 4. Stack

| Parte | Escolha | Por quê |
|---|---|---|
| Build | Vite + React + TypeScript | Rápido, padrão de mercado, bom para aprender |
| Estilo | Tailwind CSS | Tokens de design fáceis de manter |
| Dados | IndexedDB via **Dexie.js** (`useLiveQuery`) | Banco local de verdade, sem servidor, reativo |
| Rotas | React Router | Navegação entre pilares |
| Gráficos | Recharts | Simples e suficiente |
| Datas | date-fns com locale `pt-BR` | Semanas começando na segunda |
| CSV | PapaParse | Importação de extrato |
| Ícones | lucide-react | Leves e consistentes |
| Testes | Vitest | Só para regras de cálculo (finanças e metas) |

Regras técnicas:
- **Dinheiro sempre em centavos (inteiro).** Nunca `float` para valores.
- Todos os registros com `id` (UUID), `createdAt` e `updatedAt` — isso deixa pronto para sincronizar no futuro.
- Semana = segunda a domingo, fuso `America/Sao_Paulo`.
- Formatação `R$ 1.234,56` com `Intl.NumberFormat('pt-BR')`.
- Sem estado global extra (Zustand/Redux) no MVP: Dexie + hooks bastam.

---

## 5. Modelo de dados

```ts
type ID = string; // uuid
type Cents = number; // inteiro
type ISODate = string; // 'YYYY-MM-DD'

type Pillar = 'financas' | 'trabalho' | 'projetos' | 'estudos' | 'saude';

interface Base { id: ID; createdAt: string; updatedAt: string; }

// ---------- Geral ----------
interface Task extends Base {
  title: string;
  pillar: Pillar | null;
  projectId?: ID;         // se pertence a um projeto
  kind?: 'acumulado' | 'novo'; // usado no pilar Trabalho
  workArea?: string;      // ex.: design, social, suporte, telefonia, URA
  dueDate?: ISODate;
  plannedFor?: ISODate;   // "fazer hoje" = plannedFor === hoje
  doneAt?: string;
}

interface Idea extends Base {
  text: string;
  status: 'inbox' | 'movida' | 'descartada';
  movedTo?: { type: 'task' | 'project'; id: ID };
}

interface Goal extends Base {       // metas de 6 meses de cada pilar
  pillar: Pillar;
  title: string;
  targetValue?: number;             // ex.: 1 curso, 4 treinos, valor em centavos
  unit?: string;
  deadline?: ISODate;
  achievedAt?: string;
}

interface Habit extends Base {      // hábitos com meta semanal
  pillar: Pillar;
  title: string;                    // ex.: "Academia", "Jiu-jitsu", "Foco em projeto"
  weeklyTarget: number;
  unit: 'vezes' | 'minutos';
  active: boolean;
}

interface HabitLog extends Base {
  habitId: ID;
  date: ISODate;
  amount: number;                   // 1 vez ou N minutos
  note?: string;
}

// ---------- Finanças ----------
type IncomeSource = 'salario_1' | 'salario_2' | 'voip' | 'freela' | 'sistema' | 'outro';

interface Transaction extends Base {
  date: ISODate;
  amount: Cents;                    // positivo = entrada, negativo = saída
  description: string;
  categoryId: ID;
  source?: IncomeSource;            // só para entradas
  origin: 'manual' | 'import';
  importHash?: string;              // hash(date+amount+description) para evitar duplicata
}

interface Category extends Base {
  name: string;                     // ex.: Comer fora, Transporte, Assinaturas
  type: 'entrada' | 'saida';
  weeklyLimit?: Cents;              // ex.: limite de "Comer fora"
  color: string;
}

interface CategoryRule extends Base {
  contains: string;                 // ex.: "IFOOD", "UBER"
  categoryId: ID;
}

interface SavingsGoal extends Base {
  name: string;                     // "Viagem", "Reserva de emergência"
  targetAmount: Cents;
  deadline?: ISODate;
  autoTarget?: { monthsOfExpenses: number }; // reserva = N × gasto médio mensal
}

interface SavingsDeposit extends Base {
  goalId: ID;
  date: ISODate;
  amount: Cents;                    // pode ser negativo (retirada)
  note?: string;
}

interface ImportMapping extends Base {  // lembra o formato do CSV de cada banco
  bankName: string;
  dateColumn: string; dateFormat: string;
  amountColumn: string; descriptionColumn: string;
  invertSign: boolean;
}

// ---------- Estudos ----------
interface Subject extends Base {    // matéria da faculdade
  name: string;
  semester: string;
  passingGrade: number;
  status: 'cursando' | 'aprovado' | 'reprovado';
}
interface Assessment extends Base { // prova/trabalho
  subjectId: ID; title: string; date: ISODate;
  weight?: number; grade?: number;
}
interface Course extends Base {     // curso livre
  name: string; totalLessons: number; doneLessons: number;
  startedAt?: ISODate; finishedAt?: ISODate;
}

// ---------- Projetos ----------
interface Project extends Base {
  name: string;
  status: 'ativo' | 'pausado' | 'concluido';
  description?: string;
  nextStep?: string;                // sempre visível no card
}
interface FocusSession extends Base { // tempo dedicado a projeto ou estudo
  pillar: 'projetos' | 'estudos';
  projectId?: ID;
  date: ISODate;
  minutes: number;
}

// ---------- Saúde ----------
interface Workout extends Base {
  date: ISODate;
  type: 'academia' | 'jiujitsu';
  focus?: string;                   // ex.: peito, costas, perna
  note?: string;
}

// ---------- Revisão ----------
interface WeeklyReview extends Base {
  weekStart: ISODate;
  wentWell: string;
  gotStuck: string;
  nextWeekPriority: string;
  snapshot: Record<Pillar, number>; // % das metas semanais atingidas
}

interface Settings {
  startDate: ISODate;               // início dos 6 meses
  endDate: ISODate;
  theme: 'claro' | 'escuro' | 'sistema';
  monthlySavingsBase: Cents;        // padrão: 30000 (R$ 300)
  voipGoesToSavings: boolean;       // padrão: true
  voipGoalId?: ID;                  // para qual meta vai o VoIP
}
```

---

## 6. Telas

### 6.1 Navegação
- Desktop: barra lateral estreita com 7 itens: **Hoje, Finanças, Trabalho, Projetos, Estudos, Saúde, Revisão**. Configurações no rodapé.
- Mobile (já responsivo): barra inferior com Hoje, Finanças, botão central de captura, Projetos, "Mais".
- Cada pilar tem uma cor própria usada como marca-texto (ver Design).

### 6.2 Captura rápida (o coração do app)
- Botão fixo "+" sempre visível e atalho `N` no teclado (ou `Ctrl+K`).
- Abre um painel com 6 opções: **Gasto, Entrada, Ideia, Tarefa, Treino, Foco**.
- **Gasto:** campo de valor com teclado numérico já focado → chips das 6 categorias mais usadas → Enter salva. Data = hoje (editável, mas escondida).
- **Entrada:** valor → origem (Salário 1, Salário 2, VoIP, Freela, Sistema, Outro). Se for VoIP e `voipGoesToSavings`, mostrar: "Guardar R$ X na meta Viagem?" com um clique para confirmar.
- **Ideia:** só um campo de texto. Enter salva na caixa de ideias.
- **Tarefa:** texto + pilar (chips) + "para hoje?" (sim por padrão).
- **Treino:** dois botões grandes: Academia / Jiu-jitsu. Um clique registra hoje.
- **Foco:** Projeto ou Estudo → 30 / 60 / 90 min → (projeto, se for o caso).
- Confirmação: toast curto com "Desfazer".

### 6.3 Hoje
Ordem da tela, de cima para baixo:
1. **Faixa de finanças** (o elemento de destaque do app): progresso da viagem e da reserva + "Guardado este mês: R$ X de R$ Y".
2. **Tarefas de hoje:** usar o componente pronto `ChecklistHoje.tsx` + `checklist-hoje.css` (anexos; adaptados do Checklist do Bencho, MIT). Não reescrever as animações nem remover os comentários: eles explicam por que os números são o que são. Limite de 5 tarefas por dia (prop `limite`). A cor do preenchimento vem do pilar da tarefa. Manter a ordem de criação. Botão "Puxar tarefas" que sugere atrasadas e as marcadas com prazo próximo.
3. **Caixa de ideias:** campo sempre aberto + lista das ideias da inbox. Cada ideia pode virar tarefa, ir para um projeto ou ser descartada (arrastar ou menu).
4. **Semana em andamento:** um mini-indicador por pilar (ex.: Academia 2/3, Jiu-jitsu 1/2, Projetos 90/240 min, Comer fora R$ 80 de R$ 150).
5. Dia da semana adapta a tela: em qua/qui mostra lembrete "treino no almoço"; em seg/ter/sex, "treino às 15h". Configurável.

### 6.4 Finanças
- **Resumo do mês:** entradas, saídas, sobra. Entradas separadas por origem.
- **Metas de poupança:** cards de Viagem e Reserva com barra de progresso, valor que falta, aporte médio mensal e **projeção** ("no ritmo atual, você chega lá em mês/ano").
- **Meta mensal de guardar:** `monthlySavingsBase + total VoIP do mês`. Mostra quanto já foi guardado.
- **Comer fora:** card próprio com gasto da semana x limite semanal, e histórico das últimas 8 semanas. (Hoje é meu maior vazamento de dinheiro.)
- **Gastos por categoria:** barras do mês atual, comparadas à média dos meses anteriores.
- **Lançamentos:** lista filtrável por mês, categoria e origem, com edição inline de categoria.
- **Importar extrato:**
  1. Upload de CSV ou OFX.
  2. Na primeira vez de um banco, tela para apontar as colunas (data, valor, descrição); salvar como `ImportMapping`.
  3. Prévia com categorias sugeridas pelas `CategoryRule`; linhas duplicadas (mesmo `importHash`) aparecem esmaecidas e não entram.
  4. Ao corrigir a categoria de um lançamento, perguntar: "Sempre classificar 'IFOOD' como Comer fora?" → cria regra.
- **Reserva de emergência:** meta pode ser calculada automaticamente como N × média de gastos mensais dos últimos 3 meses (N configurável, padrão 3). Até ter 3 meses de dados, usar valor manual.

### 6.5 Trabalho
- Lista de tarefas com duas colunas: **Acumulado** e **Novo**.
- Filtro por área (design, social media, suporte, telefonia, URA).
- Indicador semanal principal: **acumulados resolvidos na semana** e saldo do acumulado (entrou x saiu). Uma "boa semana" = acumulado diminuiu enquanto houve entregas novas.
- Gráfico de evolução: tamanho do acumulado por semana.

### 6.6 Projetos (espaço separado)
- Cards de projetos com status, **próximo passo** em destaque e minutos dedicados na semana.
- Página de cada projeto: descrição, tarefas, ideias movidas para ele, histórico de sessões de foco.
- Meta semanal de tempo em projetos (hábito "Foco em projeto", em minutos).
- Gráfico: minutos por semana em projetos ao longo dos 6 meses (esse é o indicador do objetivo "ter mais tempo para projetos").

### 6.7 Estudos
- **Faculdade:** lista de matérias do período com próximas provas/trabalhos (ordenadas por data), notas lançadas e situação de cada matéria. Destaque para avaliações nos próximos 7 dias.
- **Cursos:** curso atual com progresso de aulas (+1 aula com um clique). Meta: concluir 1 curso nos 6 meses.
- Meta semanal de tempo de estudo fora da aula (hábito em minutos).
- Mostrar lado a lado **estudo x projetos** na semana, porque os dois disputam o mesmo tempo.

### 6.8 Saúde
- Semana atual: Academia X/meta e Jiu-jitsu X/meta.
- Calendário dos últimos 3 meses (cada dia marcado pelo tipo de treino).
- Sequência de **semanas** batendo a meta (não dias).
- Meta configurável e progressiva: começa em academia 3× + jiu-jitsu 1×, objetivo de chegar a academia 4× + jiu-jitsu 2×. Sugerir subir a meta depois de 3 semanas seguidas cumpridas.
- Alimentação (leve, sem restrição): um hábito opcional semanal, ex.: "refeições feitas em casa". Desligado por padrão.

### 6.9 Revisão semanal
- Disponível de sexta a domingo; card lembrando na Hoje se ainda não foi feita.
- Passo 1: mostra automaticamente o resultado da semana em cada pilar.
- Passo 2: três campos curtos: o que foi bem, o que travou, prioridade da próxima semana.
- Passo 3: esvaziar a caixa de ideias (decidir cada uma).
- Salva um `WeeklyReview` com o snapshot. A lista de revisões anteriores vira o histórico da evolução.

### 6.10 Configurações
- Período dos 6 meses, tema, metas de poupança, meta mensal base, destino do VoIP.
- Categorias (nome, cor, limite semanal), regras de categorização, mapeamentos de banco.
- Hábitos e metas semanais.
- Exportar/importar backup JSON. Lembrete na Hoje se o último backup tiver mais de 7 dias.

### 6.11 Primeiro uso (onboarding)
Uma sequência curta que já preenche os dados reais:
1. Data de início (padrão: hoje) e fim (+6 meses).
2. Valor e data da viagem; valor da reserva (ou "calcular depois").
3. Metas de treino da semana.
4. Matérias do período e curso atual.
5. Projetos ativos.
Tudo pode ser pulado.

---

## 7. Regras e cálculos (com testes no Vitest)

- `semanaAtual(data)`: segunda a domingo.
- `progressoHabito(habito, semana)`: soma dos `HabitLog` / `weeklyTarget`, limitado a 100% para cores, mas mostrando o valor real.
- Treinos e sessões de foco também geram o progresso dos hábitos correspondentes (um `Workout` de academia conta para o hábito "Academia").
- `metaMensalPoupanca(mes)` = `monthlySavingsBase` + soma das entradas `source = 'voip'` no mês.
- `projecaoMeta(meta)`: média dos aportes dos últimos 3 meses (ou dos meses disponíveis); data estimada = hoje + (falta / média). Sem aportes → "sem projeção ainda".
- `gastoMedioMensal`: média das saídas dos últimos 3 meses fechados.
- `importHash` = hash de `date|amount|description normalizada` (maiúsculas, sem espaços duplicados).
- Categorização: primeira `CategoryRule` cujo `contains` aparece na descrição (sem diferenciar maiúsculas); senão, "Sem categoria".

---

## 8. Design

Direção: **caderno digital com abas de marca-texto.** Limpo, moderno, pouco decorado. A personalidade vem da tipografia e das cores de cada pilar, não de enfeites.

### Cores
| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `papel` | `#F5F6F8` | `#15181D` | fundo |
| `folha` | `#FFFFFF` | `#1D2127` | superfícies |
| `grafite` | `#1C2230` | `#E7EAF0` | texto principal |
| `lapis` | `#6B7385` | `#9AA2B1` | texto secundário |
| `linha` | `#E3E6EB` | `#2A2F37` | divisórias |

Cores dos pilares (usadas como marca-texto: fundo suave + texto forte):
- Finanças `#12A150`
- Trabalho `#2F6FEB`
- Projetos `#C8378A`
- Estudos `#7B5CF0`
- Saúde `#E39A0B`

### Tipografia
- Títulos e números: **Bricolage Grotesque** (valores em dinheiro grandes e com personalidade).
- Texto: **Instrument Sans**.
- Números com `font-variant-numeric: tabular-nums`.

### Diretrizes
- Um único elemento de destaque: a **faixa de finanças da Hoje**. O resto é quieto.
- Pilares identificados por uma aba colorida lateral, não por cards todos iguais com sombra.
- Raio de borda com hierarquia (maior em painéis, menor em chips), não o mesmo em tudo.
- Sem rótulos em CAIXA ALTA, sem gradientes decorativos.
- Animação só como resposta a ação: marcar tarefa, registrar treino, bater meta da semana (um momento de comemoração discreto).
- Textos curtos, em português, voz ativa, sem tom de culpa. Estados vazios dizem o que fazer ("Nenhum treino esta semana. Registre com +").
- Acessível: foco visível no teclado, contraste AA, respeitar `prefers-reduced-motion`.
- Tudo navegável pelo teclado no desktop.

---

## 9. Estrutura de pastas sugerida

```
src/
  app/            rotas e layout
  db/             schema Dexie, migrações, seed
  features/
    hoje/
    captura/
    financas/     inclui importacao/
    trabalho/
    projetos/
    estudos/
    saude/
    revisao/
    configuracoes/
  lib/            datas, dinheiro, calculos (com testes)
  ui/             componentes base (botão, chip, barra de progresso…)
  styles/         tokens
```

---

## 10. Plano de construção

Cada fase termina com algo usável. **Pare no fim de cada fase, me mostre como testar e espere minha aprovação.** Faça commits pequenos com mensagens claras em português.

**Fase 0 — Fundação**
Projeto Vite + TS + Tailwind, tokens de design, fontes, layout com navegação, tema claro/escuro, Dexie com schema, seed de categorias padrão, exportar/importar JSON.
✔ Pronto quando: navego entre as telas vazias, troco o tema e o backup funciona.

**Fase 1 — Hoje + Captura rápida**
Tarefas do dia, caixa de ideias, painel de captura com Ideia e Tarefa, atalho de teclado.
✔ Pronto quando: consigo planejar o dia e jogar ideias em menos de 10 s.

**Fase 2 — Finanças**
Gasto e Entrada na captura, lançamentos, categorias, metas de poupança com aportes, meta mensal com VoIP, card de comer fora, faixa de finanças na Hoje, importação CSV/OFX com mapeamento, regras e deduplicação. Testes dos cálculos.
✔ Pronto quando: importo um extrato real, as categorias vêm quase certas e vejo quanto falta para a viagem.

**Fase 3 — Saúde e Trabalho**
Treino na captura, hábitos semanais, calendário, sequência de semanas; tarefas acumulado/novo, áreas e gráfico do acumulado.

**Fase 4 — Projetos e Estudos**
Projetos com próximo passo, sessões de foco, matérias, avaliações, cursos, comparação estudo x projetos.

**Fase 5 — Revisão e Evolução**
Revisão semanal, histórico, gráficos de evolução em todos os pilares, onboarding.

**Fase 6 — Depois do MVP (não fazer agora)**
- PWA instalável no celular.
- Sincronização com Supabase (login + dados na nuvem).
- Avaliar integração com banco via agregador de Open Finance, para lançar gastos automaticamente.

---

## 11. Como trabalhar comigo (instruções para o Claude Code)

- Sou iniciante: explique o que cada arquivo novo faz, em poucas frases.
- Prefira código simples e legível a código "esperto".
- Não instale bibliotecas fora da stack sem me perguntar.
- Se algo neste briefing estiver ambíguo, pergunte antes de decidir.
- Se achar uma forma mais simples de atingir o mesmo objetivo, proponha.
- Ao fim de cada fase, liste: o que foi feito, como testar, o que ficou pendente.
