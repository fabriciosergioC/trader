import React from 'react';
import Head from 'next/head';
import CryptoHeader from '../components/CryptoHeader';
import { fmt } from '../utils/formatters';
import CryptoSuperDomPanel from '../components/CryptoSuperDomPanel';

const CRYPTO_ICONS = {
    'BTC-USD': '₿', 'ETH-USD': 'Ξ', 'SOL-USD': '◎', 'ADA-USD': '₳', 'XRP-USD': '✕',
};

const SINAL_CONFIG = {
    COMPRA: { cor: '#10B981', bg: 'rgba(16,185,129,0.12)', icone: '▲' },
    VENDA:  { cor: '#EF4444', bg: 'rgba(239,68,68,0.12)',  icone: '▼' },
    NEUTRO: { cor: '#94A3B8', bg: 'rgba(148,163,184,0.08)', icone: '◆' },
};

const Row = ({ label, value, color }) => (
    <div className="detail-row">
        <span className="detail-label">{label}</span>
        <span className="detail-value" style={color ? { color } : undefined}>{value ?? '—'}</span>
        <style jsx>{`
            .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
            .detail-label { font-size: 12px; color: var(--text-secondary); }
            .detail-value { font-size: 13px; font-weight: 700; font-family: monospace; }
        `}</style>
    </div>
);

const CryptoDetailView = ({ ticker, data, onVoltar }) => {
    const [noticiasAberto, setNoticiasAberto] = React.useState(false);
    
    if (!data) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">Carregando análise de {ticker}…</p>
            </div>
        );
    }

    const d = data;
    const cfg = SINAL_CONFIG[d.sinal] || SINAL_CONFIG.NEUTRO;
    const icon = CRYPTO_ICONS[ticker] || '🪙';
    const sr = d.detalhes?.sr_analysis;
    const alvosExibicao = d.vereditoIA?.alvos ? {
        entrada: d.vereditoIA.alvos.entrada,
        stop_loss: d.vereditoIA.alvos.stop_loss,
        take_profit: d.vereditoIA.alvos.take_profit
    } : (d.alvos || d.detalhes?.stops ? {
        entrada: d.precoEntradaViavel || d.preco,
        stop_loss: d.alvos?.stop ?? d.detalhes?.stops?.stopLoss,
        take_profit: d.alvos?.gain ?? d.detalhes?.stops?.takeProfit
    } : null);

    return (
        <div className="crypto-detail-page" style={{ padding: 'var(--spacing-app)' }}>
            <Head><title>TradeAI Crypto — {ticker?.replace('-USD', '')}</title></Head>

            {/* Cabeçalho de volta */}
            <CryptoHeader totalAtivos={0} onRefresh={() => {}} atualizando={false} />

            <div style={{ marginTop: 20 }}>
                <button className="btn-voltar" onClick={onVoltar}>← Voltar</button>
            </div>

            {/* Hero do ativo */}
            <div className="crypto-hero">
                <div className="hero-left">
                    <span className="hero-icon">{icon}</span>
                    <div>
                        <h1 className="hero-ticker">{ticker?.replace('-USD', '')}</h1>
                        <div className="hero-nome">{d.nome || ticker}</div>
                    </div>
                </div>
                <div className="hero-right">
                    <div className="hero-price">$ {fmt(d.preco)}</div>
                    <div style={{ fontSize: '11px', marginBottom: '4px', display: 'flex', gap: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Ab: $ {fmt(d.precoAbertura)}</span>
                        <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>In: $ {fmt(d.precoEntradaViavel)}</span>
                    </div>
                    <span className="hero-sinal" style={{ color: cfg.cor, background: cfg.bg }}>
                        {cfg.icone} {d.sinal}
                    </span>
                </div>
            </div>

            <div className="detail-grid">
                {/* Indicadores Técnicos */}
                <div className="detail-card">
                    <h3 className="detail-card-title">📊 Indicadores Técnicos</h3>
                    <Row label="RSI (14)" value={d.rsi?.toFixed(2)} color={d.rsi < 35 ? '#10B981' : d.rsi > 65 ? '#EF4444' : undefined} />
                    <Row label="ADX" value={d.adx?.toFixed(2)} color={d.adx >= 25 ? '#10B981' : '#F59E0B'} />
                    <Row label="Confiança" value={`${d.confianca || 0}%`} color={cfg.cor} />
                    <Row label="SMA 9" value={`$ ${fmt(d.sma9)}`} />
                    <Row label="SMA 21" value={`$ ${fmt(d.sma21)}`} />
                    <Row label="SMA 50" value={`$ ${fmt(d.sma50)}`} />
                    <Row label="SMA 200" value={`$ ${fmt(d.sma200)}`} />
                    <Row label="OBV Trend" value={d.obv_trend} color={d.obv_trend === 'SUBINDO' ? '#10B981' : '#EF4444'} />
                </div>

                {/* Resumo da IA */}
                <div className="detail-card">
                    <h3 className="detail-card-title">🧠 Análise Técnica</h3>
                    {d.vereditoIA && !d.vereditoIA.erro ? (
                        <>
                            <div className="ia-badge" style={{ color: d.vereditoIA.recomendacao === 'COMPRA' ? '#10B981' : d.vereditoIA.recomendacao === 'VENDA' ? '#EF4444' : '#F59E0B' }}>
                                {d.vereditoIA.recomendacao}
                            </div>
                            <p className="ia-resumo">{d.vereditoIA.resumo || d.vereditoIA.justificativa_tecnica}</p>
                        </>
                    ) : (
                        <>
                            <Row label="Tendência" value={d.detalhes?.tendencia} color={d.detalhes?.tendencia === 'ALTA' ? '#10B981' : '#EF4444'} />
                            <Row label="Variação 5d" value={`${d.detalhes?.variacao_5dias?.toFixed(2) || '—'}%`} />
                            <Row label="Volatilidade" value={d.detalhes?.volatilidade} />
                            <Row label="MACD Status" value={d.detalhes?.macd_status} color={d.detalhes?.macd_status === 'BULLISH' ? '#10B981' : '#EF4444'} />
                        </>
                    )}
                </div>
            </div>

            {/* Alvos da Operação (Cripto) */}
            {alvosExibicao && (
                <div className="detail-card" style={{ marginTop: 16 }}>
                    <h3 className="detail-card-title">🎯 Alvos Recomendados ({d.vereditoIA?.alvos ? "Análise IA" : "Algoritmo"})</h3>
                    <div className="sr-mini-grid">
                        <div className="sr-mini-item support" style={{ borderColor: 'var(--accent-blue)' }}>
                            <span className="sr-mini-lbl" style={{ color: 'var(--accent-blue)' }}>Entrada</span>
                            <span className="sr-mini-val" style={{ color: 'var(--accent-blue)' }}>$ {fmt(alvosExibicao.entrada)}</span>
                        </div>
                        <div className="sr-mini-item resistance" style={{ borderColor: 'var(--accent-red)' }}>
                            <span className="sr-mini-lbl" style={{ color: 'var(--accent-red)' }}>Stop Loss</span>
                            <span className="sr-mini-val" style={{ color: 'var(--accent-red)' }}>$ {fmt(alvosExibicao.stop_loss)}</span>
                        </div>
                        <div className="sr-mini-item support" style={{ borderColor: 'var(--accent-green)' }}>
                            <span className="sr-mini-lbl" style={{ color: 'var(--accent-green)' }}>Alvo (TP)</span>
                            <span className="sr-mini-val" style={{ color: 'var(--accent-green)' }}>$ {fmt(alvosExibicao.take_profit)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Notícias */}
            {d.noticias && d.noticias.length > 0 && (
                <div className="detail-card" style={{ marginTop: 16 }}>
                    <div className="noticias-section">
                        <button className="noticias-toggle" onClick={() => setNoticiasAberto(!noticiasAberto)}>
                            <span>📰 Últimas Notícias ({d.noticias.length})</span>
                            <span className="chevron">{noticiasAberto ? "▲" : "▼"}</span>
                        </button>
                        {noticiasAberto && (
                            <ul className="noticias-list">
                                {d.noticias.map((n, i) => (
                                    <li key={i} className="noticia-item">
                                        <div className="noticia-titulo">{n.titulo}</div>
                                        <div className="noticia-meta">
                                            <span className="noticia-fonte">{n.fonte}</span>
                                            <span className="noticia-data">{n.data}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Suporte & Resistência em USD */}
            {sr && (
                <div className="detail-card" style={{ marginTop: 16 }}>
                    <h3 className="detail-card-title">🛡️ Suporte & Resistência (USD)</h3>
                    <div className="sr-mini-grid">
                        <div className="sr-mini-item support">
                            <span className="sr-mini-lbl">Suporte (Faixa)</span>
                            <span className="sr-mini-val">$ {fmt(sr.support?.mean)}</span>
                            <span className="sr-mini-sub">{sr.support?.touches} toques</span>
                        </div>
                        <div className="sr-mini-item current">
                            <span className="sr-mini-lbl">Preço Atual</span>
                            <span className="sr-mini-val">$ {fmt(d.preco)}</span>
                            <span className="sr-mini-sub">{sr.entry_zone_status?.replace('_', ' ')}</span>
                        </div>
                        <div className="sr-mini-item resistance">
                            <span className="sr-mini-lbl">Resistência (Faixa)</span>
                            <span className="sr-mini-val">$ {fmt(sr.resistance?.mean)}</span>
                            <span className="sr-mini-sub">{sr.resistance?.touches} toques</span>
                        </div>
                    </div>
                    {sr.entry_details && (
                        <p className="sr-details-text">💡 {sr.entry_details}</p>
                    )}
                </div>
            )}

            {/* Super DOM de Cripto */}
            {d.detalhes?.dom_analysis && (
                <div className="detail-card" style={{ marginTop: 16 }}>
                    <CryptoSuperDomPanel domAnalysis={d.detalhes.dom_analysis} preco={d.preco} />
                </div>
            )}

            <style jsx>{`
                .crypto-hero {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    margin: 16px 0;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .hero-left { display: flex; align-items: center; gap: 16px; }
                .hero-icon { font-size: 40px; }
                .hero-ticker { font-size: 28px; font-weight: 900; margin: 0; }
                .hero-nome { font-size: 13px; color: var(--text-secondary); }
                .hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
                .hero-price { font-size: 24px; font-weight: 800; font-family: monospace; }
                .hero-sinal {
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-size: 14px;
                    font-weight: 800;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-top: 0;
                }
                .detail-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 18px;
                }
                .detail-card-title { font-size: 13px; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
                .ia-badge { font-size: 22px; font-weight: 900; text-align: center; margin-bottom: 10px; }
                .ia-resumo { font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin: 0; }
                .btn-voltar {
                    padding: 8px 16px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-bottom: 12px;
                    transition: background 0.2s;
                }
                .btn-voltar:hover { background: rgba(255,255,255,0.12); }
                .sr-mini-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .sr-mini-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 10px;
                    border-radius: 10px;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .sr-mini-item.support .sr-mini-val { color: #10B981; }
                .sr-mini-item.resistance .sr-mini-val { color: #EF4444; }
                .sr-mini-lbl { font-size: 10px; color: var(--text-secondary); text-align: center; }
                .sr-mini-val { font-size: 15px; font-weight: 800; font-family: monospace; margin: 4px 0 2px; }
                .sr-mini-sub { font-size: 10px; color: var(--text-secondary); }
                .sr-details-text { font-size: 11px; line-height: 1.4; color: var(--text-secondary); margin: 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.04); }
                @media (max-width: 640px) {
                    .detail-grid { grid-template-columns: 1fr; }
                    .sr-mini-grid { grid-template-columns: 1fr; }
                    .hero-right { align-items: flex-start; }
                }
            `}</style>
        </div>
    );
};

export default CryptoDetailView;
