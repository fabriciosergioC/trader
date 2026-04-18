const { RSI, MACD, SMA, ADX, BollingerBands, ATR, OBV } = require("technicalindicators");

function calcularIndicadores(closes, highs, lows, volumes) {
    if (closes.length < 200) {
        console.warn("⚠️ Dados insuficientes para cálculo completo de indicadores (mínimo 200 candles para SMA200)");
    }

    return {
        rsi:  RSI.calculate({ values: closes, period: 9 }), 
        rsi14: RSI.calculate({ values: closes, period: 14 }),
        sma9: SMA.calculate({ values: closes, period: 9 }),
        sma21: SMA.calculate({ values: closes, period: 21 }),
        sma50: SMA.calculate({ values: closes, period: 50 }),
        sma200: closes.length >= 200 ? SMA.calculate({ values: closes, period: 200 }) : [],
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
        
        // Detecção de Suporte e Resistência de Curto Prazo
        resistencia: Math.max(...highs.slice(-10)),
        suporte:     Math.min(...lows.slice(-10)),
        
        // Dados brutos para análise de divergência no strategy.js
        lastCloses: closes.slice(-30),
        lastHighs: highs.slice(-30),
        lastLows: lows.slice(-30)
    };
}

module.exports = { calcularIndicadores };