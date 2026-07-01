import React from 'react';

const CandlestickPatterns = ({ patterns }) => {
    if (!patterns || patterns.length === 0) {
        return (
            <div className="patterns-section">
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic' }}>
                    Nenhum padrão de candlestick relevante detectado hoje.
                </p>
            </div>
        );
    }

    return (
        <div className="patterns-section">
            <h3 className="section-title" style={{ marginBottom: '16px' }}>
                🕯️ Padrões de Candlestick
            </h3>
            <div className="patterns-grid">
                {patterns.map((item, idx) => (
                    <div key={idx} className={`pattern-card ${item.pattern.type}`}>
                        <div className="pattern-header">
                            <div>
                                <span className={`pattern-badge ${item.pattern.type}`}>
                                    {item.pattern.type === 'bullish' ? 'Alta' : item.pattern.type === 'bearish' ? 'Baixa' : 'Neutro'}
                                </span>
                                <span className="pattern-name-pt">{item.pattern.namePortuguese}</span>
                                <span className="pattern-name-en">{item.pattern.name}</span>
                            </div>
                            <div className="pattern-confidence-box">
                                <div className="pattern-confidence-value">{item.confidence}%</div>
                                <div className="pattern-confidence-label">Confiança</div>
                            </div>
                        </div>

                        <p className="pattern-desc">{item.pattern.description}</p>

                        <div className="trading-grid">
                            <div className="trading-item">
                                <div className="trading-label">ENTRADA</div>
                                <div className="trading-value">R$ {item.entry?.toFixed(2)}</div>
                            </div>
                            <div className="trading-item">
                                <div className="trading-label">STOP LOSS</div>
                                <div className="trading-value red">R$ {item.stop?.toFixed(2)}</div>
                            </div>
                            <div className="trading-item alvos-row">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div className="trading-label">ALVOS (R/R)</div>
                                    <div className="alvos-list">
                                        <span className="alvo-val" style={{ color: 'var(--accent-green)' }}>1:1 R${item.target1?.toFixed(2)}</span>
                                        <span className="alvo-val" style={{ color: 'var(--accent-green)', fontWeight: '800' }}>1:2 R${item.target2?.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div 
                                    className={`volume-dot ${item.confirmedByVolume ? 'confirmed' : ''}`} 
                                    title={item.confirmedByVolume ? 'Volume Confirmado' : 'Volume Insuficiente'}
                                ></div>
                            </div>
                        </div>

                        <div className="pattern-rule">
                            💡 {item.pattern.tradingRule}
                        </div>

                        <div className="pattern-icon-bg">
                            {item.pattern.type === 'bullish' ? '📈' : '📉'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CandlestickPatterns;
