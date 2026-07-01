import React from 'react';
import { fmt } from '../utils/formatters';

const SupportResistance = ({ sr, preco }) => {
    if (!sr || !sr.support || !sr.resistance) return null;

    const {
        support,
        resistance,
        active_zone,
        volume_ratio,
        volume_confirmation,
        breakout_probability,
        entry_zone_status,
        entry_action,
        entry_details
    } = sr;

    // Calcular a porcentagem da posição do preço entre o Suporte e a Resistência
    const supMean = support.mean;
    const resMean = resistance.mean;
    let positionPct = 50;
    if (resMean > supMean) {
        positionPct = Math.max(0, Math.min(100, ((preco - supMean) / (resMean - supMean)) * 100));
    }

    // Função para configurar cor/label de uma probabilidade de rompimento
    const getProbabilityConfig = (prob) => {
        let color = "#10B981"; // Verde
        let label = "BAIXO RISCO";
        let cls = "low";
        if (prob > 65) {
            color = "#EF4444"; // Vermelho
            label = "ROMPI. IMINENTE";
            cls = "high";
        } else if (prob >= 35) {
            color = "#F59E0B"; // Âmbar
            label = "RISCO MODERADO";
            cls = "medium";
        }
        return { color, label, cls };
    };

    const supProbConfig = getProbabilityConfig(support.breakout_probability);
    const resProbConfig = getProbabilityConfig(resistance.breakout_probability);

    // Círculo de progresso SVG helper
    const getStrokeOffset = (prob) => {
        const strokeDasharray = 113.1;
        return strokeDasharray - (prob / 100) * strokeDasharray;
    };

    // Mapeamento visual para status da zona
    const statusMap = {
        SUPORTE_RESPEITADO: { label: "Suporte Sólido (Recompra)", class: "status-solido" },
        SUPORTE_PERIGO: { label: "Suporte Sob Pressão (Evitar)", class: "status-perigo" },
        RESISTENCIA_RESPEITADA: { label: "Resistência Forte (Venda)", class: "status-rejeicao" },
        RESISTENCIA_PERIGO: { label: "Resistência Sob Pressão", class: "status-perigo" },
        ROMPIMENTO_ALTA_CONFIRMADO: { label: "✅ Rompimento de Alta CONFIRMADO", class: "status-rompimento-alta" },
        ROMPIMENTO_ALTA_PARCIAL: { label: "⚠️ Rompimento de Alta Parcial", class: "status-rompimento-alta-parcial" },
        ROMPIMENTO_ALTA_FRACO: { label: "Rompimento de Alta Fraco", class: "status-neutral" },
        ROMPIMENTO_BAIXA_CONFIRMADO: { label: "❌ Rompimento de Baixa CONFIRMADO", class: "status-rompimento-baixa" },
        ROMPIMENTO_BAIXA_PARCIAL: { label: "⚠️ Rompimento de Baixa Parcial", class: "status-rompimento-baixa-parcial" },
        ROMPIMENTO_BAIXA_FRACO: { label: "Rompimento de Baixa Fraco", class: "status-neutral" },
        NEUTRO: { label: "Zona Neutra de Canal", class: "status-neutral" }
    };

    const currentStatus = statusMap[entry_zone_status] || { label: entry_zone_status || "Desconhecido", class: "status-neutral" };

    // Configurar cor do badge de Ação Recomendada
    let actionClass = "action-wait";
    if (entry_action === "COMPRA" || entry_action === "COMPRA_AGRESSIVA" || entry_action?.includes("COMPRA")) {
        actionClass = "action-buy";
    } else if (entry_action === "VENDA" || entry_action === "VENDA_AGRESSIVA" || entry_action?.includes("VENDA")) {
        actionClass = "action-sell";
    }

    // Círculo de progresso SVG (r=18 -> circunferência ~113.1)
    const strokeDasharray = 113.1;
    const strokeDashoffset = strokeDasharray - (breakout_probability / 100) * strokeDasharray;

    return (
        <div className="sr-section card-premium">
            <h3 className="section-title">
                🛡️ Análise de Suporte & Resistência
            </h3>

            {/* Cabeçalho de Status e Ação */}
            <div className="sr-header-grid">
                <div className="sr-status-badge">
                    <span className="badge-label">ZONA ATUAL</span>
                    <span className={`badge-value ${currentStatus.class}`}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="sr-action-badge">
                    <span className="badge-label">AÇÃO RECOMENDADA</span>
                    <span className={`badge-value-action ${actionClass}`}>
                        {entry_action}
                    </span>
                </div>
            </div>

            {/* Visualização de Canal Horizontal de Preços */}
            <div className="price-channel-container">
                <div className="channel-labels">
                    <div className="channel-extreme support">
                        <span className="lbl-lvl">Suporte (Faixa)</span>
                        <span className="lbl-val">R$ {fmt(supMean)}</span>
                        <span className="lbl-touches">{support.touches} {support.touches === 1 ? 'toque' : 'toques'}</span>
                    </div>
                    <div className="channel-extreme resistance">
                        <span className="lbl-lvl">Resistência (Faixa)</span>
                        <span className="lbl-val">R$ {fmt(resMean)}</span>
                        <span className="lbl-touches">{resistance.touches} {resistance.touches === 1 ? 'toque' : 'toques'}</span>
                    </div>
                </div>
                
                {/* Linha do Canal com Gradiente e Marcador de Preço */}
                <div className="channel-track-bg">
                    <div className="channel-track-fill" />
                    <div 
                        className={`channel-price-marker ${positionPct < 20 ? 'near-support' : positionPct > 80 ? 'near-resistance' : ''}`} 
                        style={{ left: `${positionPct}%` }}
                    >
                        <div className="marker-dot" />
                        <div className="marker-tooltip">
                            R$ {fmt(preco)}
                        </div>
                    </div>
                </div>

                <div className="channel-sub-info">
                    <span>Distância do Suporte: {fmt(Math.abs(preco - supMean))} (R$)</span>
                    <span>Distância da Resistência: {fmt(Math.abs(resMean - preco))} (R$)</span>
                </div>
            </div>

            {/* Aviso de Confirmação de Rompimento (se houver) */}
            {sr.breakout_confirmation_warning && (
                <div style={{
                    marginBottom: 14,
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: sr.confirmed_breakout.strength === 'HIGH' 
                        ? (sr.confirmed_breakout.type === 'HIGH' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)')
                        : 'rgba(245,158,11,0.12)',
                    border: '2px solid ' + (sr.confirmed_breakout.strength === 'HIGH' 
                        ? (sr.confirmed_breakout.type === 'HIGH' ? '#10b981' : '#ef4444') 
                        : '#f59e0b'),
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <span style={{ fontSize: '20px' }}>
                        {sr.confirmed_breakout.strength === 'HIGH' 
                            ? (sr.confirmed_breakout.type === 'HIGH' ? '🚀' : '📉') 
                            : '⚠️'}
                    </span>
                    <span>{sr.breakout_confirmation_warning}</span>
                </div>
            )}

            {/* Avisos de Rompimento das Zonas */}
            <div className="warnings-grid" style={{ marginBottom: 14, display: 'grid', gap: '8px' }}>
                <div className="warning-box" style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    fontSize: '11px',
                    color: '#fff'
                }}>
                    {support.warning}
                </div>
                <div className="warning-box" style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.06)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '11px',
                    color: '#fff'
                }}>
                    {resistance.warning}
                </div>
            </div>

            {/* Probabilidades de Rompimento (Suporte e Resistência) e Volume */}
            <div className="breakout-volume-grid">
                {/* Suporte */}
                <div className="breakout-col">
                    <div className="radial-gauge-container">
                        <svg width="56" height="56" viewBox="0 0 44 44" className="progress-ring">
                            <circle className="progress-ring__background" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="transparent" r="18" cx="22" cy="22" />
                            <circle 
                                className="progress-ring__circle" 
                                stroke={supProbConfig.color} 
                                strokeWidth="3.5" 
                                strokeDasharray="113.1" 
                                strokeDashoffset={getStrokeOffset(support.breakout_probability)} 
                                strokeLinecap="round"
                                fill="transparent" 
                                r="18" 
                                cx="22" 
                                cy="22" 
                                transform="rotate(-90 22 22)"
                            />
                            <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#ffffff" className="progress-ring__text">
                                {support.breakout_probability}%
                            </text>
                        </svg>
                        <div className="radial-info">
                            <span className="radial-title">Romp. Suporte</span>
                            <span className={`radial-status ${supProbConfig.cls}`}>{supProbConfig.label}</span>
                        </div>
                    </div>
                </div>

                {/* Resistência */}
                <div className="breakout-col">
                    <div className="radial-gauge-container">
                        <svg width="56" height="56" viewBox="0 0 44 44" className="progress-ring">
                            <circle className="progress-ring__background" stroke="rgba(255,255,255,0.06)" strokeWidth="3" fill="transparent" r="18" cx="22" cy="22" />
                            <circle 
                                className="progress-ring__circle" 
                                stroke={resProbConfig.color} 
                                strokeWidth="3.5" 
                                strokeDasharray="113.1" 
                                strokeDashoffset={getStrokeOffset(resistance.breakout_probability)} 
                                strokeLinecap="round"
                                fill="transparent" 
                                r="18" 
                                cx="22" 
                                cy="22" 
                                transform="rotate(-90 22 22)"
                            />
                            <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#ffffff" className="progress-ring__text">
                                {resistance.breakout_probability}%
                            </text>
                        </svg>
                        <div className="radial-info">
                            <span className="radial-title">Romp. Resis.</span>
                            <span className={`radial-status ${resProbConfig.cls}`}>{resProbConfig.label}</span>
                        </div>
                    </div>
                </div>

                <div className="volume-col">
                    <div className="volume-metric-box">
                        <span className="vol-title">Volume Operacional</span>
                        <div className="vol-ratio-row">
                            <span className="vol-ratio-val">{volume_ratio?.toFixed(2)}x</span>
                            <span className={`vol-confirm-badge ${volume_confirmation === 'ALTO' || volume_confirmation === 'EXTREMO' || volume_confirmation === 'MUITO FORTE' ? 'high' : 'normal'}`}>
                                {volume_confirmation}
                            </span>
                        </div>
                        <span className="vol-desc">vs média diária de 20 períodos</span>
                    </div>
                </div>
            </div>

            {/* Detalhes e Justificativa */}
            {entry_details && (
                <div className="sr-details-box">
                    <span className="details-icon">💡</span>
                    <p className="details-text">{entry_details}</p>
                </div>
            )}

            <style jsx>{`
                .sr-section {
                    margin-top: 18px;
                    padding: 16px;
                    border-radius: 12px;
                    background: rgba(26, 31, 46, 0.4);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
                .section-title {
                    font-size: 13px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.8px;
                    color: rgba(255, 255, 255, 0.9);
                    margin: 0 0 14px 0;
                    display: flex;
                    align-items: center;
                }
                .sr-header-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                .badge-label {
                    display: block;
                    font-size: 9px;
                    font-weight: 700;
                    color: var(--text-muted, rgba(255, 255, 255, 0.4));
                    margin-bottom: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .badge-value, .badge-value-action {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 6px 8px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 700;
                    text-align: center;
                    min-height: 28px;
                }
                
                /* Cores para Status da Zona */
                .badge-value.status-solido {
                    background: rgba(16, 185, 129, 0.12);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.25);
                }
                .badge-value.status-rejeicao {
                    background: rgba(59, 130, 246, 0.12);
                    color: #3b82f6;
                    border: 1px solid rgba(59, 130, 246, 0.25);
                }
                .badge-value.status-perigo {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.25);
                }
                .badge-value.status-rompimento-alta {
                    background: rgba(16, 185, 129, 0.16);
                    color: #059669;
                    border: 1px solid rgba(16, 185, 129, 0.35);
                    box-shadow: 0 0 8px rgba(16, 185, 129, 0.25);
                }
                .badge-value.status-rompimento-baixa {
                    background: rgba(239, 68, 68, 0.12);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.25);
                }
                .badge-value.status-rompimento-alta-parcial {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.25);
                }
                .badge-value.status-rompimento-baixa-parcial {
                    background: rgba(245, 158, 11, 0.12);
                    color: #f59e0b;
                    border: 1px solid rgba(245, 158, 11, 0.25);
                }
                .badge-value.status-neutral {
                    background: rgba(255, 255, 255, 0.05);
                    color: rgba(255, 255, 255, 0.7);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                /* Cores para Ação Recomendada */
                .badge-value-action.action-buy {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    color: white;
                    box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
                }
                .badge-value-action.action-sell {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
                }
                .badge-value-action.action-wait {
                    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                    color: white;
                    box-shadow: 0 2px 10px rgba(245, 158, 11, 0.3);
                }

                /* Canal de Preços */
                .price-channel-container {
                    margin-bottom: 20px;
                    background: rgba(255, 255, 255, 0.02);
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.03);
                }
                .channel-labels {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }
                .channel-extreme {
                    display: flex;
                    flex-direction: column;
                }
                .channel-extreme.support {
                    align-items: flex-start;
                }
                .channel-extreme.resistance {
                    align-items: flex-end;
                }
                .lbl-lvl {
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.4);
                }
                .lbl-val {
                    font-size: 13px;
                    font-weight: 700;
                    font-family: monospace;
                    margin-top: 1px;
                }
                .channel-extreme.support .lbl-val {
                    color: #10b981;
                }
                .channel-extreme.resistance .lbl-val {
                    color: #ef4444;
                }
                .lbl-touches {
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.5);
                    font-style: italic;
                    margin-top: 2px;
                }

                /* Canal Deslizante */
                .channel-track-bg {
                    height: 6px;
                    background: linear-gradient(to right, rgba(16, 185, 129, 0.3) 0%, rgba(255, 255, 255, 0.1) 40%, rgba(255, 255, 255, 0.1) 60%, rgba(239, 68, 68, 0.3) 100%);
                    border-radius: 100px;
                    position: relative;
                    margin: 20px 4px 10px 4px;
                }
                .channel-price-marker {
                    position: absolute;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    z-index: 10;
                    transition: left 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67);
                }
                .marker-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2.5px solid #2563eb;
                    box-shadow: 0 0 8px #2563eb, 0 0 15px #ffffff;
                    animation: pulseMarker 2s infinite;
                }
                .channel-price-marker.near-support .marker-dot {
                    border-color: #10b981;
                    box-shadow: 0 0 8px #10b981, 0 0 15px #ffffff;
                }
                .channel-price-marker.near-resistance .marker-dot {
                    border-color: #ef4444;
                    box-shadow: 0 0 8px #ef4444, 0 0 15px #ffffff;
                }
                .marker-tooltip {
                    position: absolute;
                    bottom: 18px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #1e293b;
                    color: white;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-size: 10px;
                    font-weight: 700;
                    font-family: monospace;
                    white-space: nowrap;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                }
                .marker-tooltip::after {
                    content: '';
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border-width: 4px;
                    border-style: solid;
                    border-color: #1e293b transparent transparent transparent;
                }

                .channel-sub-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.35);
                    margin-top: 6px;
                    font-family: monospace;
                }

                /* Detalhes de Rompimento e Volume */
                .breakout-volume-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 14px;
                }
                .breakout-col, .volume-col {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.03);
                    border-radius: 8px;
                    padding: 10px 12px;
                }
                .radial-gauge-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .progress-ring__text {
                    font-size: 10px;
                    font-weight: 700;
                    font-family: monospace;
                }
                .radial-info {
                    display: flex;
                    flex-direction: column;
                }
                .radial-title {
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .radial-status {
                    font-size: 10px;
                    font-weight: 700;
                    margin-top: 2px;
                }
                .radial-status.low { color: #10b981; }
                .radial-status.medium { color: #f59e0b; }
                .radial-status.high { color: #ef4444; }

                .volume-metric-box {
                    display: flex;
                    flex-direction: column;
                }
                .vol-title {
                    font-size: 9px;
                    color: rgba(255, 255, 255, 0.4);
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .vol-ratio-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 2px 0;
                }
                .vol-ratio-val {
                    font-size: 14px;
                    font-weight: 800;
                    color: #ffffff;
                    font-family: monospace;
                }
                .vol-confirm-badge {
                    font-size: 8px;
                    font-weight: 800;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                .vol-confirm-badge.normal {
                    background: rgba(255, 255, 255, 0.08);
                    color: rgba(255, 255, 255, 0.7);
                }
                .vol-confirm-badge.high {
                    background: rgba(16, 185, 129, 0.15);
                    color: #10b981;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .vol-desc {
                    font-size: 8px;
                    color: rgba(255, 255, 255, 0.3);
                }

                /* Caixa de detalhes */
                .sr-details-box {
                    display: flex;
                    gap: 8px;
                    background: rgba(59, 130, 246, 0.06);
                    border: 1px solid rgba(59, 130, 246, 0.15);
                    border-radius: 8px;
                    padding: 10px 12px;
                }
                .details-icon {
                    font-size: 13px;
                }
                .details-text {
                    font-size: 11px;
                    line-height: 1.4;
                    color: rgba(255, 255, 255, 0.85);
                    margin: 0;
                }

                @keyframes pulseMarker {
                    0% {
                        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.6);
                    }
                    70% {
                        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
                    }
                }
            `}</style>
        </div>
    );
};

export default SupportResistance;
