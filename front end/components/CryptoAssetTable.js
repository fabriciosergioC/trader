import React from 'react';

const fmt = (v) => v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

const SINAL_CONFIG = {
    COMPRA: { cor: '#10B981', bg: 'rgba(16,185,129,0.12)', icone: '▲' },
    VENDA:  { cor: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icone: '▼' },
    NEUTRO: { cor: '#94A3B8', bg: 'rgba(148,163,184,0.08)', icone: '◆' },
};

const CRYPTO_ICONS = {
    'BTC-USD': '₿',
    'ETH-USD': 'Ξ',
    'SOL-USD': '◎',
    'ADA-USD': '₳',
    'XRP-USD': '✕',
};

const CryptoAssetTable = ({ ativos = [], onSelectAtivo }) => {
    if (!ativos.length) {
        return (
            <div className="empty-state">
                <div className="empty-icon">₿</div>
                <p>Nenhum criptoativo encontrado.</p>
            </div>
        );
    }

    return (
        <div className="crypto-table-wrap">
            <div className="crypto-table-header">
                <span>Ativo</span>
                <span>Preço (USD)</span>
                <span>Sinal</span>
                <span>Confiança</span>
                <span>RSI</span>
                <span>ATR (Vol)</span>
                <span>Tendência</span>
                <span>Ação</span>
            </div>
            {ativos.map((ativo, idx) => {
                const cfg = SINAL_CONFIG[ativo.sinal] || SINAL_CONFIG.NEUTRO;
                const icon = CRYPTO_ICONS[ativo.ticker] || '🪙';
                return (
                    <div key={ativo.ticker} className="crypto-table-row" style={{ animationDelay: `${idx * 0.04}s` }}>
                        <div className="col-ativo">
                            <span className="crypto-icon">{icon}</span>
                            <div>
                                <div className="crypto-ticker">{ativo.ticker.replace('-USD', '')}</div>
                                <div className="crypto-nome">{ativo.nome || ativo.ticker}</div>
                            </div>
                        </div>
                        <div className="col-preco">
                            <div className="price-main"><span className="currency">$</span>{fmt(ativo.preco)}</div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '10px', marginTop: '2px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Ab: ${fmt(ativo.precoAbertura)}</span>
                                <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>In: ${fmt(ativo.precoEntradaViavel)}</span>
                            </div>
                        </div>
                        <div className="col-sinal">
                            <span className="sinal-badge" style={{ color: cfg.cor, background: cfg.bg }}>
                                {cfg.icone} {ativo.sinal}
                            </span>
                        </div>
                        <div className="col-conf">
                            <div className="conf-bar-bg">
                                <div className="conf-bar-fill" style={{ width: `${ativo.confianca || 0}%`, background: cfg.cor }} />
                            </div>
                            <span className="conf-val">{ativo.confianca || 0}%</span>
                        </div>
                        <div className="col-rsi" style={{ color: ativo.rsi < 35 ? '#10B981' : ativo.rsi > 65 ? '#EF4444' : '#94A3B8' }}>
                            {ativo.rsi != null ? ativo.rsi.toFixed(1) : '—'}
                        </div>
                        <div className="col-atr">
                            <div className="atr-val">${fmt(ativo.atr)}</div>
                            <div className="atr-label">Vol. Diária</div>
                        </div>
                        <div className="col-tend" style={{ color: ativo.detalhes?.tendencia === 'ALTA' ? '#10B981' : '#EF4444' }}>
                            {ativo.detalhes?.tendencia === 'ALTA' ? '▲ Alta' : '▼ Baixa'}
                        </div>
                        <div className="col-acao">
                            <button className="btn-detalhe" onClick={() => onSelectAtivo(ativo.ticker)}>
                                Ver Análise
                            </button>
                        </div>
                    </div>
                );
            })}

            <style jsx>{`
                .crypto-table-wrap { display: flex; flex-direction: column; gap: 4px; }
                .crypto-table-header {
                    display: grid;
                    grid-template-columns: 2fr 1.2fr 1fr 1.4fr 0.7fr 0.8fr 1fr 1fr;
                    padding: 8px 16px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.6px;
                    color: var(--text-secondary);
                    border-bottom: 1px solid var(--border);
                }
                .crypto-table-row {
                    display: grid;
                    grid-template-columns: 2fr 1.2fr 1fr 1.4fr 0.7fr 0.8fr 1fr 1fr;
                    align-items: center;
                    padding: 10px 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    transition: border-color 0.2s, transform 0.15s;
                    animation: fadeIn 0.3s ease both;
                }
                .crypto-table-row:hover { border-color: rgba(99,102,241,0.4); transform: translateY(-1px); }
                .col-ativo { display: flex; align-items: center; gap: 10px; }
                .crypto-icon { font-size: 20px; width: 32px; text-align: center; }
                .crypto-ticker { font-size: 14px; font-weight: 800; color: var(--text-primary); }
                .crypto-nome { font-size: 11px; color: var(--text-secondary); }
                .col-preco { font-size: 15px; font-weight: 700; font-family: monospace; }
                .currency { font-size: 11px; color: var(--text-secondary); margin-right: 2px; }
                .sinal-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 11px;
                    font-weight: 700;
                }
                .conf-bar-bg {
                    height: 4px;
                    background: rgba(255,255,255,0.07);
                    border-radius: 100px;
                    overflow: hidden;
                    margin-bottom: 3px;
                }
                .conf-bar-fill { height: 100%; border-radius: 100px; transition: width 0.5s; }
                .conf-val { font-size: 11px; font-family: monospace; color: var(--text-secondary); }
                .col-rsi { font-size: 13px; font-weight: 700; font-family: monospace; }
                .col-atr { font-family: monospace; }
                .atr-val { font-size: 13px; font-weight: 700; color: var(--text-primary); }
                .atr-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; }
                .col-tend { font-size: 12px; font-weight: 600; }
                .btn-detalhe {
                    padding: 6px 12px;
                    background: rgba(99,102,241,0.15);
                    border: 1px solid rgba(99,102,241,0.3);
                    border-radius: 8px;
                    color: #818CF8;
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.2s;
                    white-space: nowrap;
                }
                .btn-detalhe:hover { background: rgba(99,102,241,0.3); }
                .empty-state { text-align: center; padding: 60px; color: var(--text-secondary); }
                .empty-icon { font-size: 48px; margin-bottom: 12px; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
                @media (max-width: 768px) {
                    .crypto-table-header, .crypto-table-row {
                        grid-template-columns: 2fr 1fr 1fr;
                    }
                    .col-conf, .col-rsi, .col-atr, .col-tend { display: none; }
                }
            `}</style>
        </div>
    );
};

export default CryptoAssetTable;
