require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const { analisarAtivo }    = require("./services/analysis");
const { verificarAlerta }  = require("./alerts");
const { buscarContextoMacro } = require("./services/contextMacro");
const { sincronizarAtivo } = require("./services/supabase");

const app = express();
app.use(cors());
app.use(express.json());

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

// Lista plana de todos os ativos (sem duplicatas)
const TODOS_ATIVOS = [...new Set(Object.values(ATIVOS).flat())];

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

        // Pequeno delay entre batches para evitar rate limit (reduzido para 100ms)
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
let cachedAnalise      = null;
let analiseTimestamp   = 0;
const CACHE_ANALISE_MS = 5 * 60 * 1000; // 5 minutos (aumentado para performance)

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
        const { setor, ativo } = req.query;

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
            if (!res.erro) sincronizarAtivo(res);
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

        // Usar cache se disponível
        if (!force && cachedAnalise && (agora - analiseTimestamp) < CACHE_ANALISE_MS) {
            // Calcular score de probabilidade de compra - MAIS RIGOROSO
            const comScores = cachedAnalise.map(ativo => {
                let score = 0;
                let motivoCompra = [];
                let motivoAlerta = [];
                let bloqueios = [];

                // 1. Sinal de compra (+30 pontos, era 40)
                if (ativo.sinal === "COMPRA") {
                    score += 30;
                    motivoCompra.push("Sinal técnico de COMPRA");
                } else if (ativo.sinal === "NEUTRO") {
                    score += 5;
                } else if (ativo.sinal === "VENDA") {
                    score -= 30;
                    motivoAlerta.push("Sinal técnico de VENDA");
                }

                // 2. Confiança (0-25 pontos, threshold 70%)
                if (ativo.confianca >= 70) {
                    score += 25;
                    motivoCompra.push(`Confiança alta (${ativo.confianca}%)`);
                } else if (ativo.confianca >= 60) {
                    score += 15;
                    motivoCompra.push(`Boa confiança (${ativo.confianca}%)`);
                } else if (ativo.confianca >= 40) {
                    score += 5;
                } else {
                    bloqueios.push("Confiança baixa");
                    score -= 10;
                }

                // 3. RSI (0-15 pontos)
                if (ativo.rsi < 30) {
                    score += 15;
                    motivoCompra.push("RSI em sobrevenda (< 30)");
                } else if (ativo.rsi < 40) {
                    score += 10;
                    motivoCompra.push("RSI baixo, oportunidade");
                } else if (ativo.rsi > 70) {
                    score -= 15;
                    motivoAlerta.push("RSI em sobrecompra (> 70)");
                    bloqueios.push("RSI sobrecomprado");
                } else if (ativo.rsi > 60) {
                    score -= 5;
                }

                // 4. ADX - força da tendência (0-10 pontos)
                if (ativo.adx >= 25) {
                    score += 10;
                    motivoCompra.push(`ADX forte (${ativo.adx.toFixed(1)}) - tendência definida`);
                } else if (ativo.adx < 20) {
                    score -= 10;
                    motivoAlerta.push("ADX baixo - mercado lateral");
                    bloqueios.push("Mercado lateral");
                }

                // 5. Tendência (0-10 pontos)
                if (ativo.tendencia === "ALTA") {
                    score += 10;
                    motivoCompra.push("Tendência de ALTA");
                } else if (ativo.tendencia === "BAIXA") {
                    score -= 15;
                    motivoAlerta.push("Tendência de BAIXA");
                }

                // Calcular probabilidade (0-100%)
                const probabilidade = Math.max(0, Math.min(100, Math.round(score * 1.2)));

                // BLOQUEIOS: se há bloqueios, não recomendar
                const bloqueado = bloqueios.length > 0;

                return {
                    ...ativo,
                    score,
                    probabilidade: bloqueado ? Math.min(probabilidade, 30) : probabilidade,
                    motivoCompra,
                    motivoAlerta,
                    bloqueios,
                    recomendacao: bloqueado ? "BLOQUEADO" :
                                  probabilidade >= 70 ? "FORTE COMPRA" :
                                  probabilidade >= 50 ? "COMPRA" :
                                  probabilidade >= 30 ? "NEUTRO/PENDENTE" :
                                  probabilidade >= 15 ? "EVITAR" : "NÃO RECOMENDADO"
                };
            });

            // Ordenar por score (maior primeiro)
            const ordenados = comScores.sort((a, b) => b.score - a.score);
            const topAtivos = ordenados.slice(0, limiteNum);

            return res.json({
                ativos: topAtivos,
                total: ordenados.length,
                timestamp: new Date(analiseTimestamp).toISOString(),
                cached: true
            });
        }

        // Se não tem cache, usar apenas ativos válidos para ser mais rápido
        console.log(`📊 Gerando guia de oportunidades de compra...`);
        const macro = await getMacro();
        const resultados = await processarAtivosEmBatch(ATIVOS_VALIDOS.slice(0, 50), macro, 25, true);

        const resultadosValidos = resultados.filter(r => !r.erro);
        const listaRapida = resultadosValidos.map(r => ({
            ticker: r.ticker,
            preco: r.preco,
            sinal: r.sinal,
            confianca: r.confianca,
            forca: r.forca,
            rsi: r.rsi,
            adx: r.adx,
            tendencia: r.detalhes?.tendencia || "NEUTRO"
        }));

        // Atualizar cache
        cachedAnalise = listaRapida;
        analiseTimestamp = agora;

        // Calcular scores
        const comScores = listaRapida.map(ativo => {
            let score = 0;
            let motivoCompra = [];
            let motivoAlerta = [];

            if (ativo.sinal === "COMPRA") {
                score += 40;
                motivoCompra.push("Sinal técnico de COMPRA");
            } else if (ativo.sinal === "NEUTRO") {
                score += 10;
            } else if (ativo.sinal === "VENDA") {
                score -= 20;
                motivoAlerta.push("Sinal técnico de VENDA");
            }

            if (ativo.confianca >= 60) {
                score += 30;
                motivoCompra.push(`Alta confiança (${ativo.confianca}%)`);
            } else if (ativo.confianca >= 40) {
                score += 20;
                motivoCompra.push(`Boa confiança (${ativo.confianca}%)`);
            } else if (ativo.confianca >= 20) {
                score += 10;
            }

            if (ativo.rsi < 30) {
                score += 20;
                motivoCompra.push("RSI em sobrevenda (< 30)");
            } else if (ativo.rsi < 40) {
                score += 15;
                motivoCompra.push("RSI baixo, oportunidade");
            } else if (ativo.rsi > 70) {
                score -= 10;
                motivoAlerta.push("RSI em sobrecompra (> 70)");
            } else if (ativo.rsi > 60) {
                score -= 5;
            }

            if (ativo.adx >= 25) {
                score += 10;
                motivoCompra.push(`ADX forte (${ativo.adx.toFixed(1)}) - tendência definida`);
            } else if (ativo.adx < 20) {
                score -= 5;
                motivoAlerta.push("ADX baixo - mercado lateral");
            }

            if (ativo.tendencia === "ALTA") {
                score += 10;
                motivoCompra.push("Tendência de ALTA");
            } else if (ativo.tendencia === "BAIXA") {
                score -= 10;
                motivoAlerta.push("Tendência de BAIXA");
            }

            const probabilidade = Math.max(0, Math.min(100, Math.round(score * 1.2)));

            return {
                ...ativo,
                score,
                probabilidade,
                motivoCompra,
                motivoAlerta,
                recomendacao: probabilidade >= 70 ? "FORTE COMPRA" :
                              probabilidade >= 50 ? "COMPRA" :
                              probabilidade >= 30 ? "NEUTRO/PENDENTE" :
                              probabilidade >= 15 ? "EVITAR" : "NÃO RECOMENDADO"
            };
        });

        const ordenados = comScores.sort((a, b) => b.score - a.score);
        const topAtivos = ordenados.slice(0, limiteNum);

        res.json({
            ativos: topAtivos,
            total: ordenados.length,
            timestamp: new Date().toISOString(),
            cached: false
        });
    } catch (error) {
        console.error("Erro /oportunidades-compra:", error.message);
        res.status(500).json({ error: "Erro ao gerar guia de oportunidades" });
    }
});

// ── GET /analise-rapida — análise sem detalhes para performance ──────────────
app.get("/analise-rapida", async (req, res) => {
    try {
        const { setor, pagina = 1, limite = 30, force } = req.query;
        const paginaNum = parseInt(pagina);
        const limiteNum = parseInt(limite);
        const agora = Date.now();

        // Usar lista de ativos VÁLIDOS (mais rápida)
        let ativosParaAnalisar = ATIVOS_VALIDOS;

        if (setor && ATIVOS[setor]) {
            ativosParaAnalisar = ATIVOS[setor].filter(a => ATIVOS_VALIDOS.includes(a));
        }

        // Usar cache se disponível e não expirado (a menos que force=true)
        if (!force && cachedAnalise && (agora - analiseTimestamp) < CACHE_ANALISE_MS) {
            // Aplicar paginação e filtros ao cache
            const inicio = (paginaNum - 1) * limiteNum;
            const fim = inicio + limiteNum;
            const ativosFiltrados = setor && ATIVOS[setor]
                ? cachedAnalise.filter(r => ATIVOS[setor].includes(r.ticker))
                : cachedAnalise;
            const ativosPaginados = ativosFiltrados.slice(inicio, fim);

            return res.json({
                ativos: ativosPaginados,
                macro: cachedMacro,
                total: ativosFiltrados.length,
                pagina: paginaNum,
                limite: limiteNum,
                totalPaginas: Math.ceil(ativosFiltrados.length / limiteNum),
                setor: setor || "todos",
                successCount: ativosPaginados.length,
                errorCount: 0,
                cached: true,
                timestamp: new Date(analiseTimestamp).toISOString()
            });
        }

        // Calcular paginação
        const inicio = (paginaNum - 1) * limiteNum;
        const fim = inicio + limiteNum;
        const ativosPaginados = ativosParaAnalisar.slice(inicio, fim);

        console.log(`📊 Analisando ${ativosPaginados.length} ativos (página ${paginaNum}/${Math.ceil(ativosParaAnalisar.length / limiteNum)})`);

        const macro = await getMacro();
        // Sempre pular notícias na análise rápida para performance
        const resultados = await processarAtivosEmBatch(ativosPaginados, macro, 30, true);

        // Filtrar assets com erro
        const resultadosValidos = resultados.filter(r => !r.erro);

        // Retorna apenas dados essenciais para listagem
        const listaRapida = resultadosValidos.map(r => ({
            ticker: r.ticker,
            preco: r.preco,
            sinal: r.sinal,
            confianca: r.confianca,
            forca: r.forca,
            rsi: r.rsi,
            adx: r.adx,
            tendencia: r.detalhes?.tendencia || "NEUTRO"
        }));

        // Sincronizar resultados válidos com Supabase
        resultadosValidos.forEach(res => sincronizarAtivo(res));

        // Atualizar cache
        cachedAnalise = listaRapida;
        analiseTimestamp = agora;

        res.json({
            ativos: listaRapida,
            macro,
            total: ativosParaAnalisar.length,
            pagina: paginaNum,
            limite: limiteNum,
            totalPaginas: Math.ceil(ativosParaAnalisar.length / limiteNum),
            setor: setor || "todos",
            successCount: listaRapida.length,
            errorCount: resultados.length - listaRapida.length,
            cached: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Erro /analise-rapida:", error.message);
        res.status(500).json({ error: "Erro ao analisar ativos" });
    }
});

const PORT = process.env.PORT || 3001;

// ── Lista de ativos VÁLIDOS (removendo delisted) ───────────────────────────────
const ATIVOS_VALIDOS = [
    // Principais ativos da B3 (validados)
    "PETR4.SA", "PETR3.SA", "VALE3.SA", "ITUB4.SA", "BBDC4.SA", "BBAS3.SA",
    "ABEV3.SA", "WEGE3.SA", "RENT3.SA", "MGLU3.SA", "BBAS3.SA", "SUZB3.SA",
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
    "CRPG5.SA", "CURY3.SA", "CYRE3.SA", "DIRR3.SA", "DMMO3.SA", "DXCO3.SA",
    "ELEK4.SA", "ELET3.SA", "EMBR3.SA", "ENAT3.SA", "ESTR4.SA", "EVEN3.SA",
    "FESA4.SA", "FGUI3.SA", "FLRY3.SA", "FRAS3.SA", "GEPA4.SA", "GGBR3.SA",
    "GMAT3.SA", "GOAU3.SA", "GOLL4.SA", "GRND3.SA", "GUAR3.SA", "HAGA4.SA",
    "HBOR3.SA", "HYPE3.SA", "IGTA3.SA", "INEP4.SA", "INTB3.SA", "ITSA4.SA",
    "JALL3.SA", "JFAB3.SA", "KEPL3.SA", "KLBN11.SA", "LAME4.SA", "LAVV3.SA",
    "LEVE3.SA", "LIGT3.SA", "LJQQ3.SA", "LOGG3.SA", "LUPA3.SA", "MYPK3.SA",
    "NATU3.SA", "ODPV3.SA", "OFSA3.SA", "PCAR3.SA", "PDGR3.SA", "PETZ3.SA",
    "PGUI3.SA", "PINE4.SA", "PLPL3.SA", "PMAM3.SA", "POMO4.SA", "POSI3.SA",
    "PTBL3.SA", "QGEL3.SA", "RAIL3.SA", "RANI3.SA", "RAPT4.SA", "RCSL4.SA",
    "RECV3.SA", "REDE3.SA", "RENT3.SA", "ROMI3.SA", "RSID3.SA", "SAPR4.SA",
    "SEER3.SA", "SGPS3.SA", "SHOW3.SA", "SLCE3.SA", "SMFT3.SA", "SMTO3.SA",
    "SNSY5.SA", "SOMA3.SA", "SPRJ3.SA", "STBP3.SA", "SULA11.SA", "SZPQ3.SA",
    "TASA4.SA", "TECN3.SA", "TEND3.SA", "TGMA3.SA", "TIET11.SA", "TUPY3.SA",
    "UCAS3.SA", "UGPA3.SA", "UNIP6.SA", "USIM3.SA", "VAMO3.SA", "VIVA3.SA",
    "VULC3.SA", "WEGE4.SA", "WIZC3.SA"
];

// Substituir TODOS_ATIVOS pela lista válida
const TODOS_ATIVOS_ORIGINAL = [...new Set(Object.values(ATIVOS).flat())];

app.listen(PORT, () => {
    console.log(`🚀 Backend rodando na porta ${PORT}`);
    console.log(`📊 Total de ativos: ${TODOS_ATIVOS_ORIGINAL.length}`);
    console.log(`📂 Setores disponíveis: ${Object.keys(ATIVOS).length}`);
    console.log(`✅ Ativos válidos monitorados: ${ATIVOS_VALIDOS.length}`);
    console.log(`⚡ Modo rápido ativado - cache sob demanda`);
});