const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env do Backend!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Salva ou atualiza a análise de um ativo no Supabase
 */
async function sincronizarAtivo(analise) {
    try {
        const { data, error } = await supabase
            .from('ativos_analisados')
            .upsert({
                ticker: analise.ticker,
                preco: analise.preco,
                sinal: analise.sinal,
                confianca: analise.confianca,
                detalhes: analise.detalhes,
                timestamp: new Date().toISOString()
            }, { onConflict: 'ticker' });

        if (error) throw error;
        // console.log(`✅ ${analise.ticker} sincronizado com Supabase`);
    } catch (error) {
        console.error(`❌ Erro ao sincronizar ${analise.ticker}:`, error.message);
    }
}

module.exports = { sincronizarAtivo };
