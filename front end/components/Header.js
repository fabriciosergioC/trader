import React from 'react';
import Link from 'next/link';
import { useStore } from '../store/useStore';

const Header = ({ totalAtivos, totalGeral, onRefresh, atualizando }) => {
    const setorSelecionado = useStore(state => state.setorSelecionado);

    return (
        <header className="header">
            <div className="header-left">
                <div className="logo-icon">📈</div>
                <div>
                    <div className="header-title">TradeAI</div>
                    <div className="header-subtitle">
                        Painel de Análise B3 · {setorSelecionado === "todos" ? `${totalGeral} ativos` : `${totalAtivos} de ${totalGeral} ativos`}
                    </div>
                </div>
            </div>
            <div className="header-right">
                <Link href="/melhores-compras" className="btn-melhores-compras-link">
                    📈 Melhores Compras
                </Link>
                <Link href="/crypto" className="btn-crypto-link">
                    ₿ Criptoativos
                </Link>
                <button 
                    className={`btn-refrescar ${atualizando ? 'spinning' : ''}`}
                    onClick={onRefresh}
                    disabled={atualizando}
                >
                    {atualizando ? '⌛' : '🔄'} {atualizando ? 'Atualizando...' : 'Atualizar Agora'}
                </button>
                <div className="status-badge">
                    <span className={`status-dot ${atualizando ? 'active' : ''}`} />
                    {atualizando ? 'Buscando...' : 'Tempo Real Ativo'}
                </div>
            </div>
            <style jsx>{`
                .btn-crypto-link {
                    padding: 8px 14px;
                    background: rgba(245,158,11,0.12);
                    border: 1px solid rgba(245,158,11,0.25);
                    border-radius: 8px;
                    color: #F59E0B;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                .btn-crypto-link:hover {
                    background: rgba(245,158,11,0.25);
                }
                .btn-melhores-compras-link {
                    padding: 8px 14px;
                    background: rgba(16, 185, 129, 0.12);
                    border: 1px solid rgba(16, 185, 129, 0.25);
                    border-radius: 8px;
                    color: #10B981;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    text-decoration: none;
                    transition: background 0.2s;
                }
                .btn-melhores-compras-link:hover {
                    background: rgba(16, 185, 129, 0.25);
                }
            `}</style>
        </header>
    );
};

export default Header;

