/* Treino: dois botões grandes. Um toque registra o treino de hoje.
   Se o toque bate a meta da semana, o aviso comemora (discretamente). */
import { Dumbbell, Swords } from "lucide-react";
import { db } from "../../db/db";
import { registrarTreino } from "../../db/acoes";
import type { Workout } from "../../db/types";
import { semanaAtual } from "../../lib/datas";
import { progressoHabito } from "../../lib/habitos";
import { useToast } from "../../ui/Toast";

const TIPOS: { tipo: Workout["type"]; nome: string; Icone: typeof Dumbbell }[] = [
  { tipo: "academia", nome: "Academia", Icone: Dumbbell },
  { tipo: "jiujitsu", nome: "Jiu-jitsu", Icone: Swords },
];

export function FormTreino({ onPronto }: { onPronto: () => void }) {
  const avisar = useToast();

  async function registrar(tipo: Workout["type"], nome: string) {
    const desfazer = await registrarTreino(tipo);
    const habito = await db.habits.where("link").equals(`treino:${tipo}`).first();
    let texto = `${nome} registrado`;
    if (habito?.active) {
      const [logs, workouts] = await Promise.all([db.habitLogs.toArray(), db.workouts.toArray()]);
      const p = progressoHabito(habito, semanaAtual(), { logs, workouts, focus: [] });
      texto = p.valor === p.meta ? `${nome} ${p.valor}/${p.meta}: meta da semana batida ✓` : `${nome} ${p.valor}/${p.meta} na semana`;
    }
    avisar(texto, desfazer);
    onPronto();
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {TIPOS.map(({ tipo, nome, Icone }, i) => (
        <button
          key={tipo}
          type="button"
          autoFocus={i === 0}
          onClick={() => registrar(tipo, nome)}
          className="flex flex-col items-center gap-2 rounded-2xl border border-linha px-3 py-7 text-base font-semibold hover:bg-papel"
        >
          <Icone size={30} style={{ color: "var(--pilar-saude)" }} aria-hidden="true" />
          {nome}
        </button>
      ))}
    </div>
  );
}
