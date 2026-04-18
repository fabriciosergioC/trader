const { analisarAtivo } = require("./services/analysis");

async function testLongTerm() {
    console.log("🧪 Iniciando teste de estratégia de Longo Prazo...");
    
    // Lista de teste com alguns ativos conhecidos
    const ativos = ["PETR4.SA", "VALE3.SA", "ITUB4.SA", "WEGE3.SA"];
    
    for (let ticker of ativos) {
        try {
            console.log(`\n🔍 Analisando ${ticker}...`);
            const resultado = await analisarAtivo(ticker, {}, true);
            
            console.log(`Preço: ${resultado.preco}`);
            console.log(`SMA 50: ${resultado.sma50}`);
            console.log(`SMA 200: ${resultado.sma200}`);
            console.log(`Sinal Longo Prazo: ${resultado.sinal_longo_prazo}`);
            console.log(`Sinal Conservador: ${resultado.sinal}`);
            console.log(`Destaques: ${JSON.stringify(resultado.detalhes)}`);
            
            if (resultado.sma200 === null || resultado.sma50 === null) {
                console.error("❌ Falha: Médias móveis não calculadas!");
            } else {
                console.log("✅ Dados de médias móveis calculados corretamente.");
            }
            
        } catch (error) {
            console.error(`❌ Erro ao testar ${ticker}:`, error.message);
        }
    }
}

testLongTerm();
