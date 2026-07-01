/**
 * Filtros específicos para o mercado brasileiro (B3)
 */

const isLiquid = (candle, minVolume = 500000) => {
    return (candle.volume || 0) >= minVolume;
};

/**
 * Verifica se o horário está dentro da sessão regular da B3
 * @param {Date|string} timestamp 
 * @returns {boolean}
 */
const isRegularSession = (timestamp) => {
    const date = new Date(timestamp);
    // Ajustar para timezone de São Paulo se necessário, mas geralmente dados vêm normalizados
    const hour = date.getHours();
    const minute = date.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // 10h00 às 17h55 (Pregão Regular)
    return totalMinutes >= 600 && totalMinutes <= 1075;
};

/**
 * Identifica se é um dia de alta volatilidade esperado (calendário fixo simplificado)
 * @param {Date} date 
 */
const isHighVolatilityDay = (date) => {
    const day = date.getDate();
    const month = date.getMonth();
    const dayOfWeek = date.getDay();

    // Vencimento de opções (3ª sexta-feira do mês)
    if (dayOfWeek === 5 && day >= 15 && day <= 21) return true;

    return false;
};

module.exports = {
    isLiquid,
    isRegularSession,
    isHighVolatilityDay
};
