const { PATTERNS } = require('./candlestickPatterns');

class CandlestickPatternDetector {
    constructor(config = {}) {
        this.config = {
            bodyThreshold: 0.30,       // 30% — limite para corpo pequeno vs grande
            shadowThreshold: 2.0,      // 2x — mínimo para sombra significativa
            dojiTolerance: 0.001,      // 0.1% — tolerância para corpo do doji
            volumeConfirmation: 1.5,   // 150% — volume mínimo para confirmação
            atrPeriod: 14,             // Período do ATR para normalização
            minVolumeLiquidity: 500000, // R$ 500k volume mínimo (filtro de liquidez B3)
            ...config
        };
    }

    // Funções de apoio
    getBodySize(candle) {
        return Math.abs(candle.open - candle.close);
    }

    getUpperShadow(candle) {
        return candle.high - Math.max(candle.open, candle.close);
    }

    getLowerShadow(candle) {
        return Math.min(candle.open, candle.close) - candle.low;
    }

    getTotalRange(candle) {
        return candle.high - candle.low || 0.0001; // Evitar divisão por zero
    }

    isGreenCandle(candle) {
        return candle.close > candle.open;
    }

    isRedCandle(candle) {
        return candle.close < candle.open;
    }

    isDoji(candle) {
        const body = this.getBodySize(candle);
        const range = this.getTotalRange(candle);
        return body <= candle.open * this.config.dojiTolerance || body <= range * 0.1;
    }

    // Detectores específicos
    detectHammer(candle, contextTrend) {
        const body = this.getBodySize(candle);
        const lowerShadow = this.getLowerShadow(candle);
        const upperShadow = this.getUpperShadow(candle);
        const range = this.getTotalRange(candle);

        if (lowerShadow >= 2 * body && upperShadow <= 0.1 * range && body <= 0.3 * range) {
            return { ...PATTERNS.HAMMER };
        }
        return null;
    }

    detectInvertedHammer(candle) {
        const body = this.getBodySize(candle);
        const upperShadow = this.getUpperShadow(candle);
        const lowerShadow = this.getLowerShadow(candle);
        const range = this.getTotalRange(candle);

        if (upperShadow >= 2 * body && lowerShadow <= 0.1 * range && body <= 0.3 * range) {
            return { ...PATTERNS.INVERTED_HAMMER };
        }
        return null;
    }

    detectBullishEngulfing(c1, c2) {
        if (this.isRedCandle(c1) && this.isGreenCandle(c2)) {
            if (c2.open <= c1.close && c2.close > c1.open) {
                return { ...PATTERNS.BULLISH_ENGULFING };
            }
        }
        return null;
    }

    detectBearishEngulfing(c1, c2) {
        if (this.isGreenCandle(c1) && this.isRedCandle(c2)) {
            if (c2.open >= c1.close && c2.close < c1.open) {
                return { ...PATTERNS.BEARISH_ENGULFING };
            }
        }
        return null;
    }

    detectShootingStar(candle) {
        const body = this.getBodySize(candle);
        const upperShadow = this.getUpperShadow(candle);
        const lowerShadow = this.getLowerShadow(candle);
        const range = this.getTotalRange(candle);

        if (upperShadow >= 2 * body && lowerShadow <= 0.1 * range && body <= 0.3 * range) {
            return { ...PATTERNS.SHOOTING_STAR };
        }
        return null;
    }

    detectMorningStar(c1, c2, c3) {
        const isC1LongRed = this.isRedCandle(c1) && this.getBodySize(c1) > this.getTotalRange(c1) * 0.5;
        const isC2Small = this.getBodySize(c2) <= this.getTotalRange(c2) * 0.3;
        const isC3LongGreen = this.isGreenCandle(c3) && c3.close > (c1.open + c1.close) / 2;

        if (isC1LongRed && isC2Small && isC3LongGreen && c2.open < c1.close) {
            return this.isDoji(c2) ? { ...PATTERNS.MORNING_DOJI_STAR } : { ...PATTERNS.MORNING_STAR };
        }
        return null;
    }

    detectEveningStar(c1, c2, c3) {
        const isC1LongGreen = this.isGreenCandle(c1) && this.getBodySize(c1) > this.getTotalRange(c1) * 0.5;
        const isC2Small = this.getBodySize(c2) <= this.getTotalRange(c2) * 0.3;
        const isC3LongRed = this.isRedCandle(c3) && c3.close < (c1.open + c1.close) / 2;

        if (isC1LongGreen && isC2Small && isC3LongRed && c2.open > c1.close) {
            return this.isDoji(c2) ? { ...PATTERNS.EVENING_DOJI_STAR } : { ...PATTERNS.EVENING_STAR };
        }
        return null;
    }

    detectMarubozu(candle) {
        const body = this.getBodySize(candle);
        const range = this.getTotalRange(candle);
        if (body >= range * 0.9) {
            return this.isGreenCandle(candle) ? { ...PATTERNS.BULLISH_MARUBOZU } : { ...PATTERNS.BEARISH_MARUBOZU };
        }
        return null;
    }

    detectHarami(c1, c2) {
        const c1Body = this.getBodySize(c1);
        const c2Body = this.getBodySize(c2);
        
        const isInside = (Math.max(c2.open, c2.close) <= Math.max(c1.open, c1.close)) && 
                         (Math.min(c2.open, c2.close) >= Math.min(c1.open, c1.close));

        if (isInside && c1Body > c2Body * 2) {
            if (this.isRedCandle(c1) && this.isGreenCandle(c2)) return { ...PATTERNS.BULLISH_HARAMI };
            if (this.isGreenCandle(c1) && this.isRedCandle(c2)) return { ...PATTERNS.BEARISH_HARAMI };
        }
        return null;
    }

    detectPiercingLine(c1, c2) {
        if (this.isRedCandle(c1) && this.isGreenCandle(c2)) {
            const midpoint = (c1.open + c1.close) / 2;
            if (c2.open < c1.low && c2.close > midpoint) {
                return { ...PATTERNS.PIERCING_LINE };
            }
        }
        return null;
    }

    detectDarkCloudCover(c1, c2) {
        if (this.isGreenCandle(c1) && this.isRedCandle(c2)) {
            const midpoint = (c1.open + c1.close) / 2;
            if (c2.open > c1.high && c2.close < midpoint) {
                return { ...PATTERNS.DARK_CLOUD_COVER };
            }
        }
        return null;
    }

    detectTweezer(c1, c2) {
        const threshold = c1.close * 0.001;
        const sameLow = Math.abs(c1.low - c2.low) < threshold;
        const sameHigh = Math.abs(c1.high - c2.high) < threshold;

        if (sameLow && this.isRedCandle(c1) && this.isGreenCandle(c2)) return { ...PATTERNS.TWEEZER_BOTTOM };
        if (sameHigh && this.isGreenCandle(c1) && this.isRedCandle(c2)) return { ...PATTERNS.TWEEZER_TOP };
        return null;
    }

    detectThreeMethods(candles, i) {
        if (i < 4) return null;
        const [c1, c2, c3, c4, c5] = candles.slice(i - 4, i + 1);
        
        // Rising Three Methods
        if (this.isGreenCandle(c1) && this.isRedCandle(c2) && this.isRedCandle(c3) && this.isRedCandle(c4) && this.isGreenCandle(c5)) {
            if (c5.close > c1.close && c2.low > c1.low && c4.low > c1.low && c2.high < c1.high && c4.high < c1.high) {
                return { ...PATTERNS.RISING_THREE_METHODS };
            }
        }
        
        // Falling Three Methods
        if (this.isRedCandle(c1) && this.isGreenCandle(c2) && this.isGreenCandle(c3) && this.isGreenCandle(c4) && this.isRedCandle(c5)) {
            if (c5.close < c1.close && c2.high < c1.high && c4.high < c1.high && c2.low > c1.low && c4.low > c1.low) {
                return { ...PATTERNS.FALLING_THREE_METHODS };
            }
        }
        return null;
    }

    detectSpinningTop(candle) {
        const body = this.getBodySize(candle);
        const range = this.getTotalRange(candle);
        const upperShadow = this.getUpperShadow(candle);
        const lowerShadow = this.getLowerShadow(candle);

        if (body <= range * 0.2 && upperShadow > body && lowerShadow > body) {
            return { ...PATTERNS.SPINNING_TOP };
        }
        return null;
    }

    detectAll(candles) {
        const results = [];
        if (candles.length < 5) return results;

        const i = candles.length - 1;

        // 1 Candle Patterns
        const c = candles[i];
        const p1 = this.detectHammer(c) || this.detectInvertedHammer(c) || this.detectShootingStar(c) || this.detectMarubozu(c) || this.detectSpinningTop(c);
        if (p1) results.push({ pattern: p1, index: i });
        if (this.isDoji(c)) results.push({ pattern: { ...PATTERNS.DOJI }, index: i });

        // 2 Candle Patterns
        const cPrev = candles[i-1];
        const p2 = this.detectBullishEngulfing(cPrev, c) || 
                   this.detectBearishEngulfing(cPrev, c) || 
                   this.detectHarami(cPrev, c) || 
                   this.detectPiercingLine(cPrev, c) || 
                   this.detectDarkCloudCover(cPrev, c) || 
                   this.detectTweezer(cPrev, c);
        if (p2) results.push({ pattern: p2, index: i });

        // 3 Candle Patterns
        const cPrev2 = candles[i-2];
        const p3 = this.detectMorningStar(cPrev2, cPrev, c) || this.detectEveningStar(cPrev2, cPrev, c);
        if (p3) results.push({ pattern: p3, index: i });

        // Continuation Patterns (5 candles)
        const p5 = this.detectThreeMethods(candles, i);
        if (p5) results.push({ pattern: p5, index: i });

        return results;
    }
}

module.exports = { CandlestickPatternDetector };
