/**
 * Script de teste para verificar as melhorias de assertividade
 */
require("dotenv").config();
const { analisarAtivo } = require("./services/analysis");
const { buscarContextoMacro } = require("./services/contextMacro");

async function testarMelhorias() {
    console.log("🧪 Testando melhorias de assertividade...\n");

    try {
        // Buscar contexto macro
        console.log("📊 Buscando contexto macro...");
        const macro = await buscarContextoMacro();
        console.log("✅ Contexto macro obtido\n");

        // Testar com um ativo
        const ticker = "PETR4.SA";
        console.log(`🔍 Analisando ${ticker}...\n`);

        const resultado = await analisarAtivo(ticker, macro);

        console.log("═".repeat(80));
        console.log(`📈 RESULTADO DA ANÁLISE - ${resultado.ticker}`);
        console.log("═".repeat(80));
        console.log(`Preço atual: R$ ${resultado.preco.toFixed(2)}`);
        console.log(`Sinal: ${resultado.sinal}`);
        console.log(`Força: ${resultado.forca}`);
        console.log(`Confiança: ${resultado.confianca}%`);
        console.log("");

        console.log("📊 INDICADORES TÉCNICOS:");
        console.log(`  RSI: ${resultado.rsi?.toFixed(2) || 'N/A'}`);
        console.log(`  SMA9: ${resultado.sma9?.toFixed(2) || 'N/A'}`);
        console.log(`  SMA21: ${resultado.sma21?.toFixed(2) || 'N/A'}`);
        console.log(`  ADX: ${resultado.adx?.toFixed(2) || 'N/A'}`);
        console.log(`  ATR: ${resultado.atr?.toFixed(2) || 'N/A'}`);
        console.log("");

        if (resultado.detalhes.stops) {
            console.log("🛡️ GESTÃO DE RISCO DINÂMICA:");
            console.log(`  Stop Loss: R$ ${resultado.detalhes.stops.stopLoss?.toFixed(2) || 'N/A'}`);
            console.log(`  Take Profit: R$ ${resultado.detalhes.stops.takeProfit?.toFixed(2) || 'N/A'}`);
            console.log(`  Risk/Reward: ${resultado.detalhes.stops.riskReward}:1`);
            console.log(`  ATR Multiple: ${resultado.detalhes.stops.atrMultiplier}x`);
            console.log("");
        }

        if (resultado.detalhes.rsi_divergence || resultado.detalhes.macd_divergence) {
            console.log("📊 DIVERGÊNCIAS DETECTADAS:");
            if (resultado.detalhes.rsi_divergence) {
                console.log(`  RSI: ${resultado.detalhes.rsi_divergence}`);
            }
            if (resultado.detalhes.macd_divergence) {
                console.log(`  MACD: ${resultado.detalhes.macd_divergence}`);
            }
            console.log("");
        }

        if (resultado.detalhes.pullback) {
            console.log("🎯 OPORTUNIDADE DE PULLBACK:");
            console.log(`  É pullback: ${resultado.detalhes.pullback.isPullback ? 'SIM' : 'NÃO'}`);
            console.log(`  Direção: ${resultado.detalhes.pullback.direction || 'N/A'}`);
            console.log(`  Qualidade: ${resultado.detalhes.pullback.quality || 0}%`);
            console.log(`  Motivo: ${resultado.detalhes.pullback.reason || 'N/A'}`);
            console.log("");
        }

        if (resultado.detalhes.volume_accumulation) {
            console.log("💰 ANÁLISE DE VOLUME AVANÇADA:");
            console.log(`  Trend: ${resultado.detalhes.volume_accumulation.trend}`);
            console.log(`  Strength: ${resultado.detalhes.volume_accumulation.strength}%`);
            console.log("");
        }

        if (resultado.avisos && resultado.avisos.length > 0) {
            console.log("⚠️ AVISOS E ALERTAS:");
            resultado.avisos.forEach((aviso, i) => {
                console.log(`  ${i + 1}. ${aviso}`);
            });
            console.log("");
        }

        console.log("═".repeat(80));
        console.log("✅ Teste concluído com sucesso!");
        console.log("═".repeat(80));

    } catch (error) {
        console.error("❌ Erro no teste:", error.message);
        console.error(error.stack);
    }
}

// Executar teste
testarMelhorias();
