// Usar fetch direto ao invés do yahoo-finance2 para contornar bloqueio no Render.com
const { buscarHistorico } = require('./yahooFetch');

const { calcularIndicadores } = require("../utils/indicators");
const { gerarSinal }          = require("../strategies/strategy");
const { buscarNoticias }      = require("./news");
const { geraVereditoIA }      = require("./aiService");
const { 
    detectRSIDivergence, 
    detectMACDDivergence, 
    detectPullbackOpportunity, 
    analyzeVolumeAccumulation, 
    calculateDynamicStops 
} = require("../utils/advancedAnalysis");


// ── Cache local de notícias (evita buscas repetidas) ────────────────────────
const noticiasCache = new Map();
const NOTICIAS_CACHE_MS = 30 * 60 * 1000; // 30 minutos

async function analisarAtivo(ticker, macro, skipNoticias = true) {
    // ── Buscar dados históricos (OHLCV) - 300 dias para SMA 200 ────────────────
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 300);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Usar fetch HTTP direto — funciona no Render.com sem bloqueio
    const dados = await buscarHistorico(ticker, startDateStr, '1d');

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
    const rsi14 = ind.rsi14.at(-1);
    const sma9 = ind.sma9.at(-1);
    const sma21= ind.sma21.at(-1);
    const sma50= ind.sma50.at(-1);
    const sma200= ind.sma200.at(-1);
    const macd = ind.macd.at(-1);
    const adx  = ind.adx.at(-1);        // { adx, pdi, mdi }
    const bb   = ind.bb.at(-1);         // { upper, middle, lower }
    const atr  = ind.atr.at(-1);        // número
    const obv  = ind.obv;              // array completo (para tendência)
    const preco= closes.at(-1);
    const precoAbertura = opens.at(-1);
    const fechamentoAnterior = closes.length > 1 ? closes.at(-2) : null;

    // ── Análise Avançada (Novas métricas) ────────────────────────────────────
    const rsiDivergence = detectRSIDivergence(closes, ind.rsi);
    const macdDivergence = detectMACDDivergence(closes, ind.macd);
    const pullback = detectPullbackOpportunity(closes, sma9, sma21, rsi, atr);
    const volumeAcc = analyzeVolumeAccumulation(volumes, closes);
    
    // Métricas de Variação e Momentum para o Frontend
    const varIntraday = precoAbertura ? ((preco - precoAbertura) / precoAbertura) * 100 : 0;
    const diaNegativo = preco < precoAbertura;
    const quedaDia = Math.max(0, precoAbertura ? ((precoAbertura - preco) / precoAbertura) * 100 : 0);
    
    const last3Closes = closes.slice(-3);
    const last3Opens = opens.slice(-3);
    let verdes = 0;
    let vermelhos = 0;
    last3Closes.forEach((c, i) => {
        if (c > last3Opens[i]) verdes++;
        else vermelhos++;
    });

    const variacao5dias = closes.length >= 6 ? ((preco - closes.at(-6)) / closes.at(-6)) * 100 : 0;
    const volumeMedio = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const volumeConfirmacao = volumes.at(-1) > volumeMedio * 1.2 ? "FORTE" : volumes.at(-1) < volumeMedio * 0.8 ? "FRACO" : "NORMAL";

    // ── Gerar sinal com todas as camadas ─────────────────────────────────────
    const resultado = gerarSinal({
        preco,
        rsi,
        rsi14,
        sma9,
        sma21,
        sma50,
        sma200,
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

    // Injetar métricas avançadas nos detalhes para o frontend
    resultado.detalhes.rsi_divergence = rsiDivergence.type?.toUpperCase();
    resultado.detalhes.macd_divergence = macdDivergence.type?.toUpperCase();
    resultado.detalhes.pullback = pullback;
    resultado.detalhes.volume_accumulation = volumeAcc;
    resultado.detalhes.var_intraday = varIntraday.toFixed(2);
    resultado.detalhes.dia_negativo = diaNegativo;
    resultado.detalhes.queda_dia = quedaDia.toFixed(2);
    resultado.detalhes.momentum_candles = { verdes, vermelhos };
    resultado.detalhes.variacao_5dias = variacao5dias.toFixed(2);
    resultado.detalhes.volume_confirmacao = volumeConfirmacao;
    resultado.detalhes.stops = calculateDynamicStops(preco, atr, resultado.sinal === "VENDA" ? "SELL" : "BUY");

    // ── Notícias e IA apenas se solicitado (pula por padrão para performance) ─────
    let noticias = [];
    let vereditoIA = null;

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

        // Chamar Gemini para análise qualitativa
        vereditoIA = await geraVereditoIA({
            ticker,
            preco,
            rsi,
            adx: adx?.adx || 0,
            atr: atr || 0,
            detalhes: resultado.detalhes,
            noticias
        }, macro);
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
        sma50:     sma50,
        sma200:    sma200,
        // Novos indicadores
        adx:       adx?.adx  ?? null,
        pdi:       adx?.pdi  ?? null,
        mdi:       adx?.mdi  ?? null,
        atr:       atr       ?? null,
        bb:        bb ? { upper: bb.upper, middle: bb.middle, lower: bb.lower } : null,
        obv_trend: resultado.detalhes.obv_trend,
        // Sinal e metadados
        sinal:     resultado.sinal,
        sinal_longo_prazo: resultado.sinal_longo_prazo,
        forca:     resultado.forca,
        confianca: resultado.confianca,
        avisos:    resultado.avisos,
        detalhes:  resultado.detalhes,
        // Notícias e IA
        noticias,
        vereditoIA
    };
}

module.exports = { analisarAtivo };