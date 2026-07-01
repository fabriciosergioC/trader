import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import CryptoHeader from '../components/CryptoHeader';
import CryptoTickerBar from '../components/CryptoTickerBar';
import CryptoOpportunitySection from '../components/CryptoOpportunitySection';
import CryptoAssetTable from '../components/CryptoAssetTable';
import CryptoDetailView from '../components/CryptoDetailView';
import { useCryptoData } from '../hooks/useCryptoData';

export default function CryptoDashboard() {
    const router = useRouter();
    const queryTicker = router.query.ticker;

    const [busca, setBusca] = useState('');
    const [localBusca, setLocalBusca] = useState('');
    const [pagina, setPagina] = useState(1);
    const [ativoSelecionado, setAtivoSelecionado] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setBusca(localBusca);
            setPagina(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [localBusca]);

    useEffect(() => {
        if (queryTicker) {
            setAtivoSelecionado(queryTicker);
        }
    }, [queryTicker]);

    useEffect(() => {
        if (ativoSelecionado === null && queryTicker) {
            router.push('/crypto', undefined, { shallow: true });
        }
    }, [ativoSelecionado, queryTicker, router]);

    const {
        quickAnalysis,
        opportunities,
        detailedAnalysis,
        refetchAll
    } = useCryptoData({
        page: pagina,
        limit: 10,
        ticker: ativoSelecionado,
        busca: busca
    });

    const handleSelectAtivo = (ticker) => {
        window.open(`/crypto?ticker=${ticker}`, '_blank');
    };

    const handleVoltar = () => {
        setAtivoSelecionado(null);
    };

    if (ativoSelecionado) {
        return (
            <CryptoDetailView
                ticker={ativoSelecionado}
                data={detailedAnalysis.data?.resultados?.[0]}
                onVoltar={handleVoltar}
            />
        );
    }

    return (
        <>
            <Head>
                <title>TradeAI — Crypto Dashboard</title>
                <meta name="description" content="Scanner inteligente e detector de sinais de alta precisão para criptomoedas." />
            </Head>

            <div className="app-layout">
                <header style={{ gridArea: 'header' }}>
                    <CryptoHeader
                        totalAtivos={quickAnalysis.data?.total || 0}
                        onRefresh={refetchAll}
                        atualizando={quickAnalysis.isFetching}
                    />
                </header>

                <CryptoTickerBar tickers={quickAnalysis.data?.ativos || []} />

                <main style={{ gridArea: 'main' }}>
                    {quickAnalysis.isLoading && !quickAnalysis.data ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p className="loading-text">Analisando criptoativos...</p>
                        </div>
                    ) : (
                        <>
                            {/* Oportunidades em destaque */}
                            <CryptoOpportunitySection
                                ativos={opportunities.data?.ativos}
                                onSelectAtivo={handleSelectAtivo}
                            />

                            {/* Barra de Busca de Criptos */}
                            <div className="crypto-search-bar">
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar cripto por ticker ou nome (ex: BTC, ETH...)"
                                    value={localBusca}
                                    onChange={(e) => {
                                        setLocalBusca(e.target.value);
                                    }}
                                    className="search-input"
                                />
                                {localBusca && (
                                    <button className="btn-clear" onClick={() => {
                                        setLocalBusca('');
                                        setBusca('');
                                    }}>
                                        Limpar
                                    </button>
                                )}
                            </div>

                            {/* Tabela de Resultados */}
                            <div className="resultados-info" style={{ marginTop: '20px' }}>
                                <h3 className="section-title">📋 Criptoativos Monitorados</h3>
                                Mostrando <strong>{(quickAnalysis.data?.ativos || []).filter(a => a.sinal === "COMPRA").length}</strong> ativos
                            </div>

                            <CryptoAssetTable
                                ativos={(quickAnalysis.data?.ativos || []).filter(a => a.sinal === "COMPRA")}
                                onSelectAtivo={handleSelectAtivo}
                            />

                            {/* Paginação */}
                            {quickAnalysis.data?.totalPaginas > 1 && (
                                <div className="paginacao-container" style={{ marginTop: '20px' }}>
                                    <div className="paginacao-botoes">
                                        <button
                                            className="pag-btn"
                                            disabled={pagina === 1}
                                            onClick={() => setPagina(pagina - 1)}
                                        >
                                            ← Anterior
                                        </button>
                                        <span className="pag-info">
                                            Página {pagina} de {quickAnalysis.data?.totalPaginas}
                                        </span>
                                        <button
                                            className="pag-btn"
                                            disabled={pagina === quickAnalysis.data?.totalPaginas}
                                            onClick={() => setPagina(pagina + 1)}
                                        >
                                            Próxima →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>

                <aside style={{ gridArea: 'sidebar' }}>
                    <div className="sidebar-content">
                        <div className="card-analise" style={{ padding: '20px', background: 'var(--bg-card)', borderRadius: 'var(--radius-card)', border: '1px solid var(--border)' }}>
                            <h4 style={{ marginBottom: '15px' }}>₿ Scanner Cripto</h4>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                Análise 24 horas por dia, 7 dias por semana nos principais pares de criptomoedas cotados em USD.
                            </p>
                            <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div className="mini-stat">
                                    <span>Mercado</span>
                                    <strong style={{ color: '#10B981' }}>ATIVO 24/7</strong>
                                </div>
                                <div className="mini-stat">
                                    <span>Fonte de Dados</span>
                                    <strong>Yahoo Finance</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            <style jsx>{`
                .crypto-search-bar {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .search-input {
                    flex: 1;
                    padding: 12px 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .search-input:focus {
                    border-color: #818CF8;
                }
                .btn-clear {
                    padding: 0 16px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    cursor: pointer;
                }
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
        </>
    );
}
