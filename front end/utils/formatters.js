export const SIGNAL_ICON = { COMPRA: "▲", VENDA: "▼", NEUTRO: "◆" };
export const OBV_ICON    = { SUBINDO: "↑", CAINDO: "↓", NEUTRO: "→" };

export function fmt(v, dec = 2) {
    if (v == null) return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function confiancaColor(c) {
    if (c >= 65) return "high";
    if (c >= 35) return "medium";
    return "low";
}

export function adxLabel(adx) {
    if (adx == null) return { label: "—", cls: "" };
    if (adx < 20)   return { label: "LATERAL FORTE", cls: "danger" };
    if (adx < 25)   return { label: "LATERAL", cls: "warn" };
    if (adx >= 35)  return { label: "TENDÊNCIA FORTE", cls: "strong" };
    return { label: "MODERADO", cls: "ok" };
}

export function bbPositionPct(preco, bb) {
    if (!bb) return null;
    const range = bb.upper - bb.lower;
    if (range <= 0) return 50;
    return Math.max(0, Math.min(100, ((preco - bb.lower) / range) * 100));
}

export function macroVarClass(v) {
    if (v == null) return "";
    return v >= 0 ? "up" : "down";
}
