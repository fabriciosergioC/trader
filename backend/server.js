require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const cron    = require("node-cron");

const { analisarAtivo }    = require("./services/analysis");
const { verificarAlerta }  = require("./alerts");
const { buscarContextoMacro } = require("./services/contextMacro");
const { sincronizarAtivo, salvarTrade } = require("./services/supabase");

const app = express();
app.use(cors());
app.use(express.json());

// ── ENDPOINT DE SAÚDE (Para UptimeRobot / Keep-Alive) ────────────────────────
app.get("/ping", (req, res) => {
    res.status(200).send("pong 🚀");
});

// ═════════════════════════════════════════════════════════════════════════════
// ── Lista completa de ativos da B3 (organizados por setor)
// ═════════════════════════════════════════════════════════════════════════════
const ATIVOS = {
    // ── Petróleo, Gás e Combustíveis
    petroleo_gas: [
        "PETR4.SA", "PETR3.SA", "PRIO3.SA", "RECV3.SA", "UGPA3.SA", "VBBR3.SA", "ENAT3.SA", "RRRP3.SA"
    ],

    // ── Mineração e Siderurgia
    mineracao_siderurgia: [
        "VALE3.SA", "GGBR4.SA", "CSNA3.SA", "GOAU4.SA", "USIM5.SA", "CMIN3.SA", "CBAV3.SA"
    ],

    // ── Bancos e Instituições Financeiras
    financeiro: [
        "ITUB4.SA", "BBDC4.SA", "BBAS3.SA", "SANB11.SA", "BPAC11.SA", "B3SA3.SA", "ITSA4.SA", "ABCB4.SA"
    ],

    // ── Seguros e Previdência
    seguros: [
        "BBSE3.SA", "PSSA3.SA", "IRBR3.SA", "CXSE3.SA"
    ],

    // ── Consumo e Varejo
    consumo_varejo: [
        "ABEV3.SA", "MGLU3.SA", "LREN3.SA", "BHIA3.SA", "AMER3.SA", "ARZZ3.SA", "SOMA3.SA", "ALPA4.SA", "CEAB3.SA"
    ],

    // ── Alimentos e Agro
    alimentos_agro: [
        "JBSS3.SA", "BRFS3.SA", "MRFG3.SA", "BEEF3.SA", "SMTO3.SA", "AGRO3.SA", "SLCE3.SA"
    ],

    // ── Tecnologia e Bens de Capital
    tech_capital: [
        "WEGE3.SA", "TOTS3.SA", "LWSA3.SA", "POSI3.SA", "INTB3.SA", "TUPY3.SA", "KEPL3.SA"
    ],

    // ── Telecomunicações
    telecom: [
        "TIMS3.SA", "VIVT3.SA"
    ],

    // ── Energia Elétrica
    energia: [
        "ELET3.SA", "CPLE6.SA", "EQTL3.SA", "ENGI11.SA", "TAEE11.SA", "TRPL4.SA", "AURE3.SA", "EGIE3.SA", "CMIG4.SA", "ENEV3.SA"
    ],

    // ── Saneamento e Infra
    saneamento_infra: [
        "SBSP3.SA", "SAPR11.SA", "CSMG3.SA", "CCRO3.SA", "ECOR3.SA", "RAIL3.SA"
    ],

    // ── Imobiliário e Construção
    imobiliario_construcao: [
        "CYRE3.SA", "MRVE3.SA", "EZTC3.SA", "CURY3.SA", "TEND3.SA", "JHSF3.SA", "DIRR3.SA"
    ],

    // ── Papel e Celulose
    papel_celulose: [
        "SUZB3.SA", "KLBN11.SA"
    ],

    // ── Saúde
    saude: [
        "RADL3.SA", "HAPV3.SA", "RDOR3.SA", "HYPE3.SA", "FLRY3.SA"
    ],

    // ── Educação
    educacao: [
        "YDUQ3.SA", "COGN3.SA"
    ],

    // ── Transportes Áereos
    aereo: [
        "AZUL4.SA", "GOLL4.SA"
    ],

    // ── Agronegócio
    agronegocio: [
        "AGRO3.SA", "BEEF3.SA", "SMTO3.SA", "SLCE3.SA", "MTIG3.SA",
        "AGRI3.SA", "CAML3.SA", "BIOE3.SA", "MOAR3.SA", "RANI3.SA",
        "SBSA3.SA", "JALL3.SA"
    ],

    // ── Turismo e Hotels
    turismo_hoteis: [
        "HGLG11.SA", "HGRU11.SA", "BRCR11.SA", "MALL11.SA", "SHOP11.SA",
        "HOOT4.SA", "JHSF3.SA"
    ],

    // ── Bebidas
    bebidas: [
        "ABEV3.SA", "BIDI4.SA", "BIDI3.SA"
    ],

    // ── Holding e Conglomerates
    holding: [
        "ITSA4.SA", "ITSA3.SA", "CSMG3.SA", "ELET3.SA", "ELET6.SA",
        "CMIG4.SA", "CMIG3.SA", "ENGI11.SA", "ENGI3.SA", "ENGI4.SA",
        "TAEE11.SA", "TRPL4.SA", "SANB11.SA", "SANB4.SA", "BBSE3.SA",
        "PSSA3.SA", "IRBR3.SA", "CXSE3.SA", "BPAC11.SA", "BIDI4.SA",
        "BIDI3.SA", "PARC3.SA"
    ],

    // ── Games e Entretenimento
    games_lazer: [
        "GLFI3.SA", "CINE3.SA", "HOOT4.SA"
    ],

    // ── Biocombustíveis e Energia Renovável
    biocombustiveis: [
        "BIOE3.SA", "RNEW11.SA", "CTNM4.SA", "CTNM3.SA", "MOAR3.SA",
        "BREN3.SA"
    ],

    // ── Tecidos e Vestuário
    tecidos_vestuario: [
        "LREN3.SA", "GUAR3.SA", "SOMA3.SA", "CEAB3.SA", "HMLR3.SA",
        "VEST3.SA"
    ],

    // ── Eletrodomésticos e Eletrônicos
    eletrodomesticos: [
        "LWSA3.SA", "MOVI3.SA", "MOBK3.SA"
    ]
};

// ── Helper: Processar ativos em batches para evitar rate limit ───────────────
async function processarAtivosEmBatch(ativos, macro, batchSize = 20, skipNoticias = true) {
    const resultados = [];

    for (let i = 0; i < ativos.length; i += batchSize) {
        const batch = ativos.slice(i, i + batchSize);

        // Processar batch em paralelo
        const batchResults = await Promise.all(
            batch.map(async (ativo) => {
                try {
                    return await analisarAtivo(ativo, macro, skipNoticias);
                } catch (error) {
                    console.warn(`⚠️ Falha ao analisar ${ativo}: ${error.message}`);
                    // Retornar objeto vazio para não quebrar o fluxo
                    return {
                        ticker: ativo,
                        preco: 0,
                        sinal: "NEUTRO",
                        confianca: 0,
                        erro: error.message
                    };
                }
            })
        );

        resultados.push(...batchResults);

        // Pequeno delay entre batches para evitar rate limit
        if (i + batchSize < ativos.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    return resultados;
}

// ── Cache do contexto macro (atualiza a cada 5 min) ─────────────────────────
let cachedMacro     = null;
let macroTimestamp  = 0;

// ── Cache de análises de ativos (atualiza a cada 5 min) ───────────────────────
let cachedAnaliseFull      = null;
let analiseFullTimestamp   = 0;
let cachedOportunidades    = null;
let oportunidadesTimestamp = 0;
const CACHE_ANALISE_MS     = 1 * 60 * 1000; // Reduzido para 1 minuto para testes

// ── Lista mestre de ativos (Unificada e Validada) ──────────────────────────────
const ATIVOS_VALIDOS = [
    // Principais ativos da B3 (validados)
    "PETR4.SA", "PETR3.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
    "ABEV3.SA", "WEGE3.SA", "RENT3.SA", "MGLU3.SA", "SUZB3.SA",
    "LREN3.SA", "RADL3.SA", "JBSS3.SA", "HAPV3.SA", "RDOR3.SA", "QUAL3.SA",
    "TOTS3.SA", "LWSA3.SA", "CSNA3.SA", "GGBR4.SA", "USIM5.SA", "GOAU4.SA",
    "CMIG4.SA", "CPLE6.SA", "EQTL3.SA", "TAEE11.SA", "SBSP3.SA", "SAPR11.SA",
    "CYRE3.SA", "MRVE3.SA", "EZTC3.SA", "JHSF3.SA", "BRKM5.SA", "ECOR3.SA",
    "RAIL3.SA", "CCRO3.SA", "AZUL4.SA", "CVCB3.SA", "YDUQ3.SA", "COGN3.SA",
    "B3SA3.SA", "SANB11.SA", "BBSE3.SA", "PSSA3.SA", "IRBR3.SA", "BIDI4.SA",
    "PRIO3.SA", "UGPA3.SA", "CSMG3.SA", "NEOE3.SA", "ENGI11.SA", "TRPL4.SA",
    "MULT3.SA", "ALPA4.SA", "ENBR3.SA", "GEPA4.SA", "EGIE3.SA", "AFLT3.SA",
    "ARZZ3.SA", "BBRK3.SA", "BMGB4.SA", "BPAN4.SA", "BRAP4.SA", "BRFS3.SA",
    "BEEF3.SA", "CAML3.SA", "CEDO4.SA", "CESP6.SA", "CMIN3.SA", "CPFE3.SA",
    "CRPG5.SA", "CURY3.SA", "DIRR3.SA", "DMMO3.SA", "DXCO3.SA", "ELEK4.SA",
    "ELET3.SA", "EMBR3.SA", "ENAT3.SA", "ESTR4.SA", "EVEN3.SA", "FESA4.SA",
    "FGUI3.SA", "FLRY3.SA", "FRAS3.SA", "GGBR3.SA", "GMAT3.SA", "GOAU3.SA",
    "GOLL4.SA", "GRND3.SA", "GUAR3.SA", "HAGA4.SA", "HBOR3.SA", "HYPE3.SA",
    "IGTA3.SA", "INEP4.SA", "INTB3.SA", "ITSA4.SA", "JALL3.SA", "JFAB3.SA",
    "KEPL3.SA", "KLBN11.SA", "LAME4.SA", "LAVV3.SA", "LEVE3.SA", "LIGT3.SA",
    "LJQQ3.SA", "LOGG3.SA", "LUPA3.SA", "MYPK3.SA", "NATU3.SA", "ODPV3.SA",
    "OFSA3.SA", "PCAR3.SA", "PDGR3.SA", "PETZ3.SA", "PGUI3.SA", "PINE4.SA",
    "PLPL3.SA", "PMAM3.SA", "POMO4.SA", "POSI3.SA", "PTBL3.SA", "QGEL3.SA",
    "RANI3.SA", "RAPT4.SA", "RCSL4.SA", "RECV3.SA", "REDE3.SA", "ROMI3.SA",
    "RSID3.SA", "SAPR4.SA", "SEER3.SA", "SGPS3.SA", "SHOW3.SA", "SLCE3.SA",
    "SMFT3.SA", "SMTO3.SA", "SNSY5.SA", "SOMA3.SA", "SPRJ3.SA", "STBP3.SA",
    "SULA11.SA", "SZPQ3.SA", "TASA4.SA", "TECN3.SA", "TEND3.SA", "TGMA3.SA",
    "TIET11.SA", "TUPY3.SA", "UCAS3.SA", "UNIP6.SA", "USIM3.SA", "VAMO3.SA",
    "VIVA3.SA", "VULC3.SA", "WEGE4.SA", "WIZC3.SA",
    // Adicionados de ATIVOS
    "VBBR3.SA", "RRRP3.SA", "CBAV3.SA", "BPAC11.SA", "ABCB4.SA", "CXSE3.SA",
    "BHIA3.SA", "AMER3.SA", "CEAB3.SA", "MRFG3.SA", "AGRO3.SA", "TIMS3.SA",
    "VIVT3.SA", "AURE3.SA", "ENEV3.SA", "MTIG3.SA", "AGRI3.SA", "BIOE3.SA",
    "MOAR3.SA", "SBSA3.SA", "HGLG11.SA", "HGRU11.SA", "BRCR11.SA", "MALL11.SA",
    "SHOP11.SA", "HOOT4.SA", "BIDI3.SA", "ITSA3.SA", "ELET6.SA", "CMIG3.SA",
    "ENGI3.SA", "ENGI4.SA", "SANB4.SA", "PARC3.SA", "GLFI3.SA", "CINE3.SA",
    "RNEW11.SA", "CTNM4.SA", "CTNM3.SA", "BREN3.SA", "HMLR3.SA", "VEST3.SA",
    "MOVI3.SA", "MOBK3.SA"
];

const TODOS_ATIVOS = [...new Set([...ATIVOS_VALIDOS, ...Object.values(ATIVOS).flat()])];

async function getMacro() {
    const agora = Date.now();
    if (!cachedMacro || agora - macroTimestamp > 5 * 60 * 1000) {
        cachedMacro    = await buscarContextoMacro();
        macroTimestamp = agora;
    }
    return cachedMacro;
}

// ── GET /macro — contexto macroeconômico ─────────────────────────────────────
app.get("/macro", async (req, res) => {
    try {
        const macro = await getMacro();
        res.json(macro);
    } catch (error) {
        console.error("Erro /macro:", error.message);
        res.status(500).json({ error: "Erro ao buscar contexto macro" });
    }
});

// ── GET /ativos — lista todos os ativos disponíveis organizados por setor ────
app.get("/ativos", (req, res) => {
    const setor = req.query.setor;
    
    if (setor && ATIVOS[setor]) {
        return res.json({ setor, ativos: ATIVOS[setor] });
    }
    
    res.json({
        setores: Object.keys(ATIVOS),
        ativos: ATIVOS,
        todos: TODOS_ATIVOS,
        total: TODOS_ATIVOS.length
    });
});

// ── GET /analise — análise completa dos ativos ───────────────────────────────
app.get("/analise", async (req, res) => {
    try {
        const { setor, ativo, force } = req.query;

        // Limpar cache se solicitado
        if (force === "true") {
            cachedAnaliseFull = null;
            analiseFullTimestamp = 0;
            cachedOportunidades = null;
            oportunidadesTimestamp = 0;
            cachedMacro = null;
            macroTimestamp = 0;
            console.log("♻️ Cache limpo via force update");
        }

        // Determinar quais ativos analisar
        let ativosParaAnalisar = TODOS_ATIVOS; // Default: todos

        if (ativo) {
            // Analisar um único ativo específico
            const ativoUpper = ativo.toUpperCase();
            const ativoFull = ativoUpper.includes('.SA') ? ativoUpper : `${ativoUpper}.SA`;
            ativosParaAnalisar = [ativoFull];
        } else if (setor && ATIVOS[setor]) {
            // Analisar apenas um setor específico
            ativosParaAnalisar = ATIVOS[setor];
        }

        const macro = await getMacro();
        // Análise detalhada busca notícias apenas para ativo único
        const skipNoticias = !ativo;
        const resultados = await processarAtivosEmBatch(ativosParaAnalisar, macro, 15, skipNoticias);

        // Sincronizar com Supabase em background
        resultados.forEach(res => {
            if (!res.erro) {
                sincronizarAtivo(res);
                
                // Salvar sinal de longo prazo se detectado
                if (res.sinal_longo_prazo === "COMPRA") {
                    salvarTrade({
                        ticker: res.ticker,
                        sinal:  res.sinal_longo_prazo,
                        preco:  res.preco,
                        sma50:  res.sma50,
                        sma200: res.sma200,
                        detalhes: res.detalhes
                    });
                }
            }
        });

        verificarAlerta(resultados);
        res.json({
            resultados,
            macro,
            setor: setor || "todos",
            total: resultados.length
        });
    } catch (error) {
        console.error("Erro /analise:", error.message);
        res.status(500).json({ error: "Erro ao analisar ativos" });
    }
});

// ── GET /oportunidades-compra — guia de ativos com maior probabilidade de compra ─
app.get("/oportunidades-compra", async (req, res) => {
    try {
        const { limite = 20, force } = req.query;
        const limiteNum = parseInt(limite);
        const agora = Date.now();

        if (!force && cachedOportunidades && (agora - oportunidadesTimestamp) < CACHE_ANALISE_MS) {
            return res.json({
                ativos: cachedOportunidades.slice(0, limiteNum),
                total: cachedOportunidades.length,
                timestamp: new Date(oportunidadesTimestamp).toISOString(),
                cached: true
            });
        }

        let baseParaOportunidades = null;
        let tsBase = 0;

        if (!force && cachedAnaliseFull && (agora - analiseFullTimestamp) < CACHE_ANALISE_MS) {
            // Se temos o cache da análise rápida, usamos ele como base, 
            // mas precisamos garantir que os campos necessários para o score existam
            baseParaOportunidades = cachedAnaliseFull.map(r => ({
                ticker: r.ticker,
                preco: r.preco,
                sinal: r.sinal,
                confianca: r.confianca,
                forca: r.forca || 0,
                rsi: r.rsi || 50,
                adx: r.adx || 0,
                tendencia: r.tendencia || "NEUTRO"
            }));
            tsBase = analiseFullTimestamp;
        }

        if (!baseParaOportunidades) {
            console.log(`📊 Gerando base para oportunidades (Processando todos os ${ATIVOS_VALIDOS.length} ativos)...`);
            const macro = await getMacro();
            const resultados = await processarAtivosEmBatch(ATIVOS_VALIDOS, macro, 30, true);

            baseParaOportunidades = resultados.filter(r => !r.erro).map(r => ({
                ticker: r.ticker,
                preco: r.preco,
                sinal: r.sinal,
                confianca: r.confianca,
                forca: r.forca || 0,
                rsi: r.rsi || 50,
                adx: r.adx || 0,
                tendencia: r.detalhes?.tendencia || "NEUTRO"
            }));
            tsBase = agora;
        }

        const comScores = baseParaOportunidades.map(ativo => {
            let score = 0;
            let motivoCompra = [];
            let motivoVenda = [];
            let bloqueios = [];

            // --- Lógica de COMPRA ---
            if (ativo.sinal === "COMPRA") score += 35;
            if (ativo.confianca >= 70) score += 25;
            if (ativo.rsi < 35) score += 20;
            if (ativo.adx > 25) score += 10;
            if (ativo.tendencia === "ALTA") score += 10;

            // --- Lógica de VENDA ---
            let sellScore = 0;
            if (ativo.sinal === "VENDA") sellScore += 35;
            if (ativo.confianca >= 70) sellScore += 25;
            if (ativo.rsi > 65) sellScore += 20;
            if (ativo.adx > 25) sellScore += 10;
            if (ativo.tendencia === "BAIXA") sellScore += 10;

            const probCompra = Math.max(0, Math.min(100, Math.round(score * 1.3)));
            const probVenda  = Math.max(0, Math.min(100, Math.round(sellScore * 1.3)));

            return {
                ...ativo,
                score,
                sellScore,
                probabilidade: probCompra,
                probabilidadeVenda: probVenda,
                recomendacao: probCompra >= 70 ? "FORTE COMPRA" : probCompra >= 50 ? "COMPRA" : "NEUTRO",
                recomendacaoVenda: probVenda >= 70 ? "FORTE VENDA" : probVenda >= 50 ? "VENDA" : "NEUTRO"
            };
        });

        // Ordenar por maior probabilidade de compra
        const ordenados = comScores.sort((a, b) => b.probabilidade - a.probabilidade);
        
        cachedOportunidades = ordenados;
        oportunidadesTimestamp = agora;

        res.json({
            ativos: ordenados.slice(0, limiteNum),
            total: ordenados.length,
            timestamp: new Date(tsBase).toISOString(),
            cached: false
        });
    } catch (error) {
        console.error("Erro /oportunidades-compra:", error.message);
        res.status(500).json({ error: "Erro ao gerar oportunidades" });
    }
});

// ── GET /analise-ia/:ticker — Análise profunda via Gemini AI ─────────────────
app.get("/analise-ia/:ticker", async (req, res) => {
    try {
        const { ticker } = req.params;
        const tickerUpper = ticker.toUpperCase();
        const tickerFull = tickerUpper.includes('.SA') ? tickerUpper : `${tickerUpper}.SA`;

        const macro = await getMacro();
        // Forçamos skipNoticias = false para garantir que a IA seja chamada
        const resultado = await analisarAtivo(tickerFull, macro, false);

        if (resultado.erro) {
            return res.status(400).json({ error: resultado.erro });
        }

        res.json({
            ticker: resultado.ticker,
            preco: resultado.preco,
            veredito: resultado.vereditoIA,
            indicadores: {
                rsi: resultado.rsi,
                adx: resultado.adx,
                tendencia: resultado.detalhes?.tendencia,
                forca: resultado.forca
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro /analise-ia:", error.message);
        res.status(500).json({ error: "Erro ao gerar análise da IA" });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// ── Agendador Automático (CRON)
// ═════════════════════════════════════════════════════════════════════════════

// Varrer o mercado a cada 10 minutos em busca de sinais fortes
// Executa de Segunda a Sexta, das 09h às 18h (Horário de Brasília/Mercado)
cron.schedule("*/10 9-18 * * 1-5", async () => {
    console.log(`\n⏰ [CRON] Iniciando varredura automática de mercado (${new Date().toLocaleTimeString()})...`);
    
    try {
        const macro = await getMacro();
        
        // 1. Varredura Rápida (sem Gemini/Notícias) em todos os ativos
        console.log(`📡 [CRON] Passo 1: Varredura rápida em ${ATIVOS_VALIDOS.length} ativos...`);
        const varreduraRapida = await processarAtivosEmBatch(ATIVOS_VALIDOS, macro, 30, true);
        
        // 2. Filtrar ativos com sinal de COMPRA e confiança >= 60%
        const sinaisDetectados = varreduraRapida.filter(r => r.sinal === "COMPRA" && r.confianca >= 60);
        console.log(`🎯 [CRON] Passo 2: ${sinaisDetectados.length} potenciais sinais detectados.`);

        if (sinaisDetectados.length > 0) {
            // 3. Análise Profunda (com Gemini/Notícias) APENAS nos ativos com sinal
            console.log(`🤖 [CRON] Passo 3: Gerando análise Gemini para os sinais detectados...`);
            const tickersSinais = sinaisDetectados.map(s => s.ticker);
            const analiseProfunda = await processarAtivosEmBatch(tickersSinais, macro, 5, false);
            
            console.log(`✅ [CRON] Varredura e análise concluídas.`);
            
            // 4. Enviar para o Telegram
            verificarAlerta(analiseProfunda);
        } else {
            console.log(`✅ [CRON] Varredura concluída. Nenhum sinal forte detectado.`);
        }

    } catch (error) {
        console.error("❌ [CRON] Erro na varredura automática:", error.message);
    }
}, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
});

// Auto-ping a cada 10 minutos para reforçar a atividade do servidor
cron.schedule("*/10 * * * *", () => {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    if (url) {
        axios.get(`${url}/ping`).catch(() => {});
        // console.log("📡 [AUTO-PING] Mantendo servidor ativo...");
    }
});

// ── GET /analise-rapida — análise sem detalhes para performance ──────────────
app.get("/analise-rapida", async (req, res) => {
    try {
        const { setor, pagina = 1, limite = 30, force } = req.query;
        const paginaNum = parseInt(pagina);
        const limiteNum = parseInt(limite);
        const agora = Date.now();

        if (!force && cachedAnaliseFull && (agora - analiseFullTimestamp) < CACHE_ANALISE_MS) {
            let ativosFiltrados = cachedAnaliseFull;
            if (setor && ATIVOS[setor]) {
                ativosFiltrados = cachedAnaliseFull.filter(r => ATIVOS[setor].includes(r.ticker));
            }

            const inicio = (paginaNum - 1) * limiteNum;
            const ativosPaginados = ativosFiltrados.slice(inicio, inicio + limiteNum);

            return res.json({
                ativos: ativosPaginados,
                macro: cachedMacro,
                total: ativosFiltrados.length,
                totalGeral: cachedAnaliseFull.length,
                pagina: paginaNum,
                limite: limiteNum,
                totalPaginas: Math.ceil(ativosFiltrados.length / limiteNum),
                setor: setor || "todos",
                cached: true,
                timestamp: new Date(analiseFullTimestamp).toISOString()
            });
        }

        console.log(`📊 Executando análise completa de ${ATIVOS_VALIDOS.length} ativos...`);
        const macro = await getMacro();
        const resultados = await processarAtivosEmBatch(ATIVOS_VALIDOS, macro, 35, true);
        const resultadosValidos = resultados.filter(r => !r.erro).map(r => ({
            ticker: r.ticker,
            preco: r.preco,
            sinal: r.sinal,
            confianca: r.confianca,
            forca: r.forca,
            rsi: r.rsi,
            adx: r.adx,
            tendencia: r.detalhes?.tendencia || "NEUTRO"
        }));

        cachedAnaliseFull = resultadosValidos;
        analiseFullTimestamp = agora;

        let ativosFiltrados = resultadosValidos;
        if (setor && ATIVOS[setor]) {
            ativosFiltrados = resultadosValidos.filter(r => ATIVOS[setor].includes(r.ticker));
        }

        const inicio = (paginaNum - 1) * limiteNum;
        const ativosPaginados = ativosFiltrados.slice(inicio, inicio + limiteNum);

        res.json({
            ativos: ativosPaginados,
            macro,
            total: ativosFiltrados.length,
            totalGeral: resultadosValidos.length,
            pagina: paginaNum,
            limite: limiteNum,
            totalPaginas: Math.ceil(ativosFiltrados.length / limiteNum),
            setor: setor || "todos",
            cached: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro /analise-rapida:", error.message);
        res.status(500).json({ error: "Erro na análise rápida" });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor Trading System rodando na porta ${PORT}`);
    console.log(`📍 Endpoints disponíveis:`);
    console.log(`   - GET /ativos`);
    console.log(`   - GET /macro`);
    console.log(`   - GET /analise?ativo=TICKER`);
    console.log(`   - GET /analise-ia/TICKER`);
    console.log(`   - GET /oportunidades-compra\n`);
});