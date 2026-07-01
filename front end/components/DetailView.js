import React from 'react';
import Head from 'next/head';
import AssetCard from './AssetCard';
import { useStore } from '../store/useStore';

const DetailView = ({ ticker, data, loading }) => {
    const setAtivoSelecionado = useStore(state => state.setAtivoSelecionado);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">Carregando análise detalhada…</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: 'var(--spacing-app)' }}>
            <Head>
                <title>TradeAI — {ticker}</title>
            </Head>
            <header className="header" style={{ marginBottom: '24px' }}>
                <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button 
                        className="btn-voltar" 
                        onClick={() => setAtivoSelecionado(null)}
                        style={{ padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                    >
                        ← Voltar
                    </button>
                    <div>
                        <div className="header-title" style={{ fontSize: 'var(--font-xl)', fontWeight: '800' }}>{ticker?.replace(".SA", "")}</div>
                        <div className="header-subtitle" style={{ color: 'var(--text-secondary)' }}>Análise Detalhada</div>
                    </div>
                </div>
            </header>

            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {data?.map((d, i) => (
                    <AssetCard key={d.ticker} d={d} idx={i} />
                ))}
            </div>
        </div>
    );
};

export default DetailView;
