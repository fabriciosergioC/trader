class ConfluenceScorer {
    /**
     * @param {Object} technicalContext 
     * @param {Object[]} candles 
     */
    calculateScore(patternResult, candles, currentIndex, technicalContext) {
        const { pattern } = patternResult;
        let score = pattern.reliability; // Base: confiabilidade histórica

        const currentCandle = candles[currentIndex];
        const prevCandle = candles[currentIndex - 1];

        // 1. Volume Confirmation (+15)
        const avgVolume = candles.slice(currentIndex - 20, currentIndex).reduce((sum, c) => sum + (c.volume || 0), 0) / 20;
        if (currentCandle.volume > avgVolume * 1.5) {
            score += 15;
            patternResult.confirmedByVolume = true;
        } else {
            score -= 15;
            patternResult.confirmedByVolume = false;
        }

        // 2. Support/Resistance Levels (+10)
        if (this.atKeyLevel(currentCandle, technicalContext.keyLevels)) {
            score += 10;
        }

        // 3. Fibonacci Levels (+10)
        if (this.atFibLevel(currentCandle, technicalContext.fibLevels)) {
            score += 10;
        }

        // 4. Moving Averages (+8)
        if (this.atMA(currentCandle, technicalContext.movingAverages)) {
            score += 8;
        }

        // 5. RSI Confluence (+8)
        if (pattern.type === 'bullish' && technicalContext.rsi < 30) score += 8;
        if (pattern.type === 'bearish' && technicalContext.rsi > 70) score += 8;

        // 6. Trend Alignment (+5)
        if (pattern.type === 'bullish' && technicalContext.trend === 'uptrend') score += 5;
        if (pattern.type === 'bearish' && technicalContext.trend === 'downtrend') score += 5;

        // 7. Counter Trend (-10)
        if (pattern.type === 'bullish' && technicalContext.trend === 'downtrend') score -= 10;
        if (pattern.type === 'bearish' && technicalContext.trend === 'uptrend') score -= 10;

        // Final score calculation
        patternResult.confidence = Math.min(100, Math.max(0, score));
        patternResult.confluenceScore = patternResult.confidence; // Simplified for now

        // Calculate suggested entries/stops
        this.calculateTradingLevels(patternResult, currentCandle, prevCandle, technicalContext.atr);

        return patternResult;
    }

    atKeyLevel(candle, levels) {
        if (!levels) return false;
        const threshold = candle.close * 0.005; // 0.5% tolerance
        return [...(levels.supports || []), ...(levels.resistances || [])].some(level => Math.abs(candle.low - level) < threshold || Math.abs(candle.high - level) < threshold);
    }

    atFibLevel(candle, levels) {
        if (!levels || typeof levels !== 'object') return false;
        const threshold = candle.close * 0.003; // 0.3% tolerance
        return Object.values(levels).some(level => Math.abs(candle.low - level) < threshold || Math.abs(candle.high - level) < threshold);
    }

    atMA(candle, mas) {
        if (!mas || typeof mas !== 'object') return false;
        const threshold = candle.close * 0.002; // 0.2% tolerance
        return Object.values(mas).some(ma => Math.abs(candle.low - ma) < threshold || Math.abs(candle.close - ma) < threshold);
    }

    calculateTradingLevels(result, candle, prevCandle, atr) {
        const { pattern } = result;
        if (pattern.type === 'bullish') {
            result.entry = candle.high + (atr * 0.1);
            result.stop = Math.min(candle.low, prevCandle ? prevCandle.low : candle.low) - (atr * 0.2);
            const risk = result.entry - result.stop;
            result.target1 = result.entry + risk;
            result.target2 = result.entry + (risk * 2);
            result.target3 = result.entry + (risk * 3);
        } else if (pattern.type === 'bearish') {
            result.entry = candle.low - (atr * 0.1);
            result.stop = Math.max(candle.high, prevCandle ? prevCandle.high : candle.high) + (atr * 0.2);
            const risk = result.stop - result.entry;
            result.target1 = result.entry - risk;
            result.target2 = result.entry - (risk * 2);
            result.target3 = result.entry - (risk * 3);
        } else if (pattern.type === 'neutral') {
            // Sugestão de rompimento para padrões neutros (Indecisão)
            result.entry = candle.high + (atr * 0.1);
            result.stop = candle.low - (atr * 0.1);
            const range = result.entry - result.stop;
            result.target1 = result.entry + range;
            result.target2 = result.entry + (range * 2);
        }
    }
}

module.exports = { ConfluenceScorer };
