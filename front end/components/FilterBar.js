import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';

const FilterBar = ({ sectors = [] }) => {
    const { 
        busca, setBusca, 
        setorSelecionado, setSetorSelecionado,
        filtroSinal, setFiltroSinal
    } = useStore();
    
    const [localBusca, setLocalBusca] = useState(busca);

    useEffect(() => {
        const timer = setTimeout(() => setBusca(localBusca), 300);
        return () => clearTimeout(timer);
    }, [localBusca, setBusca]);

    return (
        <div className="filtros-container">
            <div className="filtros-bar">
                <div className="busca-box">
                    <span className="busca-icon">🔍</span>
                    <input
                        type="text"
                        className="busca-input"
                        placeholder="Ticker ou nome..."
                        value={localBusca}
                        onChange={e => setLocalBusca(e.target.value)}
                    />
                    {localBusca && (
                        <button className="busca-clear" onClick={() => setLocalBusca('')}>✕</button>
                    )}
                </div>

                <div className="selectors-group">
                    <select
                        className="setor-select input-premium"
                        value={setorSelecionado}
                        onChange={e => setSetorSelecionado(e.target.value)}
                    >
                        <option value="todos">Todos Setores</option>
                        {sectors?.map(setor => (
                            <option key={setor} value={setor}>
                                {setor.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                            </option>
                        ))}
                    </select>

                    <select
                        className="sinal-select input-premium"
                        value={filtroSinal}
                        onChange={e => setFiltroSinal(e.target.value)}
                    >
                        <option value="todos">Todos Sinais</option>
                        <option value="COMPRA">📈 Compra</option>
                        <option value="VENDA">📉 Venda</option>
                        <option value="NEUTRO">⚪ Neutro</option>
                    </select>
                </div>
            </div>

            <style jsx>{`
                .filtros-container {
                    margin: 24px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .filtros-bar {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .busca-box {
                    flex: 2;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 10px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .busca-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    outline: none;
                    font-size: 14px;
                }
                .selectors-group {
                    flex: 1;
                    display: flex;
                    gap: 10px;
                }
                .input-premium {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 10px 14px;
                    color: var(--text-primary);
                    font-size: 14px;
                    cursor: pointer;
                    flex: 1;
                }
                @media (min-width: 1024px) {
                    .filtros-bar {
                        flex-direction: row;
                    }
                    .selectors-group {
                        flex: none;
                        width: 400px;
                    }
                }
            `}</style>
        </div>
    );
};

export default FilterBar;
