import React from 'react';
import Link from 'next/link';

const CryptoHeader = ({ totalAtivos, onRefresh, atualizando }) => {
    return (
        <header className="header">
            <div className="header-left">
                <div className="logo-icon">₿</div>
                <div>
                    <div className="header-title">TradeAI — Criptoativos</div>
                    <div className="header-subtitle">
                        Mercado 24/7 · {totalAtivos || 0} ativos monitorados
                    </div>
                </div>
            </div>
            <div className="header-right">
                <Link href="/" className="btn-b3">
                    📈 Voltar ao Painel B3
                </Link>
                <button
                    className={`btn-refrescar ${atualizando ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    disabled={atualizando}
                >
                    {atualizando ? '⌛' : '🔄'} {atualizando ? 'Atualizando...' : 'Atualizar'}
                </button>
                <div className="status-badge">
                    <span className={`status-dot ${atualizando ? 'active' : ''}`} />
                    {atualizando ? 'Buscando...' : '24/7 Ativo'}
                </div>
            </div>
            <style jsx>{`
                .btn-b3 {
                    padding: 8px 14px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                .btn-b3:hover { background: rgba(255,255,255,0.12); }
            `}</style>
        </header>
    );
};

export default CryptoHeader;
