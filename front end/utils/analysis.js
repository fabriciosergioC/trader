export function analisarEntrada(d) {
    const pontos = [];
    let pontosPositivos = 0;
    let pontosNegativos = 0;
    let bloqueadores = [];

    // 0. Sinal de Longo Prazo (SMA 50/200) - ALTO PESO
    if (d.sinal_longo_prazo === "COMPRA") {
        pontosPositivos += 4;
        pontos.push({ tipo: "positivo", texto: "💎 Forte tendência de LONGO PRAZO (SMA 50/200)" });
    } else if (d.sma50 > d.sma200) {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "Tendência macro de alta (SMA 50 > 200)" });
    }

    // 1. Sinal base
    if (d.sinal === "COMPRA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "Sinal de COMPRA ativo" });
    } else if (d.sinal === "VENDA") {
        pontosNegativos += 2;
        pontos.push({ tipo: "negativo", texto: "Sinal de VENDA ativo" });
    }

    // 2. Confiança
    if (d.confianca >= 60) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `Confiança alta (${d.confianca}%)` });
    } else if (d.confianca >= 35) {
        pontosPositivos += 1;
        pontos.push({ tipo: "neutro", texto: `Confiança moderada (${d.confianca}%)` });
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `Confiança baixa (${d.confianca}%)` });
    }

    // 3. ADX - força da tendência
    if (d.adx >= 25) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `ADX forte (${d.adx.toFixed(1)}) - tendência definida` });
    } else if (d.adx < 20) {
        bloqueadores.push("⚠️ ADX muito baixo - mercado lateral forte");
        pontosNegativos += 3;
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `ADX moderado (${d.adx.toFixed(1)}) - tendência fraca` });
    }

    // 4. Tendência SMA
    if (d.sma9 > d.sma21) {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "SMA9 acima SMA21 - tendência de alta" });
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "SMA9 abaixo SMA21 - tendência de baixa" });
    }

    // 5. RSI
    if (d.rsi < 40) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `RSI sobrevendido (${d.rsi.toFixed(1)}) - bom ponto` });
    } else if (d.rsi > 60) {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `RSI sobrecomprado (${d.rsi.toFixed(1)})` });
    } else {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: `RSI neutro (${d.rsi.toFixed(1)})` });
    }

    // 6. MACD
    if (d.detalhes?.macd_status === "BULLISH") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "MACD bullish" });
    } else if (d.detalhes?.macd_status === "BEARISH") {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "MACD bearish" });
    }

    // 7. OBV
    if (d.obv_trend === "SUBINDO") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "OBV subindo - pressão de compra" });
    } else if (d.obv_trend === "CAINDO") {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "OBV caindo - pressão de venda" });
    }

    // 8. Divergências
    if (d.detalhes?.rsi_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência RSI bullish confirma compra" });
    } else if (d.detalhes?.rsi_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência RSI bearish confirma venda" });
    } else if (d.detalhes?.rsi_divergence && d.sinal !== "NEUTRO") {
        bloqueadores.push("⚠️ Divergência RSI contradiz sinal");
        pontosNegativos += 2;
    }

    if (d.detalhes?.macd_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência MACD bullish confirma" });
    } else if (d.detalhes?.macd_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência MACD bearish confirma" });
    }

    // 9. Pullback
    if (d.detalhes?.pullback?.isPullback) {
        const pb = d.detalhes.pullback;
        if ((pb.direction === "BUY" && d.sinal === "COMPRA") || 
            (pb.direction === "SELL" && d.sinal === "VENDA")) {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: `🎯 Pullback detectado - ótimo ponto! (${pb.quality}%)` });
        }
    }

    // 10. Volume Accumulation
    if (d.detalhes?.volume_accumulation) {
        const vol = d.detalhes.volume_accumulation;
        if (vol.trend === "ACUMULAÇÃO" && d.sinal === "COMPRA") {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: "💰 Acumulação de volume - instituições comprando" });
        } else if (vol.trend === "DISTRIBUIÇÃO" && d.sinal === "VENDA") {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: "💰 Distribuição de volume - instituições vendendo" });
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
        pontos.push({ tipo: "negativo", texto: "⚡ Alta volatilidade - risco elevado" });
    } else if (d.detalhes?.volatilidade === "BAIXA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "Volatilidade baixa - risco controlado" });
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
            pontos.push({ tipo: "positivo", texto: `Momentum positivo no dia (+${varIntra.toFixed(1)}%)` });
        }
    }

    // 14. Momentum dos últimos candles
    if (d.detalhes?.momentum_candles) {
        const { vermelhos, verdes } = d.detalhes.momentum_candles;
        if (d.sinal === "COMPRA" && vermelhos >= 3) {
            pontosNegativos += 2;
            pontos.push({ tipo: "negativo", texto: "3 candles vermelhos seguidos — momentum fraco" });
        } else if (d.sinal === "COMPRA" && verdes >= 2) {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: "Momentum de alta nos últimos candles" });
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
            pontos.push({ tipo: "positivo", texto: `Alta de ${var5dias.toFixed(1)}% nos últimos 5 dias` });
        }
    }

    // 16. Candlestick Patterns (B3 Specialist)
    if (d.detalhes?.candlestick_patterns && d.detalhes.candlestick_patterns.length > 0) {
        d.detalhes.candlestick_patterns.forEach(p => {
            const isBullishPattern = p.pattern.type === 'bullish';
            const isBearishPattern = p.pattern.type === 'bearish';
            const highConfidence = p.confidence >= 70;

            if (d.sinal === "COMPRA" && isBullishPattern) {
                const bonus = highConfidence ? 3 : 1;
                pontosPositivos += bonus;
                pontos.push({ tipo: "positivo", texto: `🕯️ ${p.pattern.namePortuguese} (${p.confidence}%) confirma COMPRA` });
            } else if (d.sinal === "VENDA" && isBearishPattern) {
                const bonus = highConfidence ? 3 : 1;
                pontosPositivos += bonus; 
                pontos.push({ tipo: "positivo", texto: `🕯️ ${p.pattern.namePortuguese} (${p.confidence}%) confirma VENDA` });
            } else if (d.sinal === "COMPRA" && isBearishPattern && highConfidence) {
                bloqueadores.push(`⚠️ ${p.pattern.namePortuguese} contradiz compra`);
                pontosNegativos += 3;
            } else if (d.sinal === "VENDA" && isBullishPattern && highConfidence) {
                bloqueadores.push(`⚠️ ${p.pattern.namePortuguese} contradiz venda`);
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
                // Preço ricocheteando no suporte
                const bonus = volRatio > 1.3 ? 4 : 3;
                pontosPositivos += bonus;
                pontos.push({ 
                    tipo: "positivo", 
                    texto: `🛡️ Suporte Sólido (Faixa R$ ${sr.support.mean?.toFixed(2)}) - Ponto de ricochete com ${sr.support.touches} toques` 
                });
            } else if (sr.entry_zone_status === "SUPORTE_PERIGO") {
                // Suporte prestes a romper para baixo (breakdown)
                bloqueadores.push(`🚫 Suporte sob alta pressão. Alto risco de rompimento de baixa (Prob: ${sr.breakout_probability}%)`);
                pontosNegativos += 4;
            } else if (sr.entry_zone_status === "ROMPIMENTO_ALTA_CONFIRMADO") {
                // Rompimento de alta confirmado com volume
                pontosPositivos += 4;
                pontos.push({ 
                    tipo: "positivo", 
                    texto: `🚀 Rompimento de Resistência (Teto) Confirmado com Volume (${volRatio.toFixed(1)}x)` 
                });
            } else if (sr.entry_zone_status === "RESISTENCIA_RESPEITADA") {
                // Comprando no topo do canal (rejeição iminente)
                bloqueadores.push(`🚫 Preço em zona de resistência forte (R$ ${sr.resistance.mean?.toFixed(2)}). Alto risco de rejeição!`);
                pontosNegativos += 3;
            }
        } else if (d.sinal === "VENDA") {
            if (sr.entry_zone_status === "RESISTENCIA_RESPEITADA") {
                // Preço ricocheteando na resistência
                pontosPositivos += 3;
                pontos.push({ 
                    tipo: "positivo", 
                    texto: `🛡️ Resistência Sólida (Faixa R$ ${sr.resistance.mean?.toFixed(2)}) - Ponto de rejeição com ${sr.resistance.touches} toques` 
                });
            } else if (sr.entry_zone_status === "ROMPIMENTO_BAIXA_CONFIRMADO") {
                // Rompimento de baixa (breakdown) confirmado
                pontosPositivos += 4;
                pontos.push({ 
                    tipo: "positivo", 
                    texto: `📉 Rompimento de Suporte (Chão) Confirmado com Volume (${volRatio.toFixed(1)}x)` 
                });
            } else if (sr.entry_zone_status === "SUPORTE_RESPEITADO") {
                // Vendendo no fundo do canal (recompra iminente)
                bloqueadores.push(`🚫 Preço em zona de suporte forte (R$ ${sr.support.mean?.toFixed(2)}). Alto risco de ricochete!`);
                pontosNegativos += 3;
            }
        }
    }

    // 16c. ORDER FLOW MICROSTRUCTURE (Times & Trades + Super DOM)
    const tt = d.detalhes?.tt_analysis ?? d.tt_analysis;
    const dom = d.detalhes?.dom_analysis ?? d.dom_analysis;

    if (tt && !tt.error) {
        if (d.sinal === "COMPRA" && tt.delta?.pressure === "COMPRADOR_FORTE") {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: `🌊 T&T Delta fortemente comprador (+${tt.delta.deltaPct}%)` });
        } else if (d.sinal === "COMPRA" && tt.delta?.pressure === "COMPRADOR") {
            pontosPositivos += 1;
            pontos.push({ tipo: "positivo", texto: `🌊 T&T Delta comprador (+${tt.delta.deltaPct}%)` });
        } else if (d.sinal === "COMPRA" && tt.delta?.pressure?.includes("VENDEDOR")) {
            pontosNegativos += 2;
            pontos.push({ tipo: "negativo", texto: `⚠️ T&T Delta vendedor contradiz compra` });
        }

        if (d.sinal === "COMPRA" && tt.clusters?.institutionalActivity === "COMPRA_INSTITUCIONAL") {
            pontosPositivos += 3;
            pontos.push({ tipo: "positivo", texto: `🏦 T&T Acumulação Institucional ativa (${tt.clusters.recentClusters} clusters)` });
        }
    }

    if (dom && !dom.error) {
        if (d.sinal === "COMPRA" && dom.absorption?.absorptionType === "ABSORÇÃO_COMPRA") {
            pontosPositivos += 4;
            pontos.push({ tipo: "positivo", texto: "🛡️ DOM Absorção de compra no suporte (Institucional defendendo!)" });
        } else if (d.sinal === "COMPRA" && dom.absorption?.absorptionType === "ABSORÇÃO_VENDA") {
            bloqueadores.push("🚫 Absorção institucional de VENDA na resistência");
            pontosNegativos += 3;
        }

        if (d.sinal === "COMPRA" && dom.iceberg?.hasIceberg && dom.iceberg.latestIceberg?.type === "ICEBERG_COMPRA") {
            pontosPositivos += 3;
            pontos.push({ tipo: "positivo", texto: "🧊 DOM Iceberg de compra detectado (Ordem oculta grande)" });
        }
        
        if (d.sinal === "COMPRA" && dom.orderBook?.imbalance > 25) {
            pontosPositivos += 1;
            pontos.push({ tipo: "positivo", texto: `⚖️ DOM Imbalance comprador no book (${dom.orderBook.imbalance.toFixed(0)}%)` });
        }
    }

    // 17. Veredito da Inteligência Artificial (Gemini) - JUIZ FINAL
    if (d.vereditoIA && !d.vereditoIA.erro) {
        const recIA = d.vereditoIA.recomendacao?.toUpperCase() || "NEUTRO";
        const confIA = d.vereditoIA.confianca || 50;

        if (recIA === "COMPRA" && d.sinal === "COMPRA") {
            pontosPositivos += 5;
            pontos.unshift({ tipo: "positivo", texto: `🧠 IA Confirma COMPRA (${confIA}%) - Confluência Total` });
        } else if (recIA === "VENDA" && d.sinal === "VENDA") {
            pontosPositivos += 5;
            pontos.unshift({ tipo: "positivo", texto: `🧠 IA Confirma VENDA (${confIA}%) - Confluência Total` });
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

    // Calcular score final
    const score = pontosPositivos - pontosNegativos;

    // Determinar recomendação base algorítmica
    let recomendacao = "NEUTRO";
    let cor = "blue";
    let icone = "◆";
    let mensagem = "Monitorando mercado";

    if (bloqueadores.length >= 2) {
        recomendacao = "EVITAR";
        cor = "red";
        icone = "🚫";
        mensagem = "Condições desfavoráveis (Múltiplos bloqueios)";
    } else if (score <= 0) {
        recomendacao = "MONITORAR";
        cor = "yellow";
        icone = "🔎";
        mensagem = "Aguardando melhor sinal técnico";
    } else if (score >= 8 && d.confianca >= 65 && d.sinal !== "NEUTRO") {
        recomendacao = "ENTRAR";
        cor = "green";
        icone = "✅";
        mensagem = d.sinal === "COMPRA"
            ? "Ótima oportunidade de compra detectada!"
            : "Ótima oportunidade de venda detectada!";
    } else if (score >= 5 && d.confianca >= 55 && d.sinal !== "NEUTRO") {
        recomendacao = "ENTRAR COM CAUTELA";
        cor = "blue";
        icone = "⚡";
        mensagem = "Sinal positivo com riscos moderados";
    }

    // --- OVERRIDE DA INTELIGÊNCIA ARTIFICIAL (DECISÃO FINAL) ---
    // A IA atua como filtro de segurança primário e veta a operação se houver risco
    if (d.vereditoIA && !d.vereditoIA.erro) {
        const recIA = d.vereditoIA.recomendacao?.toUpperCase() || "NEUTRO";
        
        if (recIA === "AGUARDAR" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "VETADO PELA IA";
            cor = "yellow";
            icone = "✋";
            mensagem = "A IA detectou riscos no contexto atual (Candlestick/Macro/Notícias). Fique de fora.";
        } else if (recIA === "VENDA" && d.sinal === "COMPRA" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "CANCELADO: DIVERGÊNCIA";
            cor = "red";
            icone = "❌";
            mensagem = "Conflito Extremo: Algoritmo sugere Compra, IA sugere Venda. Operação abortada.";
        } else if (recIA === "COMPRA" && d.sinal === "VENDA" && (recomendacao.includes("ENTRAR") || recomendacao === "MONITORAR")) {
            recomendacao = "CANCELADO: DIVERGÊNCIA";
            cor = "red";
            icone = "❌";
            mensagem = "Conflito Extremo: Algoritmo sugere Venda, IA sugere Compra. Operação abortada.";
        } else if ((recIA === d.sinal) && recomendacao.includes("ENTRAR")) {
            recomendacao = "ENTRADA CONFIRMADA PELA IA";
            cor = "green";
            icone = "🎯";
            mensagem = "Algoritmo e IA em total sintonia técnica e macroeconômica. Sinal muito forte!";
        }
    }

    return {
        recomendacao,
        cor,
        icone,
        mensagem,
        score,
        pontosPositivos,
        pontosNegativos,
        bloqueadores,
        pontos: pontos.slice(0, 7) // Mostramos até 7 pontos para garantir que a IA apareça
    };
}
