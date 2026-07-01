import React, { useMemo } from 'react';
import { fmt } from '../utils/formatters';

/**
 * Componente Times & Trades
 * Exibe análise de microestrutura: tabela de negócios, delta acumulado,
 * indicador de agressão, VWAP e atividade institucional.
 */
const TimesAndTrades = ({ ttAnalysis, preco }) => {
    if (!ttAnalysis || ttAnalysis.error) return null;

    const {
        vwap,
        delta,
        clusters,
        tickSpeed,
        vwapPosition,
        priceVsVWAP,
        ttScore,
        ttSignals = [],
        ttInterpretation,
        tradesList = []
    } = ttAnalysis;

    // Cores e rótulos
    const pressureConfig = {
        COMPRADOR_FORTE:  { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'COMPRADOR FORTE ↑↑' },
        COMPRADOR:        { color: '#34D399', bg: 'rgba(52,211,153,0.10)', label: 'COMPRADOR ↑' },
        NEUTRO:           { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', label: 'NEUTRO —' },
        VENDEDOR:         { color: '#F87171', bg: 'rgba(248,113,113,0.10)', label: 'VENDEDOR ↓' },
        VENDEDOR_FORTE:   { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'VENDEDOR FORTE ↓↓' },
    };

    const pressure = pressureConfig[delta?.pressure] || pressureConfig.NEUTRO;

    const instConfig = {
        COMPRA_INSTITUCIONAL: { color: '#10B981', icon: '🏦', label: 'Compra Institucional' },
        VENDA_INSTITUCIONAL:  { color: '#EF4444', icon: '🏦', label: 'Venda Institucional' },
        ATIVIDADE_MISTA:      { color: '#F59E0B', icon: '🏦', label: 'Atividade Mista' },
        NEUTRO:               { color: '#94A3B8', icon: '◆',  label: 'Sem Atividade Notável' },
    };
    const instAct = instConfig[clusters?.institutionalActivity] || instConfig.NEUTRO;

    // Cor do score geral
    const scoreColor = ttScore >= 3 ? '#10B981' : ttScore <= -3 ? '#EF4444' : '#F59E0B';

    // Barra de delta
    const deltaPct = delta?.deltaPct ?? 0;
    const deltaBarWidth = Math.min(100, Math.abs(deltaPct) * 3);
    const deltaIsPositive = deltaPct >= 0;

    return (
        <div className="tt-section">
            <h3 className="tt-title">🕐 Times & Trades — Fluxo de Negócios</h3>

            {/* ─── PAINEL DE PRESSÃO DIRECIONAL ─── */}
            <div className="tt-pressure-panel" style={{ background: pressure.bg, borderColor: pressure.color }}>
                <div className="tt-pressure-left">
                    <span className="tt-pressure-label">PRESSÃO DIRECIONAL</span>
                    <span className="tt-pressure-value" style={{ color: pressure.color }}>{pressure.label}</span>
                </div>
                <div className="tt-score-badge" style={{ borderColor: scoreColor, color: scoreColor }}>
                    <span className="tt-score-num">{ttScore >= 0 ? '+' : ''}{ttScore}</span>
                    <span className="tt-score-label">SCORE T&T</span>
                </div>
            </div>

            {/* ─── MÉTRICAS PRINCIPAIS ─── */}
            <div className="tt-metrics-row">
                {/* Delta */}
                <div className="tt-metric-card">
                    <span className="tt-metric-lbl">DELTA ACUMULADO</span>
                    <div className="tt-delta-bar-wrap">
                        <div className="tt-delta-bar-bg">
                            <div
                                className={`tt-delta-bar-fill ${deltaIsPositive ? 'positive' : 'negative'}`}
                                style={{
                                    width: `${deltaBarWidth}%`,
                                    marginLeft: deltaIsPositive ? '50%' : `${50 - deltaBarWidth}%`
                                }}
                            />
                            <div className="tt-delta-center-line" />
                        </div>
                    </div>
                    <span className="tt-metric-val" style={{ color: deltaIsPositive ? '#10B981' : '#EF4444' }}>
                        {deltaIsPositive ? '+' : ''}{deltaPct.toFixed(1)}%
                    </span>
                </div>

                {/* VWAP */}
                {vwap && (
                    <div className="tt-metric-card">
                        <span className="tt-metric-lbl">VWAP</span>
                        <span className="tt-metric-val">R$ {fmt(vwap.vwap)}</span>
                        <span
                            className="tt-metric-sub"
                            style={{ color: priceVsVWAP >= 0 ? '#10B981' : '#EF4444' }}
                        >
                            {priceVsVWAP >= 0 ? '+' : ''}{priceVsVWAP?.toFixed(2)}% do VWAP
                        </span>
                    </div>
                )}

                {/* Tick Speed */}
                <div className="tt-metric-card">
                    <span className="tt-metric-lbl">TICK SPEED</span>
                    <span className="tt-metric-val" style={{ fontSize: '12px' }}>
                        {tickSpeed?.tickSpeed === 'ACELERANDO' ? '⚡' :
                         tickSpeed?.tickSpeed === 'DESACELERANDO' ? '🐌' : '→'}
                        {' '}{tickSpeed?.tickSpeed?.replace('_', ' ') ?? 'NORMAL'}
                    </span>
                    {tickSpeed?.acceleration !== undefined && (
                        <span className="tt-metric-sub">
                            {tickSpeed.acceleration >= 0 ? '+' : ''}{tickSpeed.acceleration.toFixed(1)}% aceleração
                        </span>
                    )}
                </div>
            </div>

            {/* ─── BANDAS DO VWAP ─── */}
            {vwap && (
                <div className="tt-vwap-bands">
                    <span className="tt-vwap-label">Bandas VWAP</span>
                    <div className="tt-vwap-band-grid">
                        <span className="tt-vwap-band red">R$ {fmt(vwap.lowerBand2)} (−2σ)</span>
                        <span className="tt-vwap-band orange">R$ {fmt(vwap.lowerBand1)} (−1σ)</span>
                        <span className="tt-vwap-band white">R$ {fmt(vwap.vwap)} (VWAP)</span>
                        <span className="tt-vwap-band orange">R$ {fmt(vwap.upperBand1)} (+1σ)</span>
                        <span className="tt-vwap-band red">R$ {fmt(vwap.upperBand2)} (+2σ)</span>
                    </div>
                </div>
            )}

            {/* ─── ATIVIDADE INSTITUCIONAL ─── */}
            {clusters && (
                <div className="tt-institutional">
                    <span className="tt-inst-icon">{instAct.icon}</span>
                    <div className="tt-inst-info">
                        <span className="tt-inst-label">Atividade Institucional</span>
                        <span className="tt-inst-value" style={{ color: instAct.color }}>{instAct.label}</span>
                    </div>
                    <div className="tt-clusters-info">
                        <span>🟢 {clusters.buyingClusters}</span>
                        <span>🔴 {clusters.sellingClusters}</span>
                    </div>
                </div>
            )}

            {/* ─── SINAIS DO T&T ─── */}
            {ttSignals.length > 0 && (
                <div className="tt-signals">
                    {ttSignals.map((s, i) => (
                        <div key={i} className={`tt-signal-item ${s.tipo}`}>
                            {s.texto}
                        </div>
                    ))}
                </div>
            )}

            {/* ─── TABELA DE ÚLTIMOS NEGÓCIOS ─── */}
            {tradesList.length > 0 && (
                <div className="tt-trades-table-wrap">
                    <div className="tt-trades-header">Últimos Negócios</div>
                    <div className="tt-trades-table">
                        <div className="tt-trades-thead">
                            <span>Hora</span>
                            <span>Preço</span>
                            <span>Qtd</span>
                            <span>Agressão</span>
                        </div>
                        {tradesList.slice(0, 8).map((t, i) => (
                            <div
                                key={i}
                                className={`tt-trade-row ${t.agressao === 'COMPRADOR' ? 'buy' : 'sell'}`}
                            >
                                <span className="tt-td hora">{t.hora}</span>
                                <span className="tt-td preco">R$ {fmt(t.preco)}</span>
                                <span className="tt-td qtd">{t.quantidade?.toLocaleString('pt-BR')}</span>
                                <span className={`tt-td agr ${t.agressao === 'COMPRADOR' ? 'buy' : 'sell'}`}>
                                    {t.agressao === 'COMPRADOR' ? '▲ C' : '▼ V'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .tt-section {
                    margin-top: 18px;
                    padding: 16px;
                    border-radius: 12px;
                    background: rgba(15, 20, 40, 0.5);
                    border: 1px solid rgba(255,255,255,0.06);
                }
                .tt-title {
                    font-size: 13px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    color: rgba(255,255,255,0.9);
                    margin: 0 0 14px 0;
                }
                .tt-pressure-panel {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid;
                    border-radius: 10px;
                    padding: 12px 16px;
                    margin-bottom: 14px;
                }
                .tt-pressure-left { display: flex; flex-direction: column; gap: 4px; }
                .tt-pressure-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
                .tt-pressure-value { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; }
                .tt-score-badge {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    border: 2px solid;
                    border-radius: 10px;
                    padding: 8px 12px;
                    min-width: 60px;
                }
                .tt-score-num { font-size: 20px; font-weight: 900; line-height: 1; }
                .tt-score-label { font-size: 8px; font-weight: 700; text-transform: uppercase; margin-top: 2px; opacity: 0.7; }

                .tt-metrics-row {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                    margin-bottom: 12px;
                }
                .tt-metric-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 8px;
                    padding: 10px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .tt-metric-lbl { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; }
                .tt-metric-val { font-size: 15px; font-weight: 800; color: #fff; font-family: monospace; }
                .tt-metric-sub { font-size: 10px; color: rgba(255,255,255,0.5); }

                .tt-delta-bar-wrap { margin: 4px 0; }
                .tt-delta-bar-bg {
                    position: relative;
                    height: 6px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 100px;
                    overflow: hidden;
                }
                .tt-delta-bar-fill {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    border-radius: 100px;
                    transition: width 0.5s;
                }
                .tt-delta-bar-fill.positive { background: #10B981; }
                .tt-delta-bar-fill.negative { background: #EF4444; }
                .tt-delta-center-line {
                    position: absolute;
                    left: 50%;
                    top: 0;
                    width: 2px;
                    height: 100%;
                    background: rgba(255,255,255,0.2);
                }

                .tt-vwap-bands {
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.04);
                    border-radius: 8px;
                    padding: 10px 12px;
                    margin-bottom: 10px;
                }
                .tt-vwap-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; display: block; margin-bottom: 8px; }
                .tt-vwap-band-grid { display: flex; flex-wrap: wrap; gap: 6px; }
                .tt-vwap-band {
                    font-size: 10px;
                    font-family: monospace;
                    padding: 3px 8px;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.04);
                }
                .tt-vwap-band.red { color: #F87171; }
                .tt-vwap-band.orange { color: #FBBF24; }
                .tt-vwap-band.white { color: #fff; font-weight: 700; background: rgba(255,255,255,0.08); }

                .tt-institutional {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.04);
                    border-radius: 8px;
                    padding: 10px 12px;
                    margin-bottom: 10px;
                }
                .tt-inst-icon { font-size: 20px; }
                .tt-inst-info { display: flex; flex-direction: column; flex: 1; }
                .tt-inst-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; }
                .tt-inst-value { font-size: 13px; font-weight: 700; }
                .tt-clusters-info { display: flex; gap: 8px; font-size: 13px; font-weight: 700; }

                .tt-signals {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: 12px;
                }
                .tt-signal-item {
                    font-size: 11px;
                    padding: 6px 10px;
                    border-radius: 6px;
                    line-height: 1.4;
                }
                .tt-signal-item.positivo { background: rgba(16,185,129,0.08); color: #6EE7B7; border-left: 3px solid #10B981; }
                .tt-signal-item.negativo { background: rgba(239,68,68,0.08); color: #FCA5A5; border-left: 3px solid #EF4444; }
                .tt-signal-item.neutro   { background: rgba(245,158,11,0.08); color: #FDE68A; border-left: 3px solid #F59E0B; }

                .tt-trades-table-wrap { margin-top: 12px; }
                .tt-trades-header { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
                .tt-trades-table { border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; overflow: hidden; }
                .tt-trades-thead {
                    display: grid;
                    grid-template-columns: 80px 90px 90px 60px;
                    background: rgba(255,255,255,0.04);
                    padding: 6px 8px;
                    font-size: 9px;
                    font-weight: 700;
                    color: rgba(255,255,255,0.4);
                    text-transform: uppercase;
                }
                .tt-trade-row {
                    display: grid;
                    grid-template-columns: 80px 90px 90px 60px;
                    padding: 5px 8px;
                    border-top: 1px solid rgba(255,255,255,0.03);
                    font-size: 11px;
                    animation: fadeIn 0.3s ease;
                }
                .tt-trade-row.buy { background: rgba(16,185,129,0.04); }
                .tt-trade-row.sell { background: rgba(239,68,68,0.04); }
                .tt-td { font-family: monospace; }
                .tt-td.hora { color: rgba(255,255,255,0.5); }
                .tt-td.preco { color: #fff; font-weight: 700; }
                .tt-td.qtd { color: rgba(255,255,255,0.7); }
                .tt-td.agr { font-weight: 800; font-size: 10px; text-align: center; }
                .tt-td.agr.buy { color: #10B981; }
                .tt-td.agr.sell { color: #EF4444; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
            `}</style>
        </div>
    );
};

export default TimesAndTrades;
