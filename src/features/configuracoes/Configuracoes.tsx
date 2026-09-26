/* Configurações: tudo que é ajustável no app sem mexer no código. */
import { useRef, useState } from "react";
import { db } from "../../db/db";
import { baixarJSON, exportarTudo, importarTudo, validarBackup } from "../../db/backup";
import { salvarSettings, useSettings } from "../../db/hooks";
import { hojeISO } from "../../lib/datas";
import type { Settings } from "../../db/types";
import { Botao, Cabecalho, Chip, Painel } from "../../ui/ui";

export function Configuracoes() {
  return (
    <>
      <Cabecalho titulo="Configurações" />
      <div className="grid gap-4">
        <SecaoTema />
        <SecaoBackup />
      </div>
    </>
  );
}

function SecaoTema() {
  const { theme } = useSettings();
  const opcoes: { id: Settings["theme"]; nome: string }[] = [
    { id: "sistema", nome: "Igual ao sistema" },
    { id: "claro", nome: "Claro" },
    { id: "escuro", nome: "Escuro" },
  ];
  return (
    <Painel titulo="Tema">
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <Chip key={o.id} ativo={theme === o.id} onClick={() => salvarSettings({ theme: o.id })}>
            {o.nome}
          </Chip>
        ))}
      </div>
    </Painel>
  );
}

function SecaoBackup() {
  const { lastBackupAt } = useSettings();
  const arquivo = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function exportar() {
    const agora = new Date().toISOString();
    await salvarSettings({ lastBackupAt: agora });
    const dados = await exportarTudo(db);
    baixarJSON(dados, `organizaai-backup-${hojeISO()}.json`);
    setMsg({ tipo: "ok", texto: "Backup baixado. Guarde o arquivo em um lugar seguro." });
  }

  async function importar(file: File) {
    setMsg(null);
    try {
      const dados = JSON.parse(await file.text());
      const erro = validarBackup(dados, db);
      if (erro) return setMsg({ tipo: "erro", texto: erro });
      const ok = window.confirm(
        "Importar este backup vai SUBSTITUIR todos os dados atuais pelos do arquivo. Continuar?",
      );
      if (!ok) return;
      await importarTudo(db, dados);
      setMsg({ tipo: "ok", texto: "Backup importado." });
    } catch {
      setMsg({ tipo: "erro", texto: "Não consegui ler esse arquivo. Ele é um JSON exportado pelo app?" });
    } finally {
      if (arquivo.current) arquivo.current.value = "";
    }
  }

  return (
    <Painel titulo="Backup">
      <p className="mb-3 text-sm text-lapis">
        Seus dados ficam só neste navegador. Exporte um backup de vez em quando.
        {lastBackupAt && <> Último backup: {new Date(lastBackupAt).toLocaleDateString("pt-BR")}.</>}
      </p>
      <div className="flex flex-wrap gap-2">
        <Botao variante="primario" onClick={exportar}>
          Exportar backup
        </Botao>
        <Botao onClick={() => arquivo.current?.click()}>Importar backup</Botao>
        <input
          ref={arquivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])}
        />
      </div>
      {msg && (
        <p role="status" className="mt-3 text-sm" style={{ color: msg.tipo === "erro" ? "#C2410C" : "var(--pilar-financas)" }}>
          {msg.texto}
        </p>
      )}
    </Painel>
  );
}
