
const { analisarAtivo } = require('./services/analysis');
const { buscarContextoMacro } = require('./services/contextMacro');
require('dotenv').config();

async function testGemini() {
    console.log("🚀 Iniciando teste do Gemini AI...");
    const ticker = "PETR4.SA";
    
    try {
        console.log(`📊 Buscando dados e gerando análise para ${ticker}...`);
        const macro = await buscarContextoMacro();
        const resultado = await analisarAtivo(ticker, macro, false); // false para NÃO pular notícias/IA

        if (resultado.vereditoIA) {
            console.log("\n✅ Veredito da IA recebido com sucesso:");
            console.log("------------------------------------------");
            console.log(`Sentimento: ${resultado.vereditoIA.sentimento}`);
            console.log(`Recomendação: ${resultado.vereditoIA.recomendacao}`);
            console.log(`Confiança: ${resultado.vereditoIA.confianca}%`);
            console.log(`\nJustificativa Técnica:\n${resultado.vereditoIA.justificativa_tecnica}`);
            console.log(`\nJustificativa Contexto:\n${resultado.vereditoIA.justificativa_contexto}`);
            console.log("\nAlvos:");
            console.log(`  - Entrada: R$ ${resultado.vereditoIA.alvos?.entrada}`);
            console.log(`  - Stop Loss: R$ ${resultado.vereditoIA.alvos?.stop_loss}`);
            console.log(`  - Take Profit: R$ ${resultado.vereditoIA.alvos?.take_profit}`);
            console.log("------------------------------------------");
        } else {
            console.log("\n❌ Veredito da IA não foi gerado. Verifique a GEMINI_API_KEY no .env");
        }
    } catch (error) {
        console.error("\n❌ Erro durante o teste:", error.message);
    }
}

testGemini();
