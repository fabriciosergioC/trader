/**
 * @typedef {'bullish' | 'bearish' | 'neutral' | 'continuation'} PatternType
 * @typedef {'weak' | 'moderate' | 'strong'} PatternStrength
 * 
 * @typedef {Object} CandlePattern
 * @property {string} name
 * @property {string} namePortuguese
 * @property {PatternType} type
 * @property {PatternStrength} strength
 * @property {number} reliability - 0-100: taxa histórica de acerto no mercado BR
 * @property {number} candlesRequired
 * @property {boolean} confirmationRequired
 * @property {string} description
 * @property {string} tradingRule
 */

const PATTERNS = {
    // CATEGORIA 1 — REVERSÃO DE BAIXA PARA ALTA (Bullish Reversals)
    HAMMER: {
        name: 'Hammer',
        namePortuguese: 'Martelo',
        type: 'bullish',
        strength: 'moderate',
        reliability: 65,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Corpo pequeno na parte superior, sombra inferior longa.',
        tradingRule: 'Confirmar com candle verde no próximo pregão; volume > média 20p'
    },
    INVERTED_HAMMER: {
        name: 'Inverted Hammer',
        namePortuguese: 'Martelo Invertido',
        type: 'bullish',
        strength: 'weak',
        reliability: 55,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Corpo pequeno na parte inferior, sombra superior longa.',
        tradingRule: 'Menor que Hammer, exige confirmação obrigatória. Validar contexto em gaps.'
    },
    DRAGONFLY_DOJI: {
        name: 'Dragonfly Doji',
        namePortuguese: 'Doji Libélula',
        type: 'bullish',
        strength: 'moderate',
        reliability: 60,
        candlesRequired: 1,
        confirmationRequired: false,
        description: 'Abertura = Fechamento na máxima, sombra inferior longa.',
        tradingRule: 'Sinal de reversão de alta em suporte.'
    },
    BULLISH_MARUBOZU: {
        name: 'Bullish Marubozu',
        namePortuguese: 'Marubozu de Alta',
        type: 'bullish',
        strength: 'strong',
        reliability: 75,
        candlesRequired: 1,
        confirmationRequired: false,
        description: 'Corpo longo verde sem sombras.',
        tradingRule: 'Relevante após notícia positiva ou breakout de suporte.'
    },
    BULLISH_ENGULFING: {
        name: 'Bullish Engulfing',
        namePortuguese: 'Engolfo de Alta',
        type: 'bullish',
        strength: 'strong',
        reliability: 72,
        candlesRequired: 2,
        confirmationRequired: false,
        description: 'Candle verde que engloba completamente o corpo do candle vermelho anterior.',
        tradingRule: 'Entrada acima da máxima do candle 2; Stop abaixo da mínima do candle 1.'
    },
    PIERCING_LINE: {
        name: 'Piercing Line',
        namePortuguese: 'Linha Penetrante',
        type: 'bullish',
        strength: 'moderate',
        reliability: 65,
        candlesRequired: 2,
        confirmationRequired: false,
        description: 'Candle verde que abre abaixo da mínima anterior e fecha acima de 50% do corpo anterior.',
        tradingRule: 'Eficaz quando gap de abertura ocorre no after-market NYSE/Nasdaq.'
    },
    TWEEZER_BOTTOM: {
        name: 'Tweezer Bottom',
        namePortuguese: 'Fundo de Pinça',
        type: 'bullish',
        strength: 'weak',
        reliability: 58,
        candlesRequired: 2,
        confirmationRequired: true,
        description: 'Duas mínimas iguais em candles de cores opostas.',
        tradingRule: 'Potencializado em suporte histórico ou número redondo.'
    },
    BULLISH_HARAMI: {
        name: 'Bullish Harami',
        namePortuguese: 'Harami de Alta',
        type: 'bullish',
        strength: 'weak',
        reliability: 53,
        candlesRequired: 2,
        confirmationRequired: true,
        description: 'Pequeno candle verde dentro do corpo do candle vermelho anterior.',
        tradingRule: 'Sinal fraco isolado, usar como alerta de indecisão após queda.'
    },
    MORNING_STAR: {
        name: 'Morning Star',
        namePortuguese: 'Estrela da Manhã',
        type: 'bullish',
        strength: 'strong',
        reliability: 80,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Candle vermelho longo, seguido de corpo pequeno com gap, seguido de verde longo.',
        tradingRule: 'Um dos mais confiáveis. Aguardar candle 3 na segunda se candle 2 for na sexta.'
    },
    MORNING_DOJI_STAR: {
        name: 'Morning Doji Star',
        namePortuguese: 'Estrela da Manhã Doji',
        type: 'bullish',
        strength: 'strong',
        reliability: 82,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Variação do Morning Star com Doji no meio.',
        tradingRule: 'Alta confiabilidade na reversão.'
    },
    THREE_WHITE_SOLDIERS: {
        name: 'Three White Soldiers',
        namePortuguese: 'Três Soldados Brancos',
        type: 'bullish',
        strength: 'strong',
        reliability: 78,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Três candles verdes consecutivos com fechamentos nas máximas.',
        tradingRule: 'Verificar se não há resistência forte próxima.'
    },
    THREE_INSIDE_UP: {
        name: 'Three Inside Up',
        namePortuguese: 'Três por Dentro de Alta',
        type: 'bullish',
        strength: 'moderate',
        reliability: 70,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Harami de alta seguido por um candle verde de confirmação.',
        tradingRule: 'Confirmação segura do Harami.'
    },

    // CATEGORIA 2 — REVERSÃO DE ALTA PARA BAIXA (Bearish Reversals)
    SHOOTING_STAR: {
        name: 'Shooting Star',
        namePortuguese: 'Estrela Cadente',
        type: 'bearish',
        strength: 'moderate',
        reliability: 63,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Corpo pequeno na parte inferior, sombra superior longa.',
        tradingRule: 'Comum em dias de IPCA/FOMC com reversão intraday.'
    },
    HANGING_MAN: {
        name: 'Hanging Man',
        namePortuguese: 'Enforcado',
        type: 'bearish',
        strength: 'weak',
        reliability: 55,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Mesma geometria do Martelo, mas no topo de uma tendência de alta.',
        tradingRule: 'Volume de confirmação é crucial. Corpo vermelho na sessão seguinte confirma.'
    },
    GRAVESTONE_DOJI: {
        name: 'Gravestone Doji',
        namePortuguese: 'Doji Lápide',
        type: 'bearish',
        strength: 'moderate',
        reliability: 62,
        candlesRequired: 1,
        confirmationRequired: false,
        description: 'Abertura = Fechamento na mínima, sombra superior longa.',
        tradingRule: 'Eficaz em topo de IFR sobrecomprado (> 70).'
    },
    BEARISH_MARUBOZU: {
        name: 'Bearish Marubozu',
        namePortuguese: 'Marubozu de Baixa',
        type: 'bearish',
        strength: 'strong',
        reliability: 75,
        candlesRequired: 1,
        confirmationRequired: false,
        description: 'Candle vermelho longo sem sombras.',
        tradingRule: 'Atenção especial em ex-dividendo ou resultados negativos.'
    },
    BEARISH_ENGULFING: {
        name: 'Bearish Engulfing',
        namePortuguese: 'Engolfo de Baixa',
        type: 'bearish',
        strength: 'strong',
        reliability: 74,
        candlesRequired: 2,
        confirmationRequired: false,
        description: 'Candle vermelho que engloba completamente o corpo do candle verde anterior.',
        tradingRule: 'Stop acima da máxima do candle 2.'
    },
    DARK_CLOUD_COVER: {
        name: 'Dark Cloud Cover',
        namePortuguese: 'Cobertura de Nuvem Negra',
        type: 'bearish',
        strength: 'moderate',
        reliability: 66,
        candlesRequired: 2,
        confirmationRequired: false,
        description: 'Candle vermelho que abre acima da máxima anterior e fecha abaixo de 50% do corpo anterior.',
        tradingRule: 'Reversão clássica em topos.'
    },
    TWEEZER_TOP: {
        name: 'Tweezer Top',
        namePortuguese: 'Topo de Pinça',
        type: 'bearish',
        strength: 'weak',
        reliability: 60,
        candlesRequired: 2,
        confirmationRequired: true,
        description: 'Duas máximas iguais em candles de cores opostas.',
        tradingRule: 'Potencializado em resistência histórica.'
    },
    BEARISH_HARAMI: {
        name: 'Bearish Harami',
        namePortuguese: 'Harami de Baixa',
        type: 'bearish',
        strength: 'weak',
        reliability: 52,
        candlesRequired: 2,
        confirmationRequired: true,
        description: 'Pequeno candle vermelho dentro do corpo do candle verde anterior.',
        tradingRule: 'Sinal de alerta, não de entrada direta.'
    },
    EVENING_STAR: {
        name: 'Evening Star',
        namePortuguese: 'Estrela da Tarde',
        type: 'bearish',
        strength: 'strong',
        reliability: 79,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Candle verde longo, seguido de corpo pequeno com gap, seguido de vermelho longo.',
        tradingRule: 'Alta confiabilidade para reversão de baixa.'
    },
    EVENING_DOJI_STAR: {
        name: 'Evening Doji Star',
        namePortuguese: 'Estrela da Tarde Doji',
        type: 'bearish',
        strength: 'strong',
        reliability: 81,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Variação do Evening Star com Doji no meio.',
        tradingRule: 'Sinal forte de topo.'
    },
    THREE_BLACK_CROWS: {
        name: 'Three Black Crows',
        namePortuguese: 'Três Corvos Negros',
        type: 'bearish',
        strength: 'strong',
        reliability: 76,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Três candles vermelhos consecutivos fechando nas mínimas.',
        tradingRule: 'Forte momentum vendedor.'
    },
    THREE_INSIDE_DOWN: {
        name: 'Three Inside Down',
        namePortuguese: 'Três por Dentro de Baixa',
        type: 'bearish',
        strength: 'moderate',
        reliability: 68,
        candlesRequired: 3,
        confirmationRequired: false,
        description: 'Harami de baixa seguido por um candle vermelho de confirmação.',
        tradingRule: 'Confirmação do sinal de topo do Harami.'
    },

    // CATEGORIA 3 — CONTINUAÇÃO DE TENDÊNCIA
    RISING_THREE_METHODS: {
        name: 'Rising Three Methods',
        namePortuguese: 'Três Métodos de Alta',
        type: 'continuation',
        strength: 'moderate',
        reliability: 72,
        candlesRequired: 5,
        confirmationRequired: false,
        description: 'Candle verde longo, 3 pequenos vermelhos dentro do range, finaliza com verde longo rompendo máxima.',
        tradingRule: 'Comum em Ibovespa e blue chips em tendência estabelecida.'
    },
    FALLING_THREE_METHODS: {
        name: 'Falling Three Methods',
        namePortuguese: 'Três Métodos de Baixa',
        type: 'continuation',
        strength: 'moderate',
        reliability: 70,
        candlesRequired: 5,
        confirmationRequired: false,
        description: 'Inverso do Rising Three Methods.',
        tradingRule: 'Continuação de forte tendência de baixa.'
    },

    // CATEGORIA 4 — PADRÕES DE INDECISÃO
    DOJI: {
        name: 'Doji',
        namePortuguese: 'Doji',
        type: 'neutral',
        strength: 'weak',
        reliability: 50,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Abertura quase igual ao fechamento.',
        tradingRule: 'Indica equilíbrio. Só tem valor em zonas de suporte/resistência ou exaustão.'
    },
    SPINNING_TOP: {
        name: 'Spinning Top',
        namePortuguese: 'Pião',
        type: 'neutral',
        strength: 'weak',
        reliability: 45,
        candlesRequired: 1,
        confirmationRequired: true,
        description: 'Corpo pequeno com sombras equilibradas.',
        tradingRule: 'Indica indecisão no mercado.'
    }
};

module.exports = { PATTERNS };
