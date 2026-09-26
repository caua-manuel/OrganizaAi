# OrganizaAi

Painel pessoal para acompanhar 6 meses em 5 pilares — **Finanças, Trabalho, Projetos, Estudos e Saúde** — com a sensação de um caderno rápido: registrar qualquer coisa em até 3 toques e 10 segundos.

- Especificação original de produto: [BRIEFING.md](BRIEFING.md).
- **Especificação viva (arquitetura, modelo de dados, cada módulo e backlog numerado):** [docs/ESPECIFICACAO.md](docs/ESPECIFICACAO.md). Para pedir uma melhoria, cite o ID do backlog — por exemplo, "implemente o F-04".

## Como rodar

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install      # baixa as dependências (uma vez)
npm run dev      # abre o app em http://localhost:5173
npm test         # roda os testes dos cálculos
npm run build    # gera a versão final em dist/
```

## O que já funciona

| Fase | Entrega |
|---|---|
| 0 — Fundação | Layout com navegação, tema claro/escuro, banco local, backup JSON |
| 1 — Hoje + Captura | Tarefas do dia (até 5), caixa de ideias, captura rápida com `N` / `Ctrl+K` e "Desfazer" |
| 2 — Finanças | Gasto/entrada em 3 toques, metas com projeção, meta mensal (base + VoIP), comer fora, importação CSV/OFX com regras e deduplicação |
| 3 — Saúde e Trabalho | Treino em 1 toque, hábitos semanais, calendário, sequência de semanas; acumulado × novo |
| 4 — Projetos e Estudos | Próximo passo, sessões de foco, matérias com média, cursos, estudo × projetos |
| 5 — Revisão | Revisão semanal em 3 passos, evolução por pilar, onboarding de primeiro uso |
| 6 — Tarefas completas | Tela Tarefas, prazo, edição, repetição; editar lançamento, histórico de aportes, "quanto guardar por mês", apagar categoria, prioridade das regras |

As próximas fases (7 a 10: finanças avançadas, organização, IA opcional e qualidade) estão descritas no backlog da especificação.

## Como testar rapidamente

1. `npm run dev` e abra http://localhost:5173 — o primeiro acesso abre as boas-vindas.
2. Aperte **N** em qualquer tela: `1` gasto, `2` entrada, `3` ideia, `4` tarefa, `5` treino, `6` foco.
3. **Finanças → Importar extrato** aceita CSV (com cabeçalho) e OFX. Importe o mesmo arquivo duas vezes para ver as duplicadas esmaecidas.
4. **Configurações → Exportar backup** baixa tudo em JSON; **Importar** restaura.

## Onde ficam os dados

Tudo fica **só no seu navegador** (IndexedDB). Não existe servidor nem login. Para não perder nada, use **Configurações → Exportar backup** de vez em quando; o app lembra na tela Hoje quando o último backup passa de 7 dias.

## Estrutura

```
src/
  app/            rotas, layout (barra lateral / inferior) e tema
  db/             banco (Dexie), tipos, dados iniciais, backup e ações
  features/       uma pasta por tela: hoje, captura, financas, trabalho,
                  projetos, estudos, saude, revisao, configuracoes
  lib/            datas, dinheiro e cálculos (com testes)
  ui/             componentes base (painel, botão, chip, barra…)
  styles/         tokens de cor e fonte
```

## Stack

Vite + React + TypeScript · Tailwind CSS · Dexie (IndexedDB) · React Router · Recharts · date-fns · PapaParse · lucide-react · framer-motion (animação do checklist) · Vitest.

## Regras técnicas

- Dinheiro sempre em **centavos inteiros**.
- Semana de **segunda a domingo**, fuso `America/Sao_Paulo`.
- Todo registro tem `id` (UUID), `createdAt` e `updatedAt`.
