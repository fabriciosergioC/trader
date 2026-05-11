const { analisarAtivo } = require('./services/analysis');
const { buscarContextoMacro } = require('./services/contextMacro');

async function testPersistence() {
    console.log("🧪 Iniciando teste de persistência analítica...");
    
    try {
        const macro = await buscarContextoMacro();
        const tickers = ["PETR4.SA", "VALE3.SA", "ITUB4.SA", "BBAS3.SA", "MGLU3.SA"];
        
        for (const ticker of tickers) {
            console.log(`\n🔍 Analisando ${ticker}...`);
            const resultado = await analisarAtivo(ticker, macro, true);
            
            console.log(`Sinal Final: ${resultado.sinal} | Original: ${resultado.detalhes.sinal_original} | Dias: ${resultado.dias_consecutivos} | Conf: ${resultado.confianca}%`);
            
            if (resultado.sinal === "NEUTRO" && resultado.detalhes.sinal_original !== "NEUTRO" && resultado.dias_consecutivos < 2) {
                console.log("🛡️  FILTRO ATIVO: Sinal de 1 dia barrado.");
            }
        }

    } catch (error) {
        console.error("❌ Erro no teste:", error.stack);
    }
}

testPersistence();
