const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance();

async function test() {
    try {
        const ticker = "PETR4.SA";
        console.log(`Testing ${ticker}...`);
        const dados = await yahooFinance.historical(ticker, {
            period1: "2024-01-01",
            interval: "1d",
        });
        console.log(`Success! Got ${dados.length} candles.`);
        console.log("Last candle:", dados[dados.length - 1]);
    } catch (e) {
        console.error("FAILED:", e);
    }
}

test();
