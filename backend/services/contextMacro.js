const YahooFinance = require("yahoo-finance2").default;
const yf = new YahooFinance();

async function buscarContextoMacro() {
    try {
        const [dolar, vix, ibov] = await Promise.allSettled([
            yf.quote("USDBRL=X"),
            yf.quote("^VIX"),
            yf.quote("^BVSP"),
        ]);

        const d = dolar.status === "fulfilled" ? dolar.value : null;
        const v = vix.status   === "fulfilled" ? vix.value   : null;
        const i = ibov.status  === "fulfilled" ? ibov.value  : null;

        const vixPrice = v?.regularMarketPrice ?? null;
        let risco = "BAIXO";
        if (vixPrice !== null) {
            if (vixPrice > 35)      risco = "CRÍTICO";
            else if (vixPrice > 25) risco = "ALTO";
            else if (vixPrice > 18) risco = "MODERADO";
        }

        return {
            dolar: d ? {
                valor:     d.regularMarketPrice,
                variacao:  d.regularMarketChangePercent,
                variacaoAbs: d.regularMarketChange,
            } : null,
            vix: v ? { valor: vixPrice, risco } : null,
            ibovespa: i ? {
                valor:    i.regularMarketPrice,
                variacao: i.regularMarketChangePercent,
            } : null,
            timestamp: new Date().toISOString(),
        };
    } catch (e) {
        console.error("Erro macro:", e.message);
        return null;
    }
}

module.exports = { buscarContextoMacro };
