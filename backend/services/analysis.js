const YahooFinance = require("yahoo-finance2").default;

// Configurar Yahoo Finance para suprimir avisos
const yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey']
});

const { calcularIndicadores } = require("../utils/indicators");
const { gerarSinal }          = require("../strategies/strategy");
const { buscarNoticias }      = require("./news");

// ── Cache local de notícias (evita buscas repetidas) ────────────────────────
const noticiasCache = new Map();
const NOTICIAS_CACHE_MS = 30 * 60 * 1000; // 30 minutos

async function analisarAtivo(ticker, macro, skipNoticias = true) {
    // ── Buscar dados históricos (OHLCV) - apenas 60 dias para performance ────
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Reduzido de 2024-01-01 para 60 dias

    const chart = await yahooFinance.chart(ticker, {
        period1: startDate.toISOString().split('T')[0],
        interval: "1d",
    }).catch(err => {
        console.warn(`⚠️ Erro ao buscar ${ticker}: ${err.message}`);
        return { quotes: [] };
    });

    const dados   = chart.quotes?.filter(d => d.close != null) ?? [];

    if (dados.length < 10) {
        return {
            ticker,
            preco: 0,
            sinal: "NEUTRO",
            confianca: 0,
            erro: "Dados insuficientes"
        };
    }

    const closes  = dados.map(d => d.close);
    const opens   = dados.map(d => d.open ?? d.close);
    const highs   = dados.map(d => d.high   ?? d.close);
    const lows    = dados.map(d => d.low    ?? d.close);
    const volumes = dados.map(d => d.volume ?? 0);

    // ── Calcular indicadores ─────────────────────────────────────────────────
    const ind  = calcularIndicadores(closes, highs, lows, volumes);

    const rsi  = ind.rsi.at(-1);
    const sma9 = ind.sma9.at(-1);
    const sma21= ind.sma21.at(-1);
    const macd = ind.macd.at(-1);
    const adx  = ind.adx.at(-1);        // { adx, pdi, mdi }
    const bb   = ind.bb.at(-1);         // { upper, middle, lower }
    const atr  = ind.atr.at(-1);        // número
    const obv  = ind.obv;              // array completo (para tendência)
    const preco= closes.at(-1);
    const precoAbertura = opens.at(-1);
    const fechamentoAnterior = closes.length > 1 ? closes.at(-2) : null;

    // ── Gerar sinal com todas as camadas ─────────────────────────────────────
    const resultado = gerarSinal({
        preco,
        rsi,
        sma9,
        sma21,
        macd,
        adx,
        bb,
        obv,
        atr,
        volumes,
        macro,
        closes,      // Array completo para divergências
        highs,       // Array completo para análise
        lows,        // Array completo para análise
        precoAbertura,
        fechamentoAnterior
    });

    // ── Notícias apenas se solicitado (pula por padrão para performance) ─────
    let noticias = [];
    if (!skipNoticias) {
        const cacheKey = ticker;
        const cached = noticiasCache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < NOTICIAS_CACHE_MS) {
            noticias = cached.data;
        } else {
            noticias = await buscarNoticias(ticker).catch(() => []);
            noticiasCache.set(cacheKey, { data: noticias, timestamp: now });
        }
    }

    return {
        ticker,
        preco,
        precoAbertura,
        fechamentoAnterior,
        // Indicadores básicos
        rsi:       rsi,
        sma9:      sma9,
        sma21:     sma21,
        // Novos indicadores
        adx:       adx?.adx  ?? null,
        pdi:       adx?.pdi  ?? null,
        mdi:       adx?.mdi  ?? null,
        atr:       atr       ?? null,
        bb:        bb ? { upper: bb.upper, middle: bb.middle, lower: bb.lower } : null,
        obv_trend: resultado.detalhes.obv_trend,
        // Sinal e metadados
        sinal:     resultado.sinal,
        forca:     resultado.forca,
        confianca: resultado.confianca,
        avisos:    resultado.avisos,
        detalhes:  resultado.detalhes,
        // Notícias
        noticias,
    };
}

module.exports = { analisarAtivo };