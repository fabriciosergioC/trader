/**
 * ══════════════════════════════════════════════════════════════════════════════
 * SUPER DOM (DEPTH OF MARKET) ANALYSIS ENGINE
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Analisa a profundidade de mercado (livro de ordens) baseada em dados OHLCV.
 * Reconstrói o DOM usando Volume Profile — concentração de volume por nível de preço.
 * 
 * Métricas calculadas:
 *  - Book simulado: 5 níveis de bid e ask com tamanhos estimados
 *  - POC (Point of Control): nível de preço com maior volume negociado
 *  - Value Area (VA): faixa onde 70% do volume foi negociado (VA High / VA Low)
 *  - Order Flow Imbalance (OFI): desequilíbrio entre ordens de compra e venda
 *  - Absorption: detecção de absorção institucional no suporte/resistência
 *  - Iceberg Orders: estimativa de ordens ocultas grandes
 */

/**
 * Constrói um Volume Profile — distribuição de volume por faixa de preço.
 * Cada "bucket" representa uma faixa de preço e acumula o volume negociado.
 * 
 * @param {number[]} highs   - Preços máximos
 * @param {number[]} lows    - Preços mínimos
 * @param {number[]} closes  - Preços de fechamento
 * @param {number[]} opens   - Preços de abertura
 * @param {number[]} volumes - Volumes
 * @param {number}   numBuckets - Resolução do profile (padrão: 30 faixas)
 * @param {number}   lookback   - Períodos a considerar
 * @returns {{ buckets: Array, minPrice: number, maxPrice: number, bucketSize: number }}
 */
function buildVolumeProfile(highs, lows, closes, opens, volumes, numBuckets = 30, lookback = 60) {
    const n = Math.min(lookback, closes.length);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const c = closes.slice(-n);
    const o = opens.slice(-n);
    const v = volumes.slice(-n);

    const minPrice = Math.min(...l);
    const maxPrice = Math.max(...h);
    const priceRange = maxPrice - minPrice;

    if (priceRange === 0) return { buckets: [], minPrice, maxPrice, bucketSize: 0 };

    const bucketSize = priceRange / numBuckets;

    // Inicializar buckets
    const buckets = Array.from({ length: numBuckets }, (_, i) => ({
        priceMin: minPrice + (i * bucketSize),
        priceMax: minPrice + ((i + 1) * bucketSize),
        priceMid: minPrice + ((i + 0.5) * bucketSize),
        volumeTotal: 0,
        volumeBuy: 0,
        volumeSell: 0,
        trades: 0
    }));

    // Distribuir volume dos candles pelos buckets
    for (let i = 0; i < n; i++) {
        const candleRange = h[i] - l[i];
        const isBullish = c[i] > o[i];
        const vol = v[i];

        // Distribuir o volume do candle proporcionalmente pelos níveis de preço
        for (let b = 0; b < numBuckets; b++) {
            const bucketMin = buckets[b].priceMin;
            const bucketMax = buckets[b].priceMax;

            // Verificar sobreposição do candle com o bucket
            const overlapMin = Math.max(l[i], bucketMin);
            const overlapMax = Math.min(h[i], bucketMax);

            if (overlapMin < overlapMax) {
                const overlapRatio = candleRange > 0 ? (overlapMax - overlapMin) / candleRange : 1 / numBuckets;
                const bucketVolume = vol * overlapRatio;

                // Distribuir entre compra e venda baseado na direção e posição no candle
                let buyRatio;
                if (isBullish) {
                    // Candle de alta: mais volume de compra nos níveis altos
                    buyRatio = (bucketMin - l[i]) / candleRange * 0.3 + 0.5;
                } else {
                    // Candle de baixa: mais volume de venda nos níveis baixos
                    buyRatio = 1 - ((h[i] - bucketMax) / candleRange * 0.3 + 0.5);
                }

                buyRatio = Math.max(0.1, Math.min(0.9, buyRatio));

                buckets[b].volumeTotal += bucketVolume;
                buckets[b].volumeBuy += bucketVolume * buyRatio;
                buckets[b].volumeSell += bucketVolume * (1 - buyRatio);
                buckets[b].trades++;
            }
        }
    }

    // Arredondar para melhor apresentação
    return {
        buckets: buckets.map(b => ({
            ...b,
            priceMin: Number(b.priceMin.toFixed(2)),
            priceMax: Number(b.priceMax.toFixed(2)),
            priceMid: Number(b.priceMid.toFixed(2)),
            volumeTotal: Math.round(b.volumeTotal),
            volumeBuy: Math.round(b.volumeBuy),
            volumeSell: Math.round(b.volumeSell)
        })),
        minPrice: Number(minPrice.toFixed(2)),
        maxPrice: Number(maxPrice.toFixed(2)),
        bucketSize: Number(bucketSize.toFixed(4))
    };
}

/**
 * Encontra o POC (Point of Control) — nível com maior volume negociado.
 * O POC é o nível mais "justo" do mercado — preço que o mercado mais frequentou.
 */
function findPOC(volumeProfile) {
    if (!volumeProfile.buckets || volumeProfile.buckets.length === 0) return null;

    const poc = volumeProfile.buckets.reduce((max, b) =>
        b.volumeTotal > max.volumeTotal ? b : max,
        volumeProfile.buckets[0]
    );

    return {
        price: poc.priceMid,
        volume: poc.volumeTotal,
        priceRange: { min: poc.priceMin, max: poc.priceMax }
    };
}

/**
 * Calcula a Value Area — faixa onde 70% do volume total foi negociado.
 * VA High e VA Low são referências institucionais para zonas de suporte/resistência.
 */
function calculateValueArea(volumeProfile, targetPct = 0.70) {
    const { buckets } = volumeProfile;
    if (!buckets || buckets.length === 0) return null;

    const totalVolume = buckets.reduce((sum, b) => sum + b.volumeTotal, 0);
    const targetVolume = totalVolume * targetPct;

    // Encontrar POC index
    let pocIdx = 0;
    for (let i = 1; i < buckets.length; i++) {
        if (buckets[i].volumeTotal > buckets[pocIdx].volumeTotal) pocIdx = i;
    }

    // Expandir a partir do POC até atingir 70% do volume
    let vaVolume = buckets[pocIdx].volumeTotal;
    let vaLow = pocIdx;
    let vaHigh = pocIdx;

    while (vaVolume < targetVolume && (vaLow > 0 || vaHigh < buckets.length - 1)) {
        const volumeAbove = vaHigh < buckets.length - 1 ? buckets[vaHigh + 1].volumeTotal : 0;
        const volumeBelow = vaLow > 0 ? buckets[vaLow - 1].volumeTotal : 0;

        if (volumeAbove >= volumeBelow && vaHigh < buckets.length - 1) {
            vaHigh++;
            vaVolume += buckets[vaHigh].volumeTotal;
        } else if (vaLow > 0) {
            vaLow--;
            vaVolume += buckets[vaLow].volumeTotal;
        } else {
            break;
        }
    }

    const vaPct = totalVolume > 0 ? (vaVolume / totalVolume * 100) : 0;

    return {
        vaHigh: Number(buckets[vaHigh].priceMax.toFixed(2)),
        vaLow: Number(buckets[vaLow].priceMin.toFixed(2)),
        poc: Number(buckets[pocIdx].priceMid.toFixed(2)),
        vaPct: Number(vaPct.toFixed(1)),
        vaVolume: Math.round(vaVolume),
        totalVolume: Math.round(totalVolume)
    };
}

/**
 * Simula o livro de ordens (DOM) com 5 níveis de bid e ask.
 * Usa Volume Profile para estimar tamanho das ordens em cada nível.
 * 
 * @param {number}   currentPrice  - Preço atual
 * @param {number}   atr           - ATR para calcular espaçamento dos níveis
 * @param {Object}   volumeProfile - Volume profile calculado
 * @param {Object}   valueArea     - Value Area calculada
 * @returns {{ bids: Array, asks: Array, spread: number, imbalance: number }}
 */
function simulateOrderBook(currentPrice, atr, volumeProfile, valueArea) {
    const tickSize = atr ? atr * 0.05 : currentPrice * 0.002;
    const { buckets } = volumeProfile;

    // Função para estimar volume de ordens em um nível baseado no VP
    const estimateOrderVolume = (price) => {
        if (!buckets || buckets.length === 0) return 1000;

        // Encontrar bucket mais próximo
        const bucket = buckets.reduce((closest, b) => {
            const distCurrent = Math.abs(b.priceMid - price);
            const distClosest = Math.abs(closest.priceMid - price);
            return distCurrent < distClosest ? b : closest;
        }, buckets[0]);

        // Normalizar para lotes razoáveis (100-10000)
        const maxVol = Math.max(...buckets.map(b => b.volumeTotal));
        const normalizedVol = maxVol > 0 ? (bucket.volumeTotal / maxVol) * 9900 + 100 : 1000;
        return Math.round(normalizedVol / 100) * 100;
    };

    // Construir 5 níveis de bid (compra) — abaixo do preço
    const bids = Array.from({ length: 5 }, (_, i) => {
        const bidPrice = currentPrice - (tickSize * (i + 1));
        const isVALevel = valueArea && bidPrice >= valueArea.vaLow && bidPrice <= valueArea.vaHigh;
        const isPOC = valueArea && Math.abs(bidPrice - valueArea.poc) < tickSize * 2;
        const volume = estimateOrderVolume(bidPrice);

        return {
            nivel: i + 1,
            price: Number(bidPrice.toFixed(2)),
            volume: isPOC ? volume * 2 : (isVALevel ? Math.round(volume * 1.5) : volume), // POC e VA têm mais liquidez
            isVALevel,
            isPOC,
            type: 'BID'
        };
    });

    // Construir 5 níveis de ask (venda) — acima do preço
    const asks = Array.from({ length: 5 }, (_, i) => {
        const askPrice = currentPrice + (tickSize * (i + 1));
        const isVALevel = valueArea && askPrice >= valueArea.vaLow && askPrice <= valueArea.vaHigh;
        const isPOC = valueArea && Math.abs(askPrice - valueArea.poc) < tickSize * 2;
        const volume = estimateOrderVolume(askPrice);

        return {
            nivel: i + 1,
            price: Number(askPrice.toFixed(2)),
            volume: isPOC ? volume * 2 : (isVALevel ? Math.round(volume * 1.5) : volume),
            isVALevel,
            isPOC,
            type: 'ASK'
        };
    });

    // Calcular spread e imbalance
    const spread = asks[0].price - bids[0].price;
    const totalBidVolume = bids.reduce((sum, b) => sum + b.volume, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.volume, 0);
    const totalVolume = totalBidVolume + totalAskVolume;

    // Imbalance: positivo = mais bid (compradores), negativo = mais ask (vendedores)
    const imbalance = totalVolume > 0
        ? ((totalBidVolume - totalAskVolume) / totalVolume) * 100
        : 0;

    return {
        bids: bids.reverse(), // Ordenar do preço mais alto para baixo (estilo real)
        asks,
        spread: Number(spread.toFixed(2)),
        totalBidVolume: Math.round(totalBidVolume),
        totalAskVolume: Math.round(totalAskVolume),
        imbalance: Number(imbalance.toFixed(2))
    };
}

/**
 * Detecta absorção institucional — quando grande volume entra em um nível
 * mas o preço não avança significativamente (ordens sendo "absorvidas").
 * 
 * Absorção de compra no suporte: instituições acumulando → bullish
 * Absorção de venda na resistência: instituições distribuindo → bearish
 */
function detectAbsorption(closes, highs, lows, volumes, supports, resistances, atr) {
    const n = Math.min(10, closes.length);
    const c = closes.slice(-n);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const v = volumes.slice(-n);

    const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, volumes.length);
    const currentPrice = c.at(-1);

    const absorptions = [];

    for (let i = 1; i < n; i++) {
        const isHighVolume = v[i] > avgVolume * 1.8; // Volume muito acima da média
        const priceMovement = Math.abs(c[i] - c[i - 1]);
        const atrValue = atr || currentPrice * 0.015;

        // Absorção: alto volume mas pouco movimento de preço
        const isAbsorption = isHighVolume && priceMovement < atrValue * 0.3;

        if (isAbsorption) {
            const isNearSupport = supports && Math.abs(c[i] - supports) / currentPrice < 0.015;
            const isNearResistance = resistances && Math.abs(c[i] - resistances) / currentPrice < 0.015;
            const isBullishBar = c[i] >= l[i] + (h[i] - l[i]) * 0.5; // Fechou na metade superior

            if (isNearSupport && isBullishBar) {
                absorptions.push({
                    type: 'ABSORÇÃO_COMPRA',
                    price: c[i],
                    volume: v[i],
                    volumeRatio: Number((v[i] / avgVolume).toFixed(1)),
                    index: i,
                    interpretation: 'Institucional absorvendo pressão vendedora no suporte → BULLISH'
                });
            } else if (isNearResistance && !isBullishBar) {
                absorptions.push({
                    type: 'ABSORÇÃO_VENDA',
                    price: c[i],
                    volume: v[i],
                    volumeRatio: Number((v[i] / avgVolume).toFixed(1)),
                    index: i,
                    interpretation: 'Institucional absorvendo pressão compradora na resistência → BEARISH'
                });
            }
        }
    }

    const latestAbsorption = absorptions.length > 0 ? absorptions.at(-1) : null;

    return {
        absorptions: absorptions.slice(-3),
        latestAbsorption,
        hasRecentAbsorption: absorptions.length > 0,
        absorptionType: latestAbsorption?.type ?? 'NENHUMA'
    };
}

/**
 * Detecta possíveis Iceberg Orders — ordens grandes ocultas que se revelam
 * quando o preço fica estagnado em um nível com alto volume.
 */
function detectIcebergOrders(closes, highs, lows, volumes, atr) {
    const n = Math.min(15, closes.length);
    const c = closes.slice(-n);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const v = volumes.slice(-n);

    const avgVolume = v.reduce((a, b) => a + b, 0) / n;
    const atrValue = atr || Math.abs(c.at(-1)) * 0.015;

    const icebergs = [];

    for (let i = 2; i < n; i++) {
        // Procurar por 3+ candles consecutivos com preço estagnado mas volume alto
        const priceStagnant =
            Math.abs(h[i] - h[i - 1]) < atrValue * 0.4 &&
            Math.abs(l[i] - l[i - 1]) < atrValue * 0.4;

        const highVolume = v[i] > avgVolume * 1.5 && v[i - 1] > avgVolume * 1.5;

        if (priceStagnant && highVolume) {
            const isCompra = c[i] >= (l[i] + (h[i] - l[i]) * 0.5);
            icebergs.push({
                type: isCompra ? 'ICEBERG_COMPRA' : 'ICEBERG_VENDA',
                price: Number(((h[i] + l[i]) / 2).toFixed(2)),
                volumeAccumulated: v[i] + v[i - 1],
                interpretation: isCompra
                    ? 'Possível Iceberg de COMPRA — ordem oculta grande absorvendo vendas'
                    : 'Possível Iceberg de VENDA — ordem oculta grande absorvendo compras'
            });
        }
    }

    return {
        icebergs: icebergs.slice(-2),
        hasIceberg: icebergs.length > 0,
        latestIceberg: icebergs.at(-1) ?? null
    };
}

/**
 * Calcula o Order Flow Imbalance (OFI) — desequilíbrio de ordens nos últimos candles.
 * OFI positivo = mais compradores agressivos → pressão de alta
 * OFI negativo = mais vendedores agressivos → pressão de baixa
 */
function calculateOFI(opens, closes, highs, lows, volumes, lookback = 10) {
    const n = Math.min(lookback, closes.length);
    const o = opens.slice(-n);
    const c = closes.slice(-n);
    const h = highs.slice(-n);
    const l = lows.slice(-n);
    const v = volumes.slice(-n);

    let ofiSum = 0;
    const ofiHistory = [];

    for (let i = 0; i < n; i++) {
        const range = h[i] - l[i];
        const closePos = range > 0 ? (c[i] - l[i]) / range : 0.5;

        // OFI do candle: peso pelo volume e posição do fechamento
        const candleOFI = v[i] * (closePos - 0.5) * 2; // -1 a +1
        ofiSum += candleOFI;
        ofiHistory.push(candleOFI);
    }

    const totalVolume = v.reduce((a, b) => a + b, 0);
    const ofiPct = totalVolume > 0 ? (ofiSum / totalVolume) * 100 : 0;

    let ofiInterpretation = 'NEUTRO';
    if (ofiPct > 20) ofiInterpretation = 'FORTE_COMPRA';
    else if (ofiPct > 8) ofiInterpretation = 'COMPRA';
    else if (ofiPct < -20) ofiInterpretation = 'FORTE_VENDA';
    else if (ofiPct < -8) ofiInterpretation = 'VENDA';

    return {
        ofi: Math.round(ofiSum),
        ofiPct: Number(ofiPct.toFixed(2)),
        ofiHistory,
        interpretation: ofiInterpretation
    };
}

/**
 * Função principal — analisa o Super DOM de um ativo.
 * 
 * @param {Object} params
 * @param {number[]} params.opens    - Preços de abertura
 * @param {number[]} params.highs    - Preços máximos
 * @param {number[]} params.lows     - Preços mínimos
 * @param {number[]} params.closes   - Preços de fechamento
 * @param {number[]} params.volumes  - Volumes
 * @param {number}   params.atr      - ATR do ativo
 * @param {Object}   params.srZones  - Zonas de S/R já calculadas
 * @returns {Object} Análise completa do Super DOM
 */
function analyzeSuperDOM({ opens, highs, lows, closes, volumes, atr, srZones = null }) {
    if (!closes || closes.length < 10) {
        return { error: 'Dados insuficientes para análise DOM' };
    }

    const currentPrice = closes.at(-1);

    // 1. Construir Volume Profile (base de tudo)
    const volumeProfile = buildVolumeProfile(highs, lows, closes, opens, volumes, 30, 60);

    // 2. Calcular POC e Value Area
    const poc = findPOC(volumeProfile);
    const valueArea = calculateValueArea(volumeProfile, 0.70);

    // 3. Simular Order Book (DOM)
    const orderBook = simulateOrderBook(currentPrice, atr, volumeProfile, valueArea);

    // 4. Detectar Absorção
    const supportLevel = srZones?.support?.mean ?? (currentPrice * 0.98);
    const resistanceLevel = srZones?.resistance?.mean ?? (currentPrice * 1.02);
    const absorption = detectAbsorption(closes, highs, lows, volumes, supportLevel, resistanceLevel, atr);

    // 5. Detectar Iceberg
    const iceberg = detectIcebergOrders(closes, highs, lows, volumes, atr);

    // 6. Calcular OFI
    const ofi = calculateOFI(opens, closes, highs, lows, volumes, 10);

    // 7. Posição do preço relativo ao DOM
    const priceVsPOC = poc ? ((currentPrice - poc.price) / poc.price) * 100 : 0;
    const priceVsVAH = valueArea ? ((currentPrice - valueArea.vaHigh) / valueArea.vaHigh) * 100 : 0;
    const priceVsVAL = valueArea ? ((currentPrice - valueArea.vaLow) / valueArea.vaLow) * 100 : 0;

    let priceLocation = 'INSIDE_VA'; // Dentro da Value Area
    if (valueArea) {
        if (currentPrice > valueArea.vaHigh) priceLocation = 'ABOVE_VA';
        else if (currentPrice < valueArea.vaLow) priceLocation = 'BELOW_VA';
    }

    // 8. Calcular score DOM
    let domScore = 0;
    const domSignals = [];

    // OFI Score
    if (ofi.interpretation === 'FORTE_COMPRA') {
        domScore += 2;
        domSignals.push({ tipo: 'positivo', texto: `📈 OFI forte compra (+${ofi.ofiPct.toFixed(1)}%) — compradores dominando o book` });
    } else if (ofi.interpretation === 'COMPRA') {
        domScore += 1;
        domSignals.push({ tipo: 'positivo', texto: `📈 OFI comprador (+${ofi.ofiPct.toFixed(1)}%)` });
    } else if (ofi.interpretation === 'FORTE_VENDA') {
        domScore -= 2;
        domSignals.push({ tipo: 'negativo', texto: `📉 OFI forte venda (${ofi.ofiPct.toFixed(1)}%) — vendedores dominando` });
    } else if (ofi.interpretation === 'VENDA') {
        domScore -= 1;
        domSignals.push({ tipo: 'negativo', texto: `📉 OFI vendedor (${ofi.ofiPct.toFixed(1)}%)` });
    }

    // Imbalance do Book Score
    if (orderBook.imbalance > 20) {
        domScore += 2;
        domSignals.push({ tipo: 'positivo', texto: `⚖️ Book com imbalance comprador (${orderBook.imbalance.toFixed(1)}% bids > asks)` });
    } else if (orderBook.imbalance < -20) {
        domScore -= 2;
        domSignals.push({ tipo: 'negativo', texto: `⚖️ Book com imbalance vendedor (${Math.abs(orderBook.imbalance).toFixed(1)}% asks > bids)` });
    }

    // Absorção Score
    if (absorption.absorptionType === 'ABSORÇÃO_COMPRA') {
        domScore += 4;
        domSignals.push({ tipo: 'positivo', texto: `🏦 Absorção institucional de COMPRA detectada no suporte — muito bullish!` });
    } else if (absorption.absorptionType === 'ABSORÇÃO_VENDA') {
        domScore -= 3;
        domSignals.push({ tipo: 'negativo', texto: `🏦 Absorção institucional de VENDA detectada na resistência — bearish!` });
    }

    // Iceberg Score
    if (iceberg.hasIceberg && iceberg.latestIceberg?.type === 'ICEBERG_COMPRA') {
        domScore += 3;
        domSignals.push({ tipo: 'positivo', texto: `🧊 Possível Iceberg de COMPRA detectado — ordem oculta institucional` });
    } else if (iceberg.hasIceberg && iceberg.latestIceberg?.type === 'ICEBERG_VENDA') {
        domScore -= 2;
        domSignals.push({ tipo: 'negativo', texto: `🧊 Possível Iceberg de VENDA detectado — distribuição oculta` });
    }

    // POC Score
    if (poc) {
        if (currentPrice > poc.price && priceVsPOC < 3) {
            domScore += 1;
            domSignals.push({ tipo: 'positivo', texto: `🎯 Preço acima do POC (R$ ${poc.price}) — força compradora na zona de maior liquidez` });
        } else if (currentPrice < poc.price && Math.abs(priceVsPOC) < 3) {
            domScore -= 1;
            domSignals.push({ tipo: 'negativo', texto: `🎯 Preço abaixo do POC (R$ ${poc.price}) — fraqueza` });
        }
    }

    // Interpretação geral
    let domInterpretation = 'NEUTRO';
    if (domScore >= 5) domInterpretation = 'MUITO_BULLISH';
    else if (domScore >= 2) domInterpretation = 'BULLISH';
    else if (domScore <= -5) domInterpretation = 'MUITO_BEARISH';
    else if (domScore <= -2) domInterpretation = 'BEARISH';

    // Top buckets do Volume Profile para exibição (os 10 com maior volume)
    const topBuckets = volumeProfile.buckets
        ? [...volumeProfile.buckets]
            .sort((a, b) => b.volumeTotal - a.volumeTotal)
            .slice(0, 10)
        : [];

    return {
        currentPrice,
        // Volume Profile
        volumeProfile: {
            topBuckets,
            minPrice: volumeProfile.minPrice,
            maxPrice: volumeProfile.maxPrice
        },
        // Referências institucionais
        poc,
        valueArea,
        // Order Book
        orderBook,
        // Análises avançadas
        ofi,
        absorption,
        iceberg,
        // Contexto do preço
        priceLocation,
        priceVsPOC: Number(priceVsPOC.toFixed(2)),
        // Score e sinais
        domScore,
        domSignals,
        domInterpretation
    };
}

module.exports = {
    analyzeSuperDOM,
    buildVolumeProfile,
    findPOC,
    calculateValueArea,
    simulateOrderBook,
    detectAbsorption,
    detectIcebergOrders,
    calculateOFI
};
