// Usar fetch direto ao invés do yahoo-finance2 para contornar bloqueio no Render.com
const { buscarHistorico, buscarResumo } = require('./yahooFetch');

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

const { CandlestickPatternDetector } = require("./patterns/candlestickDetector");
const { ConfluenceScorer } = require("./patterns/confluenceScoring");
const { isLiquid } = require("../utils/b3Filters");
const { analyzeSupportResistance } = require("../utils/supportResistance");
const { analyzeTimesAndTrades } = require("../utils/timesAndTrades");
const { analyzeSuperDOM }       = require("../utils/superDom");

const detector = new CandlestickPatternDetector();
const scorer = new ConfluenceScorer();


// ── Cache local ─────────────────────────────────────────────────────────────
const noticiasCache = new Map();
const fundamentaisCache = new Map();
const NOTICIAS_CACHE_MS = 30 * 60 * 1000; // 30 minutos
const FUNDAMENTAIS_CACHE_MS = 24 * 60 * 60 * 1000; // 24 horas

async function analisarAtivo(ticker, macro, skipNoticias = true, incluirFundamentais = true) {
    // ── Buscar dados históricos (OHLCV) ──────────────────────────────────────
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 300);
    const startDateStr = startDate.toISOString().split('T')[0];

    const dados = await buscarHistorico(ticker, startDateStr, '1d');

    if (dados.length < 10) {
        return { ticker, preco: 0, sinal: "NEUTRO", confianca: 0, erro: "Dados insuficientes" };
    }

    // ── Buscar dados semanais para análise Multi-Timeframe (MTF) ──
    const startDateWeekly = new Date();
    startDateWeekly.setDate(startDateWeekly.getDate() - 1050); // ~150 semanas
    const startDateWeeklyStr = startDateWeekly.toISOString().split('T')[0];
    const dadosSemanais = await buscarHistorico(ticker, startDateWeeklyStr, '1wk');

    const closes  = dados.map(d => d.close);
    const opens   = dados.map(d => d.open ?? d.close);
    const highs   = dados.map(d => d.high   ?? d.close);
    const lows    = dados.map(d => d.low    ?? d.close);
    const volumes = dados.map(d => d.volume ?? 0);

    const ind  = calcularIndicadores(closes, highs, lows, volumes);
    const rsi14 = ind.rsi14.at(-1);
    const sma9 = ind.sma9.at(-1);
    const sma21= ind.sma21.at(-1);
    const sma50= ind.sma50.at(-1);
    const sma200= ind.sma200.at(-1);
    const preco= closes.at(-1);
    const precoAbertura = opens.at(-1);

    // Calcular tendência semanal
    let tendenciaMacroSemanal = "NEUTRO";
    let sma50SemanalValue = null;
    
    if (dadosSemanais && dadosSemanais.length >= 50) {
        const closesSemanais = dadosSemanais.map(d => d.close);
        const { SMA } = require("technicalindicators");
        const sma50Semanal = SMA.calculate({ values: closesSemanais, period: 50 });
        
        if (sma50Semanal && sma50Semanal.length > 0) {
            sma50SemanalValue = sma50Semanal.at(-1);
            const ultimoFechamentoSemanal = closesSemanais.at(-1);
            tendenciaMacroSemanal = ultimoFechamentoSemanal > sma50SemanalValue ? "ALTA" : "BAIXA";
        }
    } else {
        // Fallback para tendência diária se não houver dados semanais suficientes (ativos recentes)
        if (sma50 && sma200) {
            tendenciaMacroSemanal = sma50 > sma200 ? "ALTA" : "BAIXA";
        }
    }

    // ── Buscar Fundamentais (Cacheado) ──────────────────────────────────────
    let fundamentais = null;
    if (incluirFundamentais) {
        const cached = fundamentaisCache.get(ticker);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < FUNDAMENTAIS_CACHE_MS) {
            fundamentais = cached.data;
        } else {
            fundamentais = await buscarResumo(ticker).catch(() => null);
            if (fundamentais) fundamentaisCache.set(ticker, { data: fundamentais, timestamp: now });
        }
    }

    const rsi  = ind.rsi.at(-1);
    const macd = ind.macd.at(-1);
    const adx  = ind.adx.at(-1);        // { adx, pdi, mdi }
    const bb   = ind.bb.at(-1);         // { upper, middle, lower }
    const atr  = ind.atr.at(-1);        // número
    const obv  = ind.obv;              // array completo (para tendência)
    const fechamentoAnterior = closes.length > 1 ? closes.at(-2) : null;

    // ── Análise Avançada (Novas métricas) ────────────────────────────────────
    const rsiDivergence = detectRSIDivergence(closes, ind.rsi);
    const macdDivergence = detectMACDDivergence(closes, ind.macd);
    const pullback = detectPullbackOpportunity(closes, sma9, sma21, rsi, atr);
    const volumeAcc = analyzeVolumeAccumulation(volumes, closes);
    const srAnalysis = analyzeSupportResistance(closes, highs, lows, volumes, ind, atr);

    // ── Times & Trades e Super DOM ───────────────────────────────────────────
    const candles = dados.map(d => ({
        open:   d.open   ?? d.close,
        high:   d.high   ?? d.close,
        low:    d.low    ?? d.close,
        close:  d.close,
        volume: d.volume ?? 0,
        date:   d.date
    }));

    const ttAnalysis  = analyzeTimesAndTrades({ opens, highs, lows, closes, volumes, candles });
    const domAnalysis = analyzeSuperDOM({ opens, highs, lows, closes, volumes, atr, srZones: srAnalysis });
    
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

    // ── Função auxiliar para extrair dados de um dia específico ─────────────
    const getSinalNoDia = (offset) => {
        // Offset 0 = hoje, 1 = ontem, etc.
        return gerarSinal({
            preco: closes.at(-(offset + 1)),
            rsi: ind.rsi.at(-(offset + 1)),
            rsi14: ind.rsi14.at(-(offset + 1)),
            sma9: ind.sma9.at(-(offset + 1)),
            sma21: ind.sma21.at(-(offset + 1)),
            sma50: ind.sma50.at(-(offset + 1)),
            sma200: ind.sma200.at(-(offset + 1)),
            macd: ind.macd.at(-(offset + 1)),
            adx: ind.adx.at(-(offset + 1)),
            adxArray: ind.adx.slice(0, ind.adx.length - offset),
            bb: ind.bb.at(-(offset + 1)),
            obv: ind.obv.slice(0, ind.obv.length - offset),
            atr: ind.atr.at(-(offset + 1)),
            volumes: volumes.slice(0, volumes.length - offset),
            macro,
            closes: closes.slice(0, closes.length - offset),
            highs: highs.slice(0, highs.length - offset),
            lows: lows.slice(0, lows.length - offset),
            precoAbertura: opens.at(-(offset + 1)),
            fechamentoAnterior: closes.at(-(offset + 2)),
            srAnalysis: offset === 0 ? srAnalysis : null
        });
    };

    // ── Gerar sinal atual e verificar persistência ──────────────────────────
    const resultado = getSinalNoDia(0);
    
    // Calcular quantos dias seguidos o sinal se mantém
    let dias_consecutivos = 1;
    if (resultado.sinal !== "NEUTRO") {
        for (let i = 1; i < 5; i++) {
            const resAnterior = getSinalNoDia(i);
            if (resAnterior.sinal === resultado.sinal) {
                dias_consecutivos++;
            } else {
                break;
            }
        }
    }

    // ── REGRA DE PERSISTÊNCIA ANALÍTICA REMOVIDA PARA ENTRADAS DIÁRIAS ────────
    const sinalOriginal = resultado.sinal;
    // Removida a exigência de 2 dias consecutivos para permitir operação intraday (day trade)
    // conforme solicitação do usuário para foco em previsão diária.
    
    // Injetar métricas avançadas nos detalhes para o frontend
    resultado.detalhes.dias_consecutivos = dias_consecutivos;
    resultado.detalhes.sinal_original = sinalOriginal;
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
    resultado.detalhes.sr_analysis = srAnalysis;
    resultado.detalhes.tt_analysis  = ttAnalysis;
    resultado.detalhes.dom_analysis = domAnalysis;
    resultado.detalhes.tendencia_macro_semanal = tendenciaMacroSemanal;
    resultado.detalhes.sma50_semanal = sma50SemanalValue ? Number(sma50SemanalValue.toFixed(2)) : null;

    // Adicionar campo EXPLÍCITO de rompimento confirmado no resultado principal
    resultado.rompimento_confirmado = srAnalysis.rompimento_confirmado; // Campo TOPO nível!

    // Adicionar avisos de rompimento de suporte/resistência
    if (srAnalysis.support.warning) {
        resultado.avisos.push(srAnalysis.support.warning);
    }
    if (srAnalysis.resistance.warning) {
        resultado.avisos.push(srAnalysis.resistance.warning);
    }

    // Adicionar aviso de confirmação de rompimento (prioridade alta)
    if (srAnalysis.breakout_confirmation_warning) {
        resultado.avisos.unshift(srAnalysis.breakout_confirmation_warning); // Adiciona no início dos avisos!
    }

    // ── Detecção de Padrões de Candlestick (Nova funcionalidade B3) ──────────
    const candleData = dados.map((d, idx) => ({
        timestamp: d.date,
        open: d.open ?? d.close,
        high: d.high ?? d.close,
        low: d.low ?? d.close,
        close: d.close,
        volume: d.volume ?? 0
    }));

    const detectedPatterns = detector.detectAll(candleData);
    
    // Preparar contexto técnico para o Scoring
    const trend = sma21 > sma50 ? (sma9 > sma21 ? 'uptrend' : 'sideways') : 'downtrend';
    const techContext = {
        trend,
        rsi: rsi14,
        atr,
        movingAverages: { ma9: sma9, ma21: sma21, ma50: sma50, ma200: sma200 },
        keyLevels: { supports: [srAnalysis.support.mean], resistances: [srAnalysis.resistance.mean] },
        fibLevels: { // Simplificado: baseado no range dos últimos 100 dias
            level500: (Math.max(...highs.slice(-100)) + Math.min(...lows.slice(-100))) / 2
        }
    };

    const scoredPatterns = detectedPatterns.map(p => scorer.calculateScore(p, candleData, p.index, techContext));
    resultado.detalhes.candlestick_patterns = scoredPatterns;
    resultado.detalhes.is_liquid = isLiquid(candleData.at(-1));

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

    // ── Calcular Entrada Viável (Safe Entry) ────────────────────────────────
    // Ponto mais seguro: Suporte Médio ou Pullback Conservador
    let precoEntradaViavel = srAnalysis?.support?.mean || (preco * 0.985); // Fallback 1.5% abaixo se sem suporte
    let localizacaoEntrada = "Suporte";

    // Se o preço já está perto do suporte, a entrada viável é o próprio suporte
    if (srAnalysis?.entry_zone_status === 'SUPORTE_RESPEITADO') {
        precoEntradaViavel = srAnalysis.support.mean;
        localizacaoEntrada = "Suporte (Confirmado)";
    } 
    // Se está em tendência de alta mas longe do suporte, sugerimos entrada no pullback da SMA9
    else if (ind.sma9.at(-1) > ind.sma21.at(-1) && preco > ind.sma9.at(-1)) {
        precoEntradaViavel = ind.sma9.at(-1);
        localizacaoEntrada = "Pullback SMA 9";
    }
    // Se o RSI está alto, a entrada viável deve ser mais baixa para evitar "topo"
    else if (rsi > 65) {
        precoEntradaViavel = Math.min(srAnalysis?.support?.mean || preco, preco * 0.97);
        localizacaoEntrada = "Ajuste RSI Alto";
    }

    const resObj = {
        ticker,
        preco,
        precoAbertura,
        precoEntradaViavel,
        localizacaoEntrada,
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
        dias_consecutivos: dias_consecutivos,
        avisos:    resultado.avisos,
        alvos:     resultado.alvos,
        detalhes:  resultado.detalhes,
        fundamentais: fundamentais,
        // Microestrutura de Mercado
        tt_analysis:  ttAnalysis,
        dom_analysis: domAnalysis,
        // Notícias e IA
        noticias,
        vereditoIA
    };

    // ── VALIDAÇÃO DE SINAL: só exibe compra se o preço estiver PERTO do suporte médio (zona narrow) ──
    console.log(`🔍 [VALIDAÇÃO] Ativo ${ticker}: Sinal inicial = ${resObj.sinal}`);
    if (resObj.sinal === "COMPRA") {
        const hasSR = resObj.detalhes?.sr_analysis;
        const currentPrice = resObj.preco;
        const atr = resObj.atr ?? (currentPrice * 0.02); // fallback de 2% se ATR não existir
        
        let isInNarrowSupportZone = false;
        if (hasSR?.support?.mean != null) {
            const supportMean = hasSR.support.mean;
            // Zona de suporte: ±0.5 * ATR (ou 1% do preço) em torno do suporte médio
            const supportTolerance = atr * 0.5; // Zona narrow em torno do suporte médio
            const supportMin = supportMean - supportTolerance;
            const supportMax = supportMean + supportTolerance;
            
            isInNarrowSupportZone = (
                currentPrice >= supportMin && 
                currentPrice <= supportMax
            );
            
            console.log(`🔍 [VALIDAÇÃO] Ativo ${ticker}: Preço=${currentPrice.toFixed(2)}, Suporte Médio=${supportMean.toFixed(2)}, Zona Narrow=[${supportMin.toFixed(2)}, ${supportMax.toFixed(2)}], Dentro=${isInNarrowSupportZone}`);
        }
        
        if (!isInNarrowSupportZone) {
            console.log(`⚠️ Ativo ${ticker}: Sinal de COMPRA descartado (preço FORA da zona de suporte narrow)`);
            resObj.sinal = "NEUTRO";
        } else {
            console.log(`✅ Ativo ${ticker}: Sinal de COMPRA mantido (preço DENTRO da zona de suporte narrow)`);
        }
    }

    return resObj;
}

function analisarEntradaBackend(d) {
    let pontosPositivos = 0;
    let pontosNegativos = 0;
    let bloqueadores = [];

    // 0. Sinal de Longo Prazo (SMA 50/200) - ALTO PESO
    if (d.sinal_longo_prazo === "COMPRA") {
        pontosPositivos += 4;
    } else if (d.sma50 > d.sma200) {
        pontosPositivos += 1;
    }

    // 1. Sinal base
    if (d.sinal === "COMPRA") {
        pontosPositivos += 2;
    } else if (d.sinal === "VENDA") {
        pontosNegativos += 2;
    }

    // 2. Confiança
    if (d.confianca >= 60) {
        pontosPositivos += 2;
    } else if (d.confianca >= 35) {
        pontosPositivos += 1;
    } else {
        pontosNegativos += 1;
    }

    // 3. ADX - força da tendência
    const adxVal = d.adx ?? 0;
    if (adxVal >= 25) {
        pontosPositivos += 2;
    } else if (adxVal < 20) {
        bloqueadores.push("⚠️ ADX muito baixo - mercado lateral forte");
        pontosNegativos += 3;
    } else {
        pontosNegativos += 1;
    }

    // 4. Tendência SMA
    if (d.sma9 > d.sma21) {
        pontosPositivos += 1;
    } else {
        pontosNegativos += 1;
    }

    // 5. RSI
    const rsiVal = d.rsi ?? 50;
    if (rsiVal < 40) {
        pontosPositivos += 2;
    } else if (rsiVal > 60) {
        pontosNegativos += 1;
    } else {
        pontosPositivos += 1;
    }

    // 6. MACD
    if (d.detalhes?.macd_status === "BULLISH") {
        pontosPositivos += 1;
    } else if (d.detalhes?.macd_status === "BEARISH") {
        pontosNegativos += 1;
    }

    // 7. OBV
    if (d.obv_trend === "SUBINDO") {
        pontosPositivos += 1;
    } else if (d.obv_trend === "CAINDO") {
        pontosNegativos += 1;
    }

    // 8. Divergências
    if (d.detalhes?.rsi_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 2;
    } else if (d.detalhes?.rsi_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 2;
    } else if (d.detalhes?.rsi_divergence && d.sinal !== "NEUTRO") {
        bloqueadores.push("⚠️ Divergência RSI contradiz sinal");
        pontosNegativos += 2;
    }

    if (d.detalhes?.macd_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 1;
    } else if (d.detalhes?.macd_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 1;
    }

    // 9. Pullback
    if (d.detalhes?.pullback?.isPullback) {
        const pb = d.detalhes.pullback;
        if ((pb.direction === "BUY" && d.sinal === "COMPRA") || 
            (pb.direction === "SELL" && d.sinal === "VENDA")) {
            pontosPositivos += 2;
        }
    }

    // 10. Volume Accumulation
    if (d.detalhes?.volume_accumulation) {
        const vol = d.detalhes.volume_accumulation;
        if (vol.trend === "ACUMULAÇÃO" && d.sinal === "COMPRA") {
            pontosPositivos += 2;
        } else if (vol.trend === "DISTRIBUIÇÃO" && d.sinal === "VENDA") {
            pontosPositivos += 2;
        } else if (vol.trend === "ACUMULAÇÃO" && d.sinal === "VENDA") {
            bloqueadores.push("⚠️ Acumulação contradiz venda");
            pontosNegativos += 2;
        } else if (vol.trend === "DISTRIBUIÇÃO" && d.sinal === "COMPRA") {
            bloqueadores.push("⚠️ Distribuição contradiz compra");
            pontosNegativos += 2;
        }
    }

    // 11. Volatilidade
    if (d.detalhes?.volatilidade === "ALTA") {
        pontosNegativos += 1;
    } else if (d.detalhes?.volatilidade === "BAIXA") {
        pontosPositivos += 1;
    }

    // 12. Bollinger Bands - falso rompimento
    if (d.detalhes?.falso_rompimento) {
        bloqueadores.push("⚠️ Possível falso rompimento detectado");
        pontosNegativos += 3;
    }

    // 13. Variação Intraday
    if (d.detalhes?.var_intraday) {
        const varIntra = parseFloat(d.detalhes.var_intraday);
        if (d.sinal === "COMPRA" && varIntra > 3.0) {
            bloqueadores.push(`⚠️ Preço já subiu muito (${varIntra.toFixed(1)}%) hoje — risco de exaustão`);
            pontosNegativos += 2;
        } else if (d.sinal === "COMPRA" && varIntra > 0.5) {
            pontosPositivos += 1;
        }
    }

    // 14. Momentum dos últimos candles
    if (d.detalhes?.momentum_candles) {
        const { vermelhos, verdes } = d.detalhes.momentum_candles;
        if (d.sinal === "COMPRA" && vermelhos >= 3) {
            pontosNegativos += 2;
        } else if (d.sinal === "COMPRA" && verdes >= 2) {
            pontosPositivos += 2;
        }
    }

    // 15. Tendência de curto prazo
    if (d.detalhes?.variacao_5dias) {
        const var5dias = parseFloat(d.detalhes.variacao_5dias);
        if (d.sinal === "COMPRA" && var5dias < -5) {
            bloqueadores.push(`⚠️ Tendência de curto prazo de baixa (${var5dias.toFixed(1)}% em 5d)`);
            pontosNegativos += 2;
        } else if (var5dias > 2) {
            pontosPositivos += 1;
        }
    }

    // 16. Candlestick Patterns
    if (d.detalhes?.candlestick_patterns && d.detalhes.candlestick_patterns.length > 0) {
        d.detalhes.candlestick_patterns.forEach(p => {
            const isBullishPattern = p.pattern.type === 'bullish';
            const isBearishPattern = p.pattern.type === 'bearish';
            const highConfidence = p.confidence >= 70;

            if (d.sinal === "COMPRA" && isBullishPattern) {
                const bonus = highConfidence ? 3 : 1;
                pontosPositivos += bonus;
            } else if (d.sinal === "VENDA" && isBearishPattern) {
                const bonus = highConfidence ? 3 : 1;
                pontosPositivos += bonus; 
            } else if (d.sinal === "COMPRA" && isBearishPattern && highConfidence) {
                bloqueadores.push(`⚠️ ${p.pattern.namePortuguese || p.pattern.name} contradiz compra`);
                pontosNegativos += 3;
            } else if (d.sinal === "VENDA" && isBullishPattern && highConfidence) {
                bloqueadores.push(`⚠️ ${p.pattern.namePortuguese || p.pattern.name} contradiz venda`);
                pontosNegativos += 3;
            }
        });
    }

    // 16b. Análise de Zonas de Suporte, Resistência e Rompimento (S/R)
    if (d.detalhes?.sr_analysis) {
        const sr = d.detalhes.sr_analysis;
        const volRatio = sr.volume_ratio || 1.0;

        if (d.sinal === "COMPRA") {
            if (sr.entry_zone_status === "SUPORTE_RESPEITADO") {
                const bonus = volRatio > 1.3 ? 4 : 3;
                pontosPositivos += bonus;
            } else if (sr.entry_zone_status === "SUPORTE_PERIGO") {
                bloqueadores.push(`🚫 Suporte sob alta pressão. Alto risco de rompimento de baixa (Prob: ${sr.breakout_probability}%)`);
                pontosNegativos += 4;
            } else if (sr.entry_zone_status === "ROMPIMENTO_ALTA_CONFIRMADO") {
                pontosPositivos += 4;
            } else if (sr.entry_zone_status === "RESISTENCIA_RESPEITADA") {
                bloqueadores.push(`🚫 Preço em zona de resistência forte. Alto risco de rejeição!`);
                pontosNegativos += 3;
            }
        } else if (d.sinal === "VENDA") {
            if (sr.entry_zone_status === "RESISTENCIA_RESPEITADA") {
                pontosPositivos += 3;
            } else if (sr.entry_zone_status === "ROMPIMENTO_BAIXA_CONFIRMADO") {
                pontosPositivos += 4;
            } else if (sr.entry_zone_status === "SUPORTE_RESPEITADO") {
                bloqueadores.push(`🚫 Preço em zona de suporte forte. Alto risco de ricochete!`);
                pontosNegativos += 3;
            }
        }
    }

    // 16c. ORDER FLOW MICROSTRUCTURE
    const tt = d.detalhes?.tt_analysis ?? d.tt_analysis;
    const dom = d.detalhes?.dom_analysis ?? d.dom_analysis;

    if (tt && !tt.error) {
        if (d.sinal === "COMPRA" && tt.delta?.pressure === "COMPRADOR_FORTE") {
            pontosPositivos += 2;
        } else if (d.sinal === "COMPRA" && tt.delta?.pressure === "COMPRADOR") {
            pontosPositivos += 1;
        } else if (d.sinal === "COMPRA" && tt.delta?.pressure?.includes("VENDEDOR")) {
            pontosNegativos += 2;
        }

        if (d.sinal === "COMPRA" && tt.clusters?.institutionalActivity === "COMPRA_INSTITUCIONAL") {
            pontosPositivos += 3;
        }
    }

    if (dom && !dom.error) {
        if (d.sinal === "COMPRA" && dom.absorption?.absorptionType === "ABSORÇÃO_COMPRA") {
            pontosPositivos += 4;
        } else if (d.sinal === "COMPRA" && dom.absorption?.absorptionType === "ABSORÇÃO_VENDA") {
            bloqueadores.push("🚫 Absorção institucional de VENDA na resistência");
            pontosNegativos += 3;
        }

        if (d.sinal === "COMPRA" && dom.iceberg?.hasIceberg && dom.iceberg.latestIceberg?.type === "ICEBERG_COMPRA") {
            pontosPositivos += 3;
        }
        
        if (d.sinal === "COMPRA" && dom.orderBook?.imbalance > 25) {
            pontosPositivos += 1;
        }
    }

    // 17. Veredito da Inteligência Artificial (Gemini) - JUIZ FINAL
    if (d.vereditoIA && !d.vereditoIA.erro) {
        const recIA = d.vereditoIA.recomendacao?.toUpperCase() || "NEUTRO";

        if (recIA === "COMPRA" && d.sinal === "COMPRA") {
            pontosPositivos += 5;
        } else if (recIA === "VENDA" && d.sinal === "VENDA") {
            pontosPositivos += 5;
        } else if (recIA === "COMPRA" && d.sinal === "VENDA") {
            bloqueadores.push(`⚠️ IA (Gemini) sugere COMPRA, divergindo do algoritmo`);
            pontosNegativos += 5;
        } else if (recIA === "VENDA" && d.sinal === "COMPRA") {
            bloqueadores.push(`⚠️ IA (Gemini) sugere VENDA, divergindo do algoritmo`);
            pontosNegativos += 5;
        } else if (recIA === "AGUARDAR" || recIA === "MONITORAR") {
            bloqueadores.push(`⚠️ IA (Gemini) sugere AGUARDAR - Risco detectado`);
            pontosNegativos += 3;
        }
    }

    const score = pontosPositivos - pontosNegativos;
    let recomendacao = "NEUTRO";

    if (bloqueadores.length >= 2) {
        recomendacao = "EVITAR";
    } else if (score <= 0) {
        recomendacao = "MONITORAR";
    } else if (score >= 8 && d.confianca >= 65 && d.sinal !== "NEUTRO") {
        recomendacao = "ENTRAR";
    } else if (score >= 5 && d.confianca >= 55 && d.sinal !== "NEUTRO") {
        recomendacao = "ENTRAR COM CAUTELA";
    }

    if (d.vereditoIA && !d.vereditoIA.erro) {
        const recIA = d.vereditoIA.recomendacao?.toUpperCase() || "NEUTRO";
        
        if (recIA === "AGUARDAR" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "VETADO PELA IA";
        } else if (recIA === "VENDA" && d.sinal === "COMPRA" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "CANCELADO: DIVERGÊNCIA";
        } else if (recIA === "COMPRA" && d.sinal === "VENDA" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "CANCELADO: DIVERGÊNCIA";
        } else if ((recIA === d.sinal) && recomendacao.includes("ENTRAR")) {
            recomendacao = "ENTRADA CONFIRMADA PELA IA";
        }
    }

    return { recomendacao, score };
}

module.exports = { analisarAtivo };