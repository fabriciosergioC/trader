/**
 * Mapeamento de tickers para nomes amigáveis de empresas (B3)
 * Ajuda na busca por nome no frontend.
 */

const TICKER_NAMES = {
    // Petróleo, Gás e Combustíveis
    "PETR4.SA": "Petrobras PN",
    "PETR3.SA": "Petrobras ON",
    "PRIO3.SA": "Prio (ex-Petrorio)",
    "RECV3.SA": "PetroRecôncavo",
    "UGPA3.SA": "Ultrapar",
    "VBBR3.SA": "Vibra Energia",
    "ENAT3.SA": "Enauta",
    "RRRP3.SA": "3R Petroleum",

    // Mineração e Siderurgia
    "VALE3.SA": "Vale S.A.",
    "GGBR4.SA": "Gerdau PN",
    "CSNA3.SA": "Siderúrgica Nacional",
    "GOAU4.SA": "Metalúrgica Gerdau",
    "USIM5.SA": "Usiminas PNA",
    "CMIN3.SA": "CSN Mineração",
    "CBAV3.SA": "CBA (Alumínio)",

    // Bancos e Financeiro
    "ITUB4.SA": "Itaú Unibanco",
    "BBDC4.SA": "Bradesco PN",
    "BBAS3.SA": "Banco do Brasil",
    "SANB11.SA": "Santander Brasil",
    "BPAC11.SA": "BTG Pactual",
    "B3SA3.SA": "B3 S.A. (Bolsa)",
    "ITSA4.SA": "Itaúsa PN",
    "ABCB4.SA": "Banco ABC Brasil",

    // Seguros
    "BBSE3.SA": "BB Seguridade",
    "PSSA3.SA": "Porto Seguro",
    "IRBR3.SA": "IRB Brasil RE",
    "CXSE3.SA": "Caixa Seguridade",

    // Consumo e Varejo
    "ABEV3.SA": "Ambev S.A.",
    "MGLU3.SA": "Magazine Luiza",
    "LREN3.SA": "Lojas Renner",
    "BHIA3.SA": "Casas Bahia",
    "AMER3.SA": "Americanas",
    "ARZZ3.SA": "Arezzo&Co",
    "SOMA3.SA": "Grupo Soma",
    "ALPA4.SA": "Alpargatas",
    "CEAB3.SA": "C&A Brasil",

    // Alimentos e Agro
    "JBSS3.SA": "JBS S.A.",
    "BRFS3.SA": "BRF S.A.",
    "MRFG3.SA": "Marfrig Global Foods",
    "BEEF3.SA": "Minerva Foods",
    "SMTO3.SA": "São Martinho",
    "AGRO3.SA": "BrasilAgro",
    "SLCE3.SA": "SLC Agrícola",

    // Tecnologia e Bens de Capital
    "WEGE3.SA": "Weg S.A.",
    "TOTS3.SA": "Totvs",
    "LWSA3.SA": "Locaweb",
    "POSI3.SA": "Positivo Tecnologia",
    "INTB3.SA": "Intelbras",
    "TUPY3.SA": "Tupy S.A.",
    "KEPL3.SA": "Kepler Weber",

    // Telecom
    "TIMS3.SA": "TIM Brasil",
    "VIVT3.SA": "Vivo (Telefônica Brasil)",

    // Energia Elétrica
    "ELET3.SA": "Eletrobras ON",
    "CPLE6.SA": "Copel PNB",
    "EQTL3.SA": "Equatorial Energia",
    "ENGI11.SA": "Energisa Unit",
    "TAEE11.SA": "Taesa Unit",
    "TRPL4.SA": "ISA CTEEP (Transmissão Paulista)",
    "AURE3.SA": "Auren Energia",
    "EGIE3.SA": "Engie Brasil",
    "CMIG4.SA": "Cemig PN",
    "ENEV3.SA": "Eneva",

    // Saneamento e Infra
    "SBSP3.SA": "Sabesp",
    "SAPR11.SA": "Sanepar Unit",
    "CSMG3.SA": "Copasa",
    "CCRO3.SA": "CCR S.A.",
    "ECOR3.SA": "EcoRodovias",
    "RAIL3.SA": "Rumo S.A.",

    // Imobiliário e Construção
    "CYRE3.SA": "Cyrela",
    "MRVE3.SA": "MRV Engenharia",
    "EZTC3.SA": "EZTEC",
    "CURY3.SA": "Cury Construtora",
    "TEND3.SA": "Construtora Tenda",
    "JHSF3.SA": "JHSF Participações",
    "DIRR3.SA": "Direcional Engenharia",

    // Papel e Celulose
    "SUZB3.SA": "Suzano S.A.",
    "KLBN11.SA": "Klabin Unit",

    // Saúde
    "RADL3.SA": "Raia Drogasil",
    "HAPV3.SA": "Hapvida",
    "RDOR3.SA": "Rede D'Or",
    "HYPE3.SA": "Hypera Pharma",
    "FLRY3.SA": "Fleury S.A.",

    // Educação
    "YDUQ3.SA": "YDUQS (Estácio)",
    "COGN3.SA": "Cogna Educação",

    // Aéreo e Turismo
    "AZUL4.SA": "Azul Linhas Aéreas",
    "GOLL4.SA": "Gol Linhas Aéreas",
    "CVCB3.SA": "CVC Brasil",
};

/**
 * Retorna o nome amigável do ativo ou o ticker se não encontrado
 */
function getTickerName(ticker) {
    return TICKER_NAMES[ticker] || ticker.replace('.SA', '');
}

module.exports = { TICKER_NAMES, getTickerName };
