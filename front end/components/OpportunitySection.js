import { useStore } from '../store/useStore';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
import { fmt } from '../utils/formatters';
import { analisarEntrada } from '../utils/analysis';

const OpportunitySection = ({ opportunities = [] }) => {
    const { subAbaOportunidades, setSubAbaOportunidades } = useStore();
    const { isMobile } = useResponsiveLayout();

    console.log("🔍 OpportunitySection Debug:");
    console.log("- subAbaOportunidades:", subAbaOportunidades);
    console.log("- opportunities length:", opportunities?.length);
    console.log("- isMobile:", isMobile);

    if (!opportunities || !Array.isArray(opportunities)) {
        console.warn("⚠️ No opportunities array found!");
        return null;
    }

    let filtered = opportunities.filter(o => {
        if (subAbaOportunidades === "compra") {
            const analise = analisarEntrada(o);
            const hasSR = o.detalhes?.sr_analysis;
            
            // Somente ativos em região de suporte ou rompimento de resistência (MAIS FLEXÍVEL!)
            const isSRZone = hasSR && (
                hasSR.entry_zone_status === "SUPORTE_RESPEITADO" || 
                hasSR.entry_zone_status === "ROMPIMENTO_ALTA_CONFIRMADO" ||
                hasSR.entry_zone_status === "ROMPIMENTO_ALTA_PARCIAL"
            );
            
            const isBuyRecommended = ["ENTRAR", "ENTRAR COM CAUTELA", "ENTRADA CONFIRMADA PELA IA", "COMPRAR"].includes(analise.recomendacao);
            
            return o.sinal === "COMPRA" && (isSRZone || !hasSR) && (isBuyRecommended || !analise.recomendacao);
        }
        if (subAbaOportunidades === "venda") {
            const analise = analisarEntrada(o);
            const hasSR = o.detalhes?.sr_analysis;
            
            const isSRZone = hasSR && (
                hasSR.entry_zone_status === "RESISTENCIA_RESPEITADA" || 
                hasSR.entry_zone_status === "ROMPIMENTO_BAIXA_CONFIRMADO" ||
                hasSR.entry_zone_status === "ROMPIMENTO_BAIXA_PARCIAL"
            );

            const isSellRecommended = ["ENTRAR", "ENTRAR COM CAUTELA", "ENTRADA CONFIRMADA PELA IA", "VENDER"].includes(analise.recomendacao);
            
            return o.sinal === "VENDA" && (isSRZone || !hasSR) && (isSellRecommended || !analise.recomendacao);
        }
        return (o.sinal === "NEUTRO" || (o.confianca < 60 && o.score < 6 && o.sellScore < 6));
    });

    // FALLBACK: SE NENHUM RESULTADO, MOSTRA TODOS OS ATIVOS COM O SINAL CORRESPONDENTE!
    console.log("- filtered before fallback:", filtered.length);

    if (filtered.length === 0) {
        console.log("⚠️ Fallback activated! Showing all assets with signal.");
        filtered = opportunities.filter(o => {
            if (subAbaOportunidades === "compra") return o.sinal === "COMPRA";
            if (subAbaOportunidades === "venda") return o.sinal === "VENDA";
            return o.sinal === "NEUTRO";
        });
        console.log("- filtered after fallback:", filtered.length);
    }

    console.log("- final filtered length:", filtered.length);
    filtered.sort((a, b) => {
        if (subAbaOportunidades === "compra") {
            if (b.confianca !== a.confianca) return b.confianca - a.confianca;
            return b.score - a.score;
        }
        if (subAbaOportunidades === "venda") {
            if (b.confianca !== a.confianca) return b.confianca - a.confianca;
            return b.sellScore - a.sellScore;
        }
        return b.confianca - a.confianca;
    });

    return (
        <div className="oportunidades-section">
            <div className="oport-section-header">
                <div className="sub-abas-oport">
                    <button className={`sub-aba-btn compra ${subAbaOportunidades === "compra" ? "active" : ""}`} onClick={() => setSubAbaOportunidades("compra")}>📈 Melhores Compras</button>
                    <button className={`sub-aba-btn venda ${subAbaOportunidades === "venda" ? "active" : ""}`} onClick={() => setSubAbaOportunidades("venda")}>📉 Melhores Vendas</button>
                    <button className={`sub-aba-btn neutro ${subAbaOportunidades === "aguardar" ? "active" : ""}`} onClick={() => setSubAbaOportunidades("aguardar")}>◆ Aguardando</button>
                </div>
            </div>

            <div className="oport-table-container">
                {filtered.length === 0 ? (
                    <div style={{
                        padding: "40px 20px",
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: "16px"
                    }}>
                        <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                        <p>Nenhuma oportunidade encontrada no momento.</p>
                        <p style={{ fontSize: "13px", marginTop: "8px" }}>Tente novamente mais tarde.</p>
                    </div>
                ) : isMobile ? (
                    <div className="oport-cards-grid">
                        {filtered.map((ativo) => {
                            const prob = (subAbaOportunidades === "compra" ? ativo.probabilidade : ativo.probabilidadeVenda) ?? 0;
                            const score = (subAbaOportunidades === "compra" ? ativo.score : ativo.sellScore) ?? 0;
                            
                            const tt = ativo.detalhes?.tt_analysis ?? ativo.tt_analysis;
                            const dom = ativo.detalhes?.dom_analysis ?? ativo.dom_analysis;
                            const isFluxoOk = tt && dom && !tt.error && !dom.error && (
                                (ativo.sinal === "COMPRA" && tt.ttScore >= 2 && dom.domScore >= 2) ||
                                (ativo.sinal === "VENDA" && tt.ttScore <= -2 && dom.domScore <= -2)
                            );
                            
                            return (
                                <div key={ativo.ticker} className="oport-card" onClick={() => window.open(`/?ticker=${ativo.ticker}`, '_blank')}>
                                    <div className="card-header">
                                        <div className="ticker-info">
                                            <span className="ticker-main">
                                                {ativo.ticker.replace('.SA', '')}
                                                {isFluxoOk && <span className="badge-fluxo-ok" title="Confirmado por Times & Trades e Super DOM">🌊 Fluxo OK</span>}
                                            </span>
                                            <span className="ticker-sub">{ativo.nome || ativo.ticker}</span>
                                        </div>
                                        <div className="price">
                                            <div>R$ {fmt(ativo.preco)}</div>
                                            <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '2px', display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Ab: R$ {fmt(ativo.precoAbertura)}</span>
                                                <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>In: R$ {fmt(ativo.precoEntradaViavel)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-stats">
                                        <div className="stat">
                                            <span>Prob.</span>
                                            <strong>{prob}%</strong>
                                        </div>
                                        <div className="stat">
                                            <span>Score</span>
                                            <strong>{score}</strong>
                                        </div>
                                        <div className="stat">
                                            <span>Conf.</span>
                                            <strong>{ativo.confianca}%</strong>
                                        </div>
                                    </div>
                                    <button className="btn-card-action">Analisar →</button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <table className="oport-table">
                        <thead>
                            <tr>
                                <th>Ativo</th>
                                <th>Preço</th>
                                <th>Probabilidade</th>
                                <th>Score</th>
                                <th>Confiança</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                             {filtered.map((ativo) => {
                                const prob = (subAbaOportunidades === "compra" ? ativo.probabilidade : ativo.probabilidadeVenda) ?? 0;
                                const score = (subAbaOportunidades === "compra" ? ativo.score : ativo.sellScore) ?? 0;
                                
                                const tt = ativo.detalhes?.tt_analysis ?? ativo.tt_analysis;
                                const dom = ativo.detalhes?.dom_analysis ?? ativo.dom_analysis;
                                const isFluxoOk = tt && dom && !tt.error && !dom.error && (
                                    (ativo.sinal === "COMPRA" && tt.ttScore >= 2 && dom.domScore >= 2) ||
                                    (ativo.sinal === "VENDA" && tt.ttScore <= -2 && dom.domScore <= -2)
                                );
                                
                                return (
                                    <tr key={ativo.ticker} className="oport-row" onClick={() => window.open(`/?ticker=${ativo.ticker}`, '_blank')}>
                                        <td>
                                            <div className="ticker-main">
                                                {ativo.ticker.replace('.SA', '')}
                                                {isFluxoOk && <span className="badge-fluxo-ok" title="Confirmado por Times & Trades e Super DOM">🌊 Fluxo OK</span>}
                                            </div>
                                            <div className="ticker-sub">{ativo.nome || ativo.ticker}</div>
                                        </td>
                                        <td>
                                            <div className="preco-atual">R$ {fmt(ativo.preco)}</div>
                                            <div className="preco-abertura" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                Ab: R$ {fmt(ativo.precoAbertura)}
                                            </div>
                                        </td>
                                        <td>{prob}%</td>
                                        <td>{score}</td>
                                        <td>{ativo.confianca}%</td>
                                        <td><button className="btn-detalhes">Ver</button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <style jsx>{`
                .oport-cards-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 12px;
                    padding: 4px;
                }
                .oport-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-card);
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                .oport-card:active { transform: scale(0.98); }
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
                .ticker-info { display: flex; flex-direction: column; }
                .ticker-main { font-weight: 700; font-size: 18px; color: var(--accent-blue); display: flex; align-items: center; }
                .ticker-sub { font-size: 12px; color: var(--text-secondary); }
                .price { font-family: 'JetBrains Mono', monospace; font-weight: 600; }
                .badge-fluxo-ok {
                    background: rgba(59, 130, 246, 0.15);
                    color: #60A5FA;
                    border: 1px solid rgba(59, 130, 246, 0.3);
                    border-radius: 4px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: 700;
                    margin-left: 8px;
                    display: inline-block;
                    letter-spacing: 0.5px;
                }
                .card-stats {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    background: var(--bg-secondary);
                    padding: 10px;
                    border-radius: 8px;
                }
                .stat { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .stat span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }
                .stat strong { font-size: 14px; }
                .btn-card-action {
                    background: linear-gradient(135deg, var(--accent-blue), var(--accent-blue-dark));
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                }
            `}</style>
        </div>
    );
};

export default OpportunitySection;
