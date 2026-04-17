/**
 * Funções auxiliares para melhorar assertividade das entradas
 * - Detecção de divergências RSI/MACD
 * - Análise multi-timeframe
 * - Confirmação de pullback
 * - Análise avançada de volume
 * - Stop loss e take profit dinâmicos
 */

/**
 * Detecta divergências entre preço e RSI
 * @param {number[]} prices - Array de preços de fechamento
 * @param {number[]} rsiValues - Array de valores RSI
 * @param {number} lookback - Período para analisar (padrão: 20)
 * @returns {Object} { type: 'bullish' | 'bearish' | null, strength: 0-100 }
 */
function detectRSIDivergence(prices, rsiValues, lookback = 20) {
    if (!prices || !rsiValues || prices.length < lookback || rsiValues.length < lookback) {
        return { type: null, strength: 0 };
    }

    const recentPrices = prices.slice(-lookback);
    const recentRSI = rsiValues.slice(-lookback);

    // Encontrar pontos de pivô (mínimos e máximos locais)
    const priceLows = findLocalLows(recentPrices, 3);
    const priceHighs = findLocalHighs(recentPrices, 3);
    const rsiLows = findLocalLows(recentRSI, 3);
    const rsiHighs = findLocalHighs(recentRSI, 3);

    // Divergência bullish: preço faz mínimo mais baixo, RSI faz mínimo mais alto
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
        const lastPriceLow = priceLows[priceLows.length - 1];
        const prevPriceLow = priceLows[priceLows.length - 2];
        const lastRSILow = rsiLows[rsiLows.length - 1];
        const prevRSILow = rsiLows[rsiLows.length - 2];

        if (lastPriceLow.value < prevPriceLow.value && 
            lastRSILow.value > prevRSILow.value &&
            Math.abs(lastPriceLow.index - lastRSILow.index) <= 3) {
            
            const strength = calculateDivergenceStrength(
                prevPriceLow.value, lastPriceLow.value,
                prevRSILow.value, lastRSILow.value
            );
            
            return { type: 'bullish', strength };
        }
    }

    // Divergência bearish: preço faz máximo mais alto, RSI faz máximo mais baixo
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
        const lastPriceHigh = priceHighs[priceHighs.length - 1];
        const prevPriceHigh = priceHighs[priceHighs.length - 2];
        const lastRSIHigh = rsiHighs[rsiHighs.length - 1];
        const prevRSIHigh = rsiHighs[rsiHighs.length - 2];

        if (lastPriceHigh.value > prevPriceHigh.value && 
            lastRSIHigh.value < prevRSIHigh.value &&
            Math.abs(lastPriceHigh.index - lastRSIHigh.index) <= 3) {
            
            const strength = calculateDivergenceStrength(
                prevPriceHigh.value, lastPriceHigh.value,
                prevRSIHigh.value, lastRSIHigh.value,
                true
            );
            
            return { type: 'bearish', strength };
        }
    }

    return { type: null, strength: 0 };
}

/**
 * Detecta divergências entre preço e MACD
 */
function detectMACDDivergence(prices, macdValues, lookback = 20) {
    if (!prices || !macdValues || prices.length < lookback || macdValues.length < lookback) {
        return { type: null, strength: 0 };
    }

    const recentPrices = prices.slice(-lookback);
    const recentMACD = macdValues.map(m => m?.MACD ?? 0).slice(-lookback);

    const priceLows = findLocalLows(recentPrices, 3);
    const priceHighs = findLocalHighs(recentPrices, 3);
    const macdLows = findLocalLows(recentMACD, 3);
    const macdHighs = findLocalHighs(recentMACD, 3);

    // Divergência bullish
    if (priceLows.length >= 2 && macdLows.length >= 2) {
        const lastPriceLow = priceLows[priceLows.length - 1];
        const prevPriceLow = priceLows[priceLows.length - 2];
        const lastMACDLow = macdLows[macdLows.length - 1];
        const prevMACDLow = macdLows[macdLows.length - 2];

        if (lastPriceLow.value < prevPriceLow.value && 
            lastMACDLow.value > prevMACDLow.value &&
            Math.abs(lastPriceLow.index - lastMACDLow.index) <= 3) {
            
            const strength = calculateDivergenceStrength(
                prevPriceLow.value, lastPriceLow.value,
                prevMACDLow.value, lastMACDLow.value
            );
            
            return { type: 'bullish', strength };
        }
    }

    // Divergência bearish
    if (priceHighs.length >= 2 && macdHighs.length >= 2) {
        const lastPriceHigh = priceHighs[priceHighs.length - 1];
        const prevPriceHigh = priceHighs[priceHighs.length - 2];
        const lastMACDHigh = macdHighs[macdHighs.length - 1];
        const prevMACDHigh = macdHighs[macdHighs.length - 2];

        if (lastPriceHigh.value > prevPriceHigh.value && 
            lastMACDHigh.value < prevMACDHigh.value &&
            Math.abs(lastPriceHigh.index - lastMACDHigh.index) <= 3) {
            
            const strength = calculateDivergenceStrength(
                prevPriceHigh.value, lastPriceHigh.value,
                prevMACDHigh.value, lastMACDHigh.value,
                true
            );
            
            return { type: 'bearish', strength };
        }
    }

    return { type: null, strength: 0 };
}

/**
 * Análise multi-timeframe para confirmação de sinal
 * @param {Object} yahooFinance - Instância do yahoo-finance2
 * @param {string} ticker - Símbolo do ativo
 * @param {Object} currentSignal - Sinal atual do timeframe principal
 * @returns {Object} { confirmed: boolean, confidence: number, timeframes: {...} }
 */
async function analyzeMultiTimeframe(yahooFinance, ticker, currentSignal) {
    const timeframes = [
        { interval: '1h', period1: '2025-01-01', weight: 0.2 },
        { interval: '4h', period1: '2025-01-01', weight: 0.3 },
        { interval: '1d', period1: '2024-01-01', weight: 0.5 }
    ];

    const results = {};
    let totalConfidence = 0;
    let totalWeight = 0;

    for (const tf of timeframes) {
        try {
            const chart = await yahooFinance.chart(ticker, {
                period1: tf.period1,
                interval: tf.interval,
            });

            const dados = chart.quotes.filter(d => d.close != null);
            if (dados.length < 30) continue;

            const closes = dados.map(d => d.close);
            const highs = dados.map(d => d.high ?? d.close);
            const lows = dados.map(d => d.low ?? d.close);
            const volumes = dados.map(d => d.volume ?? 0);

            const { calcularIndicadores } = require('./indicators');
            const ind = calcularIndicadores(closes, highs, lows, volumes);

            const rsi = ind.rsi.at(-1);
            const sma9 = ind.sma9.at(-1);
            const sma21 = ind.sma21.at(-1);
            const macd = ind.macd.at(-1);
            const preco = closes.at(-1);

            // Análise simplificada para cada timeframe
            let tfSignal = 'NEUTRO';
            let tfScore = 0;

            if (sma9 > sma21) tfScore += 1;
            else tfScore -= 1;

            if (rsi < 40) tfScore += 1;
            else if (rsi > 60) tfScore -= 1;

            if (macd?.MACD > macd?.signal) tfScore += 1;
            else tfScore -= 1;

            if (tfScore >= 2) tfSignal = 'COMPRA';
            else if (tfScore <= -2) tfSignal = 'VENDA';

            results[tf.interval] = {
                signal: tfSignal,
                score: tfScore,
                rsi,
                sma9,
                sma21,
                preco
            };

            // Calcular confiança baseada no alinhamento de timeframes
            if (tfSignal === currentSignal) {
                totalConfidence += tf.weight * 100;
            } else if (tfSignal !== 'NEUTRO') {
                totalConfidence -= tf.weight * 50;
            }

            totalWeight += tf.weight;
        } catch (error) {
            console.warn(`Erro ao analisar timeframe ${tf.interval}:`, error.message);
        }
    }

    const alignment = totalWeight > 0 ? (totalConfidence / totalWeight) : 0;
    const confirmed = alignment > 30; // Pelo menos 2 timeframes alinhados

    return {
        confirmed,
        confidence: Math.max(0, Math.min(100, Math.round(alignment))),
        timeframes: results
    };
}

/**
 * Detecta oportunidade de pullback após tendência
 * Ideal para entrar em tendência estabelecida com melhor preço
 */
function detectPullbackOpportunity(prices, sma9, sma21, rsi, atr, lookback = 10) {
    if (!prices || prices.length < lookback) {
        return { isPullback: false, quality: 0 };
    }

    const recentPrices = prices.slice(-lookback);
    const currentPrice = recentPrices.at(-1);
    const minPrice = Math.min(...recentPrices);
    const maxPrice = Math.max(...recentPrices);

    // Tendência de alta (SMA9 > SMA21)
    const isUptrend = sma9 > sma21;
    
    // Tendência de baixa (SMA9 < SMA21)
    const isDowntrend = sma9 < sma21;

    // Pullback em tendência de alta: preço caiu para perto da SMA21
    if (isUptrend) {
        const pullbackDepth = (maxPrice - currentPrice) / maxPrice;
        const nearSMA21 = Math.abs(currentPrice - sma21) / sma21 < 0.02; // Dentro de 2%
        const rsiOversold = rsi < 45;

        if (pullbackDepth > 0.03 && (nearSMA21 || rsiOversold)) {
            const quality = Math.min(100, (pullbackDepth * 1000) + (rsiOversold ? 30 : 0));
            return {
                isPullback: true,
                direction: 'BUY',
                quality: Math.round(quality),
                reason: nearSMA21 ? 'Preço próximo à SMA21 em tendência de alta' : 'RSI sobrevendido em tendência de alta'
            };
        }
    }

    // Pullback em tendência de baixa: preço subiu para perto da SMA21
    if (isDowntrend) {
        const pullbackDepth = (currentPrice - minPrice) / minPrice;
        const nearSMA21 = Math.abs(currentPrice - sma21) / sma21 < 0.02;
        const rsiOverbought = rsi > 55;

        if (pullbackDepth > 0.03 && (nearSMA21 || rsiOverbought)) {
            const quality = Math.min(100, (pullbackDepth * 1000) + (rsiOverbought ? 30 : 0));
            return {
                isPullback: true,
                direction: 'SELL',
                quality: Math.round(quality),
                reason: nearSMA21 ? 'Preço próximo à SMA21 em tendência de baixa' : 'RSI sobrecomprado em tendência de baixa'
            };
        }
    }

    return { isPullback: false, quality: 0 };
}

/**
 * Análise avançada de volume - detecção de acumulação/distribuição
 */
function analyzeVolumeAccumulation(volumes, closes, lookback = 20) {
    if (!volumes || !closes || volumes.length < lookback || closes.length < lookback) {
        return { trend: 'NEUTRO', strength: 0 };
    }

    const recentVolumes = volumes.slice(-lookback);
    const recentCloses = closes.slice(-lookback);

    const volMedia = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const volDesvio = Math.sqrt(
        recentVolumes.reduce((sum, v) => sum + Math.pow(v - volMedia, 2), 0) / recentVolumes.length
    );

    // Analisar dias com volume acima da média
    let accumulationScore = 0;
    let distributionScore = 0;

    for (let i = 1; i < recentCloses.length; i++) {
        const priceChange = recentCloses[i] - recentCloses[i - 1];
        const volume = recentVolumes[i];

        // Volume alto com alta de preço = acumulação
        if (volume > volMedia + volDesvio && priceChange > 0) {
            accumulationScore += volume / volMedia;
        }
        
        // Volume alto com baixa de preço = distribuição
        if (volume > volMedia + volDesvio && priceChange < 0) {
            distributionScore += volume / volMedia;
        }
    }

    const netAccumulation = accumulationScore - distributionScore;
    const maxScore = Math.max(accumulationScore, distributionScore, 1);
    const strength = Math.min(100, Math.abs(netAccumulation) / maxScore * 100);

    let trend = 'NEUTRO';
    if (netAccumulation > 2) trend = 'ACUMULAÇÃO';
    else if (netAccumulation < -2) trend = 'DISTRIBUIÇÃO';

    return {
        trend,
        strength: Math.round(strength),
        accumulationScore: Math.round(accumulationScore),
        distributionScore: Math.round(distributionScore)
    };
}

/**
 * Calcula stop loss e take profit dinâmicos baseados em ATR
 * @param {number} entryPrice - Preço de entrada
 * @param {number} atr - Valor do ATR
 * @param {string} direction - 'BUY' ou 'SELL'
 * @param {number} riskReward - Ratio risco/retorno (padrão: 2)
 * @returns {Object} { stopLoss, takeProfit, atrMultiple }
 */
function calculateDynamicStops(entryPrice, atr, direction = 'BUY', riskReward = 2) {
    if (!entryPrice || !atr) {
        return { stopLoss: null, takeProfit: null };
    }

    // Múltiplos do ATR baseados em volatilidade
    const atrPct = (atr / entryPrice) * 100;
    let stopMultiplier = 2; // Padrão: 2x ATR
    
    // Ajustar baseado na volatilidade
    if (atrPct > 3) stopMultiplier = 2.5; // Alta volatilidade = stop mais largo
    else if (atrPct > 1.5) stopMultiplier = 2;
    else stopMultiplier = 1.5; // Baixa volatilidade = stop mais apertado

    const stopDistance = atr * stopMultiplier;
    const takeProfitDistance = stopDistance * riskReward;

    let stopLoss, takeProfit;

    if (direction === 'BUY') {
        stopLoss = entryPrice - stopDistance;
        takeProfit = entryPrice + takeProfitDistance;
    } else {
        stopLoss = entryPrice + stopDistance;
        takeProfit = entryPrice - takeProfitDistance;
    }

    return {
        stopLoss: Math.round(stopLoss * 100) / 100,
        takeProfit: Math.round(takeProfit * 100) / 100,
        stopDistance: Math.round(stopDistance * 100) / 100,
        riskReward,
        atrMultiplier: stopMultiplier
    };
}

// ── Funções auxiliares internas ──────────────────────────────────────────────

function findLocalLows(data, radius) {
    const pivots = [];
    for (let i = radius; i < data.length - radius; i++) {
        let isLow = true;
        for (let j = 1; j <= radius; j++) {
            if (data[i] >= data[i - j] || data[i] >= data[i + j]) {
                isLow = false;
                break;
            }
        }
        if (isLow) {
            pivots.push({ index: i, value: data[i] });
        }
    }
    return pivots;
}

function findLocalHighs(data, radius) {
    const pivots = [];
    for (let i = radius; i < data.length - radius; i++) {
        let isHigh = true;
        for (let j = 1; j <= radius; j++) {
            if (data[i] <= data[i - j] || data[i] <= data[i + j]) {
                isHigh = false;
                break;
            }
        }
        if (isHigh) {
            pivots.push({ index: i, value: data[i] });
        }
    }
    return pivots;
}

function calculateDivergenceStrength(prevVal, currVal, prevInd, currInd, isInverted = false) {
    const priceChange = Math.abs((currVal - prevVal) / prevVal) * 100;
    const indChange = Math.abs((currInd - prevInd) / prevInd) * 100;
    
    // Força baseada na magnitude das mudanças
    const strength = Math.min(100, (priceChange + indChange) * 5);
    return Math.round(strength);
}

module.exports = {
    detectRSIDivergence,
    detectMACDDivergence,
    analyzeMultiTimeframe,
    detectPullbackOpportunity,
    analyzeVolumeAccumulation,
    calculateDynamicStops
};
