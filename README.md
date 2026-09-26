# OrganizaAi

Painel pessoal para acompanhar 6 meses em 5 pilares — **Finanças, Trabalho, Projetos, Estudos e Saúde** — com a sensação de um caderno rápido: registrar qualquer coisa em até 3 toques e 10 segundos.

A especificação completa está em [BRIEFING.md](BRIEFING.md).

## Como rodar

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install      # baixa as dependências (uma vez)
npm run dev      # abre o app em http://localhost:5173
npm test         # roda os testes dos cálculos
npm run build    # gera a versão final em dist/
```

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
