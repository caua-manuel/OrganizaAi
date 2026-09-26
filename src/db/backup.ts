/* Backup: tudo que está no banco vira um único JSON, e o JSON volta
   a ser o banco. Como não há nuvem no MVP, este arquivo é a única
   cópia de segurança — por isso a Hoje lembra quando passa de 7 dias. */
import type { OrganizaDB } from "./db";

export const VERSAO_BACKUP = 1;

export interface Backup {
  app: "organizaai";
  versao: number;
  exportadoEm: string;
  tabelas: Record<string, unknown[]>;
}

export async function exportarTudo(banco: OrganizaDB): Promise<Backup> {
  const tabelas: Record<string, unknown[]> = {};
  await banco.transaction("r", banco.tables, async () => {
    for (const t of banco.tables) tabelas[t.name] = await t.toArray();
  });
  return { app: "organizaai", versao: VERSAO_BACKUP, exportadoEm: new Date().toISOString(), tabelas };
}

/* Confere o formato antes de apagar qualquer coisa. Devolve a
   mensagem de erro, ou null se estiver tudo certo. */
export function validarBackup(dados: unknown, banco: OrganizaDB): string | null {
  if (!dados || typeof dados !== "object") return "O arquivo não é um backup válido.";
  const b = dados as Partial<Backup>;
  if (b.app !== "organizaai") return "Este arquivo não é um backup do OrganizaAi.";
  if (typeof b.versao !== "number" || b.versao > VERSAO_BACKUP)
    return "Este backup foi feito por uma versão mais nova do app.";
  if (!b.tabelas || typeof b.tabelas !== "object") return "O backup não tem dados.";
  const conhecidas = new Set(banco.tables.map((t) => t.name));
  for (const [nome, linhas] of Object.entries(b.tabelas)) {
    if (!conhecidas.has(nome)) return `Tabela desconhecida no backup: ${nome}.`;
    if (!Array.isArray(linhas)) return `A tabela ${nome} está corrompida.`;
  }
  return null;
}

/* Substitui TUDO pelo conteúdo do backup, numa transação só: se algo
   falhar no meio, nada muda. */
export async function importarTudo(banco: OrganizaDB, dados: unknown) {
  const erro = validarBackup(dados, banco);
  if (erro) throw new Error(erro);
  const b = dados as Backup;
  await banco.transaction("rw", banco.tables, async () => {
    for (const t of banco.tables) {
      await t.clear();
      const linhas = b.tabelas[t.name];
      if (linhas?.length) await t.bulkAdd(linhas);
    }
  });
}

/* Baixa o backup como arquivo no navegador. */
export function baixarJSON(conteudo: unknown, nomeArquivo: string) {
  const blob = new Blob([JSON.stringify(conteudo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}
