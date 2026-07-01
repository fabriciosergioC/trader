import React from 'react';

// Formata valores em dólar americano
const fmt = (v) => v != null ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

/**
 * CryptoSuperDomPanel
 * Versão dedicada do Super DOM para criptoativos (preços em USD, sem R$).
 */
const CryptoSuperDomPanel = ({ domAnalysis, preco }) => {
    if (!domAnalysis || domAnalysis.error) return null;

    const {
        orderBook, poc, valueArea, ofi, absorption, iceberg,
        priceLocation, priceVsPOC, domScore, domSignals = [],
        domInterpretation, volumeProfile
    } = domAnalysis;

    if (!orderBook) return null;

    const { bids = [], asks = [], spread, imbalance, totalBidVolume, totalAskVolume } = orderBook;

    const imbalanceColor = imbalance > 15 ? '#10B981' : imbalance < -15 ? '#EF4444' : '#F59E0B';
    const imbalancePct = Math.min(100, Math.abs(imbalance));
    const scoreColor = domScore >= 4 ? '#10B981' : domScore <= -4 ? '#EF4444' : '#F59E0B';

    const ofiConfig = {
        FORTE_COMPRA: { color: '#10B981', label: 'Forte Compra' },
        COMPRA:       { color: '#34D399', label: 'Compra' },
        NEUTRO:       { color: '#94A3B8', label: 'Neutro' },
        VENDA:        { color: '#F87171', label: 'Venda' },
        FORTE_VENDA:  { color: '#EF4444', label: 'Forte Venda' },
    };
    const ofiInfo = ofiConfig[ofi?.interpretation] || ofiConfig.NEUTRO;

    const allVolumes = [...bids, ...asks].map(l => l.volume);
    const maxVolume = allVolumes.length ? Math.max(...allVolumes) : 1;

    const topBuckets = React.useMemo ? React.useMemo(() => {
        if (!volumeProfile?.topBuckets) return [];
        const maxVol = Math.max(...volumeProfile.topBuckets.map(b => b.volumeTotal));
        return volumeProfile.topBuckets
            .sort((a, b) => b.priceMid - a.priceMid)
            .slice(0, 8)
            .map(b => ({ ...b, barWidth: maxVol > 0 ? (b.volumeTotal / maxVol) * 100 : 0 }));
    }, [volumeProfile]) : (volumeProfile?.topBuckets || []).slice(0, 8);

    return (
        <div className="dom-section">
            <h3 className="dom-title">📊 Super DOM — Livro de Ordens (USD)</h3>

            <div className="dom-header-grid">
                <div className="dom-score-card" style={{ borderColor: scoreColor }}>
                    <span className="dom-score-lbl">SCORE DOM</span>
                    <span className="dom-score-val" style={{ color: scoreColor }}>
                        {domScore >= 0 ? '+' : ''}{domScore}
                    </span>
                    <span className="dom-interpretation">{domInterpretation?.replace('_', ' ')}</span>
                </div>
                <div className="dom-ofi-card" style={{ borderColor: ofiInfo.color }}>
                    <span className="dom-ofi-lbl">OFI — ORDER FLOW IMBALANCE</span>
                    <span className="dom-ofi-val" style={{ color: ofiInfo.color }}>{ofiInfo.label}</span>
                    <span className="dom-ofi-pct">{ofi?.ofiPct >= 0 ? '+' : ''}{ofi?.ofiPct?.toFixed(1)}%</span>
                </div>
            </div>

            <div className="dom-book">
                <div className="dom-book-header">
                    <span className="dom-bh-side ask">VENDA (ASK)</span>
                    <span className="dom-bh-price">PREÇO (USD)</span>
                    <span className="dom-bh-side bid">COMPRA (BID)</span>
                </div>

                {[...asks].reverse().map((level, i) => {
                    const barW = maxVolume > 0 ? (level.volume / maxVolume) * 80 : 0;
                    return (
                        <div key={`ask-${i}`} className={`dom-level ask ${level.isPOC ? 'poc' : ''} ${level.isVALevel ? 'va' : ''}`}>
                            <div className="dom-vol-ask">
                                <div className="dom-bar-bg"><div className="dom-bar-fill ask" style={{ width: `${barW}%` }} /></div>
                                <span className="dom-vol-label">{level.volume?.toLocaleString('en-US')}</span>
                            </div>
                            <div className="dom-price-cell ask">
                                $ {fmt(level.price)}
                                {level.isPOC && <span className="dom-poc-badge">POC</span>}
                            </div>
                            <div className="dom-vol-empty" />
                        </div>
                    );
                })}

                <div className="dom-current-price">
                    <div className="dom-cp-spread">Spread: {fmt(spread)}</div>
                    <div className="dom-cp-value">$ {fmt(preco)}</div>
                    <div className="dom-cp-loc">{priceLocation?.replace('_', ' ')}</div>
                </div>

                {bids.map((level, i) => {
                    const barW = maxVolume > 0 ? (level.volume / maxVolume) * 80 : 0;
                    return (
                        <div key={`bid-${i}`} className={`dom-level bid ${level.isPOC ? 'poc' : ''} ${level.isVALevel ? 'va' : ''}`}>
                            <div className="dom-vol-empty" />
                            <div className="dom-price-cell bid">
                                $ {fmt(level.price)}
                                {level.isPOC && <span className="dom-poc-badge">POC</span>}
                            </div>
                            <div className="dom-vol-bid">
                                <span className="dom-vol-label">{level.volume?.toLocaleString('en-US')}</span>
                                <div className="dom-bar-bg"><div className="dom-bar-fill bid" style={{ width: `${barW}%` }} /></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="dom-imbalance-section">
                <div className="dom-imb-labels">
                    <span style={{ color: '#EF4444' }}>VENDA {totalAskVolume?.toLocaleString('en-US')}</span>
                    <span className="dom-imb-title">IMBALANCE DO BOOK</span>
                    <span style={{ color: '#10B981' }}>COMPRA {totalBidVolume?.toLocaleString('en-US')}</span>
                </div>
                <div className="dom-imb-bar-bg">
                    <div className="dom-imb-bar-fill" style={{ width: `${imbalancePct}%`, marginLeft: imbalance >= 0 ? '50%' : `${50 - imbalancePct}%`, background: imbalanceColor }} />
                    <div className="dom-imb-center" />
                </div>
                <div className="dom-imb-value" style={{ color: imbalanceColor }}>
                    {imbalance >= 0 ? '+' : ''}{imbalance?.toFixed(1)}%
                    {' — '}
                    {imbalance > 15 ? 'Pressão Compradora' : imbalance < -15 ? 'Pressão Vendedora' : 'Balanceado'}
                </div>
            </div>

            {(poc || valueArea) && (
                <div className="dom-va-section">
                    {poc && (
                        <div className="dom-va-item">
                            <span className="dom-va-lbl">🎯 POC (Point of Control)</span>
                            <span className="dom-va-val">$ {fmt(poc.price)}</span>
                            <span className="dom-va-sub">{priceVsPOC >= 0 ? '+' : ''}{priceVsPOC?.toFixed(2)}% do POC</span>
                        </div>
                    )}
                    {valueArea && (
                        <>
                            <div className="dom-va-item">
                                <span className="dom-va-lbl">VA High ({valueArea.vaPct}% do vol.)</span>
                                <span className="dom-va-val" style={{ color: '#EF4444' }}>$ {fmt(valueArea.vaHigh)}</span>
                            </div>
                            <div className="dom-va-item">
                                <span className="dom-va-lbl">VA Low</span>
                                <span className="dom-va-val" style={{ color: '#10B981' }}>$ {fmt(valueArea.vaLow)}</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {domSignals.length > 0 && (
                <div className="dom-signals">
                    {domSignals.map((s, i) => (
                        <div key={i} className={`dom-signal-item ${s.tipo}`}>{s.texto}</div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .dom-section { margin-top: 18px; padding: 16px; border-radius: 12px; background: rgba(8,15,35,0.6); border: 1px solid rgba(255,255,255,0.06); }
                .dom-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255,255,255,0.9); margin: 0 0 14px 0; }
                .dom-header-grid { display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; margin-bottom: 14px; }
                .dom-score-card, .dom-ofi-card { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2px solid; border-radius: 10px; padding: 10px; gap: 2px; }
                .dom-score-lbl, .dom-ofi-lbl { font-size: 8px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; }
                .dom-score-val { font-size: 28px; font-weight: 900; line-height: 1; }
                .dom-interpretation { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
                .dom-ofi-val { font-size: 16px; font-weight: 800; }
                .dom-ofi-pct { font-size: 12px; font-family: monospace; color: rgba(255,255,255,0.7); }
                .dom-book { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; margin-bottom: 12px; }
                .dom-book-header { display: grid; grid-template-columns: 1fr auto 1fr; background: rgba(255,255,255,0.04); padding: 6px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; color: rgba(255,255,255,0.4); }
                .dom-bh-side.ask { text-align: left; color: #EF4444; }
                .dom-bh-side.bid { text-align: right; color: #10B981; }
                .dom-bh-price { text-align: center; }
                .dom-level { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 3px 8px; border-top: 1px solid rgba(255,255,255,0.03); }
                .dom-level.ask { background: rgba(239,68,68,0.03); }
                .dom-level.bid { background: rgba(16,185,129,0.03); }
                .dom-level.poc { background: rgba(245,158,11,0.08) !important; border-left: 2px solid #F59E0B; }
                .dom-vol-ask, .dom-vol-bid { display: flex; align-items: center; gap: 6px; }
                .dom-vol-ask { flex-direction: row-reverse; }
                .dom-vol-empty { width: 100%; }
                .dom-bar-bg { width: 80px; height: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; flex-shrink: 0; }
                .dom-bar-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
                .dom-bar-fill.ask { background: rgba(239,68,68,0.6); margin-left: auto; }
                .dom-bar-fill.bid { background: rgba(16,185,129,0.6); }
                .dom-vol-label { font-size: 10px; font-family: monospace; color: rgba(255,255,255,0.7); white-space: nowrap; }
                .dom-price-cell { font-size: 11px; font-weight: 700; font-family: monospace; text-align: center; padding: 2px 8px; white-space: nowrap; display: flex; align-items: center; gap: 4px; justify-content: center; }
                .dom-price-cell.ask { color: #FCA5A5; }
                .dom-price-cell.bid { color: #6EE7B7; }
                .dom-poc-badge { font-size: 7px; font-weight: 900; padding: 1px 3px; border-radius: 3px; background: rgba(245,158,11,0.3); color: #F59E0B; }
                .dom-current-price { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 8px 10px; background: rgba(59,130,246,0.08); border-top: 1px solid rgba(59,130,246,0.2); border-bottom: 1px solid rgba(59,130,246,0.2); }
                .dom-cp-spread { font-size: 9px; color: rgba(255,255,255,0.4); }
                .dom-cp-value { font-size: 15px; font-weight: 900; color: #fff; font-family: monospace; text-align: center; }
                .dom-cp-loc { font-size: 9px; color: rgba(255,255,255,0.4); text-align: right; }
                .dom-imbalance-section { margin-bottom: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 10px 12px; }
                .dom-imb-labels { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; margin-bottom: 8px; }
                .dom-imb-title { text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: 0.5px; }
                .dom-imb-bar-bg { position: relative; height: 8px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; margin-bottom: 6px; }
                .dom-imb-bar-fill { position: absolute; top: 0; height: 100%; border-radius: 100px; }
                .dom-imb-center { position: absolute; left: 50%; top: 0; width: 2px; height: 100%; background: rgba(255,255,255,0.3); }
                .dom-imb-value { font-size: 11px; font-weight: 700; text-align: center; }
                .dom-va-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
                .dom-va-item { display: flex; flex-direction: column; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.04); border-radius: 8px; padding: 8px 10px; gap: 2px; }
                .dom-va-lbl { font-size: 8px; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; }
                .dom-va-val { font-size: 13px; font-weight: 800; font-family: monospace; color: #fff; }
                .dom-va-sub { font-size: 9px; color: rgba(255,255,255,0.5); }
                .dom-signals { display: flex; flex-direction: column; gap: 6px; }
                .dom-signal-item { font-size: 11px; padding: 6px 10px; border-radius: 6px; line-height: 1.4; }
                .dom-signal-item.positivo { background: rgba(16,185,129,0.08); color: #6EE7B7; border-left: 3px solid #10B981; }
                .dom-signal-item.negativo { background: rgba(239,68,68,0.08); color: #FCA5A5; border-left: 3px solid #EF4444; }
                .dom-signal-item.neutro   { background: rgba(245,158,11,0.08); color: #FDE68A; border-left: 3px solid #F59E0B; }
            `}</style>
        </div>
    );
};

export default CryptoSuperDomPanel;
