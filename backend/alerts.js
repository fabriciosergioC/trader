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
        console.log('⚠️ Alerta: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env. O sinal não será enviado.');
        return;
    }

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: mensagem,
            parse_mode: 'HTML',
            disable_web_page_preview: false
        });
        console.log('✅ Alerta enviado para o Telegram!');
    } catch (error) {
        console.error('❌ Erro ao enviar para o Telegram:', error.response?.data || error.message);
    }
}

function verificarAlerta(dados) {
    if (!Array.isArray(dados)) return;

    dados.forEach(d => {
        const { ticker, sinal, confianca, preco, detalhes, avisos, vereditoIA } = d;
        const score = d.score || (detalhes?.score);

        // 🟢 ALERTA DE COMPRA (Filtro ajustado para mais oportunidades)
        if (sinal === "COMPRA" && confianca >= 65) {
            let msg = `<b>🚀 SINAL DE COMPRA: ${ticker.replace('.SA', '')}</b>\n\n` +
                      `💰 <b>Preço:</b> R$ ${preco.toFixed(2)}\n` +
                      `🔥 <b>Confiança:</b> ${confianca}%\n` +
                      `📊 <b>Score Técnico:</b> ${score > 0 ? '+' : ''}${score}\n`;
            
            if (vereditoIA && !vereditoIA.erro) {
                msg += `\n<b>🤖 ANÁLISE GEMINI AI:</b>\n` +
                       `💬 ${vereditoIA.justificativa_tecnica || vereditoIA.justificativa}\n` +
                       `🎯 <b>Alvo:</b> R$ ${vereditoIA.alvos?.take_profit?.toFixed(2) || '—'}\n` +
                       `🛡️ <b>Stop:</b> R$ ${vereditoIA.alvos?.stop_loss?.toFixed(2) || '—'}\n`;
            } else {
                msg += `🎯 <b>Alvo Sugerido:</b> R$ ${detalhes?.stops?.takeProfit?.toFixed(2) || '—'}\n` +
                       `🛡️ <b>Stop Loss:</b> R$ ${detalhes?.stops?.stopLoss?.toFixed(2) || '—'}\n` +
                       `📝 <b>Motivo:</b> ${avisos[0] || 'Tendência de alta confirmada'}\n`;
            }

            msg += `\n#${ticker.replace('.SA', '')} #TradeAI #B3`;
            
            console.log('\x1b[32m%s\x1b[0m', `[ALERT] ${msg}`); // Verde no console
            enviarParaTelegram(msg);
        }

        // 🔴 ALERTA DE VENDA / PROTEÇÃO
        if (detalhes?.alerta_venda?.ativo && detalhes.alerta_venda.nivel === 'ALTO') {
            const msg = `<b>🚨 ALERTA DE SAÍDA: ${ticker.replace('.SA', '')}</b>\n\n` +
                        `📉 <b>Preço:</b> R$ ${preco.toFixed(2)}\n` +
                        `⚠️ <b>Motivo:</b> ${detalhes.alerta_venda.motivos[0]}\n` +
                        `📢 <b>Ação:</b> Considere realizar lucro ou apertar o Stop!\n\n` +
                        `#${ticker.replace('.SA', '')} #Venda #Proteção`;
            
            console.log('\x1b[31m%s\x1b[0m', `[ALERT] ${msg}`); // Vermelho no console
            enviarParaTelegram(msg);
        }
    });
}

module.exports = { verificarAlerta };
