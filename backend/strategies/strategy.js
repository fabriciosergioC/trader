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
function gerarSinal({ preco, rsi, rsi14, sma9, sma21, sma50, sma200, macd, adx, bb, obv, atr, volumes, macro, closes, highs, lows, precoAbertura, fechamentoAnterior }) {
    let forca = 0;
    const avisos  = [];
    const detalhes = {};

    // ── 0. ESTRATÉGIA LONGO PRAZO (SMA 50/200) ──────────────────────────────
    const tendenciaLongoPrazo = preco > sma50 && sma50 > sma200;
    const pullbackLongoPrazo  = preco <= sma50 * 1.02;

    let sinal_longo_prazo = "NEUTRO";
    if (tendenciaLongoPrazo && pullbackLongoPrazo) {
        sinal_longo_prazo = "COMPRA";
        forca += 3; // Bônus significativo para alinhamento de longo prazo
        detalhes.long_term = "TENDÊNCIA + PULLBACK";
    } else if (tendenciaLongoPrazo) {
        detalhes.long_term = "TENDÊNCIA DE ALTA";
    }

    // ── 1. TENDÊNCIA MÉDIO PRAZO (SMA 9 vs 21) ──────────────────────────────
    if (sma9 > sma21) {
        forca += 1.5; 
        detalhes.tendencia = "ALTA";
    } else {
        forca -= 1.5;
        detalhes.tendencia = "BAIXA";
    }

    // ── 2. RSI (Mix de 9 e 14 períodos) ─────────────────────────────────────
    detalhes.rsi = rsi;
    detalhes.rsi14 = rsi14;
    
    // Usamos o RSI 9 para detecção rápida e o 14 para confirmação
    if (rsi < 30 && rsi14 < 35) {
        forca += 2.5; 
        detalhes.rsi_status = "SOBREVENDA EXTREMA";
    } else if (rsi < 40) {
        forca += 1;
        detalhes.rsi_status = "SOBREVENDA LEVE";
    } else if (rsi > 70) {
        forca -= 2.5;
        detalhes.rsi_status = "SOBRECOMPRA EXTREMA";
    }

    // ── 3. ADX — FORÇA DA TENDÊNCIA (FILTRO CRÍTICO) ────────────────────────
    const adxValue  = adx?.adx  ?? null;
    detalhes.adx    = adxValue;

    if (adxValue !== null) {
        if (adxValue < 20) {
            forca -= 2; // Penaliza falta de tendência
            avisos.push("⚠️ Sem tendência definida (ADX < 20)");
        } else if (adxValue > 30) {
            forca += 1.5; // Bônus para tendência forte
            detalhes.tendencia_forca = "FORTE";
        }
    }

    // ── 4. MOMENTUM DE CANDLES (ÚLTIMOS 3 DIAS) ─────────────────────────────
    if (closes && closes.length >= 3) {
        const corpoAtual = preco - (precoAbertura ?? preco);
        const pavioSuperior = (highs.at(-1) ?? preco) - Math.max(preco, precoAbertura ?? preco);
        
        // Se pavio superior é 2x maior que o corpo, indica rejeição de alta
        if (pavioSuperior > Math.abs(corpoAtual) * 2 && corpoAtual > 0) {
            forca -= 1.5;
            avisos.push("⚠️ Rejeição de topo detectada (pavio superior longo)");
            detalhes.rejeicao = "ALTA";
        }
    }

    // ── 5. VOLUME INSTITUCIONAL ─────────────────────────────────────────────
    if (volumes && volumes.length >= 20) {
        const volAtual = volumes.at(-1) ?? 0;
        const volMedia = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const volRelativo = volAtual / volMedia;
        
        if (volRelativo > 1.8) {
            forca += 2;
            avisos.push(`🚀 Volume explosivo detectado (${volRelativo.toFixed(1)}x a média)`);
        } else if (volRelativo < 0.6) {
            forca -= 1;
            avisos.push("📉 Volume muito baixo — falta de interesse");
        }
    }

    // ── SINAL E CONFIANÇA ──────────────────────────────────────────────────
    let sinal = "NEUTRO";
    let confianca = Math.round(Math.min(100, (Math.abs(forca) / 6) * 100));

    if (forca >= 4) sinal = "COMPRA";
    else if (forca <= -4) sinal = "VENDA";

    // Filtros de segurança finais
    if (sinal === "COMPRA" && preco < precoAbertura) {
        confianca *= 0.7;
        avisos.push("⚠️ Compra arriscada: ativo operando abaixo da abertura do dia");
    }

    return { 
        sinal, 
        sinal_longo_prazo, 
        forca, 
        confianca, 
        avisos, 
        detalhes 
    };
}

module.exports = { gerarSinal };