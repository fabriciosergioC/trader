/**
 * Sistema de Alertas Inteligentes - TradeAI
 * Suporta console estruturado e preparação para Telegram/E-mail
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function enviarParaTelegram(mensagem) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('⚠️ Telegram não configurado. Adicione TELEGRAM_TOKEN e TELEGRAM_CHAT_ID no seu .env');
        return;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: mensagem,
            parse_mode: 'HTML'
        });
        console.log('✅ Alerta enviado para o Telegram!');
    } catch (error) {
        console.error('❌ Erro ao enviar para o Telegram:', error.response?.data || error.message);
    }
}

function verificarAlerta(dados) {
    if (!Array.isArray(dados)) return;

    dados.forEach(d => {
        const { ticker, sinal, confianca, preco, detalhes, avisos } = d;
        const score = d.score || (detalhes?.score);

        // 🟢 ALERTA DE COMPRA FORTE (O "Momento Certo")
        if (sinal === "COMPRA" && confianca >= 75) {
            const msg = `🚀 OPORTUNIDADE DE COMPRA: ${ticker}\n` +
                        `💰 Preço: R$ ${preco.toFixed(2)}\n` +
                        `🔥 Confiança: ${confianca}%\n` +
                        `📊 Score: ${score > 0 ? '+' : ''}${score}\n` +
                        `🎯 Alvo Sugerido: R$ ${detalhes?.stops?.takeProfit?.toFixed(2) || '—'}\n` +
                        `🛡️ Stop Loss: R$ ${detalhes?.stops?.stopLoss?.toFixed(2) || '—'}\n` +
                        `📝 Motivo: ${avisos[0] || 'Tendência de alta confirmada'}`;
            
            console.log('\x1b[32m%s\x1b[0m', `[ALERT] ${msg}`); // Verde no console
            enviarParaTelegram(msg);
        }

        // 🔴 ALERTA DE VENDA / PROTEÇÃO
        if (detalhes?.alerta_venda?.ativo && detalhes.alerta_venda.nivel === 'ALTO') {
            const msg = `🚨 ALERTA DE SAÍDA: ${ticker}\n` +
                        `📉 Preço: R$ ${preco.toFixed(2)}\n` +
                        `⚠️ Motivo: ${detalhes.alerta_venda.motivos[0]}\n` +
                        `📢 Ação: Considere realizar lucro ou apertar o Stop!`;
            
            console.log('\x1b[31m%s\x1b[0m', `[ALERT] ${msg}`); // Vermelho no console
            enviarParaTelegram(msg);
        }

        // 🟡 ALERTA DE PULLBACK (Entrada Otimizada)
        if (detalhes?.pullback?.isPullback && detalhes.pullback.quality > 80) {
            const msg = `🎯 PULLBACK DETECTADO: ${ticker}\n` +
                        `📍 Preço de Entrada: R$ ${preco.toFixed(2)}\n` +
                        `📈 Direção: ${detalhes.pullback.direction}\n` +
                        `✨ Oportunidade de entrada com risco/retorno excelente!`;
            
            console.log('\x1b[33m%s\x1b[0m', `[ALERT] ${msg}`); // Amarelo no console
        }
    });
}

module.exports = { verificarAlerta };
