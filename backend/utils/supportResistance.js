/**
 * Motor Quant de Detecção de Suporte e Resistência, Volume e Probabilidade de Rompimento.
 */

/**
 * Detecta pivôs locais (máximos e mínimos locais) nos dados históricos.
 * @param {number[]} highs - Preços máximos
 * @param {number[]} lows - Preços mínimos
 * @param {number[]} closes - Preços de fechamento
 * @param {number} window - Janela para verificar se é um topo/fundo local
 */
function findPivots(highs, lows, closes, window = 4) {
    const pivots = [];
    const n = closes.length;

    for (let i = window; i < n - window; i++) {
        let isHigh = true;
        let isLow = true;

        for (let j = 1; j <= window; j++) {
            if (highs[i] < highs[i - j] || highs[i] < highs[i + j]) {
                isHigh = false;
            }
            if (lows[i] > lows[i - j] || lows[i] > lows[i + j]) {
                isLow = false;
            }
        }

        if (isHigh) {
            pivots.push({ index: i, price: highs[i], type: 'resistance' });
        }
        if (isLow) {
            pivots.push({ index: i, price: lows[i], type: 'support' });
        }
    }

    return pivots;
}

/**
 * Agrupa níveis de preços próximos em "zonas" (clusters).
 * @param {Object[]} pivots - Lista de pivôs detectados
 * @param {number} atr - Average True Range para normalizar distância
 * @param {number} currentPrice - Preço atual para calcular tolerância de clusterização
 * @param {number} thresholdPct - Tolerância em porcentagem da distância
 */
function clusterLevels(pivots, atr, currentPrice, thresholdPct = 1.5) {
    if (pivots.length === 0) return [];

    // Definir a tolerância de proximidade dos níveis (usando ATR ou porcentagem)
    const tolerance = atr ? atr * 1.2 : currentPrice * (thresholdPct / 100);

    // Ordenar pivôs por preço
    const sortedPivots = [...pivots].sort((a, b) => a.price - b.price);
    const clusters = [];
    let currentCluster = [sortedPivots[0]];

    for (let i = 1; i < sortedPivots.length; i++) {
        const p = sortedPivots[i];
        const lastInCluster = currentCluster[currentCluster.length - 1];

        if (p.price - lastInCluster.price <= tolerance) {
            currentCluster.push(p);
        } else {
            clusters.push(currentCluster);
            currentCluster = [p];
        }
    }
    clusters.push(currentCluster);

    // Processar os clusters para extrair estatísticas da zona
    return clusters.map(cluster => {
        const prices = cluster.map(c => c.price);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
        const touches = cluster.length;

        // Determinar o tipo predominante no cluster
        const supportCount = cluster.filter(c => c.type === 'support').length;
        const resistanceCount = cluster.filter(c => c.type === 'resistance').length;
        let type = 'mixed';
        if (supportCount > resistanceCount * 1.5) type = 'support';
        else if (resistanceCount > supportCount * 1.5) type = 'resistance';

        return {
            min,
            max,
            mean,
            touches,
            type,
            pivots: cluster
        };
    });
}

/**
 * Analisa as zonas de Suporte e Resistência do ativo.
 * @param {number[]} closes - Preços de fechamento
 * @param {number[]} highs - Preços máximos
 * @param {number[]} lows - Preços mínimos
 * @param {number[]} volumes - Volumes das operações
 * @param {Object} ind - Objeto de indicadores técnicos contendo ADX, BB, etc.
 * @param {number} atr - ATR do ativo para normalização
 */
function analyzeSupportResistance(closes, highs, lows, volumes, ind, atr) {
    const currentPrice = closes.at(-1);
    const currentVolume = volumes.at(-1) ?? 0;
    const previousClose = closes.length > 1 ? closes.at(-2) : null;
    const previousHigh = highs.length > 1 ? highs.at(-2) : null;
    const previousLow = lows.length > 1 ? lows.at(-2) : null;
    const previousVolume = volumes.length > 1 ? volumes.at(-2) ?? 0 : 0;

    // 1. Encontrar pivôs e agrupar em zonas nos últimos 150 candles
    const subsetHighs = highs.slice(-150);
    const subsetLows = lows.slice(-150);
    const subsetCloses = closes.slice(-150);
    
    const pivots = findPivots(subsetHighs, subsetLows, subsetCloses, 4);
    const zones = clusterLevels(pivots, atr, currentPrice, 1.5);

    // 2. Separar e encontrar suporte mais próximo abaixo e resistência mais próxima acima
    let nearestSupport = null;
    let nearestResistance = null;

    // Suportes são zonas abaixo do preço atual
    const supports = zones
        .filter(z => z.mean < currentPrice)
        .sort((a, b) => b.mean - a.mean); // Mais próximo do preço primeiro

    // Resistências são zonas acima do preço atual
    const resistances = zones
        .filter(z => z.mean > currentPrice)
        .sort((a, b) => a.mean - b.mean); // Mais próximo do preço primeiro

    if (supports.length > 0) {
        nearestSupport = supports[0];
    } else {
        // Fallback básico se não encontrar pivô
        const minL = Math.min(...lows.slice(-50));
        nearestSupport = { min: minL * 0.995, max: minL * 1.005, mean: minL, touches: 1, type: 'support' };
    }

    if (resistances.length > 0) {
        nearestResistance = resistances[0];
    } else {
        // Fallback básico
        const maxH = Math.max(...highs.slice(-50));
        nearestResistance = { min: maxH * 0.995, max: maxH * 1.005, mean: maxH, touches: 1, type: 'resistance' };
    }

    // 3. Confirmar volume atual contra a média dos últimos 20 dias
    const recentVolumes = volumes.slice(-20);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1.0;
    
    let volumeConfirmation = 'NORMAL';
    if (volumeRatio >= 1.5) volumeConfirmation = 'MUITO FORTE';
    else if (volumeRatio >= 1.2) volumeConfirmation = 'FORTE';
    else if (volumeRatio <= 0.7) volumeConfirmation = 'FRACO';

    // 4. Calcular probabilidade de rompimento SEPARADAMENTE para suporte E resistência
    const calculateBreakoutProb = (zone, isSupport) => {
        let prob = 30; // Probabilidade base
        const adx = ind?.adx?.at(-1)?.adx ?? 20;
        const rsi = ind?.rsi?.at(-1) ?? 50;

        // Fator 1: Número de toques (cada toque enfraquece a zona)
        if (zone.touches > 3) prob += 25;
        else if (zone.touches === 3) prob += 15;
        else if (zone.touches === 2) prob += 5;

        // Fator 2: Volume operacional
        if (volumeRatio >= 1.8) prob += 30;
        else if (volumeRatio >= 1.3) prob += 15;
        else if (volumeRatio <= 0.65) prob -= 15;

        // Fator 3: Força de tendência via ADX
        if (adx > 28) prob += 15;
        else if (adx < 18) prob -= 10;

        // Fator 4: Momentum via RSI (direção dependente se é suporte ou resistência)
        if (!isSupport) {
            // Resistência: RSI forte mas não saturado favorece rompimento para cima
            if (rsi > 50 && rsi < 66) prob += 15;
            else if (rsi >= 75) prob -= 10; // Sobrecomprado extremo
        } else {
            // Suporte: RSI fraco mas não saturado favorece rompimento para baixo
            if (rsi < 50 && rsi > 34) prob += 15;
            else if (rsi <= 25) prob -= 10; // Sobrevendido extremo
        }

        // Fator 5: Bollinger Squeeze
        if (ind?.bb && ind.bb.length >= 20) {
            const lastBB = ind.bb.at(-1);
            const recentBBs = ind.bb.slice(-20);
            const recentWidths = recentBBs.map(b => (b.upper - b.lower) / b.middle);
            const avgWidth = recentWidths.reduce((a, b) => a + b, 0) / recentWidths.length;
            const currentWidth = (lastBB.upper - lastBB.lower) / lastBB.middle;
            if (currentWidth < avgWidth * 0.9) prob += 15;
        }

        return Math.max(5, Math.min(95, prob));
    };

    const supportBreakoutProb = calculateBreakoutProb(nearestSupport, true);
    const resistanceBreakoutProb = calculateBreakoutProb(nearestResistance, false);

    // 4.1 Determinar zona ativa (mais próxima)
    const distToSupport = Math.abs(currentPrice - nearestSupport.mean) / currentPrice;
    const distToResistance = Math.abs(currentPrice - nearestResistance.mean) / currentPrice;
    const activeZone = distToSupport < distToResistance ? 'SUPPORT' : 'RESISTANCE';

    // 5. Determinar classificação da zona de entrada e confirmação de rompimento
    let entryZoneStatus = 'NEUTRO';
    let entryAction = 'AGUARDAR'; // 'COMPRAR_BOUNCE', 'VENDER_BOUNCE', 'COMPRAR_ROMPIMENTO', 'VENDER_ROMPIMENTO', 'AGUARDAR'
    let entryDetails = '';
    let confirmedBreakout = { type: null, strength: 0 }; // null, 'HIGH', 'MEDIUM', 'LOW'

    const atrTolerance = atr ? atr * 0.5 : currentPrice * 0.007;

    // Verificar rompimento com confirmação
    const checkBreakoutConfirmation = (type) => {
        const zone = type === 'HIGH' ? nearestResistance : nearestSupport;
        const prevClose = previousClose;
        const prevHigh = previousHigh;
        const prevLow = previousLow;

        let confirmations = 0;

        if (type === 'HIGH') {
            // Rompimento de alta: fechamento acima da resistência
            if (currentPrice > zone.max) confirmations++;
            if (prevClose && prevClose > zone.max) confirmations++; // Confirmação de vela anterior
            if (currentVolume > avgVolume * 1.3) confirmations++; // Volume forte
            if (adx > 25) confirmations++; // Tendência forte
        } else {
            // Rompimento de baixa: fechamento abaixo do suporte
            if (currentPrice < zone.min) confirmations++;
            if (prevClose && prevClose < zone.min) confirmations++; // Confirmação de vela anterior
            if (currentVolume > avgVolume * 1.3) confirmations++; // Volume forte
            if (adx > 25) confirmations++; // Tendência forte
        }

        let strength = 'LOW';
        if (confirmations >= 4) strength = 'HIGH';
        else if (confirmations >= 2) strength = 'MEDIUM';

        return { strength, confirmations };
    };

    // Preço perto do suporte
    if (currentPrice <= nearestSupport.max + atrTolerance && currentPrice >= nearestSupport.min - atrTolerance) {
        if (supportBreakoutProb < 50) {
            entryZoneStatus = 'SUPORTE_RESPEITADO';
            entryAction = 'COMPRAR_BOUNCE';
            entryDetails = 'Preço batendo no suporte com baixo risco de rompimento. Ótimo ponto para compra de ricochete (bounce).';
        } else {
            entryZoneStatus = 'SUPORTE_PERIGO';
            entryAction = 'AGUARDAR';
            entryDetails = 'Preço no suporte, porém com alta probabilidade de rompimento de baixa (breakdown). Evitar compra!';
        }
    }
    // Preço perto da resistência
    else if (currentPrice >= nearestResistance.min - atrTolerance && currentPrice <= nearestResistance.max + atrTolerance) {
        if (resistanceBreakoutProb < 50) {
            entryZoneStatus = 'RESISTENCIA_RESPEITADA';
            entryAction = 'VENDER_BOUNCE';
            entryDetails = 'Preço batendo na resistência com baixo risco de rompimento. Ótimo ponto para venda (short) ou realização.';
        } else {
            entryZoneStatus = 'RESISTENCIA_PERIGO';
            entryAction = 'AGUARDAR';
            entryDetails = 'Preço na resistência com alta probabilidade de rompimento de alta. Aguardar rompimento definitivo.';
        }
    }
    // Rompimento de alta
    else if (currentPrice > nearestResistance.max) {
        const breakout = checkBreakoutConfirmation('HIGH');
        confirmedBreakout = { type: 'HIGH', ...breakout };
        
        if (breakout.strength === 'HIGH') {
            entryZoneStatus = 'ROMPIMENTO_ALTA_CONFIRMADO';
            entryAction = 'COMPRAR_ROMPIMENTO';
            entryDetails = `Rompimento de alta CONFIRMADO (${breakout.confirmations} confirmações)! Preço acima da resistência com volume e tendência favoráveis.`;
        } else if (breakout.strength === 'MEDIUM') {
            entryZoneStatus = 'ROMPIMENTO_ALTA_PARCIAL';
            entryAction = 'AGUARDAR';
            entryDetails = `Rompimento de alta parcial (${breakout.confirmations} confirmações). Aguardar confirmação extra (vela fechando acima).`;
        } else {
            entryZoneStatus = 'ROMPIMENTO_ALTA_FRACO';
            entryAction = 'AGUARDAR';
            entryDetails = 'Rompimento de alta fraco. Aguardar confirmação de volume e tendência.';
        }
    }
    // Rompimento de baixa
    else if (currentPrice < nearestSupport.min) {
        const breakout = checkBreakoutConfirmation('LOW');
        confirmedBreakout = { type: 'LOW', ...breakout };
        
        if (breakout.strength === 'HIGH') {
            entryZoneStatus = 'ROMPIMENTO_BAIXA_CONFIRMADO';
            entryAction = 'VENDER_ROMPIMENTO';
            entryDetails = `Rompimento de baixa CONFIRMADO (${breakout.confirmations} confirmações)! Preço abaixo do suporte com volume e tendência favoráveis.`;
        } else if (breakout.strength === 'MEDIUM') {
            entryZoneStatus = 'ROMPIMENTO_BAIXA_PARCIAL';
            entryAction = 'AGUARDAR';
            entryDetails = `Rompimento de baixa parcial (${breakout.confirmations} confirmações). Aguardar confirmação extra (vela fechando abaixo).`;
        } else {
            entryZoneStatus = 'ROMPIMENTO_BAIXA_FRACO';
            entryAction = 'AGUARDAR';
            entryDetails = 'Rompimento de baixa fraco. Aguardar confirmação de volume e tendência.';
        }
    }
    // Fora de qualquer zona clara
    else {
        entryZoneStatus = 'NEUTRO';
        entryAction = 'AGUARDAR';
        entryDetails = 'Preço no meio do canal, longe das zonas principais de suporte e resistência.';
    }

    // Gerar avisos claros para ambas as zonas
    const getBreakoutWarning = (prob, isSupport) => {
        const level = isSupport ? 'suporte' : 'resistência';
        if (prob >= 75) return `⚡ ALTA probabilidade (${prob}%) de rompimento do ${level}!`;
        if (prob >= 50) return `⚠️ Probabilidade moderada (${prob}%) de rompimento do ${level}.`;
        if (prob <= 25) return `✅ Baixa probabilidade (${prob}%) de rompimento do ${level}.`;
        return `🔍 Probabilidade média (${prob}%) de rompimento do ${level}.`;
    };

    const supportWarning = getBreakoutWarning(supportBreakoutProb, true);
    const resistanceWarning = getBreakoutWarning(resistanceBreakoutProb, false);

    // Definir a probabilidade da zona ativa para manter compatibilidade com código existente
    const activeBreakoutProb = activeZone === 'SUPPORT' ? supportBreakoutProb : resistanceBreakoutProb;

    // Gerar aviso especial para rompimento confirmado
    let breakoutConfirmationWarning = null;
    let rompimento_confirmado = false; // Campo explícito!
    if (confirmedBreakout.strength === 'HIGH') {
        rompimento_confirmado = true;
        const direction = confirmedBreakout.type === 'HIGH' ? 'de alta' : 'de baixa';
        breakoutConfirmationWarning = `🚀 ROMPIMENTO ${direction.toUpperCase()} CONFIRMADO! (${confirmedBreakout.confirmations} confirmações)`;
    } else if (confirmedBreakout.strength === 'MEDIUM') {
        rompimento_confirmado = true;
        const direction = confirmedBreakout.type === 'HIGH' ? 'de alta' : 'de baixa';
        breakoutConfirmationWarning = `⚠️ Rompimento ${direction} PARCIAL (${confirmedBreakout.confirmations} confirmações). Aguardar confirmação extra.`;
    }

    return {
        support: {
            min: Number(nearestSupport.min.toFixed(2)),
            max: Number(nearestSupport.max.toFixed(2)),
            mean: Number(nearestSupport.mean.toFixed(2)),
            touches: nearestSupport.touches,
            breakout_probability: supportBreakoutProb,
            warning: supportWarning
        },
        resistance: {
            min: Number(nearestResistance.min.toFixed(2)),
            max: Number(nearestResistance.max.toFixed(2)),
            mean: Number(nearestResistance.mean.toFixed(2)),
            touches: nearestResistance.touches,
            breakout_probability: resistanceBreakoutProb,
            warning: resistanceWarning
        },
        current_price: currentPrice,
        active_zone: activeZone,
        volume_ratio: Number(volumeRatio.toFixed(2)),
        volume_confirmation: volumeConfirmation,
        breakout_probability: activeBreakoutProb,
        entry_zone_status: entryZoneStatus,
        entry_action: entryAction,
        entry_details: entryDetails,
        confirmed_breakout: confirmedBreakout,
        breakout_confirmation_warning: breakoutConfirmationWarning,
        rompimento_confirmado: rompimento_confirmado // Campo EXPLÍCITO para você encontrar facilmente!
    };
}

module.exports = {
    findPivots,
    clusterLevels,
    analyzeSupportResistance
};
