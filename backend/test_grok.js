const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { analisarAtivo } = require('./services/analysis');
const { buscarContextoMacro } = require('./services/contextMacro');

async function testGrok() {
    console.log("🚀 Iniciando teste do Grok (xAI)...");
    const ticker = "VALE3.SA";
    
    try {
        console.log(`📊 Buscando dados e gerando análise para ${ticker} via Grok...`);
        const macro = await buscarContextoMacro();
        
        // O analisarAtivo chama geraVereditoIA internamente, que agora prioriza o Grok
        const resultado = await analisarAtivo(ticker, macro, false);

        if (resultado.vereditoIA) {
            console.log("\n✅ Veredito do Grok recebido com sucesso:");
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
            console.log("\n❌ Veredito do Grok não foi gerado. Verifique a GROK_API_KEY no .env");
        }
    } catch (error) {
        console.error("\n❌ Erro durante o teste:", error.message);
        if (error.response) {
            console.error("Detalhes do erro:", error.response.data);
        }
    }
}

testGrok();
