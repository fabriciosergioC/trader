const express = require('express');
const router = express.Router();
const { analisarAtivo } = require('../services/analysis');

// Lista isolada de criptoativos do Yahoo Finance
const ATIVOS_CRIPTO = ["BTC-USD", "ETH-USD", "SOL-USD", "ADA-USD", "XRP-USD"];

// Mapeamento amigável de nomes para exibição
const CRYPTO_NAMES = {
    "BTC-USD": "Bitcoin (USD)",
    "ETH-USD": "Ethereum (USD)",
    "SOL-USD": "Solana (USD)",
    "ADA-USD": "Cardano (USD)",
    "XRP-USD": "Ripple (USD)"
};

// Caches locais para criptomoedas
let cachedCryptoFull = null;
let cryptoTimestamp = 0;
let cachedCryptoOportunidades = null;
let oportunidadesTimestamp = 0;

const CACHE_MS = 60 * 1000; // Cache de 1 minuto

// Helper para processar ativos de cripto em lote
async function processarCryptoEmBatch(ativos, batchSize = 5) {
    const resultados = [];
    for (let i = 0; i < ativos.length; i += batchSize) {
        const batch = ativos.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(async (ativo) => {
                try {
                    // macro = null, skipNoticias = true, incluirFundamentais = false
                    const res = await analisarAtivo(ativo, null, true, false);
                    res.nome = CRYPTO_NAMES[ativo] || ativo;
                    return res;
                } catch (error) {
                    console.warn(`⚠️ Falha ao analisar cripto ${ativo}: ${error.message}`);
                    return {
                        ticker: ativo,
                        nome: CRYPTO_NAMES[ativo] || ativo,
                        preco: 0,
                        sinal: "NEUTRO",
                        confianca: 0,
                        erro: error.message
                    };
                }
            })
        );
        resultados.push(...batchResults);
    }
    return resultados;
}

// ── GET /api/crypto/ativos ──────────────────────────────────────────────────
router.get("/ativos", (req, res) => {
    res.json({
        setores: ["cripto"],
        ativos: { cripto: ATIVOS_CRIPTO },
        todos: ATIVOS_CRIPTO,
        total: ATIVOS_CRIPTO.length
    });
});

// ── GET /api/crypto/analise-rapida ──────────────────────────────────────────
router.get("/analise-rapida", async (req, res) => {
    try {
        const { pagina = 1, limite = 10, force, busca } = req.query;
        const paginaNum = parseInt(pagina);
        const limiteNum = parseInt(limite);
        const agora = Date.now();

        if (!force && cachedCryptoFull && (agora - cryptoTimestamp) < CACHE_MS) {
            let filtrados = cachedCryptoFull;
            if (busca) {
                const query = busca.toLowerCase();
                filtrados = filtrados.filter(r => 
                    r.ticker.toLowerCase().includes(query) || 
                    (r.nome || '').toLowerCase().includes(query)
                );
            }
            const inicio = (paginaNum - 1) * limiteNum;
            const paginados = filtrados.slice(inicio, inicio + limiteNum);

            return res.json({
                ativos: paginados,
                total: filtrados.length,
                totalGeral: cachedCryptoFull.length,
                pagina: paginaNum,
                limite: limiteNum,
                totalPaginas: Math.ceil(filtrados.length / limiteNum),
                cached: true,
                timestamp: new Date(cryptoTimestamp).toISOString()
            });
        }

        console.log(`📊 Executando varredura rápida de ${ATIVOS_CRIPTO.length} criptoativos...`);
        const resultados = await processarCryptoEmBatch(ATIVOS_CRIPTO);
        const resultadosValidos = resultados.filter(r => !r.erro);

        // Apenas atualiza cache se houver resultados válidos
        if (resultadosValidos.length > 0) {
            cachedCryptoFull = resultadosValidos;
            cryptoTimestamp = agora;
        }

        let filtrados = resultadosValidos;
        if (busca) {
            const query = busca.toLowerCase();
            filtrados = filtrados.filter(r => 
                r.ticker.toLowerCase().includes(query) || 
                (r.nome || '').toLowerCase().includes(query)
            );
        }

        const inicio = (paginaNum - 1) * limiteNum;
        const paginados = filtrados.slice(inicio, inicio + limiteNum);

        res.json({
            ativos: paginados,
            total: filtrados.length,
            totalGeral: resultadosValidos.length,
            pagina: paginaNum,
            limite: limiteNum,
            totalPaginas: Math.ceil(filtrados.length / limiteNum),
            cached: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Erro em /crypto/analise-rapida:", error.message);
        res.status(500).json({ error: "Erro na análise rápida de cripto" });
    }
});

// ── GET /api/crypto/oportunidades ───────────────────────────────────────────
router.get("/oportunidades", async (req, res) => {
    try {
        const { limite = 10, force } = req.query;
        const limiteNum = parseInt(limite);
        const agora = Date.now();

        if (!force && cachedCryptoOportunidades && (agora - oportunidadesTimestamp) < CACHE_MS) {
            return res.json({
                ativos: cachedCryptoOportunidades.slice(0, limiteNum),
                total: cachedCryptoOportunidades.length,
                timestamp: new Date(oportunidadesTimestamp).toISOString(),
                cached: true
            });
        }

        let baseParaOportunidades = null;
        if (!force && cachedCryptoFull && (agora - cryptoTimestamp) < CACHE_MS) {
            baseParaOportunidades = cachedCryptoFull;
        }

        if (!baseParaOportunidades) {
            console.log(`📊 Gerando base para oportunidades de cripto...`);
            baseParaOportunidades = await processarCryptoEmBatch(ATIVOS_CRIPTO);
        }

        const comScores = baseParaOportunidades.map(ativo => {
            let score = 0;
            let sellScore = 0;

            if (ativo.sinal === "COMPRA") {
                score += 35;
                if (ativo.confianca >= 70) score += 25;
                if (ativo.rsi < 35) score += 20;
                if (ativo.adx > 25) score += 10;
            }

            if (ativo.sinal === "VENDA") {
                sellScore += 35;
                if (ativo.confianca >= 70) sellScore += 25;
                if (ativo.rsi > 65) sellScore += 20;
                if (ativo.adx > 25) sellScore += 10;
            }

            const probCompra = Math.max(0, Math.min(100, Math.round(score * 1.3)));
            const probVenda  = Math.max(0, Math.min(100, Math.round(sellScore * 1.3)));

            return {
                ...ativo,
                score,
                sellScore,
                probabilidade: probCompra,
                probabilidadeVenda: probVenda,
                recomendacao: ativo.sinal === "COMPRA" && probCompra >= 70 ? "FORTE COMPRA" : ativo.sinal === "COMPRA" && probCompra >= 50 ? "COMPRA" : "NEUTRO",
                recomendacaoVenda: ativo.sinal === "VENDA" && probVenda >= 70 ? "FORTE VENDA" : ativo.sinal === "VENDA" && probVenda >= 50 ? "VENDA" : "NEUTRO"
            };
        });

        // Ordenar por maior probabilidade (compra ou venda dependendo de qual for maior)
        const ordenados = comScores.sort((a, b) => Math.max(b.probabilidade, b.probabilidadeVenda) - Math.max(a.probabilidade, a.probabilidadeVenda));

        cachedCryptoOportunidades = ordenados;
        oportunidadesTimestamp = agora;

        res.json({
            ativos: ordenados.slice(0, limiteNum),
            total: ordenados.length,
            timestamp: new Date().toISOString(),
            cached: false
        });
    } catch (error) {
        console.error("❌ Erro em /crypto/oportunidades:", error.message);
        res.status(500).json({ error: "Erro ao gerar oportunidades de cripto" });
    }
});

// ── GET /api/crypto/analise ─────────────────────────────────────────────────
router.get("/analise", async (req, res) => {
    try {
        const { ativo } = req.query;
        if (!ativo) {
            return res.status(400).json({ error: "O parâmetro 'ativo' é obrigatório." });
        }

        const tickerUpper = ativo.toUpperCase();
        if (!ATIVOS_CRIPTO.includes(tickerUpper)) {
            return res.status(400).json({ error: "Ticker de cripto inválido ou não suportado." });
        }

        console.log(`📊 [Crypto] Executando análise detalhada de ${tickerUpper}...`);
        
        // macro = null, skipNoticias = false (para análise profunda com IA se configurado), incluirFundamentais = false
        const resultado = await analisarAtivo(tickerUpper, null, false, false);
        resultado.nome = CRYPTO_NAMES[tickerUpper] || tickerUpper;

        if (resultado.erro) {
            return res.status(400).json({ error: resultado.erro });
        }

        res.json({
            resultados: [resultado]
        });
    } catch (error) {
        console.error("❌ Erro em /crypto/analise:", error.message);
        res.status(500).json({ error: "Erro na análise detalhada de cripto" });
    }
});

module.exports = router;
