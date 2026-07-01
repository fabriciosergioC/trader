/**
 * Motor de sinais AVANÇADO com múltiplas camadas de filtro.
 */

function identificarCandlestick(preco, precoAbertura, highs, lows, atr) {
    const candleCorpo = Math.abs(preco - (precoAbertura ?? preco));
    const pavioSuperior = (highs.at(-1) ?? preco) - Math.max(preco, precoAbertura ?? preco);
    const pavioInferior = Math.min(preco, precoAbertura ?? preco) - (lows.at(-1) ?? preco);

    // Doji
    const doji = Math.abs(preco - (precoAbertura ?? preco)) <= (atr ?? 1) * 0.1;
    if (doji) {
        return {
            avisos: ["🟫 Padrão Doji detectado"],
            detalhes: { doji: "DOJI" },
            forca: 0.5
        };
    }
    // Martelo/Rejeição de fundo
    if (pavioInferior > candleCorpo * 2) {
        return {
            avisos: ["🔨 Martelo/Rejeição de fundo detectada"],
            detalhes: { rejeicao: "FUNDO" },
            forca: 2
        };
    }
    // Estrela Cadente/Rejeição de topo
    else if (pavioSuperior > candleCorpo * 2) {
        return {
            avisos: ["☄️ Estrela Cadente/Rejeição de topo detectada"],
            detalhes: { rejeicao: "TOPO" },
            forca: -2
        };
    }
    return null;
}

function gerarSinal({ preco, rsi, rsi14, sma9, sma21, sma50, sma200, macd, adx, adxArray, bb, obv, atr, volumes, macro, closes, highs, lows, precoAbertura, fechamentoAnterior, srAnalysis, ttAnalysis, domAnalysis }) {
    let forca = 0;
    let avisos = [];
    let detalhes = {};

    // ── 0. CANDLESTICK ANALYSIS (BASIC) ─────────────────────────────────────
    const candlestickAnalysis = identificarCandlestick(preco, precoAbertura, highs, lows, atr);
    if (candlestickAnalysis) {
        avisos.push(...candlestickAnalysis.avisos);
        detalhes = { ...detalhes, ...candlestickAnalysis.detalhes };
        forca += candlestickAnalysis.forca;
    }

    // ── 1. ESTRATÉGIA LONGO PRAZO (SMA 50/200) ──────────────────────────────
    const tendenciaLongoPrazo = preco > sma50 && sma50 > sma200;
    const pullbackLongoPrazo = preco <= sma50 * 1.03;

    let sinal_longo_prazo = "NEUTRO";
    if (tendenciaLongoPrazo && pullbackLongoPrazo) {
        sinal_longo_prazo = "COMPRA";
        forca += 3;
        detalhes.long_term = "TENDÊNCIA + PULLBACK";
    } else if (tendenciaLongoPrazo) {
        detalhes.long_term = "TENDÊNCIA DE ALTA";
    }

    // ── 2. TENDÊNCIA MÉDIO PRAZO (SMA 9 vs 21) ──────────────────────────────
    if (sma9 > sma21) {
        forca += 1.5;
        detalhes.tendencia = "ALTA";
    } else {
        forca -= 1.5;
        detalhes.tendencia = "BAIXA";
    }

    // ── 3. RSI E DIVERGÊNCIAS ───────────────────────────────────────────────
    detalhes.rsi = rsi;
    if (rsi < 30) {
        forca += 2;
        detalhes.rsi_status = "SOBREVENDA";
    } else if (rsi > 70) {
        forca -= 2;
        detalhes.rsi_status = "SOBRECOMPRA";
    }

    // ── 4. ADX, +DI E -DI E TENDÊNCIA ────────────────────────────────────────
    const adxObj = adx; // { adx, pdi, mdi }
    const adxValue = adxObj?.adx ?? 0;
    const pdi = adxObj?.pdi ?? 0;
    const mdi = adxObj?.mdi ?? 0;

    // Determinar força/direção do DI
    let diDirection = "NEUTRO";
    if (pdi > mdi) {
        diDirection = "ALTA"; // +DI acima de -DI -> tendência de alta
        forca += 1.5;
        detalhes.di_trend = "ALTA";
    } else if (mdi > pdi) {
        diDirection = "BAIXA"; // -DI acima de +DI -> tendência de baixa
        forca -= 1.5;
        detalhes.di_trend = "BAIXA";
    }

    // Determinar se ADX está subindo ou caindo
    if (adxArray && adxArray.length >= 2) {
        const lastAdx = adxArray.at(-1)?.adx ?? 0;
        const prevAdx = adxArray.at(-2)?.adx ?? 0;
        if (lastAdx > prevAdx) {
            detalhes.adx_trend = "SUBINDO"; // ADX subindo -> tendência ganhando força
            avisos.push("📈 Tendência ganhando força (ADX subindo)");
            
            // Impulsiona a força se estiver alinhado com a direção do DI
            if (diDirection === "ALTA") {
                forca += 1.0;
            } else if (diDirection === "BAIXA") {
                forca -= 1.0;
            }
        } else if (lastAdx < prevAdx) {
            detalhes.adx_trend = "CAINDO"; // ADX caindo -> tendência perdendo força
            avisos.push("📉 Tendência perdendo força (ADX caindo)");
            
            // Suaviza a força se a tendência estiver perdendo ímpeto
            forca *= 0.8;
        }
    }

    if (adxValue < 20) {
        forca *= 0.75;
        avisos.push("⚠️ Baixa volatilidade/tendência (ADX < 20)");
    }

    // ── 5. PRESSÃO DO DIA ───────────────────────────────────────────────────
    const fechamentoPositivo = fechamentoAnterior && preco > fechamentoAnterior;
    const fechamentoNegativo = fechamentoAnterior && preco < fechamentoAnterior;
    const candleComprador = preco > precoAbertura;
    const candleVendedor = preco < precoAbertura;

    if (fechamentoPositivo) {
        forca += 1.0;
        detalhes.pressao_dia = "POSITIVA";
    } else if (fechamentoNegativo) {
        forca -= 1.0;
        detalhes.pressao_dia = "NEGATIVA";
    }

    if (candleComprador) {
        forca += 1.0;
        detalhes.candle = "COMPRADOR";
    } else if (candleVendedor) {
        forca -= 1.0;
        detalhes.candle = "VENDEDOR";
    }

    if (fechamentoPositivo && candleComprador) {
        forca += 0.5;
        avisos.push("🚀 Momentum de alta confirmado no dia");
    }
    if (fechamentoNegativo && candleVendedor) {
        forca -= 0.5;
        avisos.push("🛑 Pressão vendedora no dia");
    }

    // ── 6. ANÁLISE DE ZONAS DE SUPORTE E RESISTÊNCIA (S/R) ───────────────────
    if (srAnalysis) {
        const { entry_action, entry_zone_status } = srAnalysis;
        
        if (entry_action === 'COMPRAR_BOUNCE') {
            forca += 2.0;
            avisos.push("🛡️ Ricochete de alta no Suporte confirmado (Bounce)");
            detalhes.sr_status = "BOUNCE_COMPRA";
        } 
        else if (entry_action === 'VENDER_BOUNCE') {
            forca -= 2.0;
            avisos.push("⚠️ Ricochete de baixa na Resistência confirmado (Bounce)");
            detalhes.sr_status = "BOUNCE_VENDA";
        }
        else if (entry_action === 'COMPRAR_ROMPIMENTO') {
            forca += 3.0;
            avisos.push("🚀 Rompimento de ALTA confirmado com volume forte!");
            detalhes.sr_status = "ROMPIMENTO_ALTA";
        }
        else if (entry_action === 'VENDER_ROMPIMENTO') {
            forca -= 3.0;
            avisos.push("🛑 Rompimento de BAIXA (Perda de Suporte) confirmado!");
            detalhes.sr_status = "ROMPIMENTO_BAIXA";
        }
        else if (entry_zone_status === 'SUPORTE_PERIGO') {
            forca -= 1.5;
            avisos.push("⚠️ Suporte sob extrema pressão. Alto risco de rompimento de baixa!");
            detalhes.sr_status = "SUPORTE_RISCO_ROMPIMENTO";
        }
        else if (entry_zone_status === 'RESISTENCIA_PERIGO') {
            forca += 1.5;
            avisos.push("⚡ Resistência enfraquecida. Alta probabilidade de romper para cima!");
            detalhes.sr_status = "RESISTENCIA_RISCO_ROMPIMENTO";
        }
    }

    // ── 7. ORDER FLOW MICROSTRUCTURE (Times & Trades + Super DOM) ─────────────
    // Ajusta a força do sinal com base em microestrutura de mercado real
    if (ttAnalysis && !ttAnalysis.error) {
        // Delta de pressão direcional
        if (ttAnalysis.delta?.pressure === 'COMPRADOR_FORTE') {
            forca += 2.0;
            avisos.push("🟢 T&T: Delta fortemente comprador — mão forte comprando agressivamente");
            detalhes.tt_pressure = "COMPRADOR_FORTE";
        } else if (ttAnalysis.delta?.pressure === 'COMPRADOR') {
            forca += 1.0;
            detalhes.tt_pressure = "COMPRADOR";
        } else if (ttAnalysis.delta?.pressure === 'VENDEDOR_FORTE') {
            forca -= 2.0;
            avisos.push("🔴 T&T: Delta fortemente vendedor — pressão de venda dominante");
            detalhes.tt_pressure = "VENDEDOR_FORTE";
        } else if (ttAnalysis.delta?.pressure === 'VENDEDOR') {
            forca -= 1.0;
            detalhes.tt_pressure = "VENDEDOR";
        }

        // Atividade institucional via clusters
        if (ttAnalysis.clusters?.institutionalActivity === 'COMPRA_INSTITUCIONAL') {
            forca += 3.0;
            avisos.push("🏦 T&T: Cluster de COMPRA institucional detectado — mão forte acumulando");
            detalhes.tt_institutional = "COMPRA_INSTITUCIONAL";
        } else if (ttAnalysis.clusters?.institutionalActivity === 'VENDA_INSTITUCIONAL') {
            forca -= 3.0;
            avisos.push("🏦 T&T: Cluster de VENDA institucional detectado — mão forte distribuindo");
            detalhes.tt_institutional = "VENDA_INSTITUCIONAL";
        }

        // VWAP como referência
        if (ttAnalysis.vwapPosition === 'ACIMA_VWAP' || ttAnalysis.vwapPosition === 'ACIMA_BANDA1') {
            forca += 0.5;
            detalhes.vwap = ttAnalysis.vwap?.vwap;
            detalhes.tt_vwap_position = ttAnalysis.vwapPosition;
        } else if (ttAnalysis.vwapPosition === 'ABAIXO_VWAP' || ttAnalysis.vwapPosition === 'ABAIXO_BANDA1') {
            forca -= 0.5;
            detalhes.vwap = ttAnalysis.vwap?.vwap;
            detalhes.tt_vwap_position = ttAnalysis.vwapPosition;
        }
    }

    if (domAnalysis && !domAnalysis.error) {
        // Order Flow Imbalance do book de ordens
        if (domAnalysis.ofi?.interpretation === 'FORTE_COMPRA') {
            forca += 2.0;
            avisos.push("📈 DOM: OFI fortemente comprador — compradores dominando o book");
            detalhes.dom_ofi = "FORTE_COMPRA";
        } else if (domAnalysis.ofi?.interpretation === 'COMPRA') {
            forca += 1.0;
            detalhes.dom_ofi = "COMPRA";
        } else if (domAnalysis.ofi?.interpretation === 'FORTE_VENDA') {
            forca -= 2.0;
            avisos.push("📉 DOM: OFI fortemente vendedor — vendedores dominando o book");
            detalhes.dom_ofi = "FORTE_VENDA";
        } else if (domAnalysis.ofi?.interpretation === 'VENDA') {
            forca -= 1.0;
            detalhes.dom_ofi = "VENDA";
        }

        // Absorção institucional — sinal mais forte de todos
        if (domAnalysis.absorption?.absorptionType === 'ABSORÇÃO_COMPRA') {
            forca += 4.0;
            avisos.push("🏦 DOM: Absorção institucional de COMPRA no suporte — SINAL MUITO FORTE!");
            detalhes.dom_absorption = "ABSORÇÃO_COMPRA";
        } else if (domAnalysis.absorption?.absorptionType === 'ABSORÇÃO_VENDA') {
            forca -= 3.0;
            avisos.push("🏦 DOM: Absorção institucional de VENDA na resistência");
            detalhes.dom_absorption = "ABSORÇÃO_VENDA";
        }

        // Iceberg orders
        if (domAnalysis.iceberg?.hasIceberg) {
            const iceberg = domAnalysis.iceberg.latestIceberg;
            if (iceberg?.type === 'ICEBERG_COMPRA') {
                forca += 3.0;
                avisos.push("🧊 DOM: Iceberg de COMPRA detectado — ordem oculta institucional");
                detalhes.dom_iceberg = "ICEBERG_COMPRA";
            } else if (iceberg?.type === 'ICEBERG_VENDA') {
                forca -= 2.0;
                avisos.push("🧊 DOM: Iceberg de VENDA detectado");
                detalhes.dom_iceberg = "ICEBERG_VENDA";
            }
        }

        // Book imbalance (bid vs ask)
        const bookImbalance = domAnalysis.orderBook?.imbalance ?? 0;
        if (bookImbalance > 25) {
            forca += 1.5;
            detalhes.dom_book_imbalance = `COMPRADOR_${bookImbalance.toFixed(0)}`;
        } else if (bookImbalance < -25) {
            forca -= 1.5;
            detalhes.dom_book_imbalance = `VENDEDOR_${Math.abs(bookImbalance).toFixed(0)}`;
        }

        // Posição relativa ao POC e Value Area
        if (domAnalysis.poc && domAnalysis.valueArea) {
            detalhes.poc = domAnalysis.poc.price;
            detalhes.va_high = domAnalysis.valueArea.vaHigh;
            detalhes.va_low  = domAnalysis.valueArea.vaLow;
        }
    }

    // ── SINAL FINAL ────────────────────────────────────────────────────────
    let sinal = "NEUTRO";
    if (forca >= 3.0) sinal = "COMPRA";
    else if (forca <= -3.0) sinal = "VENDA";

    // ── GESTÃO DE RISCO AVANÇADA ─────────────────────────────────────────────
    const basePreco = precoAbertura ?? preco;
    const volatilidade = atr ?? (basePreco * 0.02);

    // ── CALCULAR STOP LOSS CONSERVADOR ──
    let stopLoss;
    if (sinal === "COMPRA") {
        // Stop loss: menor entre suporte recente (ou suporte médio - 0.5 ATR) ou 1.5 ATR de entrada
        const recentLow = Math.min(...(lows?.slice(-10) ?? [basePreco]));
        const supportMean = srAnalysis?.support?.mean ?? null;
        const supportMin = srAnalysis?.support?.min ?? null;
        stopLoss = Math.min(
            basePreco - (volatilidade * 1.5),
            supportMean ? supportMean - (volatilidade * 0.5) : Infinity,
            supportMin ? supportMin - (volatilidade * 0.3) : Infinity,
            recentLow - (volatilidade * 0.2)
        );
    } else if (sinal === "VENDA") {
        // Stop loss para venda: maior entre resistência recente ou 1.5 ATR de entrada
        const recentHigh = Math.max(...(highs?.slice(-10) ?? [basePreco]));
        const resistanceMean = srAnalysis?.resistance?.mean ?? null;
        const resistanceMax = srAnalysis?.resistance?.max ?? null;
        stopLoss = Math.max(
            basePreco + (volatilidade * 1.5),
            resistanceMean ? resistanceMean + (volatilidade * 0.5) : -Infinity,
            resistanceMax ? resistanceMax + (volatilidade * 0.3) : -Infinity,
            recentHigh + (volatilidade * 0.2)
        );
    } else {
        stopLoss = null;
    }
    detalhes.stopLoss = stopLoss;

    // ── CALCULAR MÚLTIPLOS ALVOS (TAKE PROFIT) CONSERVADORES ──
    let alvos = [];
    let takeProfit1, takeProfit2, takeProfit3;
    if (sinal === "COMPRA") {
        // Alvo 1 (Conservador): Primeira resistência ou BB Upper
        let alvo1Candidates = [];
        if (srAnalysis?.resistance?.pivots?.length > 0) {
            // Primeira resistência acima do preço
            const resistancesAbove = srAnalysis.resistance.pivots.filter(r => r > basePreco).sort((a,b) => a - b);
            if (resistancesAbove.length > 0) alvo1Candidates.push(resistancesAbove[0]);
        }
        if (bb?.upper) alvo1Candidates.push(bb.upper);
        alvo1Candidates.push(basePreco + (volatilidade * 1.5)); // Fallback ATR
        takeProfit1 = Math.min(...alvo1Candidates.filter(v => v > basePreco)); // Menor (mais conservador)

        // Alvo 2: Segunda resistência ou BB Upper + 0.5 ATR
        let alvo2Candidates = [];
        if (srAnalysis?.resistance?.pivots?.length > 0) {
            const resistancesAbove = srAnalysis.resistance.pivots.filter(r => r > takeProfit1).sort((a,b) => a - b);
            if (resistancesAbove.length > 0) alvo2Candidates.push(resistancesAbove[0]);
        }
        if (bb?.upper) alvo2Candidates.push(bb.upper + (volatilidade * 0.5));
        alvo2Candidates.push(basePreco + (volatilidade * 2.5));
        takeProfit2 = Math.min(...alvo2Candidates.filter(v => v > takeProfit1));

        // Alvo 3 (Mais ambicioso): Terceira resistência ou SMA 200
        let alvo3Candidates = [];
        if (srAnalysis?.resistance?.pivots?.length > 0) {
            const resistancesAbove = srAnalysis.resistance.pivots.filter(r => r > takeProfit2).sort((a,b) => a - b);
            if (resistancesAbove.length > 0) alvo3Candidates.push(resistancesAbove[0]);
        }
        if (sma200 && sma200 > basePreco) alvo3Candidates.push(sma200);
        alvo3Candidates.push(basePreco + (volatilidade * 3.5));
        takeProfit3 = Math.min(...alvo3Candidates.filter(v => v > takeProfit2));

        detalhes.takeProfit1 = takeProfit1;
        detalhes.takeProfit2 = takeProfit2;
        detalhes.takeProfit3 = takeProfit3;
        detalhes.takeProfit = takeProfit1; // Alvo principal é o mais conservador
        alvos = [takeProfit1, takeProfit2, takeProfit3];
    } else if (sinal === "VENDA") {
        // Alvos para venda
        let alvo1Candidates = [];
        if (srAnalysis?.support?.pivots?.length > 0) {
            const supportsBelow = srAnalysis.support.pivots.filter(r => r < basePreco).sort((a,b) => b - a);
            if (supportsBelow.length > 0) alvo1Candidates.push(supportsBelow[0]);
        }
        if (bb?.lower) alvo1Candidates.push(bb.lower);
        alvo1Candidates.push(basePreco - (volatilidade * 1.5));
        takeProfit1 = Math.max(...alvo1Candidates.filter(v => v < basePreco));

        let alvo2Candidates = [];
        if (srAnalysis?.support?.pivots?.length > 0) {
            const supportsBelow = srAnalysis.support.pivots.filter(r => r < takeProfit1).sort((a,b) => b - a);
            if (supportsBelow.length > 0) alvo2Candidates.push(supportsBelow[0]);
        }
        if (bb?.lower) alvo2Candidates.push(bb.lower - (volatilidade * 0.5));
        alvo2Candidates.push(basePreco - (volatilidade * 2.5));
        takeProfit2 = Math.max(...alvo2Candidates.filter(v => v < takeProfit1));

        let alvo3Candidates = [];
        if (srAnalysis?.support?.pivots?.length > 0) {
            const supportsBelow = srAnalysis.support.pivots.filter(r => r < takeProfit2).sort((a,b) => b - a);
            if (supportsBelow.length > 0) alvo3Candidates.push(supportsBelow[0]);
        }
        if (sma200 && sma200 < basePreco) alvo3Candidates.push(sma200);
        alvo3Candidates.push(basePreco - (volatilidade * 3.5));
        takeProfit3 = Math.max(...alvo3Candidates.filter(v => v < takeProfit2));

        detalhes.takeProfit1 = takeProfit1;
        detalhes.takeProfit2 = takeProfit2;
        detalhes.takeProfit3 = takeProfit3;
        detalhes.takeProfit = takeProfit1;
        alvos = [takeProfit1, takeProfit2, takeProfit3];
    }

    // ── CALCULAR Risco/Recompensa para cada alvo ──
    let riscoRetorno = null;
    if (stopLoss && takeProfit1) {
        const risco = Math.abs(basePreco - stopLoss);
        const recompensa1 = Math.abs(takeProfit1 - basePreco);
        const recompensa2 = Math.abs(takeProfit2 - basePreco);
        const recompensa3 = Math.abs(takeProfit3 - basePreco);
        riscoRetorno = {
            alvo1: `1:${(recompensa1 / risco).toFixed(1)}`,
            alvo2: `1:${(recompensa2 / risco).toFixed(1)}`,
            alvo3: `1:${(recompensa3 / risco).toFixed(1)}`,
            principal: `1:${(recompensa1 / risco).toFixed(1)}`
        };
        detalhes.riscoRetorno = riscoRetorno;
    }

    let confianca = Math.min(100, Math.abs(forca) * 20);
    if (volumes && volumes.at(-1) > (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20)) {
        confianca = Math.min(100, confianca + 10);
    }

    return {
        sinal,
        sinal_longo_prazo,
        forca,
        confianca,
        avisos,
        detalhes,
        alvos: {
            stop: stopLoss,
            gain: takeProfit1,
            alvo1: takeProfit1,
            alvo2: takeProfit2,
            alvo3: takeProfit3,
            riscoRetorno: riscoRetorno
        },
        recomendacao: calcularRecomendacao(sinal, confianca, forca, detalhes, rsi, adxValue)
    };
}

function calcularRecomendacao(sinal, confianca, forca, detalhes, rsi, adx) {
    let pontosPositivos = 0;
    let pontosNegativos = 0;
    let bloqueadores = [];

    if (sinal === "COMPRA") pontosPositivos += 3;
    if (sinal === "VENDA") pontosNegativos += 3;
    if (detalhes.tendencia === "ALTA") pontosPositivos += 1;
    else pontosNegativos += 1;

    if (confianca >= 65) pontosPositivos += 2;
    else if (confianca >= 40) pontosPositivos += 1;
    else pontosNegativos += 1;

    if (adx >= 25) pontosPositivos += 2;
    else if (adx < 20) pontosNegativos += 2;

    if (rsi < 40) pontosPositivos += 2;
    else if (rsi > 65) pontosNegativos += 1;
    else pontosPositivos += 1;

    if (detalhes.pressao_dia === "POSITIVA") pontosPositivos += 2;
    if (detalhes.candle === "COMPRADOR") pontosPositivos += 1;

    if (detalhes.pressao_dia === "NEGATIVA" && sinal === "COMPRA") {
        bloqueadores.push("Fechamento Negativo");
        pontosNegativos += 3;
    }

    const score = pontosPositivos - pontosNegativos;

    if (bloqueadores.length >= 2) return { tipo: "EVITAR", score, icone: "🚫" };
    if (score <= 0) return { tipo: "MONITORAR", score, icone: "🔎" };
    if (score >= 8 && confianca >= 70) return { tipo: "ENTRAR", score, icone: "✅" };
    if (score >= 5 && confianca >= 60) return { tipo: "ENTRAR COM CAUTELA", score, icone: "⚡" };

    return { tipo: "NEUTRO", score, icone: "◆" };
}

module.exports = { gerarSinal };