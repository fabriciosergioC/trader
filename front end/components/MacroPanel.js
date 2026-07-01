import React from 'react';
import { fmt, macroVarClass } from '../utils/formatters';

const MacroPanel = React.memo(({ macro }) => {
    if (!macro) return null;
    const vixRiscoClass = { BAIXO: "ok", MODERADO: "warn", ALTO: "danger", "CRÍTICO": "danger" };

    return (
        <div className="macro-panel">
            {macro.dolar && (
                <div className="macro-item">
                    <span className="macro-icon">💵</span>
                    <div>
                        <div className="macro-label">Dólar / Real</div>
                        <div className="macro-value">R$ {fmt(macro.dolar.valor)}</div>
                        <div className={`macro-var ${macroVarClass(macro.dolar.variacao)}`}>
                            {macro.dolar.variacao >= 0 ? "+" : ""}{fmt(macro.dolar.variacao)}%
                        </div>
                    </div>
                </div>
            )}
            {macro.vix && (
                <div className="macro-item">
                    <span className="macro-icon">😬</span>
                    <div>
                        <div className="macro-label">VIX (Medo)</div>
                        <div className="macro-value">{fmt(macro.vix.valor)}</div>
                        <div className={`macro-tag ${vixRiscoClass[macro.vix.risco] || ""}`}>{macro.vix.risco}</div>
                    </div>
                </div>
            )}
            {macro.ibovespa && (
                <div className="macro-item">
                    <span className="macro-icon">📊</span>
                    <div>
                        <div className="macro-label">Ibovespa</div>
                        <div className="macro-value">{fmt(macro.ibovespa.valor, 0)}</div>
                        <div className={`macro-var ${macroVarClass(macro.ibovespa.variacao)}`}>
                            {macro.ibovespa.variacao >= 0 ? "+" : ""}{fmt(macro.ibovespa.variacao)}%
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .macro-panel {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
                    gap: var(--spacing-component);
                    margin-bottom: var(--spacing-component);
                }
                .macro-item {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-card);
                    padding: var(--spacing-card);
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .macro-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; }
                .macro-value { font-size: 18px; font-weight: 700; margin: 2px 0; }
                .macro-var { font-size: 13px; font-weight: 600; }
                .macro-var.up { color: var(--accent-green); }
                .macro-var.down { color: var(--accent-red); }
                @media (max-width: 480px) {
                    .macro-panel { grid-template-columns: 1fr; }
                    .macro-value { font-size: 16px; }
                }
            `}</style>
        </div>
    );
});

MacroPanel.displayName = 'MacroPanel';
export default MacroPanel;
