import React, { useMemo, useEffect } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useStore } from '../store/useStore';
import { useMarketData } from '../hooks/useMarketData';

// Components (Heavy ones are dynamically imported)
import Header from '../components/Header';
import TickerBar from '../components/TickerBar';
import MacroPanel from '../components/MacroPanel';
import FilterBar from '../components/FilterBar';
import OpportunitySection from '../components/OpportunitySection';
import AssetTable from '../components/AssetTable';
import ComparisonBar from '../components/ComparisonBar';

const DetailView = dynamic(() => import('../components/DetailView'), {
    loading: () => <div className="loading-container"><div className="loading-spinner" /></div>
});

export default function Home() {
    const router = useRouter();
    const queryTicker = router.query.ticker;

    const { 
        busca, 
        setorSelecionado, 
        paginaAtual, 
        setPaginaAtual, 
        ativoSelecionado,
        setAtivoSelecionado,
        filtroSinal,
        getFilteredAtivos
    } = useStore();

    useEffect(() => {
        if (queryTicker) {
            setAtivoSelecionado(queryTicker);
        }
    }, [queryTicker, setAtivoSelecionado]);

    useEffect(() => {
        if (ativoSelecionado === null && queryTicker) {
            router.push('/', undefined, { shallow: true });
        }
    }, [ativoSelecionado, queryTicker, router]);

    const { 
        quickAnalysis, 
        opportunities, 
        detailedAnalysis, 
        sectors,
        refetchAll 
    } = useMarketData({
        sector: setorSelecionado,
        page: paginaAtual,
        ticker: ativoSelecionado,
        busca: busca
    });

    const ativosFiltrados = useMemo(() => {
        return getFilteredAtivos(quickAnalysis.data?.ativos);
    }, [quickAnalysis.data, getFilteredAtivos, busca, setorSelecionado, filtroSinal]);

    if (ativoSelecionado) {
        return (
            <DetailView 
                ticker={ativoSelecionado} 
                data={detailedAnalysis.data?.resultados} 
                loading={detailedAnalysis.isLoading} 
            />
        );
    }

    return (
        <>
            <Head>
                <title>TradeAI — Painel de Análise B3</title>
                <meta name="description" content="Sistema inteligente de trade com WebSocket, TanStack Query e Virtualização." />
            </Head>

            <div className="app-layout">
                <header style={{ gridArea: 'header' }}>
                    <Header 
                        totalAtivos={quickAnalysis.data?.total || 0} 
                        totalGeral={quickAnalysis.data?.totalGeral || 0}
                        onRefresh={refetchAll}
                        atualizando={quickAnalysis.isFetching}
                    />
                </header>

                <TickerBar tickers={quickAnalysis.data?.ativos || []} />

                <main style={{ gridArea: 'main' }}>
                    {quickAnalysis.isLoading && !quickAnalysis.data ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p className="loading-text">Buscando dados do mercado…</p>
                        </div>
                    ) : (
                        <>
                            <MacroPanel macro={quickAnalysis.data?.macro} />

                            {/* Oportunidades em destaque */}
                            <OpportunitySection opportunities={opportunities.data?.ativos} />

                            {/* Filtros */}
                            <FilterBar sectors={sectors.data} />

                            {/* Tabela Principal */}
                            <div className="resultados-info" style={{ marginTop: '20px' }}>
                                <h3 className="section-title">📋 Lista Completa de Ativos</h3>
                                Mostrando <strong>{ativosFiltrados.length}</strong> ativos
                            </div>

                            <AssetTable ativos={ativosFiltrados} />

                            {/* Paginação Simplificada */}
                            {quickAnalysis.data?.totalPaginas > 1 && (
                                <div className="paginacao-container" style={{ marginTop: '20px' }}>
                                    <div className="paginacao-botoes">
                                        <button 
                                            className="pag-btn" 
                                            disabled={paginaAtual === 1}
                                            onClick={() => setPaginaAtual(paginaAtual - 1)}
                                        >← Anterior</button>
                                        <span className="pag-info">Página {paginaAtual} de {quickAnalysis.data.totalPaginas}</span>
                                        <button 
                                            className="pag-btn" 
                                            disabled={paginaAtual === quickAnalysis.data.totalPaginas}
                                            onClick={() => setPaginaAtual(paginaAtual + 1)}
                                        >Próxima →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>

                <aside style={{ gridArea: 'sidebar' }}>
                    {/* Painel Lateral Opcional para Desktop */}
                    <div className="sidebar-content">
                        <div className="card-analise" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
                            <h4 style={{ marginBottom: '15px' }}>📈 Scanner do Pregão</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Monitorando <strong>{quickAnalysis.data?.totalGeral || 0}</strong> ativos da B3 em tempo real.
                            </p>
                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="mini-stat">
                                    <span>Setores Ativos</span>
                                    <strong>{sectors.data?.length || 0}</strong>
                                </div>
                                <div className="mini-stat">
                                    <span>Sinais Fortes</span>
                                    <strong>{opportunities.data?.ativos?.length || 0}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style jsx>{`
                .mini-stat {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                    padding: 8px;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                }
                @media (max-width: 1023px) {
                    aside { display: none; }
                }
            `}</style>
            <ComparisonBar />
        </>
    );
}
