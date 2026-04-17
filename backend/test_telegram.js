require('dotenv').config();
const { verificarAlerta } = require('./alerts');

console.log("🚀 Iniciando teste de conexão com Telegram...");

// Simulação de um sinal forte de COMPRA para disparar o alerta
const mockDados = [
    {
        ticker: "TESTE4.SA",
        sinal: "COMPRA",
        confianca: 85,
        preco: 25.50,
        detalhes: {
            score: 12,
            stops: {
                takeProfit: 28.50,
                stopLoss: 23.00
            }
        },
        avisos: ["🔔 TESTE DE CONEXÃO: Seu sistema TradeAI está ONLINE e pronto para enviar alertas!"]
    }
];

verificarAlerta(mockDados);

console.log("✅ Script de teste executado. Verifique seu Telegram!");
