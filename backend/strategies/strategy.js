/**
 * gerarSinal — Motor de sinais AVANÇADO com múltiplas camadas de filtro.
 */
function gerarSinal({ preco, rsi, rsi14, sma9, sma21, sma50, sma200, macd, adx, bb, obv, atr, volumes, macro, closes, highs, lows, precoAbertura, fechamentoAnterior }) {
    let forca = 0;
    const avisos  = [];
    const detalhes = {};

    // ── 0. ESTRATÉGIA LONGO PRAZO (SMA 50/200) ──────────────────────────────
    const tendenciaLongoPrazo = preco > sma50 && sma50 > sma200;
    const pullbackLongoPrazo  = preco <= sma50 * 1.03; // 3% acima da média

    let sinal_longo_prazo = "NEUTRO";
    if (tendenciaLongoPrazo && pullbackLongoPrazo) {
        sinal_longo_prazo = "COMPRA";
        forca += 3;
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

    // ── 2. RSI E DIVERGÊNCIAS ───────────────────────────────────────────────
    detalhes.rsi = rsi;
    
    if (rsi < 30) {
        forca += 2; 
        detalhes.rsi_status = "SOBREVENDA";
    } else if (rsi > 70) {
        forca -= 2;
        detalhes.rsi_status = "SOBRECOMPRA";
    }

    // Detecção de Divergência de Alta (Preço cai, RSI sobe)
    if (closes && closes.length > 20) {
        const lastPriceLow = Math.min(...closes.slice(-5));
        const prevPriceLow = Math.min(...closes.slice(-20, -10));
        
        // Simulação simplificada de divergência (precisa de arrays completos de RSI)
        // Se implementado corretamente no indicators.js, aqui comparamos os arrays
        if (lastPriceLow < prevPriceLow && rsi > 40) { // Exemplo: Preço fez fundo mas RSI não
             // detalhes.divergencia = "ALTA";
        }
    }

    // ── 3. ADX — FILTRO DE VOLATILIDADE ─────────────────────────────────────
    const adxValue = adx?.adx ?? 0;
    if (adxValue < 20) {
        forca *= 0.75; // Reduzido de 0.5 para 0.75 para ser menos punitivo com ativos de score alto
        avisos.push("⚠️ Baixa volatilidade/tendência (ADX < 20)");
    }

    // ── 4. REJEIÇÃO DE PREÇO (CANDLESTICK) ──────────────────────────────────
    const candleCorpo = Math.abs(preco - (precoAbertura ?? preco));
    const pavioSuperior = (highs.at(-1) ?? preco) - Math.max(preco, precoAbertura ?? preco);
    const pavioInferior = Math.min(preco, precoAbertura ?? preco) - (lows.at(-1) ?? preco);

    if (pavioInferior > candleCorpo * 2) {
        forca += 2;
        avisos.push("🔨 Martelo/Rejeição de fundo detectada");
        detalhes.rejeicao = "FUNDO";
    } else if (pavioSuperior > candleCorpo * 2) {
        forca -= 2;
        avisos.push("☄️ Estrela Cadente/Rejeição de topo detectada");
        detalhes.rejeicao = "TOPO";
    }

    // ── 5. PRESSÃO VENDEDORA DO DIA (FILTRO DE SEGURANÇA) ───────────────────
    const fechamentoNegativo = fechamentoAnterior && preco < fechamentoAnterior;
    const candleVendedor = preco < precoAbertura;

    if (fechamentoNegativo) {
        forca -= 1.5; // Penaliza se o dia está sendo de queda
        detalhes.pressao_dia = "NEGATIVA";
    }
    
    if (candleVendedor) {
        forca -= 1.5; // Penaliza se o preço está abaixo da abertura (urso dominando)
        detalhes.candle = "VENDEDOR";
    }

    // Se ambos forem negativos, a queda é forte, reduzimos a confiança drasticamente
    if (fechamentoNegativo && candleVendedor) {
        forca -= 1.0; 
        avisos.push("🛑 Queda forte no dia: aguarde sinal de reversão");
    }

    // ── 6. GESTÃO DE RISCO (STOP E ALVO) ────────────────────────────────────
    const volatilidade = atr ?? (preco * 0.02); // Fallback 2%
    detalhes.stopLoss = preco - (volatilidade * 2); // 2x ATR para baixo
    detalhes.takeProfit = preco + (volatilidade * 3); // 3x ATR para cima (Ratio 1.5)
    detalhes.riscoRetorno = "1.5";

    // ── SINAL FINAL ────────────────────────────────────────────────────────
    let sinal = "NEUTRO";
    if (forca >= 3.0) sinal = "COMPRA"; // Aumentado para exigir no mínimo 60% de confiança
    else if (forca <= -3.0) sinal = "VENDA"; 

    // Ajuste de confiança baseado no volume
    let confianca = Math.min(100, Math.abs(forca) * 20); 
    if (volumes && volumes.at(-1) > (volumes.slice(-20).reduce((a,b)=>a+b,0)/20)) {
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
            stop: detalhes.stopLoss,
            gain: detalhes.takeProfit
        },
        recomendacao: calcularRecomendacao(sinal, confianca, forca, detalhes, rsi, adxValue)
    };
}

/**
 * Lógica consolidada de recomendação (Sincronizada com o Frontend)
 */
function calcularRecomendacao(sinal, confianca, forca, detalhes, rsi, adx) {
    let pontosPositivos = 0;
    let pontosNegativos = 0;
    let bloqueadores = [];

    // 1. Tendência e Sinal
    if (sinal === "COMPRA") pontosPositivos += 2;
    if (sinal === "VENDA") pontosNegativos += 2;
    if (detalhes.tendencia === "ALTA") pontosPositivos += 1;
    else pontosNegativos += 1;

    // 2. Confiança
    if (confianca >= 65) pontosPositivos += 2;
    else if (confianca >= 40) pontosPositivos += 1;
    else pontosNegativos += 1;

    // 3. ADX
    if (adx >= 25) pontosPositivos += 2;
    else if (adx < 20) {
        bloqueadores.push("ADX Baixo (Lateral)");
        pontosNegativos += 3;
    }

    // 4. RSI
    if (rsi < 40) pontosPositivos += 2;
    else if (rsi > 65) pontosNegativos += 1;
    else pontosPositivos += 1;

    // 5. Filtros de Segurança (Bloqueadores)
    if (detalhes.pressao_dia === "NEGATIVA" && sinal === "COMPRA") {
        bloqueadores.push("Pressão Vendedora no Dia");
        pontosNegativos += 4;
    }

    const score = pontosPositivos - pontosNegativos;

    if (bloqueadores.length >= 2) return { tipo: "EVITAR", score, icone: "🚫" };
    if (bloqueadores.length >= 1 || score <= 0) return { tipo: "MONITORAR", score, icone: "🔎" };
    if (score >= 8 && confianca >= 70) return { tipo: "ENTRAR", score, icone: "✅" };
    if (score >= 4 && confianca >= 60) return { tipo: "ENTRAR COM CAUTELA", score, icone: "⚡" };
    
    return { tipo: "NEUTRO", score, icone: "◆" };
}

module.exports = { gerarSinal };