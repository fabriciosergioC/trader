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
        Aja como um analista financeiro sênior especializado na B3 (Bolsa Brasileira).
        Analise os dados abaixo do ativo ${dadosAtivo.ticker} e forneça um veredito de trading.

        DADOS TÉCNICOS:
        - Preço Atual: R$ ${dadosAtivo.preco}
        - RSI: ${dadosAtivo.rsi}
        - Tendência Médio Prazo (SMA 9 vs 21): ${dadosAtivo.detalhes.tendencia}
        - Força da Tendência (ADX): ${dadosAtivo.adx}
        - Volatilidade (ATR): ${dadosAtivo.atr}
        - Sinais de Candle: ${dadosAtivo.detalhes.rejeicao || "Nenhum"}
        - Pressão do Dia: ${dadosAtivo.detalhes.pressao_dia || "Neutra"}

        CONTEXTO MACRO:
        - VIX (Volatilidade Global): ${dadosMacro.vix}
        - Taxa Selic (implícita/foco): ${dadosMacro.selic || "N/A"}
        - Tendência IBOV: ${dadosMacro.ibov_tendencia || "N/A"}

        NOTÍCIAS RECENTES:
        ${dadosAtivo.noticias.map(n => `- ${n.title}`).join('\n')}

        TAREFA:
        1. Classifique o sentimento atual (Otimista, Neutro ou Pessimista).
        2. Dê uma recomendação (Compra, Venda ou Aguardar).
        3. Justifique em no máximo 3 frases curtas e diretas.
        4. Defina um nível de confiança de 0 a 100%.

        Retorne APENAS um objeto JSON no formato:
        {
          "sentimento": "string",
          "recomendacao": "string",
          "justificativa": "string",
          "confianca": "number"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Limpar a resposta caso a IA coloque markdown de código
        const jsonStr = text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Erro no Gemini AI:", error.message);
        return { erro: "Falha ao gerar veredito da IA" };
    }
}

module.exports = { geraVereditoIA };
