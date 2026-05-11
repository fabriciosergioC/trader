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

    // ── 5. PRESSÃO DO DIA (FILTRO DE SEGURANÇA E MOMENTUM) ──────────────────
    const fechamentoPositivo = fechamentoAnterior && preco > fechamentoAnterior;
    const fechamentoNegativo = fechamentoAnterior && preco < fechamentoAnterior;
    const candleComprador = preco > precoAbertura;
    const candleVendedor = preco < precoAbertura;

    if (fechamentoPositivo) {
        forca += 1.0; // Bônus por fechar acima de ontem
        detalhes.pressao_dia = "POSITIVA";
    } else if (fechamentoNegativo) {
        forca -= 1.0; // Penalidade reduzida de 1.5 para 1.0
        detalhes.pressao_dia = "NEGATIVA";
    }
    
    if (candleComprador) {
        forca += 1.0; // Bônus por estar acima da abertura
        detalhes.candle = "COMPRADOR";
    } else if (candleVendedor) {
        forca -= 1.0; // Penalidade reduzida de 1.5 para 1.0
        detalhes.candle = "VENDEDOR";
    }

    // Se ambos forem positivos, o momentum é forte
    if (fechamentoPositivo && candleComprador) {
        forca += 0.5;
        avisos.push("🚀 Momentum de alta confirmado no dia");
    }

    // Se ambos forem negativos, a queda é forte, mas evitamos matar o sinal se houver suporte
    if (fechamentoNegativo && candleVendedor) {
        forca -= 0.5; 
        avisos.push("🛑 Pressão vendedora no dia");
    }

    // ── 6. GESTÃO DE RISCO (STOP E ALVO) ────────────────────────────────────
    const volatilidade = atr ?? (preco * 0.02); // Fallback 2%
    detalhes.stopLoss = preco - (volatilidade * 2); // 2x ATR para baixo
    detalhes.takeProfit = preco + (volatilidade * 3); // 3x ATR para cima (Ratio 1.5)
    detalhes.riscoRetorno = "1.5";

    // ── SINAL FINAL ────────────────────────────────────────────────────────
    let sinal = "NEUTRO";
    if (forca >= 3.0) sinal = "COMPRA"; // Aumentado de 2.5 para 3.0 para maior rigor
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
    if (sinal === "COMPRA") pontosPositivos += 3; // Aumentado de 2 para 3
    if (sinal === "VENDA") pontosNegativos += 3;
    if (detalhes.tendencia === "ALTA") pontosPositivos += 1;
    else pontosNegativos += 1;

    // 2. Confiança
    if (confianca >= 65) pontosPositivos += 2;
    else if (confianca >= 40) pontosPositivos += 1;
    else pontosNegativos += 1;

    // 3. ADX
    if (adx >= 25) pontosPositivos += 2;
    else if (adx < 20) {
        // bloqueadores.push("ADX Baixo (Lateral)"); // Removido como bloqueador obrigatório
        pontosNegativos += 2;
    }

    // 4. RSI
    if (rsi < 40) pontosPositivos += 2;
    else if (rsi > 65) pontosNegativos += 1;
    else pontosPositivos += 1;

    // 5. Filtros de Momentum do Dia
    if (detalhes.pressao_dia === "POSITIVA") pontosPositivos += 2;
    if (detalhes.candle === "COMPRADOR") pontosPositivos += 1;

    if (detalhes.pressao_dia === "NEGATIVA" && sinal === "COMPRA") {
        bloqueadores.push("Fechamento Negativo");
        pontosNegativos += 3;
    }

    const score = pontosPositivos - pontosNegativos;

    if (bloqueadores.length >= 2) return { tipo: "EVITAR", score, icone: "🚫" };
    if (score <= 0) return { tipo: "MONITORAR", score, icone: "🔎" };
    if (score >= 8 && confianca >= 70) return { tipo: "ENTRAR", score, icone: "✅" }; // Restaurado para 8/70 para ser mais analítico
    if (score >= 5 && confianca >= 60) return { tipo: "ENTRAR COM CAUTELA", score, icone: "⚡" };
    
    return { tipo: "NEUTRO", score, icone: "◆" };
}

module.exports = { gerarSinal };