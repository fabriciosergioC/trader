const https = require("https");

// Nomes de busca em português para cada ticker
const TERMOS_BUSCA = {
    "PETR4.SA": "Petrobras PETR4",
    "VALE3.SA": "Vale VALE3",
    "ITUB4.SA": "Itaú Unibanco ITUB4",
    "BBDC4.SA": "Bradesco BBDC4",
    "ABEV3.SA": "Ambev ABEV3",
    "B3SA3.SA": "B3 B3SA3",
    "MGLU3.SA": "Magazine Luiza MGLU3",
    "BBAS3.SA": "Banco do Brasil BBAS3",
    "WEGE3.SA": "Weg WEGE3",
    "RENT3.SA": "Localiza RENT3",
    // Criptomoedas
    "BTC-USD": "Bitcoin BTC",
    "ETH-USD": "Ethereum ETH",
    "SOL-USD": "Solana SOL",
    "ADA-USD": "Cardano ADA",
    "XRP-USD": "Ripple XRP",
};

function fetchURL(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            timeout: 6000,
        }, (res) => {
            // Seguir redirecionamentos
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return fetchURL(res.headers.location).then(resolve).catch(reject);
            }
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    });
}

function extrairTexto(xml, tag) {
    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = xml.match(re);
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim() : "";
}

async function buscarNoticias(ticker) {
    const termo = TERMOS_BUSCA[ticker] ?? ticker.replace(".SA", "");
    const query = encodeURIComponent(termo);
    // Google News RSS em PT-BR
    const url = `https://news.google.com/rss/search?q=${query}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

    try {
        const xml = await fetchURL(url);
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

        return items.slice(0, 4).map(item => {
            const rawTitulo = extrairTexto(item, "title");
            const data     = extrairTexto(item, "pubDate");

            // Google News formata como "Manchete - Fonte"
            const sepIdx = rawTitulo.lastIndexOf(" - ");
            const titulo = sepIdx > 0 ? rawTitulo.substring(0, sepIdx) : rawTitulo;
            const fonte  = sepIdx > 0 ? rawTitulo.substring(sepIdx + 3) : "";

            // Formatar data para PT-BR
            let dataFormatada = "";
            if (data) {
                try {
                    dataFormatada = new Date(data).toLocaleString("pt-BR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                    });
                } catch { dataFormatada = data; }
            }

            return { titulo, fonte, data: dataFormatada };
        }).filter(n => n.titulo.length > 5);
    } catch (e) {
        return [];
    }
}

module.exports = { buscarNoticias };
