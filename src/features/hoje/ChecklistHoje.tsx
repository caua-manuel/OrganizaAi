/* ══ ChecklistHoje ══════════════════════════════════════════
   Caminho sugerido: src/features/hoje/ChecklistHoje.tsx
   CSS: src/features/hoje/checklist-hoje.css
   Dependência: npm i framer-motion

   Adaptado do componente "Checklist" do Bencho
   (github.com/lorenzo04us/Bencho — src/lab/Checklist.tsx),
   licença MIT — bencho.dev/licence. Copie o texto da licença
   do repositório para THIRD_PARTY_NOTICES.md no projeto.

   O que mudou em relação ao original:
   - Controlado: as tarefas vêm de fora (Dexie) e as mudanças
     saem por onAlternar / onAdicionar. Nada é guardado aqui.
   - Não reseta sozinho. No original a lista voltava ao
     estado inicial depois de 3s, porque era uma demonstração.
     Aqui são as tarefas reais do dia: a pilha fica no chão e
     uma linha discreta diz que o dia fechou. Desmarcar uma
     tarefa (ou criar outra pela captura rápida) levanta a
     lista de volta, sem código extra.
   - Largura fluida, medida do próprio card.
   - Cada tarefa pode trazer a cor do seu pilar, que vira a
     cor do preenchimento da caixa (o "marca-texto").
   - Chaves por id da tarefa, não por texto + posição.
   - Textos em português.

   Uso na tela Hoje:

     const hoje = format(new Date(), "yyyy-MM-dd");
     const tarefas = useLiveQuery(
       () => db.tasks.where("plannedFor").equals(hoje).sortBy("createdAt"),
       [hoje],
     ) ?? [];

     <ChecklistHoje
       tarefas={tarefas.map((t) => ({
         id: t.id,
         titulo: t.title,
         feita: Boolean(t.doneAt),
         cor: t.pillar ? `var(--pilar-${t.pillar})` : undefined,
       }))}
       onAlternar={(id) => alternarTarefa(id)}
       onAdicionar={(titulo) => criarTarefa({ title: titulo, plannedFor: hoje })}
     />

   Mantenha a ordem de criação. Mandar as feitas para o fim
   da lista quebraria o efeito: a pessoa marca e a linha foge
   de baixo do dedo. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./checklist-hoje.css";

export type TarefaHoje = {
  id: string;
  titulo: string;
  feita: boolean;
  /* qualquer cor CSS; normalmente var(--pilar-xxx) */
  cor?: string;
};

type Props = {
  tarefas: TarefaHoje[];
  onAlternar: (id: string) => void;
  onAdicionar: (titulo: string) => void;
  /* Quantas tarefas cabem no dia. 5 é uma escolha de foco:
     um dia com mais que isso raramente fecha, e o painel é
     sobre fechar o dia. Mude se não servir para você. */
  limite?: number;
  /* raio do card, 0 a 40px */
  canto?: number;
  /* tamanho da caixa, 14 a 28px */
  caixa?: number;
  /* quanto a caixa "incha" ao marcar, 0 a 100 */
  bounce?: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── medidas ────────────────────────────────────────────────
   PAD é o respiro do card, igual nos quatro lados (o vertical
   é recalculado lá embaixo para PARECER igual).

   ROW 40: o espaço entre duas tarefas é o que sobra da linha
   depois da caixa. 40 deixa uns 18px, que se lê como lista;
   52 deixava 30 e parecia três coisas soltas.

   BOX 18 contra texto de 14px: a caixa é dimensionada pela
   LINHA de texto ao lado. Maior que isso ela vira o assunto
   da linha em vez de ser o interruptor dela. */
const PAD = 14;
const ROW = 40;

/* ── um número por linha, e tudo é lido dele ────────────────
   Encher a caixa, desenhar o ✓, riscar o texto e apagar a
   tinta do texto são quatro leituras de UMA mola, não quatro
   animações mirando o mesmo momento. Quatro transições são
   quatro chances de uma chegar antes e quebrar a ilusão de
   que é um evento só. Por isso nada no CSS dessas partes tem
   transition própria.

   O excesso da mola (passar do alvo e voltar) só é permitido
   no preenchimento, que "incha" e assenta. O ✓ e o risco usam
   o valor limitado a 0..1: um ✓ que passa do fim se desenha
   além de si mesmo e volta, o que parece defeito, e um risco
   que passa do fim sai da palavra. Uma mola, duas leituras,
   e a diferença é um clamp. */

/* O risco segue o ✓, não corre junto: começa a 12% e termina
   um pouco antes. A caixa responde primeiro e o texto é
   riscado depois, que é a ordem real de quem risca algo numa
   lista. Juntos parecem uma varrida; separados, causa e
   efeito. É uma janela sobre o mesmo número, não um segundo
   timer, então não há nada para sincronizar. */
const LAG = 0.12;
const RUN = 0.72;

/* ══ o fim do dia ═══════════════════════════════════════════
   Marcou a última tarefa aberta: a lista perde o chão, as
   linhas caem e se amontoam na borda de baixo do card. Nada
   de parabéns nem brilho. A lista acabou e se comporta como
   algo que acabou.

   O card mantém a altura. A queda vem da lista se
   compactando: uma linha tem 40px, mas o que se vê nela
   (caixa + texto) tem uns 20. Em pé, essa folga é o que faz
   ser lista e o que torna a linha inteira clicável. No chão
   ela não serve para nada, e as tiras encostam umas nas
   outras. A de baixo quase não se move, a de cima percorre
   toda a compactação. */

/* altura visível de uma linha: o maior entre caixa e texto,
   os dois MEDIDOS, sem margem extra — cada pixel de folga é
   um pixel a menos de queda */
const BODY = (side: number, line: number) => Math.max(side, line);

/* duração da queda MAIS longa; as outras são proporcionais,
   porque é tudo uma gravidade só */
const DROP_MS = 0.46;
/* quanto quica ao tocar o chão, no máximo. Sem quique parece
   "colocado"; com 9px de quique numa queda de 8 parece cama
   elástica, então é limitado pela distância percorrida. */
const REBOUND = 8;
const FALL_EASE = ["easeIn", "easeOut", "easeIn"] as const;

/* ── a inclinação vem das PALAVRAS ──────────────────────────
   Uma tira apoiada em outra fica sustentada pelo tanto que
   tem embaixo; o resto fica pendurado, e o que fica
   pendurado tomba. Tira mais longa que a de baixo sobra para
   a direita e inclina para lá. Mais curta, fica apoiada e não
   acrescenta nada.

   ACUMULA de baixo para cima: quem deita sobre algo inclinado
   já começa inclinado. A de baixo fica reta no card.

   A curva satura em vez de crescer linear: ~2° para 16px de
   diferença, ~4,5° para 60px, nunca chega a 6° — o ângulo em
   que a tira para de parecer apoiada e passa a parecer
   jogada. */
const MAX_LEAN = 6;
const REACH = 40;
const leanOf = (over: number) => MAX_LEAN * (1 - Math.exp(-over / REACH));
/* o deslocamento lateral, sobre o qual as palavras não têm
   opinião — a única coisa aqui simplesmente escolhida */
const DRIFT = [-5, 4, -2, 5, -3];

/* ── o respiro entre duas tiras ─────────────────────────────
   Inclinar move as pontas: duas tiras com inclinações
   diferentes se aproximam de um lado, e se chegarem mais
   perto que o espaço entre elas a de cima cobre o texto da
   de baixo. Então o espaço é calculado a partir das
   inclinações.

   Medido ONDE HÁ TINTA, não na largura da linha. A tira tem a
   cor do card; ela só esconde algo onde existe algo embaixo,
   e o texto termina bem antes da borda. A rotação é pelo
   meio da linha, então um ponto em x se desloca
   (x - meio) * sen(ângulo). */
const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);
const gapFor = (leans: number[], inks: number[], mid: number) =>
  1 +
  Math.max(
    0,
    ...leans.slice(1).map((below, i) => {
      const ink = Math.max(inks[i] ?? mid, inks[i + 1] ?? mid);
      return Math.max(0, (ink - mid) * (sin(leans[i]) - sin(below)));
    }),
  );

/* ── uma mola ───────────────────────────────────────────────
   Em quadros, não milissegundos: `dt` é em 1/60 s e o
   amortecimento é ELEVADO a ele, não multiplicado. Assim um
   quadro perdido dissipa a mesma energia que os dois quadros
   que ele substituiu, e a mola se comporta igual numa página
   pesada.

   O loop para sozinho quando o valor assenta: nenhum
   requestAnimationFrame fica rodando à toa.

   0..100 viram rigidez e decaimento escolhidos pela TAXA DE
   AMORTECIMENTO (zeta = -ln(d) / (2·√k)):
     0   → zeta ~0,85, pesado, chega sem oscilar
     50  → zeta ~0,41, o padrão
     100 → zeta ~0,20, vivo, dois quiques visíveis */
const springOf = (tune: number) => ({
  k: 0.08 + (tune / 100) * 0.16,
  d: 0.62 + (tune / 100) * 0.2,
});

/* O limite de parada é absoluto (0,02), então a mola trabalha
   em 0..100 e quem usa divide por 100. Numa escala de 0..1 ela
   "assentaria" antes de se mover de forma visível. */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    /* `tune` está aqui porque o loop se fecha sobre ele;
       reiniciar continua dos refs, sem pular */
  }, [target, tune, instant]);

  return at;
}

/* lido uma vez: é uma preferência, não um controle ao vivo */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function ChecklistHoje({
  tarefas,
  onAlternar,
  onAdicionar,
  limite = 5,
  canto = 16,
  caixa = 18,
  bounce = 50,
}: Props) {
  /* o rascunho fica separado da lista: desistir de digitar
     não deixa nada para trás */
  const [adicionando, setAdicionando] = useState(false);
  const [rascunho, setRascunho] = useState("");

  /* ── largura do card ─────────────────────────────────────
     O original tinha 300px fixos. Aqui o card ocupa a coluna
     da tela Hoje, então a largura é medida. */
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [largura, setLargura] = useState(320);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ler = () => setLargura(el.clientWidth);
    ler();
    const ro = new ResizeObserver(ler);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ── quanto mede cada linha de texto ─────────────────────
     Informado DE BAIXO para cima, porque só a linha sabe: a
     largura de um texto é pergunta para a fonte, não para a
     contagem de letras. offsetWidth em vez de um rect, que
     viria multiplicado se o card estiver sob algum scale.
     Guardado por id, então apagar ou incluir tarefas não
     desalinha as medidas. */
  const [runs, setRuns] = useState<Record<string, number>>({});
  const [line, setLine] = useState(20);
  const medir = useCallback((id: string, px: number, tall: number) => {
    setRuns((v) => (v[id] === px ? v : { ...v, [id]: px }));
    setLine((v) => (v === tall ? v : tall));
  }, []);

  const still = stillness();
  const r = clamp(canto, 0, 40);
  const side = clamp(Math.round(caixa), 14, 28);
  const n = tarefas.length;

  /* ── o fim, como um booleano derivado ────────────────────
     Não é estado. Todas marcadas É o fim. Desmarcar uma torna
     isto falso no mesmo render e as linhas sobem de volta sem
     ninguém precisar lembrar que tinham caído. */
  const fell = n > 0 && tarefas.every((t) => t.feita);
  /* a linha de adicionar guarda o lugar mesmo com a pilha no
     chão — sumir com ela mudaria a altura no meio da queda */
  const spare = n < limite;

  /* ── o respiro vertical é DERIVADO ───────────────────────
     A linha é mais alta que a caixa (a linha inteira é o
     alvo do clique). Essa folga fica entre a primeira caixa
     e a borda, então `padding: 14px` daria 14 dos lados e 23
     em cima. Tirando a folga do vertical, os quatro PARECEM
     iguais, em qualquer tamanho de caixa. */
  const slack = (ROW - side) / 2;
  const padV = Math.max(0, PAD - slack);

  /* ── onde a pilha para, de baixo para cima ──────────────── */
  const body = BODY(side, line);
  const inset = (ROW - body) / 2;
  const slots = n + (spare ? 1 : 0);
  const floor = padV + ROW * slots;
  const mid = (largura - PAD * 2) / 2;

  const leans = tarefas.map(() => 0);
  for (let i = n - 2; i >= 0; i--) {
    const over = Math.max(0, (runs[tarefas[i].id] ?? 0) - (runs[tarefas[i + 1].id] ?? 0));
    leans[i] = clamp(leans[i + 1] + leanOf(over), 0, MAX_LEAN);
  }
  const inks = tarefas.map((t) => runs[t.id] ?? mid);
  const touch = gapFor(leans, inks, mid);
  /* a de baixo fica reta, então sua borda é o ponto mais
     baixo e o assento não precisa corrigir inclinação */
  const seat = floor - inset - body;
  const restTop = (i: number) => padV + i * ROW;
  const pileTop = (i: number) => seat - (n - 1 - i) * (body + touch);
  const drops = tarefas.map((_, i) => Math.max(0, pileTop(i) - restTop(i)));
  /* a de cima cai mais, então dita o relógio; tempo vai com a
     raiz da distância. A cascata vem daí: nada tem atraso, a
     de baixo só tem menos caminho e chega primeiro. */
  const longest = Math.max(...drops, 1);

  const adicionar = () => {
    const texto = rascunho.trim();
    setAdicionando(false);
    setRascunho("");
    if (!texto || n >= limite) return;
    onAdicionar(texto);
  };

  return (
    <div
      ref={cardRef}
      className="chk"
      style={{
        /* altura DECLARADA para o CSS poder animar: incluir
           uma tarefa abre o card em vez de pular 40px */
        height: padV * 2 + ROW * slots,
        padding: `${padV}px ${PAD}px`,
        borderRadius: r,
      }}
    >
      {/* ── o dia fechou ────────────────────────────────────
          No espaço que a compactação libera no topo. Aparece
          depois que a pilha assenta, some na hora em que ela
          levanta. Informa, não comemora. */}
      <p
        className="chk-fim"
        role="status"
        data-show={fell || undefined}
        style={{ top: padV, left: PAD, right: PAD, height: ROW }}
      >
        {fell ? "Tudo feito por hoje." : ""}
      </p>

      <AnimatePresence initial={false}>
        {tarefas.map((tarefa, i) => (
          <Linha
            key={tarefa.id}
            tarefa={tarefa}
            side={side}
            bounce={bounce}
            still={still}
            fell={fell}
            drop={drops[i]}
            secs={DROP_MS * Math.sqrt(drops[i] / longest)}
            inset={inset}
            drift={DRIFT[i % DRIFT.length]}
            tilt={leans[i]}
            largura={largura}
            onMedir={medir}
            /* a última a pousar é o topo da pilha e precisa
               ser pintada por cima; a ordem do DOM faria o
               contrário */
            layer={fell ? n - i : undefined}
            onAlternar={onAlternar}
          />
        ))}
      </AnimatePresence>

      {/* ── a linha de adicionar ──────────────────────────────
          Discreta de propósito: é a única coisa aqui que não é
          tarefa. Com tinta cheia, pareceria uma tarefa ainda
          não marcada. Some quando a lista está cheia — um
          "adicionar" que não adiciona é um controle mentindo. */}
      {spare && (
        <div className="chk-add" data-hide={fell || undefined} style={{ height: ROW }}>
          <span
            className="chk-ghost"
            aria-hidden="true"
            style={{ width: side, height: side, borderRadius: side * 0.32 }}
          />
          {adicionando ? (
            <input
              className="chk-field"
              autoFocus
              value={rascunho}
              placeholder={n === 0 ? "Primeira tarefa do dia" : "Nova tarefa"}
              maxLength={80}
              onChange={(e) => setRascunho(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") adicionar();
                if (e.key === "Escape") {
                  setAdicionando(false);
                  setRascunho("");
                }
              }}
              onBlur={adicionar}
            />
          ) : (
            <button type="button" className="chk-new" onClick={() => setAdicionando(true)}>
              {n === 0 ? "Adicionar a primeira tarefa" : "Adicionar tarefa"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

type LinhaProps = {
  tarefa: TarefaHoje;
  side: number;
  bounce: number;
  still: boolean;
  fell: boolean;
  drop: number;
  secs: number;
  inset: number;
  drift: number;
  tilt: number;
  largura: number;
  layer?: number;
  onMedir: (id: string, px: number, tall: number) => void;
  onAlternar: (id: string) => void;
};

function Linha({
  tarefa,
  side,
  bounce,
  still,
  fell,
  drop,
  secs,
  inset,
  drift,
  tilt,
  largura,
  layer,
  onMedir,
  onAlternar,
}: LinhaProps) {
  const { id, titulo, feita, cor } = tarefa;

  /* ── mede a própria linha ────────────────────────────────
     O span tem o tamanho das PALAVRAS, então a borda direita
     dele é onde a tira realmente termina. useLayoutEffect
     porque a pilha se inclina por esse número, e um quadro com
     a resposta errada é um quadro com a pilha errada. A
     largura entra nas dependências porque, em tela estreita,
     o texto corta com reticências e muda de tamanho. */
  const say = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const el = say.current;
    if (el) onMedir(id, el.offsetLeft + el.offsetWidth, el.offsetHeight);
  }, [titulo, side, id, largura, onMedir]);

  const t = useSpring(feita ? 100 : 0, clamp(bounce, 0, 100), still) / 100;
  const held = clamp(t, 0, 1);
  const cut = clamp((held - LAG) / RUN, 0, 1);

  /* ── cair e subir não são o mesmo movimento ──────────────
     Descer é uma duração com a forma da gravidade (easeIn:
     começa do nada e ganha velocidade) e o quique no fim é a
     diferença entre pousar e ser colocado. Subir é mola:
     voltar é a lista se reafirmando, e mola se interrompe bem
     — desmarcar no meio da queda pega a linha de onde ela
     estiver.

     Com movimento reduzido não existe versão calma de algo
     caindo, então não acontece. */
  const run = still ? 0 : secs;
  const up = Math.min(REBOUND, drop * 0.22);
  const land = { duration: run, times: [0, 0.66, 0.84, 1], ease: [...FALL_EASE] };
  const lean = { duration: run, ease: "easeIn" as const };

  return (
    <motion.button
      type="button"
      className="chk-row"
      role="checkbox"
      aria-checked={feita}
      title={titulo}
      data-fell={fell || undefined}
      onClick={() => onAlternar(id)}
      style={
        {
          height: ROW,
          zIndex: layer,
          "--slip": `${inset}px`,
          "--marca": cor,
        } as CSSProperties
      }
      /* desenhada onde sempre esteve e MOVIDA a partir dali:
         o layout do card nunca muda */
      initial={false}
      exit={{ opacity: 0, transition: { duration: 0.18 } }}
      animate={
        fell
          ? { y: [0, drop, drop - up, drop], x: drift, rotate: tilt }
          : { y: 0, x: 0, rotate: 0 }
      }
      transition={
        fell
          ? { y: land, x: lean, rotate: lean }
          : { type: "spring", stiffness: 420, damping: 26, mass: 0.9 }
      }
    >
      {/* ── a caixa ─────────────────────────────────────────
          O aro nunca muda; o PREENCHIMENTO cresce dentro dele,
          a partir do centro. Trocar a cor de fundo seria outra
          cor chegando; crescer de dentro é a caixa sendo
          preenchida, que é o que a palavra quer dizer. */}
      <span className="chk-box" style={{ width: side, height: side, borderRadius: side * 0.32 }}>
        <span
          className="chk-fill"
          style={{
            borderRadius: side * 0.32,
            /* valor CRU: passa do cheio e assenta — o único
               lugar onde o excesso da mola é bem-vindo */
            transform: `scale(${t.toFixed(4)})`,
          }}
        />
        {/* ── o ✓ é DESENHADO ───────────────────────────────
            pathLength=1 normaliza o traço pelo próprio
            comprimento, então o offset é uma fração. Troque o
            desenho do ✓ e nada aqui precisa saber. */}
        <svg className="chk-tick" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 12.4 L10.3 16.7 L18 7.6"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - held}
          />
        </svg>
      </span>

      <span className="chk-say" ref={say}>
        {/* o texto perde tinta enquanto o risco passa, lido do
            mesmo número: meio riscado é meio apagado */}
        <span className="chk-word" style={{ opacity: mix(1, 0.42, held) }}>
          {titulo}
        </span>
        {/* o risco é ESCALADO, não crescido: scaleX a partir da
            esquerda não precisa medir a palavra */}
        <span
          className="chk-rule"
          aria-hidden="true"
          style={{ transform: `scaleX(${cut.toFixed(4)})` }}
        />
      </span>
    </motion.button>
  );
}
