import React from 'react';
import { useStore } from '../store/useStore';

const ComparisonBar = () => {
    const { comparisonList, clearComparison, setAbaAtual } = useStore();

    if (comparisonList.length === 0) return null;

    return (
        <div className="comparison-bar card-premium">
            <div className="comparison-info">
                <span className="count-badge">{comparisonList.length}</span>
                <span className="info-text">Ativos selecionados para comparação</span>
                <div className="ticker-chips">
                    {comparisonList.map(t => (
                        <span key={t} className="ticker-chip-mini">{t.replace('.SA', '')}</span>
                    ))}
                </div>
            </div>
            
            <div className="comparison-actions">
                <button className="btn-ghost" onClick={clearComparison}>Cancelar</button>
                <button 
                    className="btn-primary" 
                    disabled={comparisonList.length < 2}
                    onClick={() => setAbaAtual('comparacao')}
                >
                    Comparar Agora
                </button>
            </div>

            <style jsx>{`
                .comparison-bar {
                    position: fixed;
                    bottom: 24px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 90%;
                    max-width: 800px;
                    background: var(--bg-card);
                    border: 1px solid var(--accent-blue);
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    padding: 16px 24px;
                    border-radius: 100px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    z-index: 900;
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .comparison-info {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .count-badge {
                    background: var(--accent-blue);
                    color: white;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: 700;
                }
                .info-text {
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .ticker-chips {
                    display: flex;
                    gap: 6px;
                }
                .ticker-chip-mini {
                    background: var(--bg-secondary);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-family: monospace;
                    border: 1px solid var(--border);
                }
                .comparison-actions {
                    display: flex;
                    gap: 12px;
                }
                @media (max-width: 767px) {
                    .comparison-bar {
                        border-radius: 20px;
                        flex-direction: column;
                        gap: 16px;
                        bottom: 10px;
                        padding: 20px;
                    }
                    .info-text { display: none; }
                }
            `}</style>
        </div>
    );
};

export default ComparisonBar;
