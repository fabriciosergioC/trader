/**
 * ══════════════════════════════════════════════════════════════════════════════
 * TIMES & TRADES ANALYSIS ENGINE
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * Análise de microestrutura de mercado baseada em dados OHLCV.
 * Reconstrói o fluxo de negócios (tape reading) usando os dados disponíveis:
 *  - VWAP (Volume Weighted Average Price) e bandas
 *  - Delta acumulado (estimativa de pressão compradora vs vendedora)
 *  - Detecção de agressão direcional
 *  - Clustering de grandes negócios (mão forte / institucional)
 *  - Análise de ticks (velocidade e direção)
 * 
 * NOTA: Para dados reais de T&T, integrar com API premium (TradeMap, InfoMoney Pro).
 * Esta engine está preparada para receber dados reais via adaptador.
 */

/**
 * Calcula o VWAP (Volume Weighted Average Price) e suas bandas (desvio padrão).
 * O VWAP é o preço médio ponderado pelo volume — referência institucional do dia.
 * 
 * @param {number[]} highs  - Preços máximos
 * @param {number[]} lows   - Preços mínimos
 * @param {number[]} closes - Preços de fechamento
 * @param {number[]} volumes - Volumes de negociação
 * @param {number}   lookback - Quantos períodos usar (padrão: 20 = ~1 mês de pregão)
 * @returns {{ vwap: number, upperBand1: number, lowerBand1: number, upperBand2: number, lowerBand2: number }}
 */
function calculateVWAP(highs, lows, closes, volumes, lookback = 20) {
    const n = Math.min(lookback, closes.length);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const c = closes.slice(-n);
    const v = volumes.slice(-n);

    let totalVolumePrice = 0;
    let totalVolume = 0;

    for (let i = 0; i < n; i++) {
        const typicalPrice = (h[i] + l[i] + c[i]) / 3;
        totalVolumePrice += typicalPrice * v[i];
        totalVolume += v[i];
    }

    const vwap = totalVolume > 0 ? totalVolumePrice / totalVolume : closes.at(-1);

    // Calcular desvio padrão do VWAP para as bandas
    let sumSquaredDeviation = 0;
    for (let i = 0; i < n; i++) {
        const typicalPrice = (h[i] + l[i] + c[i]) / 3;
        sumSquaredDeviation += v[i] * Math.pow(typicalPrice - vwap, 2);
    }

    const stdDev = totalVolume > 0 ? Math.sqrt(sumSquaredDeviation / totalVolume) : vwap * 0.01;

    return {
        vwap: Number(vwap.toFixed(2)),
        upperBand1: Number((vwap + stdDev).toFixed(2)),      // 1 desvio padrão acima
        lowerBand1: Number((vwap - stdDev).toFixed(2)),      // 1 desvio padrão abaixo
        upperBand2: Number((vwap + stdDev * 2).toFixed(2)),  // 2 desvios padrão acima
        lowerBand2: Number((vwap - stdDev * 2).toFixed(2)),  // 2 desvios padrão abaixo
        stdDev: Number(stdDev.toFixed(4)),
        totalVolume
    };
}

/**
 * Estima o Delta acumulado — diferença entre volume de compra e venda.
 * 
 * Metodologia (CVD - Cumulative Volume Delta):
 * - Candle de alta (close > open): 60% do volume é "comprador agressivo"
 * - Candle de baixa (close < open): 60% do volume é "vendedor agressivo"
 * - Para candles com alta volatilidade (high-low grande), o desvio aumenta
 * 
 * @param {number[]} opens   - Preços de abertura
 * @param {number[]} closes  - Preços de fechamento
 * @param {number[]} highs   - Preços máximos
 * @param {number[]} lows    - Preços mínimos
 * @param {number[]} volumes - Volumes
 * @param {number}   lookback - Períodos para analisar
 * @returns {{ delta: number, cumulativeDelta: number[], deltaPct: number, pressure: string }}
 */
function calculateDelta(opens, closes, highs, lows, volumes, lookback = 20) {
    const n = Math.min(lookback, closes.length);
    const o = opens.slice(-n);
    const c = closes.slice(-n);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const v = volumes.slice(-n);

    const cumulativeDelta = [];
    let cumulativeSum = 0;

    for (let i = 0; i < n; i++) {
        const candleRange = h[i] - l[i];
        const candleBody = Math.abs(c[i] - o[i]);

        // Calcular proporção de volume comprador/vendedor baseada na posição do fechamento
        let buyVolumePct;
        if (candleRange > 0) {
            // Método: posição do fechamento no range do candle
            buyVolumePct = (c[i] - l[i]) / candleRange;
        } else {
            buyVolumePct = 0.5; // Doji
        }

        // Ajustar pela força do corpo (candles com corpo grande têm pressão mais definida)
        const bodyStrength = candleRange > 0 ? candleBody / candleRange : 0;
        buyVolumePct = buyVolumePct * 0.6 + (c[i] > o[i] ? 0.6 : 0.4) * 0.4;

        const buyVolume = v[i] * buyVolumePct;
        const sellVolume = v[i] * (1 - buyVolumePct);
        const candelDelta = buyVolume - sellVolume;

        cumulativeSum += candelDelta;
        cumulativeDelta.push(Math.round(cumulativeSum));
    }

    const lastDelta = cumulativeDelta.at(-1) ?? 0;
    const totalVolume = v.reduce((a, b) => a + b, 0);
    const deltaPct = totalVolume > 0 ? (lastDelta / totalVolume) * 100 : 0;

    let pressure = 'NEUTRO';
    if (deltaPct > 15) pressure = 'COMPRADOR_FORTE';
    else if (deltaPct > 5) pressure = 'COMPRADOR';
    else if (deltaPct < -15) pressure = 'VENDEDOR_FORTE';
    else if (deltaPct < -5) pressure = 'VENDEDOR';

    return {
        delta: Math.round(lastDelta),
        cumulativeDelta,
        deltaPct: Number(deltaPct.toFixed(2)),
        pressure
    };
}

/**
 * Detecta "clusters" de grandes negócios — possível atividade institucional.
 * Um cluster é caracterizado por volume muito acima da média em um único candle.
 * 
 * @param {number[]} volumes  - Volumes de cada candle
 * @param {number[]} closes   - Preços de fechamento
 * @param {number[]} opens    - Preços de abertura
 * @param {number}   lookback - Períodos para analisar
 * @returns {{ clusters: Array, institutionalActivity: string, biggestTrade: Object }}
 */
function detectTradeClusters(volumes, closes, opens, lookback = 30) {
    const n = Math.min(lookback, volumes.length);
    const v = volumes.slice(-n);
    const c = closes.slice(-n);
    const o = opens.slice(-n);

    // Calcular média e desvio padrão do volume
    const avgVolume = v.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(v.reduce((sum, vol) => sum + Math.pow(vol - avgVolume, 2), 0) / n);

    const clusters = [];
    let buyingClusters = 0;
    let sellingClusters = 0;

    for (let i = 0; i < n; i++) {
        // Volume acima de 2 desvios padrão é considerado "cluster grande"
        if (v[i] > avgVolume + (stdDev * 2)) {
            const isBuyingCluster = c[i] > o[i];
            const sizeRatio = avgVolume > 0 ? v[i] / avgVolume : 1;

            clusters.push({
                index: i,
                volume: v[i],
                sizeRatio: Number(sizeRatio.toFixed(1)),
                direction: isBuyingCluster ? 'BUY' : 'SELL',
                price: c[i]
            });

            if (isBuyingCluster) buyingClusters++;
            else sellingClusters++;
        }
    }

    // Verificar os últimos 5 candles para clusters recentes (mais relevantes)
    const recentClusters = clusters.filter(cl => cl.index >= n - 5);
    const recentBuying = recentClusters.filter(cl => cl.direction === 'BUY').length;
    const recentSelling = recentClusters.filter(cl => cl.direction === 'SELL').length;

    let institutionalActivity = 'NEUTRO';
    if (recentClusters.length > 0) {
        if (recentBuying > recentSelling) institutionalActivity = 'COMPRA_INSTITUCIONAL';
        else if (recentSelling > recentBuying) institutionalActivity = 'VENDA_INSTITUCIONAL';
        else institutionalActivity = 'ATIVIDADE_MISTA';
    }

    const biggestTrade = clusters.length > 0
        ? clusters.reduce((max, cl) => cl.volume > max.volume ? cl : max, clusters[0])
        : null;

    return {
        clusters: clusters.slice(-5), // Últimos 5 clusters
        totalClusters: clusters.length,
        buyingClusters,
        sellingClusters,
        recentClusters: recentClusters.length,
        institutionalActivity,
        biggestTrade,
        avgVolume: Math.round(avgVolume)
    };
}

/**
 * Analisa a velocidade e aceleração dos ticks (proxy via candles).
 * Ticks acelerando na direção do sinal = momentum crescente.
 * 
 * @param {number[]} closes  - Preços de fechamento
 * @param {number[]} volumes - Volumes
 * @param {number}   lookback
 * @returns {{ tickSpeed: string, momentum: number, acceleration: number }}
 */
function analyzeTickSpeed(closes, volumes, lookback = 10) {
    const n = Math.min(lookback, closes.length);
    const c = closes.slice(-n);
    const v = volumes.slice(-n);

    // Calcular variações percentuais de preço (proxy de velocidade dos ticks)
    const priceChanges = [];
    for (let i = 1; i < c.length; i++) {
        priceChanges.push(Math.abs((c[i] - c[i - 1]) / c[i - 1]) * 100);
    }

    if (priceChanges.length < 2) {
        return { tickSpeed: 'LENTO', momentum: 0, acceleration: 0 };
    }

    const firstHalf = priceChanges.slice(0, Math.floor(priceChanges.length / 2));
    const secondHalf = priceChanges.slice(Math.floor(priceChanges.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const acceleration = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;
    const currentMomentum = priceChanges.at(-1) ?? 0;

    let tickSpeed = 'NORMAL';
    if (acceleration > 30) tickSpeed = 'ACELERANDO';
    else if (acceleration > 10) tickSpeed = 'ACELERANDO_LEVE';
    else if (acceleration < -30) tickSpeed = 'DESACELERANDO';
    else if (acceleration < -10) tickSpeed = 'DESACELERANDO_LEVE';

    return {
        tickSpeed,
        momentum: Number(currentMomentum.toFixed(4)),
        acceleration: Number(acceleration.toFixed(2))
    };
}

/**
 * Gera uma lista simulada de Times & Trades dos últimos N períodos.
 * Estrutura compatível com tabela de T&T de plataformas profissionais.
 * 
 * @param {Object[]} candles - Array de candles com { open, high, low, close, volume, date }
 * @param {number}   count   - Quantidade de "negócios" a simular por candle
 * @returns {Array} Lista de "negócios" com { hora, preco, quantidade, agressao }
 */
function generateTimesAndTradesList(candles, count = 20) {
    const trades = [];
    const recentCandles = candles.slice(-5); // Últimos 5 candles

    for (const candle of recentCandles) {
        const { open, high, low, close, volume, date } = candle;
        const range = high - low;
        const isBullish = close > open;

        // Simular de 3 a 6 negócios por candle
        const numTrades = Math.floor(Math.random() * 4) + 3;
        const volPerTrade = Math.round(volume / numTrades);

        for (let i = 0; i < numTrades; i++) {
            // Distribuir preços dentro do range do candle
            let tradePrice;
            if (isBullish) {
                // Candle de alta: mais negócios próximos ao fechamento (compradores agressivos)
                tradePrice = low + (range * (0.4 + Math.random() * 0.6));
            } else {
                // Candle de baixa: mais negócios próximos ao fechamento (vendedores agressivos)
                tradePrice = low + (range * (Math.random() * 0.6));
            }

            tradePrice = Math.round(tradePrice * 100) / 100;
            const tradeVol = Math.round(volPerTrade * (0.5 + Math.random()));

            // Determinar agressão: quem iniciou o negócio
            const aggression = tradePrice > (open + close) / 2 ? 'COMPRADOR' : 'VENDEDOR';

            const tradeDate = date ? new Date(date) : new Date();
            tradeDate.setMinutes(tradeDate.getMinutes() - (numTrades - i) * 2);

            trades.push({
                hora: tradeDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                preco: tradePrice,
                quantidade: tradeVol,
                agressao: aggression,
                valor: Math.round(tradePrice * tradeVol)
            });
        }
    }

    // Ordenar por hora (mais recente primeiro) e limitar
    return trades.sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, count);
}

/**
 * Função principal — analisa Times & Trades de um ativo.
 * Retorna todas as métricas de microestrutura de mercado.
 * 
 * @param {Object} params
 * @param {number[]} params.opens   - Preços de abertura
 * @param {number[]} params.highs   - Preços máximos
 * @param {number[]} params.lows    - Preços mínimos
 * @param {number[]} params.closes  - Preços de fechamento
 * @param {number[]} params.volumes - Volumes
 * @param {Object[]} params.candles - Array completo de candles (para tabela T&T)
 * @returns {Object} Análise completa de T&T
 */
function analyzeTimesAndTrades({ opens, highs, lows, closes, volumes, candles = [] }) {
    if (!closes || closes.length < 5) {
        return { error: 'Dados insuficientes para análise T&T' };
    }

    const vwapData = calculateVWAP(highs, lows, closes, volumes, 20);
    const deltaData = calculateDelta(opens, closes, highs, lows, volumes, 20);
    const clusters = detectTradeClusters(volumes, closes, opens, 30);
    const tickData = analyzeTickSpeed(closes, volumes, 10);

    const currentPrice = closes.at(-1);

    // Posição do preço relativo ao VWAP
    const priceVsVWAP = ((currentPrice - vwapData.vwap) / vwapData.vwap) * 100;
    let vwapPosition = 'NO_VWAP';
    if (currentPrice > vwapData.upperBand1) vwapPosition = 'ACIMA_BANDA1';
    else if (currentPrice > vwapData.vwap) vwapPosition = 'ACIMA_VWAP';
    else if (currentPrice < vwapData.lowerBand1) vwapPosition = 'ABAIXO_BANDA1';
    else if (currentPrice < vwapData.vwap) vwapPosition = 'ABAIXO_VWAP';

    // Gerar tabela simulada de T&T
    const tradesList = candles.length > 0 ? generateTimesAndTradesList(candles, 15) : [];

    // Score de compra baseado em T&T (contribui para a decisão final)
    let ttScore = 0;
    const ttSignals = [];

    // Delta Score
    if (deltaData.pressure === 'COMPRADOR_FORTE') {
        ttScore += 2;
        ttSignals.push({ tipo: 'positivo', texto: `🟢 Delta fortemente comprador (+${deltaData.deltaPct.toFixed(1)}%)` });
    } else if (deltaData.pressure === 'COMPRADOR') {
        ttScore += 1;
        ttSignals.push({ tipo: 'positivo', texto: `🟢 Delta comprador (+${deltaData.deltaPct.toFixed(1)}%)` });
    } else if (deltaData.pressure === 'VENDEDOR_FORTE') {
        ttScore -= 2;
        ttSignals.push({ tipo: 'negativo', texto: `🔴 Delta fortemente vendedor (${deltaData.deltaPct.toFixed(1)}%)` });
    } else if (deltaData.pressure === 'VENDEDOR') {
        ttScore -= 1;
        ttSignals.push({ tipo: 'negativo', texto: `🔴 Delta vendedor (${deltaData.deltaPct.toFixed(1)}%)` });
    }

    // VWAP Score
    if (currentPrice > vwapData.vwap && currentPrice < vwapData.upperBand1) {
        ttScore += 1;
        ttSignals.push({ tipo: 'positivo', texto: `📊 Preço acima do VWAP (R$ ${vwapData.vwap}) — força compradora` });
    } else if (currentPrice < vwapData.vwap && currentPrice > vwapData.lowerBand1) {
        ttScore -= 1;
        ttSignals.push({ tipo: 'negativo', texto: `📊 Preço abaixo do VWAP (R$ ${vwapData.vwap}) — fraqueza` });
    } else if (currentPrice <= vwapData.lowerBand1 && currentPrice >= vwapData.lowerBand2) {
        ttScore += 1; // Sobrevenda extrema próxima do VWAP — possível reversão
        ttSignals.push({ tipo: 'neutro', texto: `📊 Preço 2σ abaixo do VWAP — zona de sobrevenda extrema` });
    }

    // Cluster / Institucional Score
    if (clusters.institutionalActivity === 'COMPRA_INSTITUCIONAL') {
        ttScore += 3;
        ttSignals.push({ tipo: 'positivo', texto: `🏦 Atividade institucional de COMPRA detectada (${clusters.recentClusters} clusters recentes)` });
    } else if (clusters.institutionalActivity === 'VENDA_INSTITUCIONAL') {
        ttScore -= 3;
        ttSignals.push({ tipo: 'negativo', texto: `🏦 Atividade institucional de VENDA detectada` });
    }

    // Tick Speed Score
    if (tickData.tickSpeed === 'ACELERANDO') {
        ttScore += 1;
        ttSignals.push({ tipo: 'positivo', texto: `⚡ Ticks acelerando (+${tickData.acceleration.toFixed(0)}%) — momentum crescente` });
    } else if (tickData.tickSpeed === 'DESACELERANDO') {
        ttScore -= 1;
        ttSignals.push({ tipo: 'negativo', texto: `🐌 Ticks desacelerando — momentum enfraquecendo` });
    }

    // Interpretação geral do T&T
    let ttInterpretation = 'NEUTRO';
    if (ttScore >= 4) ttInterpretation = 'MUITO_BULLISH';
    else if (ttScore >= 2) ttInterpretation = 'BULLISH';
    else if (ttScore <= -4) ttInterpretation = 'MUITO_BEARISH';
    else if (ttScore <= -2) ttInterpretation = 'BEARISH';

    return {
        vwap: vwapData,
        delta: deltaData,
        clusters,
        tickSpeed: tickData,
        vwapPosition,
        priceVsVWAP: Number(priceVsVWAP.toFixed(2)),
        currentPrice,
        ttScore,
        ttSignals,
        ttInterpretation,
        tradesList // Para exibição na tabela de T&T
    };
}

module.exports = {
    analyzeTimesAndTrades,
    calculateVWAP,
    calculateDelta,
    detectTradeClusters,
    analyzeTickSpeed
};
