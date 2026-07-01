import React from 'react';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

/**
 * TickerBar — Barra de cotações em tempo real com adaptação responsiva.
 * Mobile: Scroll horizontal automático.
 * Desktop: Grade estática rica.
 */

const TickerBar = ({ tickers = [] }) => {
    const { mode, isMobile } = useResponsiveLayout();

    const maxVisible = {
        mobile: 4,
        tablet_portrait: 6,
        tablet_landscape: 8,
        desktop: 12,
        ultrawide: 24,
    }[mode] || 10;

    return (
        <div className="ticker-bar-wrapper">
            <div className={`ticker-bar ${isMobile ? 'ticker-mobile' : ''}`}>
                {tickers.slice(0, maxVisible).map((t, idx) => (
                    <div key={t.ticker || idx} className="ticker-item">
                        <span className="ticker-symbol">{t.ticker}</span>
                        <span className={`ticker-price ${t.variacao >= 0 ? 'bull' : 'bear'}`}>
                            R$ {t.preco?.toFixed(2)}
                        </span>
                        <span className={`ticker-change ${t.variacao >= 0 ? 'bull' : 'bear'}`}>
                            {t.variacao >= 0 ? '▲' : '▼'} {Math.abs(t.variacao || 0).toFixed(2)}%
                        </span>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .ticker-bar-wrapper {
                    grid-area: ticker;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-btn);
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                .ticker-bar {
                    display: flex;
                    gap: 20px;
                    padding: 8px 16px;
                    align-items: center;
                }
                .ticker-mobile {
                    overflow-x: auto;
                    scroll-snap-type: x mandatory;
                    -webkit-overflow-scrolling: touch;
                }
                .ticker-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    white-space: nowrap;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 13px;
                    scroll-snap-align: start;
                }
                .ticker-symbol {
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .ticker-price {
                    font-weight: 500;
                }
                .ticker-change {
                    font-size: 11px;
                }
                .bull { color: var(--accent-green); }
                .bear { color: var(--accent-red); }

                @media (max-width: 767px) {
                    .ticker-bar {
                        padding: 10px 12px;
                        gap: 16px;
                    }
                    .ticker-symbol { font-size: 14px; }
                }
            `}</style>
        </div>
    );
};

export default TickerBar;
