const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require("dotenv").config();

// Configurações da API do Google Gemini (Camada Gratuita)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração de segurança para evitar bloqueios em termos técnicos/financeiros
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Usando o modelo Flash que é otimizado para velocidade e possui a maior cota gratuita
const modelGemini = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash", 
    safetySettings 
});

/**
 * geraPrompt — Padroniza a entrada para a IA
 */
function geraPrompt(dadosAtivo, dadosMacro) {
    const noticiasLimitadas = (dadosAtivo.noticias || []).slice(0, 5);
    
    // Formatar padrões de candlestick detectados
    let padroesCandlestick = "Nenhum padrão de candlestick relevante detectado no momento.";
    if (dadosAtivo.detalhes?.candlestick_patterns?.length > 0) {
        padroesCandlestick = dadosAtivo.detalhes.candlestick_patterns.map(p => 
            `- Padrão: ${p.pattern.namePortuguese} (${p.pattern.type.toUpperCase()})\n      Confiança: ${p.confidence}%\n      Confluência: ${p.confluenceScore}%\n      Notas: ${p.notes.join(' | ')}`
        ).join('\n\n    ');
    }

    return `
    Aja como um analista financeiro sênior especializado na B3 (Bolsa Brasileira), certificado com CNPI.
    Sua missão é realizar uma Análise de Entrada focada em Padrões de Candlestick e Confluência Técnica para o ativo ${dadosAtivo.ticker}.
    A estratégia deve avaliar se os padrões detectados oferecem uma oportunidade clara de operação (DAY TRADE ou SWING TRADE).

    DADOS TÉCNICOS DO DIA:
    - Preço Atual: R$ ${dadosAtivo.preco}
    - Abertura: R$ ${dadosAtivo.precoAbertura || 'N/A'}
    - RSI (14): ${dadosAtivo.rsi}
    - ADX: ${dadosAtivo.adx}
    - ATR (Volatilidade): ${dadosAtivo.atr}
    - Tendência: ${dadosAtivo.detalhes?.tendencia || "N/A"}
    - Sinal Algorítmico: ${dadosAtivo.sinal}

    PADRÕES DE CANDLESTICK DETECTADOS (PESO ALTO NA ANÁLISE):
    ${padroesCandlestick}

    CONTEXTO MACRO:
    - VIX: ${dadosMacro?.vix || "N/A"}
    - Selic: ${dadosMacro?.selic || "N/A"}
    - IBOV: ${dadosMacro?.ibov_tendencia || "N/A"}

    NOTÍCIAS:
    ${noticiasLimitadas.length > 0 ? noticiasLimitadas.map(n => `- ${n.titulo}`).join('\n') : "Sem notícias relevantes."}

    Instruções de Análise Estratégica:
    1. Avalie o peso dos Padrões de Candlestick em relação à tendência atual e ao RSI.
    2. Verifique o score de "Confluência" dos padrões detectados para validar a força do sinal.
    3. Defina pontos de entrada precisos, stop loss e take profit (alvo) baseados na volatilidade (ATR) e nos padrões detectados (ex: Stop abaixo da mínima do padrão de reversão).

    Retorne APENAS um JSON válido com a seguinte estrutura estrita:
    {
      "sentimento": "Otimista|Neutro|Pessimista",
      "recomendacao": "Compra|Venda|Aguardar",
      "justificativa_tecnica": "Análise focada nos padrões de candlestick e sua confluência técnica com outros indicadores",
      "justificativa_contexto": "Impacto do cenário macro e das notícias na validade do padrão detectado",
      "previsao_duracao": "Day Trade ou Swing Trade",
      "alvos": { "entrada": number, "stop_loss": number, "take_profit": number },
      "confianca": number
    }
    `;
}

/**
 * geraVereditoHeuristico — Motor Local (100% Gratuito e Ilimitado)
 */
function geraVereditoHeuristico(dadosAtivo) {
    const { rsi, adx, atr, preco, detalhes, ticker } = dadosAtivo;
    const tendencia = detalhes?.tendencia || "Lateral";
    
    let sentimento = "Neutro";
    let recomendacao = "MONITORAR";
    
    if ((rsi > 50 && tendencia.includes("ALTA")) || rsi > 60) {
        sentimento = "Otimista";
        recomendacao = "Compra";
    } else if ((rsi < 50 && tendencia.includes("BAIXA")) || rsi < 40) {
        sentimento = "Pessimista";
        recomendacao = "Venda";
    }

    const volatilidade = atr || (preco * 0.02);
    const isShort = (recomendacao === "Venda");
    const stop_loss = isShort ? preco + (volatilidade * 2) : preco - (volatilidade * 2);
    const take_profit = isShort ? preco - (volatilidade * 3) : preco + (volatilidade * 3);

    return {
        sentimento,
        recomendacao,
        justificativa_tecnica: `Análise técnica automática para ${ticker} baseada em RSI (${rsi.toFixed(1)}) e Tendência (${tendencia}).`,
        justificativa_contexto: "Processado localmente via Motor Heurístico (Grátis e Ilimitado).",
        alvos: {
            entrada: Number(preco.toFixed(2)),
            stop_loss: Number(stop_loss.toFixed(2)),
            take_profit: Number(take_profit.toFixed(2))
        },
        confianca: adx > 25 ? 75 : 60
    };
}

/**
 * geraVereditoGemini — Chamada principal (Gratuita até o limite da cota)
 */
async function geraVereditoGemini(dadosAtivo, dadosMacro) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.length < 10) throw new Error("MISSING_API_KEY");

    const prompt = geraPrompt(dadosAtivo, dadosMacro);
    
    try {
        const result = await modelGemini.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Limpeza de Markdown
        let jsonStr = text.replace(/```json|```/g, "").trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("❌ Erro no Gemini:", error.message);
        throw error;
    }
}

/**
 * geraVereditoIA — Orquestrador: Prioriza Gemini (Grátis) -> Fallback Heurístico
 */
async function geraVereditoIA(dadosAtivo, dadosMacro) {
    try {
        console.log(`🚀 [AI] Gerando veredito gratuito (Gemini) para ${dadosAtivo.ticker}...`);
        return await geraVereditoGemini(dadosAtivo, dadosMacro);
    } catch (error) {
        console.warn(`⚠️ Gemini indisponível ou limite atingido. Usando Motor Heurístico para ${dadosAtivo.ticker}.`);
        return geraVereditoHeuristico(dadosAtivo);
    }
}

module.exports = { geraVereditoIA };
