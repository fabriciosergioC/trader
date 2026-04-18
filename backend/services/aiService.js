const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuração de segurança para evitar bloqueios desnecessários em termos técnicos/financeiros
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", 
    safetySettings 
});

/**
 * sleep — Auxiliar para retry com delay
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * geraVereditoHeuristico — Motor de "IA Local" que não depende de APIs externas.
 * É 100% gratuito, ilimitado e instantâneo.
 */
function geraVereditoHeuristico(dadosAtivo) {
    const { rsi, adx, atr, preco, detalhes, ticker } = dadosAtivo;
    const tendencia = detalhes?.tendencia || "Lateral";
    
    let sentimento = "Neutro";
    let recomendacao = "MONITORAR";
    let justificativa_tecnica = "";
    
    // Lógica de Sentimento e Recomendação baseada em indicadores reais
    if (rsi > 60 && tendencia.includes("ALTA")) {
        sentimento = "Otimista";
        recomendacao = "Compra";
        justificativa_tecnica = `O ativo ${ticker} apresenta forte momentum de alta. O RSI em ${rsi.toFixed(1)} indica pressão compradora saudável, enquanto a tendência confirmada pelas médias móveis sustenta o movimento.`;
    } else if (rsi < 40 && tendencia.includes("BAIXA")) {
        sentimento = "Pessimista";
        recomendacao = "Venda";
        justificativa_tecnica = `O ativo ${ticker} está em tendência de baixa clara. O RSI em ${rsi.toFixed(1)} mostra domínio dos vendedores, e a falta de suporte nas médias curtas sugere continuidade da queda.`;
    } else {
        justificativa_tecnica = `O ativo ${ticker} encontra-se em zona de indefinição. O RSI em ${rsi.toFixed(1)} e o ADX em ${adx?.toFixed(1) || 'N/A'} sugerem ausência de tendência forte no momento, recomendando cautela e monitoramento de suportes.`;
    }

    // Cálculo de alvos baseado em volatilidade (ATR)
    const volatilidade = atr || (preco * 0.02);
    const entrada = preco;
    const stop_loss = recomendacao === "Compra" ? preco - (volatilidade * 2) : preco + (volatilidade * 2);
    const take_profit = recomendacao === "Compra" ? preco + (volatilidade * 3) : preco - (volatilidade * 3);

    return {
        sentimento,
        recomendacao,
        justificativa_tecnica,
        justificativa_contexto: "Análise gerada pelo motor heurístico local (Modo Ilimitado). Esta análise foca puramente nos dados técnicos e estatísticos do ativo para garantir disponibilidade constante.",
        alvos: {
            entrada: Number(entrada.toFixed(2)),
            stop_loss: Number(stop_loss.toFixed(2)),
            take_profit: Number(take_profit.toFixed(2))
        },
        confianca: adx > 25 ? 75 : 60,
        is_unlimited: true
    };
}

/**
 * geraVereditoIA — Tenta usar Gemini, se falhar ou se não houver chave, usa o motor Ilimitado.
 */
async function geraVereditoIA(dadosAtivo, dadosMacro, retries = 1) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    // Se não houver chave ou for a chave padrão, usa o motor ilimitado direto
    if (!apiKey || apiKey === "SUA_CHAVE_AQUI" || apiKey.length < 10) {
        console.log(`🚀 [AI] Usando Motor Ilimitado para ${dadosAtivo.ticker} (Sem API Key)`);
        return geraVereditoHeuristico(dadosAtivo);
    }

    try {
        // Garantir que notícias não estourem o prompt (limitar a 5 notícias)
        const noticiasLimitadas = (dadosAtivo.noticias || []).slice(0, 5);
        
        const prompt = `
        Aja como um analista financeiro sênior especializado na B3 (Bolsa Brasileira), certificado com CNPI.
        Sua tarefa é fornecer uma análise técnica e qualitativa extremamente precisa para o ativo ${dadosAtivo.ticker}.

        DADOS TÉCNICOS ATUAIS:
        - Preço: R$ ${dadosAtivo.preco}
        - RSI (14): ${dadosAtivo.rsi} (Interpretado: <30 Sobrevenda, >70 Sobrecompra)
        - ADX: ${dadosAtivo.adx} (Interpretado: >25 Tendência forte, <20 Sem tendência)
        - ATR: ${dadosAtivo.atr} (Volatilidade média)
        - Tendência (SMA 9 vs 21): ${dadosAtivo.detalhes.tendencia}
        - Sinais de Candle: ${dadosAtivo.detalhes.rejeicao || "Nenhum sinal claro"}
        - Pressão do Dia: ${dadosAtivo.detalhes.pressao_dia || "Neutra"}

        CONTEXTO MACROECONÔMICO:
        - VIX: ${dadosMacro.vix} (Aversão ao risco)
        - Selic Estimada: ${dadosMacro.selic || "N/A"}
        - Tendência IBOV: ${dadosMacro.ibov_tendencia || "N/A"}

        NOTÍCIAS RECENTES DO ATIVO:
        ${noticiasLimitadas.length > 0 
            ? noticiasLimitadas.map(n => `- ${n.title}`).join('\n')
            : "Nenhuma notícia relevante recente."}

        ANÁLISE REQUERIDA:
        1. Sentimento: (Otimista, Neutro ou Pessimista)
        2. Recomendação: (Compra, Venda ou Aguardar)
        3. Justificativa Técnica: Explique baseando-se nos indicadores RSI, ADX e Médias Móveis.
        4. Justificativa Fundamentalista/Notícias: Como o contexto macro e as notícias impactam o ativo.
        5. Alvos: Sugira um Preço de Entrada, Stop Loss e Take Profit com base na volatilidade (ATR) e preço atual.
        6. Confiança: Nível de certeza de 0 a 100%.

        Retorne APENAS um objeto JSON válido (sem markdown, sem textos extras) no formato:
        {
          "sentimento": "string",
          "recomendacao": "string",
          "justificativa_tecnica": "string",
          "justificativa_contexto": "string",
          "alvos": {
            "entrada": number,
            "stop_loss": number,
            "take_profit": number
          },
          "confianca": number
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Verificar se foi bloqueado por segurança antes de tentar ler o texto
        if (response.promptFeedback?.blockReason) {
            console.warn(`⚠️ Prompt bloqueado por segurança: ${response.promptFeedback.blockReason}`);
            throw new Error("SAFETY_FILTER_TRIGGERED");
        }

        const text = response.text();
        
        // Limpeza agressiva da resposta da IA para garantir JSON válido
        let jsonStr = text.replace(/```json|```/g, "").trim();
        
        // Tentar extrair apenas o conteúdo entre chaves se houver lixo antes/depois
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }

        try {
            const parsed = JSON.parse(jsonStr);
            // Validar campos essenciais
            if (!parsed.sentimento || !parsed.recomendacao) throw new Error("JSON incompleto");
            return parsed;
        } catch (e) {
            console.error("Erro ao fazer parse do JSON da IA:", e.message, "Texto:", text);
            throw new Error("JSON_PARSE_ERROR");
        }
    } catch (error) {
        console.error(`❌ Tentativa falhou (${retries} restantes):`, error.message);

        // Se for erro de cota (429) ou erro interno temporário, tenta novamente
        if (retries > 0 && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("500"))) {
            const waitTime = (3 - retries) * 2000; // 2s, 4s...
            console.log(`⏳ Aguardando ${waitTime}ms para nova tentativa...`);
            await sleep(waitTime);
            return geraVereditoIA(dadosAtivo, dadosMacro, retries - 1);
        }

        // Se falhou tudo ou foi segurança, retorna o Motor Heurístico Ilimitado
        console.warn(`⚠️ Utilizando Motor Ilimitado para ${dadosAtivo.ticker} devido a falha na IA: ${error.message}`);
        return geraVereditoHeuristico(dadosAtivo);
    }
}

module.exports = { geraVereditoIA };
