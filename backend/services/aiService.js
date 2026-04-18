const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

/**
 * geraVereditoIA — Envia dados técnicos e notícias para o Gemini gerar um parecer
 */
async function geraVereditoIA(dadosAtivo, dadosMacro) {
    if (!process.env.GEMINI_API_KEY) {
        return { erro: "GEMINI_API_KEY não configurada no .env" };
    }

    try {
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
        ${dadosAtivo.noticias && dadosAtivo.noticias.length > 0 
            ? dadosAtivo.noticias.map(n => `- ${n.title}`).join('\n')
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
        const text = response.text();
        
        // Limpeza agressiva da resposta da IA para garantir JSON válido
        let jsonStr = text.replace(/```json|```/g, "").trim();
        
        // Tentar extrair apenas o conteúdo entre chaves se houver lixo antes/depois
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
            jsonStr = match[0];
        }

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            console.error("Erro ao fazer parse do JSON da IA:", e.message, "Texto:", text);
            // Fallback caso a IA retorne algo inválido
            return {
                sentimento: "Neutro",
                recomendacao: "Aguardar",
                justificativa_tecnica: "Análise técnica prejudicada por falha na IA.",
                justificativa_contexto: "Ocorreu um erro no processamento da inteligência artificial.",
                alvos: { entrada: dadosAtivo.preco, stop_loss: dadosAtivo.preco * 0.95, take_profit: dadosAtivo.preco * 1.10 },
                confianca: 50
            };
        }
    } catch (error) {
        console.error("Erro no Gemini AI:", error.message);
        return { erro: "Falha ao gerar veredito da IA" };
    }
}

module.exports = { geraVereditoIA };
