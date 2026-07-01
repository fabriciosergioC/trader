import React, { useState } from 'react';

const fmt = (v) => v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

const CRYPTO_ICONS = {
    'BTC-USD': '₿', 'ETH-USD': 'Ξ', 'SOL-USD': '◎', 'ADA-USD': '₳', 'XRP-USD': '✕',
};

const CryptoOpportunitySection = ({ ativos = [], onSelectAtivo }) => {
    const [aba, setAba] = useState('compra');

    if (!ativos || ativos.length === 0) return null;

    const destaqueCompra = ativos
        .filter(a => a.probabilidade >= 40 && a.adx > 21)
        .sort((a, b) => b.probabilidade - a.probabilidade)
        .slice(0, 5);

    const destaqueVenda = ativos
        .filter(a => a.probabilidadeVenda >= 40)
        .sort((a, b) => b.probabilidadeVenda - a.probabilidadeVenda)
        .slice(0, 5);

    const lista = aba === 'compra' ? destaqueCompra : destaqueVenda;

    if (destaqueCompra.length === 0 && destaqueVenda.length === 0) return null;

    return (
        <div className="crypto-opp-section">
            <div className="opp-header">
                <h2 className="opp-title">
                    🚀 Oportunidades em Destaque
                </h2>
                <div className="opp-tabs">
                    <button
                        className={`opp-tab ${aba === 'compra' ? 'active-buy' : ''}`}
                        onClick={() => setAba('compra')}
                    >
                        📈 Compra ({destaqueCompra.length})
                    </button>
                    <button
                        className={`opp-tab ${aba === 'venda' ? 'active-sell' : ''}`}
                        onClick={() => setAba('venda')}
                    >
                        📉 Venda ({destaqueVenda.length})
                    </button>
                </div>
            </div>

            <div className="opp-cards">
                {lista.map((a) => {
                    const prob = aba === 'compra' ? a.probabilidade : a.probabilidadeVenda;
                    const isBuy = aba === 'compra';
                    const cor = isBuy ? '#10B981' : '#EF4444';
                    const icon = CRYPTO_ICONS[a.ticker] || '🪙';

                    return (
                        <div
                            key={a.ticker}
                            className="opp-card"
                            style={{ borderColor: `${cor}33`, cursor: 'pointer' }}
                            onClick={() => onSelectAtivo(a.ticker)}
                        >
                            <div className="opp-card-top">
                                <span className="opp-icon">{icon}</span>
                                <div>
                                    <div className="opp-ticker">{a.ticker.replace('-USD', '')}</div>
                                    <div className="opp-nome">{a.nome}</div>
                                </div>
                            </div>
                            <div className="opp-price">$ {fmt(a.preco)}</div>
                            <div className="opp-prob-bar-bg">
                                <div
                                    className="opp-prob-bar-fill"
                                    style={{ width: `${prob}%`, background: cor }}
                                />
                            </div>
                            <div className="opp-footer">
                                <span style={{ color: cor, fontWeight: 700 }}>
                                    {isBuy ? a.recomendacao : a.recomendacaoVenda}
                                </span>
                                <span className="opp-prob-label" style={{ color: cor }}>
                                    {prob}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .crypto-opp-section {
                    margin: 24px 0;
                    padding: 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                }
                .opp-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .opp-title { font-size: 16px; font-weight: 800; margin: 0; }
                .opp-tabs { display: flex; gap: 8px; }
                .opp-tab {
                    padding: 6px 14px;
                    border-radius: 20px;
                    border: 1px solid var(--border);
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .opp-tab.active-buy { background: rgba(16,185,129,0.15); border-color: #10B981; color: #10B981; }
                .opp-tab.active-sell { background: rgba(239,68,68,0.15); border-color: #EF4444; color: #EF4444; }
                .opp-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
                .opp-card {
                    padding: 14px;
                    background: var(--bg-secondary);
                    border: 1px solid;
                    border-radius: 12px;
                    transition: transform 0.15s, box-shadow 0.2s;
                }
                .opp-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.2); }
                .opp-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
                .opp-icon { font-size: 22px; }
                .opp-ticker { font-size: 15px; font-weight: 800; }
                .opp-nome { font-size: 10px; color: var(--text-secondary); }
                .opp-price { font-size: 14px; font-weight: 700; font-family: monospace; margin-bottom: 8px; }
                .opp-prob-bar-bg {
                    height: 4px;
                    background: rgba(255,255,255,0.07);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 8px;
                }
                .opp-prob-bar-fill { height: 100%; border-radius: 100px; transition: width 0.5s; }
                .opp-footer { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
                .opp-prob-label { font-family: monospace; font-weight: 800; font-size: 13px; }
            `}</style>
        </div>
    );
};

export default CryptoOpportunitySection;
