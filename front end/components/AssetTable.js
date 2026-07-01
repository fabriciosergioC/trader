import React, { useMemo } from 'react';
import { List } from 'react-window';
import { fmt, SIGNAL_ICON, confiancaColor } from '../utils/formatters';
import { useStore } from '../store/useStore';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const TableRow = React.memo((props) => {
    const { index, style, ativos, onSelect, isMobile, comparisonList, toggleComparison } = props;
    const ativo = ativos[index];
    if (!ativo) return null;

    const confClass = confiancaColor(ativo.confianca);
    const isCompared = comparisonList.includes(ativo.ticker);

    const handleToggle = (e) => {
        e.stopPropagation();
        toggleComparison(ativo.ticker);
    };

    return (
        <div 
            style={style} 
            className={`table-row tabela-grid-structure ${index % 2 === 0 ? "par" : "impar"} ${isCompared ? 'selected' : ''}`}
            onClick={() => onSelect(ativo.ticker)}
        >
            <div className="col-check">
                <input 
                    type="checkbox" 
                    checked={isCompared} 
                    onChange={handleToggle}
                    onClick={e => e.stopPropagation()} 
                />
            </div>
            <div className="col-ticker">
                <div className="ticker-main">{ativo.ticker.replace('.SA', '')}</div>
                <div className="ticker-sub">{ativo.nome || ativo.ticker}</div>
            </div>
            
            <div className="col-preco">
                <div className="preco-atual">R$ {fmt(ativo.preco)}</div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '10px', marginTop: '2px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Ab: R$ {fmt(ativo.precoAbertura)}</span>
                    <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>In: R$ {fmt(ativo.precoEntradaViavel)}</span>
                </div>
            </div>
            <div className="col-sinal">
                <span className={`sinal-badge ${ativo.sinal.toLowerCase()}`}>
                    {SIGNAL_ICON[ativo.sinal]} {!isMobile && ativo.sinal}
                </span>
            </div>
            {!isMobile && (
                <div className="col-confianca">
                    <div className="confianca-mini">
                        <span className={`confianca-mini-num ${confClass}`}>{ativo.confianca}%</span>
                        <div className="confianca-mini-bar">
                            <div className={`confianca-mini-fill`} style={{ width: `${ativo.confianca}%`, backgroundColor: `var(--accent-${confClass})` }} />
                        </div>
                    </div>
                </div>
            )}
            {!isMobile && (
                <div className="col-rsi">
                    <span className={ativo.rsi < 30 ? "green" : ativo.rsi > 70 ? "red" : ""}>{fmt(ativo.rsi)}</span>
                </div>
            )}
            {!isMobile && (
                <div className="col-adx">
                    <span className={ativo.adx >= 25 ? "green" : ativo.adx < 20 ? "red" : "yellow"}>{fmt(ativo.adx, 1)}</span>
                </div>
            )}
            {!isMobile && (
                <div className="col-atr">
                    <span>{fmt(ativo.atr)}</span>
                </div>
            )}
            <div className="col-acao">
                <button className="btn-detalhes">{isMobile ? '→' : 'Ver'}</button>
            </div>
        </div>
    );
});

const AssetTable = ({ ativos }) => {
    const { comparisonList, toggleComparison } = useStore();
    const { isMobile } = useResponsiveLayout();
    
    const itemData = useMemo(() => ({
        ativos,
        onSelect: (ticker) => window.open(`/?ticker=${ticker}`, '_blank'),
        isMobile,
        comparisonList,
        toggleComparison
    }), [ativos, isMobile, comparisonList, toggleComparison]);

    if (!ativos?.length) return (
        <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <div className="no-results-text">Nenhum ativo encontrado</div>
        </div>
    );

    return (
        <div className="tabela-container">
            <div className="tabela-header-row tabela-grid-structure">
                <div className="col-check"></div>
                <div className="col-ticker">Ativo</div>
                <div className="col-preco">Preço</div>
                <div className="col-sinal">Sinal</div>
                {!isMobile && <div className="col-confianca">Confiança</div>}
                {!isMobile && <div className="col-rsi">RSI</div>}
                {!isMobile && <div className="col-adx">ADX</div>}
                {!isMobile && <div className="col-atr">ATR</div>}
                <div className="col-acao"></div>
            </div>
            <List
                height={550}
                rowCount={ativos.length}
                rowHeight={isMobile ? 64 : 64}
                width="100%"
                rowProps={itemData}
                rowComponent={TableRow}
            />
        </div>
    );
};

export default AssetTable;
