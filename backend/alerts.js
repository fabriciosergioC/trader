/**
 * Sistema de Alertas Inteligentes - TradeAI
 * Suporta console estruturado e preparação para Telegram/E-mail
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ── Cache de alertas enviados para evitar spam (limpa a cada 1 hora por ativo) ──
const alertasEnviados = new Map();
const ALERTA_COOLDOWN_MS = 1 * 60 * 60 * 1000; // 1 hora

async function enviarParaTelegram(mensagem) {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.log('⚠️ Alerta: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não configurados no .env. O sinal não será enviado.');
        return;
    }

    // Log para depuração (mascarado por segurança)
    console.log(`📤 Tentando enviar sinal para o Telegram (Token: ${token.substring(0, 5)}..., Chat: ${chatId.substring(0, 3)}...)`);

    try {
        await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
            chat_id: chatId,
            text: mensagem,
            parse_mode: 'HTML',
            disable_web_page_preview: false
        });
        console.log('✅ Alerta enviado para o Telegram com sucesso!');
    } catch (error) {
        console.error('❌ Erro da API do Telegram:', error.response?.data || error.message);
    }
}

function verificarAlerta(dados) {
    if (!Array.isArray(dados)) return;

    const agora = Date.now();
    console.log(`🔍 [ALERTS] Verificando ${dados.length} ativos para possíveis alertas...`);

    dados.forEach(d => {
        const { ticker, sinal, confianca, preco, detalhes, avisos, vereditoIA, recomendacao } = d;
        const score = d.score || (detalhes?.score) || (recomendacao?.score);

        // Chave única para evitar spam do mesmo ativo e mesmo sinal
        const alertaKey = `${ticker}_${sinal}`;
        const lastSent = alertasEnviados.get(alertaKey);

        // 🟢 ALERTA DE COMPRA (Filtro agora sincronizado com o Veredito de Entrada)
        const tipoRec = recomendacao?.tipo || "N/A";
        const podeEnviar = recomendacao && (recomendacao.tipo === "ENTRAR" || recomendacao.tipo === "ENTRAR COM CAUTELA");

        console.log(`   - ${ticker}: Sinal=${sinal}, Confiança=${confianca}%, Rec=${tipoRec}, PodeEnviar=${podeEnviar}`);

        if (sinal === "COMPRA" && podeEnviar) {
            // Se já enviamos este alerta nas últimas 4 horas, pulamos
            if (lastSent && (agora - lastSent) < ALERTA_COOLDOWN_MS) {
                console.log(`   - ${ticker}: Ignorado (Cooldown ativo)`);
                return;
            }

            console.log(`   - ${ticker}: GERANDO MENSAGEM PARA TELEGRAM!`);
            
            let msg = `<b>${recomendacao.icone || '✅'} ${recomendacao.tipo}: ${ticker.replace('.SA', '')}</b>\n\n` +
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
            alertasEnviados.set(alertaKey, agora); // Marcar como enviado
        }

        // 🔴 ALERTA DE VENDA / PROTEÇÃO
        if (detalhes?.alerta_venda?.ativo && detalhes.alerta_venda.nivel === 'ALTO') {
            const vendaKey = `${ticker}_VENDA`;
            const lastVenda = alertasEnviados.get(vendaKey);

            if (lastVenda && (agora - lastVenda) < ALERTA_COOLDOWN_MS) return;

            const msg = `<b>🚨 ALERTA DE SAÍDA: ${ticker.replace('.SA', '')}</b>\n\n` +
                        `📉 <b>Preço:</b> R$ ${preco.toFixed(2)}\n` +
                        `⚠️ <b>Motivo:</b> ${detalhes.alerta_venda.motivos[0]}\n` +
                        `📢 <b>Ação:</b> Considere realizar lucro ou apertar o Stop!\n\n` +
                        `#${ticker.replace('.SA', '')} #Venda #Proteção`;
            
            console.log('\x1b[31m%s\x1b[0m', `[ALERT] ${msg}`); // Vermelho no console
            enviarParaTelegram(msg);
            alertasEnviados.set(vendaKey, agora); // Marcar como enviado
        }
    });
}

module.exports = { verificarAlerta, enviarParaTelegram };
