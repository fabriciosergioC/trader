const { verificarAlerta } = require('./alerts');
require('dotenv').config();

async function testTelegram() {
    console.log("📤 Iniciando teste de envio para o Telegram...");
    
    // Mock de um ativo com análise da IA
    const mockDados = [{
        ticker: "PETR4.SA",
        preco: 42.50,
        sinal: "COMPRA",
        confianca: 85,
        score: 12,
        detalhes: {
            stops: {
                takeProfit: 48.00,
                stopLoss: 40.00
            }
        },
        avisos: ["RSI em sobrevenda", "Tendência de alta forte"],
        vereditoIA: {
            justificativa_tecnica: "O ativo apresenta um padrão de reversão no suporte de R$ 41.00, com RSI saindo da zona de sobrevenda. O volume acima da média confirma o interesse institucional.",
            alvos: {
                take_profit: 48.50,
                stop_loss: 39.80
            }
        }
    }];

    console.log("🔄 Disparando alerta simulado...");
    verificarAlerta(mockDados);
    
    if (!process.env.TELEGRAM_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
        console.log("\n❌ ERRO: Variáveis do Telegram estão vazias no .env!");
        console.log("Preencha TELEGRAM_TOKEN e TELEGRAM_CHAT_ID para o teste funcionar.");
    } else {
        console.log("\nℹ️  Aguarde a mensagem no seu Telegram.");
    }
}

testTelegram();
