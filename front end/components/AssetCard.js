import React, { useState } from 'react';
import axios from 'axios';
import { fmt, SIGNAL_ICON, OBV_ICON, confiancaColor, adxLabel, bbPositionPct } from '../utils/formatters';
import { analisarEntrada } from '../utils/analysis';
import CandlestickPatterns from './CandlestickPatterns';
import SupportResistance from './SupportResistance';
import TimesAndTrades from './TimesAndTrades';
import SuperDomPanel from './SuperDomPanel';

// ── Sub-componentes internos para organização ───────────────────────────────

const EntradaRecomendacao = React.memo(({ analise }) => {
    if (!analise) return null;
    const corMap = { green: "verde", red: "vermelho", yellow: "amarelo", blue: "azul" };
    return (
        <div className={`entrada-recomendacao ${corMap[analise.cor]}`}>
            <div className="entrada-header">
                <span className="entrada-icone">{analise.icone}</span>
                <div>
                    <div className="entrada-titulo">{analise.recomendacao}</div>
                    <div className="entrada-mensagem">{analise.mensagem}</div>
                </div>
            </div>
            <div className="entrada-stats">
                <div className="entrada-stat">
                    <span className="stat-label-small">Pontos +</span>
                    <span className="stat-value-positive">{analise.pontosPositivos}</span>
                </div>
                <div className="entrada-stat">
                    <span className="stat-label-small">Pontos −</span>
                    <span className="stat-value-negative">{analise.pontosNegativos}</span>
                </div>
                <div className="entrada-stat">
                    <span className="stat-label-small">Score</span>
                    <span className={`stat-value-score ${analise.score >= 5 ? "positive" : analise.score <= 0 ? "negative" : "neutral"}`}>
                        {analise.score >= 0 ? "+" : ""}{analise.score}
                    </span>
                </div>
            </div>
            {analise.bloqueadores.length > 0 && (
                <div className="entrada-bloqueadores">
                    {analise.bloqueadores.map((b, i) => (
                        <div key={i} className="bloqueador-item">🚫 {b}</div>
                    ))}
                </div>
            )}
        </div>
    );
});

const VereditoIACard = React.memo(({ veredito }) => {
    if (!veredito) return null;
    if (veredito.erro) {
        return (
            <div className="veredito-ia-panel error">
                <div className="veredito-ia-header"><span className="ia-icon">⚠️</span><span className="ia-label">Análise Indisponível</span></div>
                <div className="ia-justificativa" style={{ fontStyle: 'normal', color: '#fca5a5' }}>{veredito.erro}</div>
            </div>
        );
    }
    const sentimentoIcon = { Otimista: "🚀", Pessimista: "📉", Neutro: "⚖️" };
    const recomendacaoClass = { Compra: "bullish", Venda: "bearish", Aguardar: "neutral" };
    return (
        <div className="veredito-ia-panel">
            <div className="veredito-ia-header">
                <span className="ia-icon">🤖</span>
                <span className="ia-label">Análise Inteligente (Gemini AI)</span>
                {veredito.confianca && <span className="ia-confianca">{veredito.confianca}% confiança</span>}
            </div>
            <div className="veredito-ia-content">
                <div className="ia-top-row">
                    <div className="ia-sentimento">
                        <span className="sentimento-icon">{sentimentoIcon[veredito.sentimento] || "⚖️"}</span>
                        <span className="sentimento-label">{veredito.sentimento}</span>
                    </div>
                    <div className={`ia-recomendacao ${recomendacaoClass[veredito.recomendacao] || "neutral"}`}>{veredito.recomendacao}</div>
                </div>
                {(veredito.justificativa_tecnica || veredito.justificativa) && (
                    <div className="ia-section">
                        <div className="ia-section-title">📊 Análise Técnica</div>
                        <div className="ia-justificativa">{veredito.justificativa_tecnica || veredito.justificativa}</div>
                    </div>
                )}
            </div>
        </div>
    );
});

const NoticiasCard = React.memo(({ noticias }) => {
    const [aberto, setAberto] = useState(false);
    if (!noticias || noticias.length === 0) return null;

    return (
        <div className="noticias-section">
            <button className="noticias-toggle" onClick={() => setAberto(!aberto)}>
                <span>📰 Últimas Notícias ({noticias.length})</span>
                <span className="chevron">{aberto ? "▲" : "▼"}</span>
            </button>
            {aberto && (
                <ul className="noticias-list">
                    {noticias.map((n, i) => (
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
    );
});

const AssetCard = React.memo(({ d, idx }) => {
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const sinalClass   = (d.sinal ?? "NEUTRO").toLowerCase();
    const confClass    = confiancaColor(d.confianca);
    const adxInfo      = adxLabel(d.adx);
    const bbPct        = bbPositionPct(d.preco, d.bb);
    const analiseEntrada = analisarEntrada(d);
    const alvosExibicao = d.vereditoIA?.alvos ? {
        entrada: d.vereditoIA.alvos.entrada,
        stop_loss: d.vereditoIA.alvos.stop_loss,
        take_profit: d.vereditoIA.alvos.take_profit,
        alvos: null
    } : (d.alvos ? {
        entrada: d.precoEntradaViavel || d.preco,
        stop_loss: d.alvos?.stop,
        take_profit: d.alvos?.gain,
        alvo1: d.alvos?.alvo1,
        alvo2: d.alvos?.alvo2,
        alvo3: d.alvos?.alvo3,
        riscoRetorno: d.alvos?.riscoRetorno
    } : (d.detalhes?.stops ? {
        entrada: d.precoEntradaViavel || d.preco,
        stop_loss: d.detalhes?.stops?.stopLoss,
        take_profit: d.detalhes?.stops?.takeProfit
    } : null));

    async function enviarParaTelegram() {
        if (enviando || enviado) return;
        setEnviando(true);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        try {
            await axios.post(`${API_URL}/enviar-telegram`, {
                ticker: d.ticker,
                preco: d.preco,
                precoAbertura: d.precoAbertura,
                precoEntradaViavel: d.precoEntradaViavel,
                localizacaoEntrada: d.localizacaoEntrada,
                sinal: d.sinal,
                confianca: d.confianca,
                score: analiseEntrada.score,
                veredito: d.vereditoIA,
                recomendacao: { tipo: analiseEntrada.recomendacao, icone: analiseEntrada.icone }
            });
            setEnviado(true);
            setTimeout(() => setEnviado(false), 3000);
        } catch (error) {
            console.error("Erro ao enviar para Telegram:", error);
        } finally {
            setEnviando(false);
        }
    }

    return (
        <div className={`asset-card ${sinalClass}`} style={{ animationDelay: `${idx * 0.05}s` }}>
            <div className="card-header">
                <div>
                    <div className="ticker">{d.ticker?.replace(".SA", "")}</div>
                    <div className="ticker-full">{d.nome || d.ticker}</div>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                        className={`btn-telegram ${enviado ? 'success' : ''}`} 
                        onClick={enviarParaTelegram}
                        disabled={enviando || enviado}
                        title="Enviar para Telegram"
                    >
                        {enviando ? '⌛' : enviado ? '✅' : '✈️'} {enviado ? 'Enviado' : 'Telegram'}
                    </button>
                    <div className={`signal-badge ${d.sinal}`}>
                        <span>{SIGNAL_ICON[d.sinal] ?? "◆"}</span> {d.sinal ?? "NEUTRO"}
                    </div>
                </div>
            </div>

            <div className="price-section">
                <div className="price-label">Preço Atual</div>
                <div className="price-value"><span className="price-currency">R$</span>{fmt(d.preco)}</div>
            </div>

            <div className="price-history-section">
                <div className="price-history-grid">
                    <div className="price-history-item">
                        <span className="price-history-label">Abertura</span>
                        <div className="price-history-value">R$ {fmt(d.precoAbertura)}</div>
                        <div className={`price-variation ${d.preco >= d.precoAbertura ? 'positive' : 'negative'}`}>
                            {d.preco >= d.precoAbertura ? '▲' : '▼'} {fmt(Math.abs(((d.preco - d.precoAbertura) / d.precoAbertura) * 100))}%
                        </div>
                    </div>
                    <div className="price-history-item">
                        <span className="price-history-label">Entrada Viável</span>
                        <div className="price-history-value" style={{ color: 'var(--accent-green)' }}>R$ {fmt(d.precoEntradaViavel)}</div>
                        <div className="price-variation" style={{ color: 'var(--accent-green)', fontSize: '10px', fontWeight: '700' }}>
                            {d.localizacaoEntrada || "Suporte"}
                        </div>
                    </div>
                </div>
            </div>

            <EntradaRecomendacao analise={analiseEntrada} />

            <div className="confianca-section">
                <div className="confianca-header">
                    <span className="confianca-label">Confiança do Sinal</span>
                    <span className={`confianca-num ${confClass}`}>{d.confianca ?? 0}%</span>
                </div>
                <div className="confianca-bar-bg"><div className={`confianca-bar-fill ${confClass}`} style={{ width: `${d.confianca ?? 0}%` }} /></div>
            </div>

            {alvosExibicao && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>🎯 Alvos da Operação</span>
                        <span style={{ fontSize: '9px', opacity: 0.8 }}>{d.vereditoIA?.alvos ? "Inteligência Artificial" : "Análise Avançada"}</span>
                    </div>
                    <div className="ia-alvos-grid" style={{ marginTop: 0, gap: '8px' }}>
                        <div className="ia-alvo-item entrada">
                            <span className="alvo-label">Entrada</span>
                            <span className="alvo-value">R$ {fmt(alvosExibicao.entrada)}</span>
                        </div>
                        <div className="ia-alvo-item stop">
                            <span className="alvo-label">Stop Loss</span>
                            <span className="alvo-value">R$ {fmt(alvosExibicao.stop_loss)}</span>
                        </div>
                        {alvosExibicao.alvo1 && (
                            <div className="ia-alvo-item profit" style={{ background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgba(34, 197, 94, 0.3)' }}>
                                <span className="alvo-label">Alvo 1 (Conservador)</span>
                                <span className="alvo-value">R$ {fmt(alvosExibicao.alvo1)}</span>
                                {alvosExibicao.riscoRetorno?.alvo1 && (
                                    <span style={{ fontSize: '10px', color: 'var(--accent-green)' }}>
                                        R/R: {alvosExibicao.riscoRetorno.alvo1}
                                    </span>
                                )}
                            </div>
                        )}
                        {alvosExibicao.alvo2 && (
                            <div className="ia-alvo-item" style={{ background: 'rgba(251, 191, 36, 0.1)', borderColor: 'rgba(251, 191, 36, 0.3)' }}>
                                <span className="alvo-label">Alvo 2</span>
                                <span className="alvo-value">R$ {fmt(alvosExibicao.alvo2)}</span>
                                {alvosExibicao.riscoRetorno?.alvo2 && (
                                    <span style={{ fontSize: '10px', color: 'var(--accent-yellow)' }}>
                                        R/R: {alvosExibicao.riscoRetorno.alvo2}
                                    </span>
                                )}
                            </div>
                        )}
                        {alvosExibicao.alvo3 && (
                            <div className="ia-alvo-item" style={{ background: 'rgba(251, 146, 60, 0.1)', borderColor: 'rgba(251, 146, 60, 0.3)' }}>
                                <span className="alvo-label">Alvo 3 (Ambicioso)</span>
                                <span className="alvo-value">R$ {fmt(alvosExibicao.alvo3)}</span>
                                {alvosExibicao.riscoRetorno?.alvo3 && (
                                    <span style={{ fontSize: '10px', color: '#fb923c' }}>
                                        R/R: {alvosExibicao.riscoRetorno.alvo3}
                                    </span>
                                )}
                            </div>
                        )}
                        {!alvosExibicao.alvo1 && alvosExibicao.take_profit && (
                            <div className="ia-alvo-item profit">
                                <span className="alvo-label">Alvo (TP)</span>
                                <span className="alvo-value">R$ {fmt(alvosExibicao.take_profit)}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="metrics-grid">
                <div className="metric">
                    <div className="metric-label">RSI (14)</div>
                    <div className={`metric-value ${d.rsi < 30 ? "green" : d.rsi > 70 ? "red" : ""}`}>{fmt(d.rsi)}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">SMA 9 / 21</div>
                    <div className="metric-value">{fmt(d.sma9)} / {fmt(d.sma21)}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">ADX</div>
                    <div className={`metric-value adx-${adxInfo.cls}`}>{fmt(d.adx, 1)}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">OBV</div>
                    <div className={`metric-value obv-${(d.obv_trend ?? "NEUTRO").toLowerCase()}`}>{OBV_ICON[d.obv_trend ?? "NEUTRO"]} {d.obv_trend ?? "NEUTRO"}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">ATR (Vol. Diária)</div>
                    <div className="metric-value">R$ {fmt(d.atr)}</div>
                </div>
            </div>

            {d.bb && bbPct !== null && (
                <div className="bb-section">
                    <div className="bb-header"><span className="bb-label">Bandas de Bollinger</span><span className="bb-pct">{fmt(bbPct, 0)}%</span></div>
                    <div className="bb-bar-bg">
                        <div className="bb-zones"><div className="bb-zone-low" /><div className="bb-zone-mid" /><div className="bb-zone-high" /></div>
                        <div className="bb-marker" style={{ left: `${bbPct}%` }} />
                    </div>
                </div>
            )}

            {d.detalhes?.sr_analysis && (
                <SupportResistance sr={d.detalhes.sr_analysis} preco={d.preco} />
            )}

            <VereditoIACard veredito={d.vereditoIA} />

            <NoticiasCard noticias={d.noticias} />
            
            {d.detalhes?.candlestick_patterns && (
                <CandlestickPatterns patterns={d.detalhes.candlestick_patterns} />
            )}

            {/* Times & Trades — Fluxo de Negócios */}
            <TimesAndTrades
                ttAnalysis={d.detalhes?.tt_analysis ?? d.tt_analysis}
                preco={d.preco}
            />

            {/* Super DOM — Livro de Ordens */}
            <SuperDomPanel
                domAnalysis={d.detalhes?.dom_analysis ?? d.dom_analysis}
                preco={d.preco}
            />
        </div>
    );
});

AssetCard.displayName = 'AssetCard';
export default AssetCard;
