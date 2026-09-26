import { describe, expect, it } from "vitest";
import { adivinharColunas, aplicarMapeamento, lerCSV, lerData, lerOFX, lerValor, pareceOFX } from "./importacao";

/* dados sintéticos, no formato de extratos comuns */
const CSV_PONTO_VIRGULA = `Data;Descrição;Valor
05/09/2026;IFOOD *LOJA;-45,90
06/09/2026;PIX RECEBIDO FULANO;1.200,00
07/09/2026;UBER *TRIP;abc
`;

const OFX = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260905120000[-3:BRT]
<TRNAMT>-45.90
<MEMO>IFOOD *LOJA
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20260906
<TRNAMT>1200.00
<NAME>PIX RECEBIDO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

describe("CSV", () => {
  it("detecta ponto e vírgula e lê o cabeçalho", () => {
    const { colunas, linhas } = lerCSV(CSV_PONTO_VIRGULA);
    expect(colunas).toEqual(["Data", "Descrição", "Valor"]);
    expect(linhas).toHaveLength(3);
  });

  it("adivinha as colunas pelo nome", () => {
    expect(adivinharColunas(["Data", "Descrição", "Valor"])).toEqual({
      dateColumn: "Data",
      amountColumn: "Valor",
      descriptionColumn: "Descrição",
    });
  });

  it("aplica o mapeamento e aponta a linha com problema", () => {
    const { linhas } = lerCSV(CSV_PONTO_VIRGULA);
    const r = aplicarMapeamento(linhas, {
      dateColumn: "Data",
      dateFormat: "DD/MM/YYYY",
      amountColumn: "Valor",
      descriptionColumn: "Descrição",
      invertSign: false,
    });
    expect(r.ok).toEqual([
      { date: "2026-09-05", amount: -4590, description: "IFOOD *LOJA", origem: 2 },
      { date: "2026-09-06", amount: 120000, description: "PIX RECEBIDO FULANO", origem: 3 },
    ]);
    expect(r.problemas).toEqual([{ origem: 4, motivo: 'valor não reconhecido: "abc"' }]);
  });

  it("inverte o sinal quando o banco mostra gasto como positivo", () => {
    const r = aplicarMapeamento([{ d: "2026-09-05", v: "45.90", t: "X" }], {
      dateColumn: "d",
      dateFormat: "YYYY-MM-DD",
      amountColumn: "v",
      descriptionColumn: "t",
      invertSign: true,
    });
    expect(r.ok[0].amount).toBe(-4590);
  });
});

describe("lerData", () => {
  it.each([
    ["05/09/2026", "DD/MM/YYYY", "2026-09-05"],
    ["2026-09-05", "YYYY-MM-DD", "2026-09-05"],
    ["05/09/26", "DD/MM/YY", "2026-09-05"],
    ["09/05/2026", "MM/DD/YYYY", "2026-09-05"],
  ])("%s em %s", (t, f, e) => expect(lerData(t, f)).toBe(e));
  it("recusa data impossível", () => {
    expect(lerData("32/13/2026", "DD/MM/YYYY")).toBeNull();
  });
});

describe("lerValor", () => {
  it.each([
    ["-45,90", -4590],
    ["1.234,56", 123456],
    ["-45.90", -4590],
    ["1,234.56", 123456],
    ["(45,90)", -4590],
    ["R$ 12,00", 1200],
  ])("%s", (t, e) => expect(lerValor(t)).toBe(e));
});

describe("OFX", () => {
  it("reconhece e lê os lançamentos", () => {
    expect(pareceOFX(OFX)).toBe(true);
    expect(lerOFX(OFX).ok).toEqual([
      { date: "2026-09-05", amount: -4590, description: "IFOOD *LOJA", origem: 1 },
      { date: "2026-09-06", amount: 120000, description: "PIX RECEBIDO", origem: 2 },
    ]);
  });
});
