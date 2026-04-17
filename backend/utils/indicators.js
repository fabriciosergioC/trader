const { RSI, MACD, SMA, ADX, BollingerBands, ATR, OBV } = require("technicalindicators");

function calcularIndicadores(closes, highs, lows, volumes) {
    return {
        rsi:  RSI.calculate({ values: closes, period: 9 }), // Reduzido de 14 para 9 para reagir mais rápido
        rsi14: RSI.calculate({ values: closes, period: 14 }),
        sma9: SMA.calculate({ values: closes, period: 9 }),
        sma21: SMA.calculate({ values: closes, period: 21 }),
        macd: MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false,
        }),
        adx: ADX.calculate({ close: closes, high: highs, low: lows, period: 14 }),
        bb:  BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 }),
        atr: ATR.calculate({ high: highs, low: lows, close: closes, period: 14 }),
        obv: OBV.calculate({ close: closes, volume: volumes }),
        // Suporte e Resistência (Cálculo de 20 períodos)
        resistencia: Math.max(...highs.slice(-20)),
        suporte:     Math.min(...lows.slice(-20)),
    };
}

module.exports = { calcularIndicadores };