/**
 * gerarSinal — Motor de sinais CONSERVADOR com múltiplas camadas de filtro.
 *
 * Camadas:
 *  1. Força base (SMA, RSI, MACD, OBV)
 *  2. Filtro ADX    → mercado lateral bloqueia sinal
 *  3. Filtro volume → falso rompimento reduz confiança
 *  4. Filtro ATR    → alta volatilidade reduz confiança
 *  5. Filtro macro  → VIX extremo bloqueia compra e reduz confiança
 *  6. Divergências RSI/MACD → detecta reversões potenciais
 *  7. Pullback confirmation → entra em melhor preço
 *  8. Volume accumulation/distribution → confirmação institucional
 *  9. Multi-timeframe alignment → confirmação cruzada
 * 10. Dynamic stop loss & take profit → gestão de risco inteligente
 * 11. Filtro intraday → evita compra em dia negativo
 * 12. Filtro momentum → confirma direção do preço
 */
function gerarSinal({ preco, rsi, sma9, sma21, macd, adx, bb, obv, atr, volumes, macro, closes, highs, lows, precoAbertura, fechamentoAnterior }) {
    let forca = 0;
    const avisos  = [];
    const detalhes = {};

    // ── 1. TENDÊNCIA (SMA 9 vs 21) ──────────────────────────────────────────
    if (sma9 > sma21) {
        forca += 1;
        detalhes.tendencia = "ALTA";
    } else {
        forca -= 1;
        detalhes.tendencia = "BAIXA";
    }

    // ── 2. RSI ───────────────────────────────────────────────────────────────
    detalhes.rsi = rsi;
    if (rsi < 30)       { forca += 2; detalhes.rsi_status = "SOBREVENDA FORTE"; }
    else if (rsi < 40)  { forca += 1; detalhes.rsi_status = "SOBREVENDA LEVE";  }
    else if (rsi > 70)  { forca -= 2; detalhes.rsi_status = "SOBRECOMPRA FORTE";}
    else if (rsi > 60)  { forca -= 1; detalhes.rsi_status = "SOBRECOMPRA LEVE"; }
    else                {             detalhes.rsi_status = "NEUTRO";            }

    // ── 3. MACD ──────────────────────────────────────────────────────────────
    if (macd?.MACD !== undefined && macd?.signal !== undefined) {
        if (macd.MACD > macd.signal) { forca += 1; detalhes.macd_status = "BULLISH"; }
        else                         { forca -= 1; detalhes.macd_status = "BEARISH"; }
        detalhes.macd_hist = macd.histogram;
    }

    // ── 4. OBV — pressão de volume (proxy institucional) ─────────────────────
    let obv_trend = "NEUTRO";
    if (obv && obv.length >= 10) {
        const media5  = obv.slice(-5).reduce((a, b)  => a + b, 0) / 5;
        const media10 = obv.slice(-10).reduce((a, b) => a + b, 0) / 10;
        if (media5 > media10 * 1.015)      { forca += 1; obv_trend = "SUBINDO"; }
        else if (media5 < media10 * 0.985) { forca -= 1; obv_trend = "CAINDO";  }
    }
    detalhes.obv_trend = obv_trend;

    // ── SINAL BASE ───────────────────────────────────────────────────────────
    let sinal = "NEUTRO";
    if (forca >= 3)  sinal = "COMPRA";
    if (forca <= -3) sinal = "VENDA";

    // ── CONFIANÇA BASE (0-100) ────────────────────────────────────────────────
    let confianca = Math.min(100, (Math.abs(forca) / 5) * 100);

    // ── 5. ADX — FILTRO DE LATERALIZAÇÃO ─────────────────────────────────────
    const adxValue  = adx?.adx  ?? null;
    const pdi       = adx?.pdi  ?? null;
    const mdi       = adx?.mdi  ?? null;
    detalhes.adx    = adxValue;
    detalhes.pdi    = pdi;
    detalhes.mdi    = mdi;

    let mercadoLateral = false;
    if (adxValue !== null) {
        if (adxValue < 20) {
            sinal          = "NEUTRO";
            mercadoLateral = true;
            confianca      = Math.min(confianca, 10);
            avisos.push("⚠️ Forte lateralização (ADX " + adxValue.toFixed(1) + " < 20) — operar é arriscado");
        } else if (adxValue < 25) {
            mercadoLateral = true;
            confianca     *= 0.6;
            avisos.push("⚠️ Mercado lateral (ADX " + adxValue.toFixed(1) + ") — sinal pouco confiável");
        } else if (adxValue >= 35) {
            detalhes.tendencia_forca = "FORTE";
        } else {
            detalhes.tendencia_forca = "MODERADA";
        }
    }
    detalhes.mercado_lateral = mercadoLateral;

    // ── 6. BOLLINGER BANDS + VOLUME — FALSO ROMPIMENTO ──────────────────────
    let falsoRompimento = false;
    if (bb && volumes && volumes.length >= 20) {
        const vols20    = volumes.slice(-20).filter(v => v > 0);
        const volMedia  = vols20.length ? vols20.reduce((a, b) => a + b, 0) / vols20.length : 0;
        const volAtual  = volumes.at(-1) ?? 0;
        const volRelativo = volMedia > 0 ? volAtual / volMedia : 1;

        detalhes.bb_upper    = bb.upper;
        detalhes.bb_middle   = bb.middle;
        detalhes.bb_lower    = bb.lower;
        detalhes.vol_relativo = volRelativo;

        // Posição do preço dentro das bandas (0% = lower, 100% = upper)
        const bbRange = bb.upper - bb.lower;
        detalhes.bb_pct = bbRange > 0 ? ((preco - bb.lower) / bbRange) * 100 : 50;

        if (preco > bb.upper && volRelativo < 0.8) {
            falsoRompimento = true;
            confianca      *= 0.6;
            avisos.push("🚨 Possível falso rompimento de alta — preço acima da BB superior sem volume");
        } else if (preco < bb.lower && volRelativo < 0.8) {
            falsoRompimento = true;
            confianca      *= 0.6;
            avisos.push("🚨 Possível falso rompimento de baixa — preço abaixo da BB inferior sem volume");
        }

        if      (volRelativo > 1.5) detalhes.volume_status = "ACIMA (×" + volRelativo.toFixed(1) + ")";
        else if (volRelativo < 0.7) detalhes.volume_status = "ABAIXO DA MÉDIA";
        else                        detalhes.volume_status = "NORMAL";
    }
    detalhes.falso_rompimento = falsoRompimento;

    // ── 7. ATR — VOLATILIDADE ────────────────────────────────────────────────
    if (atr && preco) {
        const atrPct = (atr / preco) * 100;
        detalhes.atr_pct = atrPct;
        if (atrPct > 3) {
            confianca *= 0.85;
            avisos.push("⚡ Alta volatilidade (ATR " + atrPct.toFixed(1) + "%) — risco elevado");
            detalhes.volatilidade = "ALTA";
        } else if (atrPct > 1.5) {
            detalhes.volatilidade = "MODERADA";
        } else {
            detalhes.volatilidade = "BAIXA";
        }
    }

    // ── 8. VIX — CONTEXTO MACRO ──────────────────────────────────────────────
    if (macro?.vix?.valor) {
        const vixVal = macro.vix.valor;
        if (vixVal > 40) {
            if (sinal === "COMPRA") {
                sinal = "NEUTRO";
                avisos.push("🛑 VIX crítico (" + vixVal.toFixed(1) + ") — compra bloqueada por pânico global");
            }
            confianca *= 0.55;
        } else if (vixVal > 30) {
            confianca *= 0.80;
            avisos.push("⚠️ VIX elevado (" + vixVal.toFixed(1) + ") — medo alto no mercado, cautela");
        } else if (vixVal > 20) {
            confianca *= 0.92;
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ── NOVAS CAMADAS DE FILTRO PARA MAIOR ASSERTIVIDADE ─────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    // ── 9. DIVERGÊNCIAS RSI ──────────────────────────────────────────────────
    const { detectRSIDivergence } = require("../utils/advancedAnalysis");
    const rsiDiv = detectRSIDivergence(closes, [rsi], 20);
    
    if (rsiDiv.type === 'bullish' && sinal === "COMPRA") {
        confianca *= 1.15; // +15% confiança
        detalhes.rsi_divergence = "BULLISH";
        avisos.push("📊 Divergência bullish RSI detectada — possível reversão para cima");
    } else if (rsiDiv.type === 'bearish' && sinal === "VENDA") {
        confianca *= 1.15;
        detalhes.rsi_divergence = "BEARISH";
        avisos.push("📊 Divergência bearish RSI detectada — possível reversão para baixo");
    } else if (rsiDiv.type === 'bullish' && sinal === "VENDA") {
        sinal = "NEUTRO";
        confianca *= 0.5;
        avisos.push("⚠️ Divergência bullish RSI contradiz sinal de venda — sinal neutralizado");
    } else if (rsiDiv.type === 'bearish' && sinal === "COMPRA") {
        sinal = "NEUTRO";
        confianca *= 0.5;
        avisos.push("⚠️ Divergência bearish RSI contradiz sinal de compra — sinal neutralizado");
    }

    // ── 10. DIVERGÊNCIAS MACD ────────────────────────────────────────────────
    const { detectMACDDivergence } = require("../utils/advancedAnalysis");
    const macdValues = [];
    if (macd?.MACD !== undefined) {
        // Criar array simulado para o último valor
        for (let i = 0; i < 20; i++) macdValues.push(macd);
    }
    const macdDiv = detectMACDDivergence(closes, macdValues, 20);
    
    if (macdDiv.type === 'bullish' && sinal === "COMPRA") {
        confianca *= 1.10; // +10% confiança
        detalhes.macd_divergence = "BULLISH";
        avisos.push("📈 Divergência bullish MACD confirma compra");
    } else if (macdDiv.type === 'bearish' && sinal === "VENDA") {
        confianca *= 1.10;
        detalhes.macd_divergence = "BEARISH";
        avisos.push("📉 Divergência bearish MACD confirma venda");
    }

    // ── 11. PULLBACK OPPORTUNITY ────────────────────────────────────────────
    const { detectPullbackOpportunity } = require("../utils/advancedAnalysis");
    const pullback = detectPullbackOpportunity(closes, sma9, sma21, rsi, atr, 10);
    
    if (pullback.isPullback) {
        detalhes.pullback = pullback;
        if (pullback.direction === 'BUY' && sinal === "COMPRA") {
            confianca *= 1.20; // +20% confiança - excelente ponto de entrada!
            avisos.push("🎯 Pullback detectado — ótimo ponto de entrada na compra!");
        } else if (pullback.direction === 'SELL' && sinal === "VENDA") {
            confianca *= 1.20;
            avisos.push("🎯 Pullback detectado — ótimo ponto de entrada na venda!");
        }
    }

    // ── 12. VOLUME ACCUMULATION/DISTRIBUTION ────────────────────────────────
    const { analyzeVolumeAccumulation } = require("../utils/advancedAnalysis");
    const volAnalysis = analyzeVolumeAccumulation(volumes, closes, 20);
    
    detalhes.volume_accumulation = volAnalysis;
    if (volAnalysis.trend === 'ACUMULAÇÃO' && sinal === "COMPRA") {
        confianca *= 1.12; // +12% confiança
        avisos.push("💰 Acumulação de volume detectada — instituições comprando");
    } else if (volAnalysis.trend === 'DISTRIBUIÇÃO' && sinal === "VENDA") {
        confianca *= 1.12;
        avisos.push("💰 Distribuição de volume detectada — instituições vendendo");
    } else if (volAnalysis.trend === 'ACUMULAÇÃO' && sinal === "VENDA") {
        confianca *= 0.7;
        avisos.push("⚠️ Acumulação contradiz sinal de venda");
    } else if (volAnalysis.trend === 'DISTRIBUIÇÃO' && sinal === "COMPRA") {
        confianca *= 0.7;
        avisos.push("⚠️ Distribuição contradiz sinal de compra");
    }

    // ── 13. DYNAMIC STOP LOSS & TAKE PROFIT ─────────────────────────────────
    const { calculateDynamicStops } = require("../utils/advancedAnalysis");
    const stops = calculateDynamicStops(preco, atr, sinal === "COMPRA" ? 'BUY' : 'SELL', 2);

    detalhes.stops = stops;
    if (stops.stopLoss && stops.takeProfit) {
        avisos.push(`🛡️ Stop Loss: R$ ${stops.stopLoss.toFixed(2)} | Take Profit: R$ ${stops.takeProfit.toFixed(2)}`);
    }

    // ── 14. ALERTA DE PROXIMIDADE DE VENDA ──────────────────────────────────
    // Detecta quando o ativo está se aproximando de uma zona de venda
    let alertaProximidadeVenda = false;
    let motivosAlertaVenda = [];

    // 14.1 RSI em zona de sobrecompra
    if (rsi > 65) {
        alertaProximidadeVenda = true;
        motivosAlertaVenda.push(`RSI em zona de alerta (${rsi.toFixed(1)})`);
    }

    // 14.2 Preço perto da banda superior de Bollinger
    if (bb && preco) {
        const bbRange = bb.upper - bb.lower;
        const bbPct = bbRange > 0 ? ((preco - bb.lower) / bbRange) * 100 : 50;
        detalhes.bb_position_pct = bbPct;

        if (bbPct > 80) {
            alertaProximidadeVenda = true;
            motivosAlertaVenda.push(`Preço perto da banda superior de Bollinger (${bbPct.toFixed(0)}%)`);
        }
    }

    // 14.3 Distribuição de volume detectada
    if (volAnalysis.trend === 'DISTRIBUIÇÃO') {
        alertaProximidadeVenda = true;
        motivosAlertaVenda.push('Distribuição de volume (instituições vendendo)');
    }

    // 14.4 OBV caindo
    if (obv_trend === 'CAINDO') {
        alertaProximidadeVenda = true;
        motivosAlertaVenda.push('OBV em queda (pressão de venda)');
    }

    // 14.5 Divergência bearish
    if (rsiDiv.type === 'bearish' || macdDiv.type === 'bearish') {
        alertaProximidadeVenda = true;
        motivosAlertaVenda.push('Divergência bearish detectada');
    }

    // 14.6 SMA9 se aproximando de cruzar abaixo da SMA21
    if (sma9 && sma21 && sma9 > sma21) {
        const diff = ((sma9 - sma21) / sma21) * 100;
        detalhes.sma_diff_pct = diff;

        if (diff < 2) { // Menos de 2% de distância
            alertaProximidadeVenda = true;
            motivosAlertaVenda.push(`SMA9 próxima de cruzar abaixo da SMA21 (diff: ${diff.toFixed(1)}%)`);
        }
    }

    // Se há pelo menos 2 motivos de alerta, exibir aviso
    if (alertaProximidadeVenda && motivosAlertaVenda.length >= 2) {
        detalhes.alerta_venda = {
            ativo: true,
            nivel: motivosAlertaVenda.length >= 4 ? 'ALTO' : motivosAlertaVenda.length >= 3 ? 'MODERADO' : 'ATENCAO',
            motivos: motivosAlertaVenda,
            contador: motivosAlertaVenda.length
        };

        avisos.push(`⚠️ ALERTA DE VENDA: ${motivosAlertaVenda.length} fatores indicando possível reversão para baixa`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ── NOVOS FILTROS CRÍTICOS PARA EVITAR SINAIS FALSOS ─────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    // ── 15. FILTRO INTRADAY — Evita comprar quando preço está alto no dia ─────
    let varIntraday = null;
    if (precoAbertura && preco) {
        varIntraday = ((preco - precoAbertura) / precoAbertura) * 100;
        detalhes.var_intraday = varIntraday.toFixed(2);

        // Se sinal é COMPRA mas o preço já subiu muito no dia (mais de 1%)
        if (sinal === "COMPRA" && varIntraday > 1.5) {
            confianca *= 0.7;
            avisos.push(`⚠️ Preço já subiu ${varIntraday.toFixed(1)}% hoje — risco de comprar no topo do dia`);
            detalhes.intraday_warning = "ALTO";
        } else if (sinal === "COMPRA" && varIntraday > 0.8) {
            confianca *= 0.85;
            avisos.push(`⚠️ Preço subiu ${varIntraday.toFixed(1)}% hoje — cuidado ao entrar`);
            detalhes.intraday_warning = "MODERADO";
        }
        // Se sinal é COMPRA mas o preço está caindo no dia
        else if (sinal === "COMPRA" && varIntraday < -0.5) {
            confianca *= 1.05; // Leve bônus - entrando em preço mais baixo
            detalhes.intraday_warning = "FAVORÁVEL";
        }
    }

    // ── 16. FILTRO DE MOMENTUM DOS ÚLTIMOS CANDLES ───────────────────────────
    if (closes && closes.length >= 5) {
        const ultimos3 = closes.slice(-3);
        const ultimos5 = closes.slice(-5);

        // Contar candles vermelhos (fechamento menor que abertura anterior)
        let candlesVermelhos = 0;
        let candlesVerdes = 0;

        for (let i = closes.length - 3; i < closes.length; i++) {
            if (i > 0 && closes[i] < closes[i-1]) candlesVermelhos++;
            if (i > 0 && closes[i] > closes[i-1]) candlesVerdes++;
        }

        detalhes.momentum_candles = {
            vermelhos: candlesVermelhos,
            verdes: candlesVerdes
        };

        // Se sinal de COMPRA mas 2 ou mais dos últimos 3 candles são vermelhos
        if (sinal === "COMPRA" && candlesVermelhos >= 2) {
            confianca *= 0.75;
            avisos.push("⚠️ Momentum fraco — últimos candles são predominantemente vermelhos");
            detalhes.momentum_warning = "FRACO";
        }
        // Se sinal de COMPRA e 2 ou mais dos últimos 3 candles são verdes
        else if (sinal === "COMPRA" && candlesVerdes >= 2) {
            confianca *= 1.05;
            detalhes.momentum_warning = "FORTE";
        }
    }

    // ── 17. FILTRO DE TENDÊNCIA DE CURTO PRAZO (5 dias) ───────────────────────
    if (closes && closes.length >= 5) {
        const ultimos5 = closes.slice(-5);
        const primeiraMedia = ultimos5[0];
        const ultimaMedia = ultimos5[ultimos5.length - 1];
        const variacao5dias = ((ultimaMedia - primeiraMedia) / primeiraMedia) * 100;

        detalhes.variacao_5dias = variacao5dias.toFixed(2);

        // Se sinal de COMPRA mas o ativo caiu nos últimos 5 dias
        if (sinal === "COMPRA" && variacao5dias < -3) {
            confianca *= 0.8;
            avisos.push(`⚠️ Ativo caiu ${Math.abs(variacao5dias).toFixed(1)}% nos últimos 5 dias — tendência de baixa`);
            detalhes.tendencia_curto = "BAIXA";
        } else if (sinal === "COMPRA" && variacao5dias > 3) {
            confianca *= 1.05;
            detalhes.tendencia_curto = "ALTA";
        }
    }

    // ── 18. FILTRO DE FECHAMENTO VS ABERTURA — Dia negativo bloqueia compra ──
    if (precoAbertura && preco && sinal === "COMPRA") {
        const diaNegativo = preco < precoAbertura;
        detalhes.dia_negativo = diaNegativo;

        if (diaNegativo) {
            const quedaPct = ((precoAbertura - preco) / precoAbertura) * 100;
            detalhes.queda_dia = quedaPct.toFixed(2);

            // REGRA RIGOROSA: Se o dia está negativo, a confiança NUNCA passa de 60%
            // Isso impede que o sistema dê sinal de "ENTRAR" (que exige 70%)
            confianca = Math.min(confianca, 60);
            
            if (quedaPct > 0.5) {
                confianca *= 0.7; // Penalidade adicional por queda acentuada
                avisos.push(`🚫 Dia negativo (-${quedaPct.toFixed(1)}%) — sinal de compra bloqueado por pressão vendedora no dia`);
            } else {
                avisos.push(`⚠️ Dia negativo — aguardando candle verde para confirmar entrada`);
            }
        }
    }

    // ── 18.1 FILTRO VS FECHAMENTO ANTERIOR ──────────────────────────────────
    if (fechamentoAnterior && preco < fechamentoAnterior && sinal === "COMPRA") {
        const quedaAnterior = ((fechamentoAnterior - preco) / fechamentoAnterior) * 100;
        if (quedaAnterior > 0.3) {
            confianca *= 0.85;
            avisos.push(`⚠️ Preço abaixo do fechamento anterior — ativo em correção de curto prazo`);
        }
    }

    // ── 19. CONFIRMAÇÃO DE VOLUME NA DIREÇÃO DO SINAL ────────────────────────
    if (volumes && volumes.length >= 20 && sinal !== "NEUTRO") {
        const volAtual = volumes[volumes.length - 1];
        const volMedia20 = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const volRelativo = volAtual / volMedia20;

        detalhes.volume_confirmacao = volRelativo > 1.2 ? "CONFIRMA" : volRelativo > 0.9 ? "NEUTRO" : "FRACO";

        // Sinal de COMPRA sem volume é suspeito
        if (sinal === "COMPRA" && volRelativo < 0.7) {
            confianca *= 0.8;
            avisos.push(`⚠️ Volume baixo (${(volRelativo * 100).toFixed(0)}% da média) — sinal de compra sem confirmação`);
        }
    }

    // ── FINAL: Arredondar e limitar confiança ───────────────────────────────
    confianca = Math.round(Math.max(0, Math.min(100, confianca)));

    // ═════════════════════════════════════════════════════════════════════════
    // ── THRESHOLDS MAIS RIGOROSOS PARA SINAIS ─────────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    // COMPRA: exige força >= 4 (era 3) E confiança >= 70% (era 60%)
    // Isso reduz drasticamente os sinais falsos
    if (forca >= 4 && confianca >= 70) {
        sinal = "COMPRA";
    } else if (forca >= 3 && confianca >= 70) {
        // Sinal moderado - força 3 mas alta confiança
        sinal = "COMPRA";
        confianca = Math.round(confianca * 0.85); // Reduz confiança para sinais fracos
        avisos.push("⚠️ Sinal de COMPRA moderado — confirme com outros indicadores");
    } else if (forca >= 2 && confianca >= 80) {
        // Sinal fraco mas confiança muito alta - pode ser pullback
        sinal = "NEUTRO";
        detalhes.sinal_potencial = "COMPRA_FRACO";
    } else if (forca >= 3) {
        sinal = "NEUTRO";
    }

    // VENDA: thresholds similares para consistência
    if (forca <= -4 && confianca >= 70) {
        sinal = "VENDA";
    } else if (forca <= -3 && confianca >= 70) {
        sinal = "VENDA";
        confianca = Math.round(confianca * 0.85);
    } else if (forca <= -3) {
        sinal = "NEUTRO";
    }

    return { sinal, forca, confianca, avisos, detalhes };
}

module.exports = { gerarSinal };