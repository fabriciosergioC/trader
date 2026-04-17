/**
 * yahooFetch.js
 * Busca dados do Yahoo Finance diretamente via HTTP (sem usar o pacote yahoo-finance2)
 * Necessário porque o Render.com tem IPs de datacenter que o Yahoo bloqueia
 * ao usar a biblioteca padrão. A chamada HTTP direta com User-Agent de browser funciona.
 */

const https = require('https');
const zlib  = require('zlib');


// Headers que simulam um browser real
const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Origin': 'https://finance.yahoo.com',
    'Referer': 'https://finance.yahoo.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
};

/**
 * Fetch genérico com timeout e retry
 */
function fetchJson(url, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout')), timeoutMs);

        const req = https.get(url, { headers: BROWSER_HEADERS }, (res) => {
            // Tratar redirecionamentos
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                clearTimeout(timer);
                return fetchJson(res.headers.location, timeoutMs).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                clearTimeout(timer);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            // Descomprimir automaticamente gzip/deflate/br
            let stream = res;
            const encoding = res.headers['content-encoding'];
            if (encoding === 'gzip') {
                stream = res.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                stream = res.pipe(zlib.createInflate());
            } else if (encoding === 'br') {
                stream = res.pipe(zlib.createBrotliDecompress());
            }

            let data = '';
            stream.on('data', chunk => data += chunk);
            stream.on('end', () => {
                clearTimeout(timer);
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error(`JSON parse error (${data.slice(0, 80)})`));
                }
            });
            stream.on('error', (err) => { clearTimeout(timer); reject(err); });
        });

        req.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}


/**
 * Busca cotação atual de um ticker
 * @param {string} ticker - ex: "PETR4.SA"
 * @returns {Object|null}
 */
async function buscarQuote(ticker) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
    try {
        const json = await fetchJson(url);
        const chart = json?.chart?.result?.[0];
        if (!chart) return null;

        const meta = chart.meta;
        return {
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketChangePercent: meta.regularMarketChangePercent,
            regularMarketChange: meta.regularMarketChange,
            regularMarketPreviousClose: meta.previousClose,
            symbol: meta.symbol,
        };
    } catch (e) {
        // Tentar endpoint alternativo
        try {
            const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`;
            const json2 = await fetchJson(url2);
            const chart2 = json2?.chart?.result?.[0];
            if (!chart2) return null;
            const meta2 = chart2.meta;
            return {
                regularMarketPrice: meta2.regularMarketPrice,
                regularMarketChangePercent: meta2.regularMarketChangePercent,
                regularMarketChange: meta2.regularMarketChange,
                regularMarketPreviousClose: meta2.previousClose,
                symbol: meta2.symbol,
            };
        } catch (e2) {
            console.warn(`⚠️ buscarQuote falhou para ${ticker}: ${e2.message}`);
            return null;
        }
    }
}

/**
 * Busca histórico OHLCV de um ticker
 * @param {string} ticker - ex: "PETR4.SA"
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} interval - "1d", "1wk", "1mo"
 * @returns {Array} - array de candles { date, open, high, low, close, volume }
 */
async function buscarHistorico(ticker, startDate, interval = '1d') {
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;

    let json;
    try {
        json = await fetchJson(url);
    } catch (e) {
        // Tentar endpoint alternativo
        try {
            const url2 = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=${interval}&events=history`;
            json = await fetchJson(url2);
        } catch (e2) {
            console.warn(`⚠️ buscarHistorico falhou para ${ticker}: ${e2.message}`);
            return [];
        }
    }

    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const indicators = result.indicators?.quote?.[0] ?? {};
    const opens   = indicators.open   ?? [];
    const highs   = indicators.high   ?? [];
    const lows    = indicators.low    ?? [];
    const closes  = indicators.close  ?? [];
    const volumes = indicators.volume ?? [];

    return timestamps.map((ts, i) => ({
        date:   new Date(ts * 1000),
        open:   opens[i]   ?? closes[i],
        high:   highs[i]   ?? closes[i],
        low:    lows[i]    ?? closes[i],
        close:  closes[i],
        volume: volumes[i] ?? 0,
    })).filter(d => d.close != null);
}

module.exports = { buscarQuote, buscarHistorico };
