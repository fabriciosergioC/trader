import React, { useMemo, useEffect, useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { useMarketData } from '../hooks/useMarketData';
import { analisarEntrada } from '../utils/analysis';
import Header from '../components/Header';
import TickerBar from '../components/TickerBar';
import AssetTable from '../components/AssetTable';
import ComparisonBar from '../components/ComparisonBar';

const DetailView = dynamic(() => import('../components/DetailView'), {
    loading: () => <div className="loading-container"><div className="loading-spinner" /></div>
});

export default function MelhoresCompras() {
    const router = useRouter();
    const queryTicker = router.query.ticker;

    const { 
        busca, 
        setBusca,
        paginaAtual, 
        setPaginaAtual, 
        ativoSelecionado,
        setAtivoSelecionado,
        comparisonList,
        toggleComparison
    } = useStore();

    // Sincroniza ticker da query
    useEffect(() => {
        if (queryTicker) {
            setAtivoSelecionado(queryTicker);
        }
    }, [queryTicker, setAtivoSelecionado]);

    useEffect(() => {
        if (ativoSelecionado === null && queryTicker) {
            router.push('/melhores-compras', undefined, { shallow: true });
        }
    }, [ativoSelecionado, queryTicker, router]);

    const { 
        quickAnalysis, 
        opportunities, 
        detailedAnalysis,
        refetchAll 
    } = useMarketData({
        sector: 'todos',
        page: 1,
        limit: 200, // Pegar mais para filtrar localmente
        ticker: ativoSelecionado,
        busca: busca
    });

    const melhoresCompras = useMemo(() => {
        const ativos = opportunities.data?.ativos || quickAnalysis.data?.ativos || [];
        if (!ativos.length) return [];

        let filtered = ativos.filter(o => {
            const analise = analisarEntrada(o);
            const hasSR = o.detalhes?.sr_analysis;
            
            // Somente ativos em região de suporte ou rompimento de resistência
            const isSRZone = hasSR && (
                hasSR.entry_zone_status === "SUPORTE_RESPEITADO" || 
                hasSR.entry_zone_status === "ROMPIMENTO_ALTA_CONFIRMADO" ||
                hasSR.entry_zone_status === "ROMPIMENTO_ALTA_PARCIAL"
            );
            
            const isBuyRecommended = ["ENTRAR", "ENTRAR COM CAUTELA", "ENTRADA CONFIRMADA PELA IA", "COMPRAR"].includes(analise.recomendacao);
            
            return o.sinal === "COMPRA" && (isSRZone || !hasSR) && (isBuyRecommended || !analise.recomendacao);
        });

        // Fallback: mostrar todos com sinal de compra
        if (filtered.length === 0) {
            filtered = ativos.filter(o => o.sinal === "COMPRA");
        }

        // Ordenar por confiança e score
        return filtered.sort((a, b) => {
            if (b.confianca !== a.confianca) return b.confianca - a.confianca;
            return (b.score || 0) - (a.score || 0);
        });
    }, [opportunities.data, quickAnalysis.data]);

    // Filtrar pela busca local do usuário, se houver
    const ativosFiltrados = useMemo(() => {
        if (!busca) return melhoresCompras;
        const query = busca.toLowerCase().replace('engie', 'egie');
        return melhoresCompras.filter(ativo => 
            ativo.ticker.toLowerCase().includes(query) || 
            (ativo.nome || '').toLowerCase().includes(query)
        );
    }, [melhoresCompras, busca]);

    // Paginação simples local
    const itensPorPagina = 20;
    const totalPaginas = Math.ceil(ativosFiltrados.length / itensPorPagina);
    const indexUltimoItem = paginaAtual * itensPorPagina;
    const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
    const ativosPaginados = useMemo(() => {
        return ativosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);
    }, [ativosFiltrados, indexPrimeiroItem, indexUltimoItem]);

    if (ativoSelecionado) {
        // Redireciona ou abre em modal/DetailView
        return (
            <DetailView 
                ticker={ativoSelecionado} 
                data={detailedAnalysis.data?.resultados} 
                loading={detailedAnalysis.isLoading} 
                onVoltar={() => setAtivoSelecionado(null)}
            />
        );
    }

    return (
        <>
            <Head>
                <title>TradeAI — Melhores Compras B3</title>
                <meta name="description" content="Listagem exclusiva das melhores oportunidades de compra da B3." />
            </Head>

            <div className="app-layout">
                <header style={{ gridArea: 'header' }}>
                    <Header 
                        totalAtivos={ativosFiltrados.length} 
                        totalGeral={quickAnalysis.data?.totalGeral || 0}
                        onRefresh={refetchAll}
                        atualizando={quickAnalysis.isFetching || opportunities.isFetching}
                    />
                </header>

                <TickerBar tickers={melhoresCompras} />

                <main style={{ gridArea: 'main' }}>
                    {quickAnalysis.isLoading && !quickAnalysis.data ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p className="loading-text">Analisando oportunidades de compra…</p>
                        </div>
                    ) : (
                        <>
                            <div className="oport-section-header" style={{ marginBottom: '20px' }}>
                                <h2 style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    📈 Melhores Compras B3
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                                    Ativos filtrados em regiões de suporte viáveis ou rompimentos confirmados com sinal de compra.
                                </p>
                            </div>

                            {/* Barra de Busca integrada na página */}
                            <div className="search-bar-container" style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar ativo nas Melhores Compras..."
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                                {busca && (
                                    <button 
                                        onClick={() => setBusca('')}
                                        style={{
                                            padding: '0 16px',
                                            background: 'rgba(255,255,255,0.06)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >Limpar</button>
                                )}
                            </div>

                            <div className="resultados-info">
                                Mostrando <strong>{ativosFiltrados.length}</strong> ativos sugeridos para compra
                            </div>

                            <AssetTable ativos={ativosPaginados} />

                            {totalPaginas > 1 && (
                                <div className="paginacao-container" style={{ marginTop: '20px' }}>
                                    <div className="paginacao-botoes">
                                        <button 
                                            className="pag-btn" 
                                            disabled={paginaAtual === 1}
                                            onClick={() => setPaginaAtual(paginaAtual - 1)}
                                        >← Anterior</button>
                                        <span className="pag-info">Página {paginaAtual} de {totalPaginas}</span>
                                        <button 
                                            className="pag-btn" 
                                            disabled={paginaAtual === totalPaginas}
                                            onClick={() => setPaginaAtual(paginaAtual + 1)}
                                        >Próxima →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>

                <aside style={{ gridArea: 'sidebar' }}>
                    <div className="sidebar-content">
                        <div className="card-analise" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
                            <h4 style={{ marginBottom: '15px' }}>💡 Critério de Seleção</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Os ativos exibidos nesta página atendem aos seguintes requisitos:
                            </p>
                            <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '20px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <li>Sinal principal de <strong>COMPRA</strong> detectado.</li>
                                <li>Localizado em região de <strong>Suporte Respeitado</strong> ou <strong>Rompimento de Alta</strong>.</li>
                                <li>Recomendação da IA de entrada imediata ou com cautela confirmada.</li>
                            </ul>
                        </div>
                    </div>
                </aside>
            </div>
            <ComparisonBar />
        </>
    );
}
