import { useEffect, useState } from "react";
import axios from "axios";
import { supabase } from '../utils/supabase';

// ── Helpers ──────────────────────────────────────────────────────────────────
const SIGNAL_ICON = { COMPRA: "▲", VENDA: "▼", NEUTRO: "◆" };
const OBV_ICON    = { SUBINDO: "↑", CAINDO: "↓", NEUTRO: "→" };

function fmt(v, dec = 2) {
    if (v == null) return "—";
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function confiancaColor(c) {
    if (c >= 65) return "high";
    if (c >= 35) return "medium";
    return "low";
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Recomendação de Entrada
// ═════════════════════════════════════════════════════════════════════════════
function EntradaRecomendacao({ analise, detalhes }) {
    if (!analise) return null;

    const corMap = {
        green: "verde",
        red: "vermelho",
        yellow: "amarelo",
        blue: "azul"
    };

    return (
        <div className={`entrada-recomendacao ${corMap[analise.cor]}`}>
            <div className="entrada-header">
                <span className="entrada-icone">{analise.icone}</span>
                <div>
                    <div className="entrada-titulo">{analise.recomendacao}</div>
                    <div className="entrada-mensagem">{analise.mensagem}</div>
                </div>
            </div>

            <div className="entrada-stats">
                <div className="entrada-stat">
                    <span className="stat-label-small">Pontos +</span>
                    <span className="stat-value-positive">{analise.pontosPositivos}</span>
                </div>
                <div className="entrada-stat">
                    <span className="stat-label-small">Pontos −</span>
                    <span className="stat-value-negative">{analise.pontosNegativos}</span>
                </div>
                <div className="entrada-stat">
                    <span className="stat-label-small">Score</span>
                    <span className={`stat-value-score ${analise.score >= 5 ? "positive" : analise.score <= 0 ? "negative" : "neutral"}`}>
                        {analise.score >= 0 ? "+" : ""}{analise.score}
                    </span>
                </div>
            </div>

            {analise.bloqueadores.length > 0 && (
                <div className="entrada-bloqueadores">
                    {analise.bloqueadores.map((b, i) => (
                        <div key={i} className="bloqueador-item">🚫 {b}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Divergências
// ═════════════════════════════════════════════════════════════════════════════
function DivergenciasPanel({ detalhes }) {
    if (!detalhes) return null;
    const temRSI = detalhes.rsi_divergence;
    const temMACD = detalhes.macd_divergence;

    if (!temRSI && !temMACD) return null;

    return (
        <div className="divergencias-panel">
            <div className="divergencias-header">🔔 Divergências Detectadas</div>
            <div className="divergencias-content">
                {temRSI && (
                    <div className={`divergencia-item ${temRSI === "BULLISH" ? "bullish" : "bearish"}`}>
                        <span className="divergencia-icon">{temRSI === "BULLISH" ? "📊" : "📉"}</span>
                        <div>
                            <div className="divergencia-label">RSI</div>
                            <div className="divergencia-value">{temRSI}</div>
                        </div>
                    </div>
                )}
                {temMACD && (
                    <div className={`divergencia-item ${temMACD === "BULLISH" ? "bullish" : "bearish"}`}>
                        <span className="divergencia-icon">{temMACD === "BULLISH" ? "📈" : "📊"}</span>
                        <div>
                            <div className="divergencia-label">MACD</div>
                            <div className="divergencia-value">{temMACD}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Pullback
// ═════════════════════════════════════════════════════════════════════════════
function PullbackPanel({ pullback }) {
    if (!pullback || !pullback.isPullback) return null;

    return (
        <div className={`pullback-panel ${pullback.direction === "BUY" ? "bullish" : "bearish"}`}>
            <div className="pullback-header">🎯 Oportunidade de Pullback</div>
            <div className="pullback-content">
                <div className="pullback-item">
                    <span className="pullback-label">Direção:</span>
                    <span className="pullback-value">{pullback.direction === "BUY" ? "COMPRA" : "VENDA"}</span>
                </div>
                <div className="pullback-item">
                    <span className="pullback-label">Qualidade:</span>
                    <span className="pullback-quality">{pullback.quality ?? 0}%</span>
                </div>
                <div className="pullback-reason">{pullback.reason}</div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Volume Accumulation
// ═════════════════════════════════════════════════════════════════════════════
function VolumeAccumPanel({ volumeAcc }) {
    if (!volumeAcc) return null;

    const corMap = {
        "ACUMULAÇÃO": "bullish",
        "DISTRIBUIÇÃO": "bearish",
        "NEUTRO": "neutral"
    };

    const iconMap = {
        "ACUMULAÇÃO": "💰",
        "DISTRIBUIÇÃO": "📤",
        "NEUTRO": "➡️"
    };

    return (
        <div className={`volume-acc-panel ${corMap[volumeAcc.trend] || "neutral"}`}>
            <div className="volume-acc-header">
                <span className="volume-acc-icon">{iconMap[volumeAcc.trend] || "➡️"}</span>
                <span className="volume-acc-label">Análise de Volume</span>
            </div>
            <div className="volume-acc-content">
                <div className="volume-acc-item">
                    <span className="vol-label">Tendência:</span>
                    <span className="vol-value">{volumeAcc.trend}</span>
                </div>
                <div className="volume-acc-item">
                    <span className="vol-label">Força:</span>
                    <span className="vol-strength">{volumeAcc.strength}%</span>
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Alerta de Proximidade de Venda
// ═════════════════════════════════════════════════════════════════════════════
function VendaAlertPanel({ alertaVenda, sinal, preco }) {
    if (!alertaVenda || !alertaVenda.ativo) return null;

    const nivelConfig = {
        ALTO: {
            cor: 'red',
            icone: '🔴',
            classe: 'alto',
            titulo: 'ALERTA MÁXIMO — VENDA IMINENTE',
            acao: 'REALIZAR LUCRO AGORA',
            descricao: 'Alta probabilidade de reversão para baixa. Proteja seu capital.',
            stopSugerido: 'Aperte stop loss para 50% do valor original',
            prioridade: 'URGENTE'
        },
        MODERADO: {
            cor: 'orange',
            icone: '🟠',
            classe: 'moderado',
            titulo: 'ATENÇÃO — Zona de Venda se Aproximando',
            acao: 'PREPARAR PARA VENDER',
            descricao: 'Indicadores apontando possível reversão. Monitore de perto.',
            stopSugerido: 'Suba stop loss para perto do preço de entrada',
            prioridade: 'IMPORTANTE'
        },
        ATENCAO: {
            cor: 'yellow',
            icone: '🟡',
            classe: 'atencao',
            titulo: 'OBSERVAR — Condições Mudando',
            acao: 'FICAR ALERTA',
            descricao: 'Alguns indicadores mostrando enfraquecimento da tendência.',
            stopSugerido: 'Mantenha stop loss atual e monitore',
            prioridade: 'MONITORAR'
        }
    };

    const config = nivelConfig[alertaVenda.nivel] || nivelConfig.ATENCAO;

    return (
        <div className={`venda-alert-panel ${config.classe}`}>
            {/* Banner de Alerta */}
            <div className="venda-alert-banner">
                <span className="venda-alert-icon">{config.icone}</span>
                <div className="venda-alert-banner-text">
                    <div className="venda-alert-prioridade">{config.prioridade}</div>
                    <div className="venda-alert-titulo">{config.titulo}</div>
                </div>
            </div>

            {/* O Que Fazer Agora */}
            <div className="venda-acao-section">
                <div className="venda-acao-header">
                    <span className="acao-icon">🎯</span>
                    <span className="acao-label">O QUE FAZER AGORA</span>
                </div>
                <div className="venda-acao-principal">
                    <span className="acao-titulo">{config.acao}</span>
                </div>
                <div className="venda-acao-descricao">{config.descricao}</div>
            </div>

            {/* Detalhes do Alerta */}
            <div className="venda-alert-content">
                <div className="venda-alert-resumo">
                    <span className="resumo-icon">⚠️</span>
                    <span className="resumo-texto">{alertaVenda.contador} fatores indicando possível reversão para baixa</span>
                </div>

                <div className="venda-alert-motivos-wrapper">
                    <div className="motivos-titulo">Fatores que dispararam o alerta:</div>
                    <ul className="venda-alert-motivos">
                        {alertaVenda.motivos.map((motivo, i) => (
                            <li key={i} className="motivo-item">
                                <span className="motivo-num">{i + 1}</span>
                                <span className="motivo-texto">{motivo}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Stop Loss Sugerido */}
                <div className="venda-stop-sugerido">
                    <span className="stop-icon">🛡️</span>
                    <div>
                        <div className="stop-label">Recomendação de Proteção</div>
                        <div className="stop-texto">{config.stopSugerido}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Stops Dinâmicos
// ═════════════════════════════════════════════════════════════════════════════
function StopsPanel({ stops, preco, sinal }) {
    if (!stops || !stops.stopLoss) return null;

    const isCompra = sinal === "COMPRA";

    return (
        <div className="stops-panel">
            <div className="stops-header">🛡️ Gestão de Risco Dinâmica</div>
            <div className="stops-content">
                <div className="stops-row">
                    <span className="stop-label">Entrada:</span>
                    <span className="stop-value">R$ {fmt(preco)}</span>
                </div>
                <div className="stops-row stop-loss">
                    <span className="stop-label">Stop Loss:</span>
                    <span className="stop-value red">R$ {fmt(stops.stopLoss)}</span>
                </div>
                <div className="stops-row take-profit">
                    <span className="stop-label">Take Profit:</span>
                    <span className="stop-value green">R$ {fmt(stops.takeProfit)}</span>
                </div>
                <div className="stops-row">
                    <span className="stop-label">Risco/Retorno:</span>
                    <span className="stop-value">{stops.riskReward}:1</span>
                </div>
                <div className="stops-row">
                    <span className="stop-label">Distância Stop:</span>
                    <span className="stop-value">{fmt(stops.stopDistance)} ({stops.atrMultiplier}x ATR)</span>
                </div>
            </div>
        </div>
    );
}

function adxLabel(adx) {
    if (adx == null) return { label: "—", cls: "" };
    if (adx < 20)   return { label: "LATERAL FORTE", cls: "danger" };
    if (adx < 25)   return { label: "LATERAL", cls: "warn" };
    if (adx >= 35)  return { label: "TENDÊNCIA FORTE", cls: "strong" };
    return { label: "MODERADO", cls: "ok" };
}

function bbPositionPct(preco, bb) {
    if (!bb) return null;
    const range = bb.upper - bb.lower;
    if (range <= 0) return 50;
    return Math.max(0, Math.min(100, ((preco - bb.lower) / range) * 100));
}

function macroVarClass(v) {
    if (v == null) return "";
    return v >= 0 ? "up" : "down";
}

// ── Componente: Painel Macro ──────────────────────────────────────────────────
function MacroPanel({ macro }) {
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
                        <div className="macro-label">VIX (Medo Global)</div>
                        <div className="macro-value">{fmt(macro.vix.valor)}</div>
                        <div className={`macro-tag ${vixRiscoClass[macro.vix.risco] || ""}`}>
                            {macro.vix.risco}
                        </div>
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
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Componente: Veredito da IA (Gemini)
// ═════════════════════════════════════════════════════════════════════════════
function VereditoIACard({ veredito }) {
    if (!veredito || veredito.erro) return null;

    const sentimentoIcon = {
        Otimista: "🚀",
        Pessimista: "📉",
        Neutro: "⚖️"
    };

    const recomendacaoClass = {
        Compra: "bullish",
        Venda: "bearish",
        Aguardar: "neutral"
    };

    return (
        <div className="veredito-ia-panel">
            <div className="veredito-ia-header">
                <span className="ia-icon">🤖</span>
                <span className="ia-label">Análise Inteligente (Gemini AI)</span>
                {veredito.confianca && (
                    <span className="ia-confianca">{veredito.confianca}% confiança</span>
                )}
            </div>
            <div className="veredito-ia-content">
                <div className="ia-top-row">
                    <div className="ia-sentimento">
                        <span className="sentimento-icon">{sentimentoIcon[veredito.sentimento] || "⚖️"}</span>
                        <span className="sentimento-label">{veredito.sentimento}</span>
                    </div>
                    <div className={`ia-recomendacao ${recomendacaoClass[veredito.recomendacao] || "neutral"}`}>
                        {veredito.recomendacao}
                    </div>
                </div>
                <div className="ia-justificativa">
                    {veredito.justificativa}
                </div>
            </div>
        </div>
    );
}

// ── Componente: Card de Notícias ──────────────────────────────────────────────
function NoticiasCard({ noticias }) {
    const [aberto, setAberto] = useState(false);
    if (!noticias?.length) return null;

    return (
        <div className="noticias-section">
            <button className="noticias-toggle" onClick={() => setAberto(a => !a)}>
                📰 Notícias ({noticias.length})
                <span className="chevron">{aberto ? "▲" : "▼"}</span>
            </button>
            {aberto && (
                <ul className="noticias-list">
                    {noticias.map((n, i) => (
                        <li key={i} className="noticia-item">
                            <div className="noticia-titulo">{n.titulo}</div>
                            <div className="noticia-meta">
                                {n.fonte && <span className="noticia-fonte">{n.fonte}</span>}
                                {n.data  && <span className="noticia-data">{n.data}</span>}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Componente: Card do Ativo ─────────────────────────────────────────────────
function AssetCard({ d, idx }) {
    const sinalClass   = (d.sinal ?? "NEUTRO").toLowerCase();
    const confClass    = confiancaColor(d.confianca);
    const adxInfo      = adxLabel(d.adx);
    const bbPct        = bbPositionPct(d.preco, d.bb);
    const temAvisos    = d.avisos?.length > 0;

    // ── Análise consolidada para recomendação de entrada ──────────────────────
    const analiseEntrada = analisarEntrada(d);

    return (
        <div className={`asset-card ${sinalClass}`} style={{ animationDelay: `${idx * 0.12}s` }}>
            {/* ── Header ── */}
            <div className="card-header">
                <div>
                    <div className="ticker">{d.ticker?.replace(".SA", "")}</div>
                    <div className="ticker-full">{d.ticker}</div>
                </div>
                <div className={`signal-badge ${d.sinal}`}>
                    <span>{SIGNAL_ICON[d.sinal] ?? "◆"}</span>
                    {d.sinal ?? "NEUTRO"}
                </div>
                {d.sinal_longo_prazo === "COMPRA" && (
                    <div className="signal-badge COMPRA" style={{ background: '#7e22ce', marginLeft: '5px' }}>
                        <span>💎</span>
                        LONGO PRAZO
                    </div>
                )}
            </div>

            {/* ── Preço ── */}
            <div className="price-section">
                <div className="price-label">Preço Atual</div>
                <div className="price-value">
                    <span className="price-currency">R$</span>{fmt(d.preco)}
                </div>
            </div>

            {/* ── Preços de Abertura e Fechamento Anterior ── */}
            {(d.precoAbertura || d.fechamentoAnterior) && (
                <div className="price-history-section">
                    <div className="price-history-grid">
                        {d.precoAbertura && (
                            <div className="price-history-item">
                                <div className="price-history-label">Abertura (Hoje)</div>
                                <div className="price-history-value">
                                    <span className="price-currency">R$</span>{fmt(d.precoAbertura)}
                                </div>
                                {d.preco && (
                                    <div className={`price-variation ${d.preco >= d.precoAbertura ? 'positive' : 'negative'}`}>
                                        {d.preco >= d.precoAbertura ? '▲' : '▼'} {fmt(Math.abs((d.preco - d.precoAbertura) / d.precoAbertura * 100))}%
                                    </div>
                                )}
                            </div>
                        )}
                        {d.fechamentoAnterior && (
                            <div className="price-history-item">
                                <div className="price-history-label">Fechamento (Anterior)</div>
                                <div className="price-history-value">
                                    <span className="price-currency">R$</span>{fmt(d.fechamentoAnterior)}
                                </div>
                                {d.preco && (
                                    <div className={`price-variation ${d.preco >= d.fechamentoAnterior ? 'positive' : 'negative'}`}>
                                        {d.preco >= d.fechamentoAnterior ? '▲' : '▼'} {fmt(Math.abs((d.preco - d.fechamentoAnterior) / d.fechamentoAnterior * 100))}%
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                RECOMENDAÇÃO DE ENTRADA (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <EntradaRecomendacao analise={analiseEntrada} detalhes={d.detalhes} />

            {/* ── Confiança ── */}
            <div className="confianca-section">
                <div className="confianca-header">
                    <span className="confianca-label">Confiança do Sinal</span>
                    <span className={`confianca-num ${confClass}`}>{d.confianca ?? 0}%</span>
                </div>
                <div className="confianca-bar-bg">
                    <div
                        className={`confianca-bar-fill ${confClass}`}
                        style={{ width: `${d.confianca ?? 0}%` }}
                    />
                </div>
            </div>

            {/* ── Métricas Principais ── */}
            <div className="metrics-grid">
                <div className="metric">
                    <div className="metric-label">RSI (14)</div>
                    <div className={`metric-value ${d.rsi < 30 ? "green" : d.rsi > 70 ? "red" : ""}`}>
                        {fmt(d.rsi)}
                    </div>
                </div>
                <div className="metric">
                    <div className="metric-label">SMA 9 / 21</div>
                    <div className="metric-value">{fmt(d.sma9)} / {fmt(d.sma21)}</div>
                    {d.sma9 && d.sma21 && (
                        <div className={`sma-status ${d.sma9 > d.sma21 ? 'positive' : 'negative'}`}>
                            {d.sma9 > d.sma21 ? '▲ Positiva' : '▼ Negativa'}
                        </div>
                    )}
                </div>
                <div className="metric">
                    <div className="metric-label">SMA 50 / 200</div>
                    <div className="metric-value">{fmt(d.sma50)} / {fmt(d.sma200)}</div>
                    {d.sma50 && d.sma200 && (
                        <div className={`sma-status ${d.sma50 > d.sma200 ? 'positive' : 'negative'}`}>
                            {d.sma50 > d.sma200 ? '📈 Longo Prazo: Alta' : '📉 Longo Prazo: Baixa'}
                        </div>
                    )}
                </div>
                <div className="metric">
                    <div className="metric-label">ADX</div>
                    <div className={`metric-value adx-${adxInfo.cls}`}>{fmt(d.adx, 1)}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">ATR</div>
                    <div className="metric-value">{fmt(d.atr)}</div>
                </div>
                <div className="metric">
                    <div className="metric-label">OBV Tendência</div>
                    <div className={`metric-value obv-${(d.obv_trend ?? "NEUTRO").toLowerCase()}`}>
                        {OBV_ICON[d.obv_trend ?? "NEUTRO"]} {d.obv_trend ?? "NEUTRO"}
                    </div>
                </div>
                <div className="metric">
                    <div className="metric-label">Volume</div>
                    <div className="metric-value">{d.detalhes?.volume_status ?? "—"}</div>
                </div>
            </div>

            {/* ── ADX Badge ── */}
            <div className="adx-row">
                <span className="adx-label">Mercado:</span>
                <span className={`adx-badge ${adxInfo.cls}`}>{adxInfo.label}</span>
                {d.detalhes?.volatilidade && (
                    <span className={`adx-badge vol-${d.detalhes.volatilidade.toLowerCase()}`}>
                        ⚡ {d.detalhes.volatilidade}
                    </span>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                DIVERGÊNCIAS (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <DivergenciasPanel detalhes={d.detalhes} />

            {/* ═══════════════════════════════════════════════════════════════
                PULLBACK (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <PullbackPanel pullback={d.detalhes?.pullback} />

            {/* ═══════════════════════════════════════════════════════════════
                VOLUME ACUMULAÇÃO (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <VolumeAccumPanel volumeAcc={d.detalhes?.volume_accumulation} />

            {/* ═══════════════════════════════════════════════════════════════
                ALERTA DE VENDA (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <VendaAlertPanel alertaVenda={d.detalhes?.alerta_venda} sinal={d.sinal} preco={d.preco} />

            {/* ═══════════════════════════════════════════════════════════════
                STOPS DINÂMICOS (NOVO)
                ═══════════════════════════════════════════════════════════════ */}
            <StopsPanel stops={d.detalhes?.stops} preco={d.preco} sinal={d.sinal} />

            {/* ── Posição nas Bollinger Bands ── */}
            {d.bb && bbPct !== null && (
                <div className="bb-section">
                    <div className="bb-header">
                        <span className="bb-label">Bandas de Bollinger</span>
                        <span className="bb-pct">{fmt(bbPct, 0)}% do range</span>
                    </div>
                    <div className="bb-bar-bg">
                        <div className="bb-zones">
                            <div className="bb-zone-low"  title="Sobrevenda" />
                            <div className="bb-zone-mid"  title="Neutro" />
                            <div className="bb-zone-high" title="Sobrecompra" />
                        </div>
                        <div className="bb-marker" style={{ left: `${bbPct}%` }} />
                    </div>
                    <div className="bb-legend">
                        <span>R${fmt(d.bb.lower)}</span>
                        <span>R${fmt(d.bb.middle)}</span>
                        <span>R${fmt(d.bb.upper)}</span>
                    </div>
                </div>
            )}

            {/* ── Avisos ── */}
            {temAvisos && (
                <div className="avisos-section">
                    {d.avisos.map((a, i) => (
                        <div key={i} className="aviso-item">{a}</div>
                    ))}
                </div>
            )}

            {/* ── Veredito da IA ── */}
            <VereditoIACard veredito={d.vereditoIA} />

            {/* ── Notícias ── */}
            <NoticiasCard noticias={d.noticias} />
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════════════════
// ── Função de Análise Consolidada de Entrada
// ═════════════════════════════════════════════════════════════════════════════
function analisarEntrada(d) {
    const pontos = [];
    let pontosPositivos = 0;
    let pontosNegativos = 0;
    let bloqueadores = [];

    // 0. Sinal de Longo Prazo (SMA 50/200) - ALTO PESO
    if (d.sinal_longo_prazo === "COMPRA") {
        pontosPositivos += 4;
        pontos.push({ tipo: "positivo", texto: "💎 Forte tendência de LONGO PRAZO (SMA 50/200)" });
    } else if (d.sma50 > d.sma200) {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "Tendência macro de alta (SMA 50 > 200)" });
    }

    // 1. Sinal base
    if (d.sinal === "COMPRA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "Sinal de COMPRA ativo" });
    } else if (d.sinal === "VENDA") {
        pontosNegativos += 2;
        pontos.push({ tipo: "negativo", texto: "Sinal de VENDA ativo" });
    }

    // 2. Confiança
    if (d.confianca >= 60) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `Confiança alta (${d.confianca}%)` });
    } else if (d.confianca >= 35) {
        pontosPositivos += 1;
        pontos.push({ tipo: "neutro", texto: `Confiança moderada (${d.confianca}%)` });
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `Confiança baixa (${d.confianca}%)` });
    }

    // 3. ADX - força da tendência
    if (d.adx >= 25) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `ADX forte (${d.adx.toFixed(1)}) - tendência definida` });
    } else if (d.adx < 20) {
        bloqueadores.push("⚠️ ADX muito baixo - mercado lateral forte");
        pontosNegativos += 3;
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `ADX moderado (${d.adx.toFixed(1)}) - tendência fraca` });
    }

    // 4. Tendência SMA
    if (d.sma9 > d.sma21) {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "SMA9 acima SMA21 - tendência de alta" });
    } else {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "SMA9 abaixo SMA21 - tendência de baixa" });
    }

    // 5. RSI
    if (d.rsi < 40) {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: `RSI sobrevendido (${d.rsi.toFixed(1)}) - bom ponto` });
    } else if (d.rsi > 60) {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: `RSI sobrecomprado (${d.rsi.toFixed(1)})` });
    } else {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: `RSI neutro (${d.rsi.toFixed(1)})` });
    }

    // 6. MACD
    if (d.detalhes?.macd_status === "BULLISH") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "MACD bullish" });
    } else if (d.detalhes?.macd_status === "BEARISH") {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "MACD bearish" });
    }

    // 7. OBV
    if (d.obv_trend === "SUBINDO") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "OBV subindo - pressão de compra" });
    } else if (d.obv_trend === "CAINDO") {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "OBV caindo - pressão de venda" });
    }

    // 8. Divergências
    if (d.detalhes?.rsi_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência RSI bullish confirma compra" });
    } else if (d.detalhes?.rsi_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 2;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência RSI bearish confirma venda" });
    } else if (d.detalhes?.rsi_divergence && d.sinal !== "NEUTRO") {
        bloqueadores.push("⚠️ Divergência RSI contradiz sinal");
        pontosNegativos += 2;
    }

    if (d.detalhes?.macd_divergence === "BULLISH" && d.sinal === "COMPRA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência MACD bullish confirma" });
    } else if (d.detalhes?.macd_divergence === "BEARISH" && d.sinal === "VENDA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "🔔 Divergência MACD bearish confirma" });
    }

    // 9. Pullback
    if (d.detalhes?.pullback?.isPullback) {
        const pb = d.detalhes.pullback;
        if ((pb.direction === "BUY" && d.sinal === "COMPRA") || 
            (pb.direction === "SELL" && d.sinal === "VENDA")) {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: `🎯 Pullback detectado - ótimo ponto! (${pb.quality}%)` });
        }
    }

    // 10. Volume Accumulation
    if (d.detalhes?.volume_accumulation) {
        const vol = d.detalhes.volume_accumulation;
        if (vol.trend === "ACUMULAÇÃO" && d.sinal === "COMPRA") {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: "💰 Acumulação de volume - instituições comprando" });
        } else if (vol.trend === "DISTRIBUIÇÃO" && d.sinal === "VENDA") {
            pontosPositivos += 2;
            pontos.push({ tipo: "positivo", texto: "💰 Distribuição de volume - instituições vendendo" });
        } else if (vol.trend === "ACUMULAÇÃO" && d.sinal === "VENDA") {
            bloqueadores.push("⚠️ Acumulação contradiz venda");
            pontosNegativos += 2;
        } else if (vol.trend === "DISTRIBUIÇÃO" && d.sinal === "COMPRA") {
            bloqueadores.push("⚠️ Distribuição contradiz compra");
            pontosNegativos += 2;
        }
    }

    // 11. Volatilidade
    if (d.detalhes?.volatilidade === "ALTA") {
        pontosNegativos += 1;
        pontos.push({ tipo: "negativo", texto: "⚡ Alta volatilidade - risco elevado" });
    } else if (d.detalhes?.volatilidade === "BAIXA") {
        pontosPositivos += 1;
        pontos.push({ tipo: "positivo", texto: "Volatilidade baixa - risco controlado" });
    }

    // 12. Bollinger Bands - falso rompimento
    if (d.detalhes?.falso_rompimento) {
        bloqueadores.push("⚠️ Possível falso rompimento detectado");
        pontosNegativos += 3;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ── NOVOS FILTROS PARA EVITAR SINAIS FALSOS ───────────────────────────────
    // ═════════════════════════════════════════════════════════════════════════

    // 13. Variação Intraday - não comprar se preço já subiu muito no dia
    if (d.detalhes?.var_intraday) {
        const varIntra = parseFloat(d.detalhes.var_intraday);
        if (d.sinal === "COMPRA" && varIntra > 1.5) {
            bloqueadores.push(`⚠️ Preço já subiu ${varIntra.toFixed(1)}% hoje — risco de topo`);
            pontosNegativos += 3;
        } else if (d.sinal === "COMPRA" && varIntra > 0.8) {
            pontosNegativos += 1;
            pontos.push({ tipo: "negativo", texto: `Preço subiu ${varIntra.toFixed(1)}% hoje — cautela` });
        } else if (varIntra < -0.5) {
            pontosPositivos += 1;
            pontos.push({ tipo: "positivo", texto: `Preço caiu ${Math.abs(varIntra).toFixed(1)}% hoje — melhor entrada` });
        }
    }

    // 14. Momentum dos últimos candles
    if (d.detalhes?.momentum_candles) {
        const { vermelhos, verdes } = d.detalhes.momentum_candles;
        if (d.sinal === "COMPRA" && vermelhos >= 2) {
            pontosNegativos += 2;
            pontos.push({ tipo: "negativo", texto: `${vermelhos} candles vermelhos nos últimos 3 — momentum fraco` });
        } else if (d.sinal === "COMPRA" && verdes >= 2) {
            pontosPositivos += 1;
            pontos.push({ tipo: "positivo", texto: `${verdes} candles verdes — momentum forte` });
        }
    }

    // 15. Tendência de curto prazo (5 dias)
    if (d.detalhes?.variacao_5dias) {
        const var5dias = parseFloat(d.detalhes.variacao_5dias);
        if (d.sinal === "COMPRA" && var5dias < -3) {
            bloqueadores.push(`⚠️ Caiu ${Math.abs(var5dias).toFixed(1)}% em 5 dias — tendência de baixa`);
            pontosNegativos += 2;
        } else if (var5dias > 3) {
            pontosPositivos += 1;
            pontos.push({ tipo: "positivo", texto: `Subiu ${var5dias.toFixed(1)}% em 5 dias — tendência de alta` });
        }
    }

    // 16. Dia negativo - bloqueio ADICIONAL E RIGOROSO para compra
    if (d.detalhes?.dia_negativo === true && d.sinal === "COMPRA") {
        const queda = d.detalhes?.queda_dia ? parseFloat(d.detalhes.queda_dia) : 0;
        
        // Bloqueio obrigatório para qualquer sinal negativo no dia
        bloqueadores.push(`🚫 Candle Vermelho (Preço < Abertura) — aguardar reversão intraday`);
        pontosNegativos += 5; // Penalidade pesada para garantir score baixo

        if (queda > 0.5) {
            bloqueadores.push(`🚫 Pressão vendedora forte (-${queda.toFixed(1)}%) — risco de queda livre`);
            pontosNegativos += 3;
        }
    }

    // 16.1 Preço abaixo do fechamento anterior (Gap de baixa ou queda)
    if (d.fechamentoAnterior && d.preco < d.fechamentoAnterior && d.sinal === "COMPRA") {
        const quedaAnt = ((d.fechamentoAnterior - d.preco) / d.fechamentoAnterior) * 100;
        if (quedaAnt > 0.3) {
            pontosNegativos += 2;
            pontos.push({ tipo: "negativo", texto: `Abaixo do fechamento anterior (-${quedaAnt.toFixed(1)}%)` });
        }
    }

    // 17. Confirmação de volume
    if (d.detalhes?.volume_confirmacao === "FRACO" && d.sinal === "COMPRA") {
        pontosNegativos += 2;
        pontos.push({ tipo: "negativo", texto: "Volume baixo — sinal sem confirmação" });
    }

    // Calcular score final
    const score = pontosPositivos - pontosNegativos;
    const totalPontos = pontosPositivos + pontosNegativos;

    // Determinar recomendação - THRESHOLDS MAIS RIGOROSOS
    let recomendacao = "AGUARDAR";
    let cor = "yellow";
    let icone = "⏳";
    let mensagem = "Aguardar melhores condições";

    // Se há bloqueadores, NÃO recomendar entrada
    if (bloqueadores.length >= 2) {
        recomendacao = "NÃO ENTRAR";
        cor = "red";
        icone = "🚫";
        mensagem = "Muitos fatores contrários - evite operar";
    } else if (bloqueadores.length >= 1 || score <= 0) {
        recomendacao = "AGUARDAR";
        cor = "yellow";
        icone = "⏳";
        mensagem = "Aguardar melhores condições";
    } else if (score >= 10 && d.confianca >= 70 && d.sinal !== "NEUTRO") {
        // Aumentei de 8 para 10 e de 60 para 70
        recomendacao = "ENTRAR";
        cor = "green";
        icone = "✅";
        mensagem = d.sinal === "COMPRA"
            ? "Boa oportunidade de compra detectada!"
            : "Boa oportunidade de venda detectada!";
    } else if (score >= 7 && d.confianca >= 65 && d.sinal !== "NEUTRO") {
        // Aumentei de 5 para 7 e adicionei requisito de confiança
        recomendacao = "ENTRAR COM CAUTELA";
        cor = "blue";
        icone = "⚡";
        mensagem = "Entrada possível mas com riscos";
    }

    return {
        recomendacao,
        cor,
        icone,
        mensagem,
        score,
        pontosPositivos,
        pontosNegativos,
        bloqueadores,
        pontos: pontos.slice(0, 6) // Mostrar no máximo 6 pontos
    };
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Home() {
    const [dados,          setDados]          = useState([]);
    const [macro,          setMacro]          = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [lastUpdate,     setLastUpdate]     = useState(null);
    const [listaRapida,    setListaRapida]    = useState([]);
    const [setores,        setSetores]        = useState([]);
    const [setorSelecionado, setSetorSelecionado] = useState("todos");
    const [busca,          setBusca]          = useState("");
    const [buscaAtiva,     setBuscaAtiva]     = useState(false);
    const [sugestoes,      setSugestoes]      = useState([]);
    const [ativoSelecionado, setAtivoSelecionado] = useState(null);
    const [filtroSinal,    setFiltroSinal]    = useState("todos"); // todos, compra, venda, neutro
    const [modoVisualizacao, setModoVisualizacao] = useState("lista"); // lista, cards
    const [abaAtual,       setAbaAtual]       = useState("lista"); // lista, oportunidades
    const [subAbaOportunidades, setSubAbaOportunidades] = useState("compra"); // compra, venda, aguardar
    const [proximaAtualizacao, setProximaAtualizacao] = useState(60);
    const [atualizando, setAtualizando] = useState(false);

    // Estado para oportunidades de compra
    const [oportunidades,  setOportunidades]  = useState([]);

    // Pagination state
    const [paginaAtual,    setPaginaAtual]    = useState(1);
    const [totalPaginas,   setTotalPaginas]   = useState(1);
    const [totalAtivos,    setTotalAtivos]    = useState(0);
    const [totalGeral,     setTotalGeral]     = useState(0);
    const limitePorPagina = 50;

    // ── Carregar lista rápida de todos os ativos ──────────────────────────────
    async function carregarListaRapida() {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            let url = `${API_URL}/analise-rapida?pagina=${paginaAtual}&limite=${limitePorPagina}`;
            if (setorSelecionado !== "todos") {
                url += `&setor=${setorSelecionado}`;
            }
            const res = await axios.get(url);
            setListaRapida(res.data.ativos ?? []);
            setMacro(res.data.macro ?? null);
            setTotalPaginas(res.data.totalPaginas ?? 1);
            setTotalAtivos(res.data.total ?? 0);
            setTotalGeral(res.data.totalGeral ?? 0);
            // Protege timestamp inválido
            const ts = res.data.timestamp ? new Date(res.data.timestamp) : new Date();
            setLastUpdate(ts);
        } catch (e) {
            console.error("Erro ao carregar lista rápida:", e);
        } finally {
            setLoading(false);
        }
    }

    // ── Handler de Busca com Sugestões ───────────────────────────────────────
    function handleBuscaChange(valor) {
        setBusca(valor);
        
        if (valor.trim().length >= 2) {
            // Buscar ativos que correspondem à busca
            const termos = valor.toUpperCase().trim();
            const correspondencias = listaRapida.filter(ativo => 
                ativo.ticker.toUpperCase().includes(termos)
            ).slice(0, 8); // Máximo 8 sugestões
            
            setSugestoes(correspondencias);
            setBuscaAtiva(true);
        } else {
            setSugestoes([]);
            setBuscaAtiva(false);
        }
    }

    function selecionarAtivo(ticker) {
        setBusca(ticker);
        setBuscaAtiva(false);
        setSugestoes([]);
        // Filtrar para mostrar apenas o ativo selecionado
        setListaRapida(listaRapida.filter(a => a.ticker === ticker));
    }

    function limparBusca() {
        setBusca("");
        setBuscaAtiva(false);
        setSugestoes([]);
        carregarListaRapida();
    }

    // ── Carregar setores disponíveis ──────────────────────────────────────────
    async function carregarSetores() {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            const res = await axios.get(`${API_URL}/ativos`);
            setSetores(res.data.setores ?? []);
        } catch (e) {
            console.error("Erro ao carregar setores:", e);
        }
    }

    // ── Keyboard shortcut (Ctrl+F para focar na busca) ───────────────────────
    useEffect(() => {
        function handleKeyDown(e) {
            // Ctrl+F ou Cmd+F (Mac)
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.querySelector('.busca-input');
                if (searchInput) {
                    searchInput.focus();
                }
            }
            // ESC para limpar busca
            if (e.key === 'Escape' && busca) {
                limparBusca();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [busca]);

    // ── Carregar oportunidades de compra ───────────────────────────────────────
    async function carregarOportunidades() {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            // Busca todos os 150 ativos (limite alto para garantir lista completa)
            const res = await axios.get(`${API_URL}/oportunidades-compra?limite=200`);
            setOportunidades(res.data.ativos ?? []);
        } catch (e) {
            console.error("Erro ao carregar oportunidades:", e);
        }
    }

    // ── Carregar análise detalhada (todos ou setor específico) ────────────────
    async function carregarAnalise(setor = null, ativo = null) {
        try {
            setLoading(true);
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
            let url = `${API_URL}/analise`;
            const params = [];
            if (setor && setor !== "todos") params.push(`setor=${setor}`);
            if (ativo) params.push(`ativo=${ativo}`);
            if (params.length > 0) url += "?" + params.join("&");

            const res = await axios.get(url);
            setDados(res.data.resultados ?? []);
            setMacro(res.data.macro ?? null);
            setLastUpdate(new Date());
        } catch (e) {
            console.error("Erro ao carregar análise:", e);
        } finally {
            setLoading(false);
        }
    }

    // ── Ver detalhes de um ativo específico ───────────────────────────────────
    function verDetalhes(ticker) {
        setAtivoSelecionado(ticker);
        carregarAnalise(null, ticker);
    }

    // ── Voltar para lista geral ───────────────────────────────────────────────
    function voltarLista() {
        setAtivoSelecionado(null);
        setDados([]);
        carregarListaRapida();
    }

    // ── Filtrar ativos na lista rápida ────────────────────────────────────────
    const ativosFiltrados = listaRapida.filter(ativo => {
        // Filtro de busca
        if (busca && !ativo.ticker.toUpperCase().includes(busca.toUpperCase())) {
            return false;
        }
        // Filtro de sinal
        if (filtroSinal !== "todos" && ativo.sinal.toLowerCase() !== filtroSinal.toLowerCase()) {
            return false;
        }
        return true;
    });

    // ── Stats gerais ──────────────────────────────────────────────────────────
    const totalCompra = listaRapida.filter(d => d.sinal === "COMPRA").length;
    const totalVenda  = listaRapida.filter(d => d.sinal === "VENDA").length;
    const totalNeutro = listaRapida.filter(d => d.sinal === "NEUTRO").length;

    // ── Load inicial ──────────────────────────────────────────────────────────
    useEffect(() => {
        carregarListaRapida();
        carregarSetores();
    }, [paginaAtual, setorSelecionado]);

    // Carregar oportunidades em background (não bloqueia a lista)
    useEffect(() => {
        carregarOportunidades();
    }, []);

    // ── Função para disparar atualização total ──
    async function refrescarTudo() {
        setAtualizando(true);
        await Promise.all([
            carregarListaRapida(),
            carregarOportunidades()
        ]);
        setAtualizando(false);
        setProximaAtualizacao(60);
    }

    // Gerenciador do Cronômetro de Atualização
    useEffect(() => {
        const timer = setInterval(() => {
            setProximaAtualizacao(prev => {
                if (prev <= 1) {
                    refrescarTudo();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [paginaAtual, setorSelecionado]);
    
    // ── Mudar setor ───────────────────────────────────────────────────────────
    function mudarSetor(setor) {
        setSetorSelecionado(setor);
        setPaginaAtual(1); // Reset para primeira página
    }
    
    // ── Mudar página ──────────────────────────────────────────────────────────
    function mudarPagina(novaPagina) {
        if (novaPagina >= 1 && novaPagina <= totalPaginas) {
            setPaginaAtual(novaPagina);
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    // ── Se tem ativo selecionado, mostra card detalhado ───────────────────────
    if (ativoSelecionado && dados.length > 0) {
        return (
            <>
                <head>
                    <title>TradeAI — {ativoSelecionado}</title>
                </head>
                <div className="container">
                    <header className="header">
                        <div className="header-left">
                            <button className="btn-voltar" onClick={voltarLista}>
                                ← Voltar
                            </button>
                            <div>
                                <div className="header-title">{ativoSelecionado.replace(".SA", "")}</div>
                                <div className="header-subtitle">Análise Detalhada</div>
                            </div>
                        </div>
                        <div className="status-badge">
                            <span className="status-dot" />
                            Ao Vivo
                        </div>
                    </header>

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner" />
                            <p className="loading-text">Carregando análise detalhada…</p>
                        </div>
                    ) : (
                        <div className="cards-grid">
                            {dados.map((d, i) => (
                                <AssetCard key={d.ticker} d={d} idx={i} />
                            ))}
                        </div>
                    )}
                </div>
            </>
        );
    }

    // ── Tela principal com lista de todos os ativos ───────────────────────────
    return (
        <>
            <head>
                <title>TradeAI — Painel de Análise B3</title>
                <meta name="description" content="Sistema inteligente de trade com ADX, Bollinger Bands, OBV, VIX e notícias PT-BR." />
            </head>

            <div className="container">
                {/* ── Header ── */}
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
                        <button 
                            className={`btn-refrescar ${atualizando ? 'spinning' : ''}`}
                            onClick={refrescarTudo}
                            disabled={atualizando}
                        >
                            {atualizando ? '⌛' : '🔄'} {atualizando ? 'Atualizando...' : 'Atualizar Agora'}
                        </button>
                        <div className="status-badge">
                            <span className={`status-dot ${atualizando ? 'active' : ''}`} />
                            {atualizando ? 'Buscando...' : `Próxima att em ${proximaAtualizacao}s`}
                        </div>
                    </div>
                </header>

                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner" />
                        <p className="loading-text">Buscando dados do mercado…</p>
                        <p className="loading-sub">Analisando {listaRapida.length || "..."} ativos</p>
                    </div>
                ) : (
                    <>
                        {/* ── Painel Macro ── */}
                        <MacroPanel macro={macro} />

                        {/* ── Stats Gerais ── */}
                        <div className="stats-row stats-4-cols">
                            <div 
                                className={`stat-card clickable ${abaAtual === "lista" ? "active" : ""}`}
                                onClick={() => { setAbaAtual("lista"); setFiltroSinal("todos"); }}
                            >
                                <div className="stat-icon blue">🔍</div>
                                <div>
                                    <div className="stat-label">Total Geral</div>
                                    <div className="stat-value blue">{totalGeral || oportunidades.length || 0}</div>
                                </div>
                            </div>
                            <div 
                                className={`stat-card stat-green clickable ${(abaAtual === "oportunidades" && subAbaOportunidades === "compra") ? "active" : ""}`}
                                onClick={() => { setAbaAtual("oportunidades"); setSubAbaOportunidades("compra"); }}
                            >
                                <div className="stat-icon green">▲</div>
                                <div>
                                    <div className="stat-label">Oportunidades Compra</div>
                                    <div className="stat-value green">
                                        {oportunidades.length > 0 
                                            ? oportunidades.filter(d => d.sinal === "COMPRA" && (d.confianca >= 60 || d.score >= 7)).length 
                                            : <span className="loading-dots">Analisando...</span>}
                                    </div>
                                </div>
                            </div>
                            <div 
                                className={`stat-card stat-red clickable ${(abaAtual === "oportunidades" && subAbaOportunidades === "venda") ? "active" : ""}`}
                                onClick={() => { setAbaAtual("oportunidades"); setSubAbaOportunidades("venda"); }}
                            >
                                <div className="stat-icon red">▼</div>
                                <div>
                                    <div className="stat-label">Oportunidades Venda</div>
                                    <div className="stat-value red">
                                        {oportunidades.length > 0 
                                            ? oportunidades.filter(d => d.sinal === "VENDA" && (d.confianca >= 60 || d.sellScore >= 7)).length 
                                            : <span className="loading-dots">Analisando...</span>}
                                    </div>
                                </div>
                            </div>
                            <div 
                                className={`stat-card clickable ${(abaAtual === "oportunidades" && subAbaOportunidades === "aguardar") ? "active" : ""}`}
                                onClick={() => { setAbaAtual("oportunidades"); setSubAbaOportunidades("aguardar"); }}
                            >
                                <div className="stat-icon" style={{ background: "rgba(148,163,184,.1)" }}>◆</div>
                                <div>
                                    <div className="stat-label">Aguardando</div>
                                    <div className="stat-value" style={{ color: "var(--text-secondary)" }}>
                                        {oportunidades.length > 0 
                                            ? oportunidades.filter(d => d.sinal === "NEUTRO" || d.confianca < 60).length 
                                            : <span className="loading-dots">Analisando...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Filtros e Busca ── */}
                        <div className="filtros-bar">
                            <div className="busca-box">
                                <span className="busca-icon">🔍</span>
                                <input
                                    type="text"
                                    className="busca-input"
                                    placeholder="Buscar ativo (ex: PETR4, VALE3)..."
                                    value={busca}
                                    onChange={e => handleBuscaChange(e.target.value)}
                                    onFocus={() => busca.trim().length >= 2 && setBuscaAtiva(true)}
                                    onBlur={() => setTimeout(() => setBuscaAtiva(false), 200)}
                                />
                                <span className="busca-shortcut">Ctrl+F</span>
                                {busca && (
                                    <button className="busca-clear" onClick={limparBusca}>✕</button>
                                )}
                                
                                {/* Dropdown de Sugestões */}
                                {buscaAtiva && sugestoes.length > 0 && (
                                    <div className="busca-sugestoes">
                                        {sugestoes.map((ativo) => (
                                            <button
                                                key={ativo.ticker}
                                                className="sugestao-item"
                                                onMouseDown={() => selecionarAtivo(ativo.ticker)}
                                            >
                                                <span className="sugestao-ticker">{ativo.ticker.replace('.SA', '')}</span>
                                                <span className="sugestao-info">
                                                    <span className={`sugestao-sinal ${ativo.sinal.toLowerCase()}`}>
                                                        {ativo.sinal === 'COMPRA' ? '▲' : ativo.sinal === 'VENDA' ? '▼' : '◆'} {ativo.sinal}
                                                    </span>
                                                    <span className="sugestao-preco">R$ {ativo.preco?.toFixed(2)}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="setor-selector">
                                <span className="setor-icon">📂</span>
                                <select
                                    className="setor-select"
                                    value={setorSelecionado}
                                    onChange={e => mudarSetor(e.target.value)}
                                >
                                    <option value="todos">Todos os Setores ({totalAtivos})</option>
                                    {setores.map(setor => (
                                        <option key={setor} value={setor}>
                                            {setor.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ── Abas de Navegação ── */}
                        <div className="abas-container">
                            <button
                                className={`aba-btn ${abaAtual === "lista" ? "active" : ""}`}
                                onClick={() => setAbaAtual("lista")}
                            >
                                📋 Lista de Ativos
                            </button>
                            <button
                                className={`aba-btn green ${abaAtual === "oportunidades" ? "active" : ""}`}
                                onClick={() => setAbaAtual("oportunidades")}
                            >
                                🎯 Guia de Oportunidades ({oportunidades.filter(o => o.probabilidade >= 50).length})
                            </button>
                        </div>

                        {/* ═══════════════════════════════════════════════════════════════
                            ABA: GUIA DE OPORTUNIDADES
                            ═══════════════════════════════════════════════════════════════ */}
                        {abaAtual === "oportunidades" && (
                            <div className="oportunidades-section">
                                {/* Header Profissional */}
                                <div className="oport-section-header">
                                    <div className="oport-header-top">
                                        <div>
                                            <h2 className="oport-section-title">
                                                <span className="title-icon">🎯</span>
                                                Guia de Oportunidades ({totalGeral} ativos)
                                            </h2>
                                            <p className="oport-section-subtitle">
                                                Ranking inteligente baseado em análise técnica multicamada
                                            </p>
                                        </div>
                                        
                                        <div className="sub-abas-oport">
                                            <button 
                                                className={`sub-aba-btn compra ${subAbaOportunidades === "compra" ? "active" : ""}`}
                                                onClick={() => setSubAbaOportunidades("compra")}
                                            >
                                                📈 Melhores Compras ({oportunidades.filter(o => o.sinal === "COMPRA" && o.confianca >= 60).length})
                                            </button>
                                            <button 
                                                className={`sub-aba-btn venda ${subAbaOportunidades === "venda" ? "active" : ""}`}
                                                onClick={() => setSubAbaOportunidades("venda")}
                                            >
                                                📉 Melhores Vendas ({oportunidades.filter(o => o.sinal === "VENDA" && o.confianca >= 60).length})
                                            </button>
                                            <button 
                                                className={`sub-aba-btn neutro ${subAbaOportunidades === "aguardar" ? "active" : ""}`}
                                                onClick={() => setSubAbaOportunidades("aguardar")}
                                            >
                                                ◆ Aguardando ({oportunidades.filter(o => o.sinal === "NEUTRO" || o.confianca < 60).length})
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabela Profissional */}
                                <div className="oport-table-container">
                                    <table className="oport-table">
                                        <thead>
                                            <tr>
                                                <th className="th-rank">#</th>
                                                <th className="th-ticker">Ativo</th>
                                                <th className="th-preco">Preço</th>
                                                <th className="th-prob">Probabilidade</th>
                                                <th className="th-rec">Recomendação</th>
                                                <th className="th-score">Score</th>
                                                <th className="th-rsi">RSI</th>
                                                <th className="th-adx">ADX</th>
                                                <th className="th-conf">Confiança</th>
                                                <th className="th-tendencia">Tendência</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {oportunidades
                                                .filter(o => {
                                                    if (subAbaOportunidades === "compra") return o.sinal === "COMPRA" && o.confianca >= 60;
                                                    if (subAbaOportunidades === "venda") return o.sinal === "VENDA" && o.confianca >= 60;
                                                    return o.sinal === "NEUTRO" || o.confianca < 60;
                                                })
                                                .sort((a, b) => {
                                                    if (subAbaOportunidades === "compra") return b.score - a.score;
                                                    if (subAbaOportunidades === "venda") return b.sellScore - a.sellScore;
                                                    return b.confianca - a.confianca;
                                                })
                                                .map((ativo, idx) => {
                                                    const prob = (subAbaOportunidades === "compra" ? ativo.probabilidade : ativo.probabilidadeVenda) ?? 0;
                                                    const rec = (subAbaOportunidades === "compra" ? ativo.recomendacao : ativo.recomendacaoVenda) ?? "NEUTRO";
                                                    const score = (subAbaOportunidades === "compra" ? ativo.score : ativo.sellScore) ?? 0;
                                                    
                                                    const probClass = subAbaOportunidades === "compra" 
                                                        ? (prob >= 70 ? 'forte-compra' : prob >= 50 ? 'compra' : 'neutro')
                                                        : (prob >= 70 ? 'forte-venda' : prob >= 50 ? 'venda' : 'neutro');
                                                    
                                                    return (
                                                        <tr 
                                                            key={ativo.ticker} 
                                                            className={`oport-row ${probClass}`}
                                                            onClick={() => verDetalhes(ativo.ticker)}
                                                        >
                                                            <td className="td-rank">
                                                                <span className="rank-badge">{idx + 1}</span>
                                                            </td>
                                                            <td className="td-ticker">
                                                                <span className="ticker-symbol">{ativo.ticker.replace(".SA", "")}</span>
                                                            </td>
                                                            <td className="td-preco">
                                                                <span className="price-value">R$ {fmt(ativo.preco)}</span>
                                                            </td>
                                                            <td className="td-prob">
                                                                <div className="prob-cell">
                                                                    <div className="prob-value-text">{prob}%</div>
                                                                    <div className="prob-bar-bg">
                                                                        <div 
                                                                            className={`prob-bar-fill ${probClass}`}
                                                                            style={{ width: `${prob}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="td-rec">
                                                                <span className={`rec-badge ${probClass}`}>
                                                                    {rec}
                                                                </span>
                                                            </td>
                                                            <td className="td-score">
                                                                <span className={`score-value ${score >= 5 ? 'positive' : score <= 0 ? 'negative' : 'neutral'}`}>
                                                                    {score >= 0 ? '+' : ''}{score}
                                                                </span>
                                                            </td>
                                                            <td className="td-rsi">
                                                                <span className={`rsi-value ${ativo.rsi < 30 ? 'oversold' : ativo.rsi > 70 ? 'overbought' : 'neutral'}`}>
                                                                    {fmt(ativo.rsi)}
                                                                </span>
                                                            </td>
                                                            <td className="td-adx">
                                                                <span className={`adx-value ${ativo.adx >= 25 ? 'strong' : ativo.adx >= 20 ? 'moderate' : 'weak'}`}>
                                                                    {fmt(ativo.adx, 1)}
                                                                </span>
                                                            </td>
                                                            <td className="td-conf">
                                                                <span className="conf-value">{ativo.confianca}%</span>
                                                            </td>
                                                            <td className="td-tendencia">
                                                                <span className={`tendencia-badge ${ativo.tendencia?.toLowerCase()}`}>
                                                                    {ativo.tendencia === 'ALTA' ? '▲ Alta' : 
                                                                     ativo.tendencia === 'BAIXA' ? '▼ Baixa' : '◆ Neutro'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════════════
                            ABA: LISTA DE ATIVOS
                            ═══════════════════════════════════════════════════════════════ */}
                        {abaAtual === "lista" && (
                        <>

                        {/* ── Contador de resultados ── */}
                        <div className="resultados-info">
                            Mostrando <strong>{ativosFiltrados.length}</strong> de {listaRapida.length} ativos
                        </div>

                        {/* ── Tabela de Ativos ── */}
                        <div className="tabela-container">
                            <table className="tabela-ativos">
                                <thead>
                                    <tr>
                                        <th className="col-ticker">Ativo</th>
                                        <th className="col-preco">Preço</th>
                                        <th className="col-sinal">Sinal</th>
                                        <th className="col-confianca">Confiança</th>
                                        <th className="col-rsi">RSI</th>
                                        <th className="col-adx">ADX</th>
                                        <th className="col-tendencia">Tendência</th>
                                        <th className="col-acao">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ativosFiltrados.map((ativo, idx) => (
                                        <tr
                                            key={ativo.ticker}
                                            className={`table-row ${ativo.sinal.toLowerCase()} ${idx % 2 === 0 ? "par" : "impar"}`}
                                            onClick={() => verDetalhes(ativo.ticker)}
                                            style={{ cursor: "pointer" }}
                                        >
                                            <td className="col-ticker">
                                                <span className="ticker-badge">{ativo.ticker.replace(".SA", "")}</span>
                                            </td>
                                            <td className="col-preco">
                                                R$ {fmt(ativo.preco)}
                                            </td>
                                            <td className="col-sinal">
                                                <span className={`sinal-badge ${ativo.sinal.toLowerCase()}`}>
                                                    {SIGNAL_ICON[ativo.sinal]} {ativo.sinal}
                                                </span>
                                            </td>
                                            <td className="col-confianca">
                                                <div className="confianca-mini">
                                                    <span className={`confianca-mini-num ${confiancaColor(ativo.confianca)}`}>
                                                        {ativo.confianca}%
                                                    </span>
                                                    <div className="confianca-mini-bar">
                                                        <div
                                                            className={`confianca-mini-fill ${confiancaColor(ativo.confianca)}`}
                                                            style={{ width: `${ativo.confianca}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="col-rsi">
                                                <span className={ativo.rsi < 30 ? "green" : ativo.rsi > 70 ? "red" : ""}>
                                                    {fmt(ativo.rsi)}
                                                </span>
                                            </td>
                                            <td className="col-adx">
                                                <span className={ativo.adx >= 25 ? "green" : ativo.adx < 20 ? "red" : "yellow"}>
                                                    {fmt(ativo.adx, 1)}
                                                </span>
                                            </td>
                                            <td className="col-tendencia">
                                                <span className={`tendencia-badge ${ativo.tendencia.toLowerCase()}`}>
                                                    {ativo.tendencia}
                                                </span>
                                            </td>
                                            <td className="col-acao">
                                                <button
                                                    className="btn-detalhes"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        verDetalhes(ativo.ticker);
                                                    }}
                                                >
                                                    Ver →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {ativosFiltrados.length === 0 && (
                                <div className="no-results">
                                    <div className="no-results-icon">🔍</div>
                                    <div className="no-results-text">
                                        Nenhum ativo encontrado com os filtros selecionados
                                    </div>
                                    <button className="btn-limpar" onClick={() => {
                                        setBusca("");
                                        setFiltroSinal("todos");
                                    }}>
                                        Limpar filtros
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Paginação ── */}
                        {totalPaginas > 1 && (
                            <div className="paginacao-container">
                                <div className="paginacao-info">
                                    Mostrando página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong> · 
                                    Total: <strong>{totalAtivos}</strong> ativos
                                </div>
                                <div className="paginacao-botoes">
                                    <button
                                        className="pag-btn"
                                        onClick={() => mudarPagina(1)}
                                        disabled={paginaAtual === 1}
                                    >
                                        ⏮ Primeira
                                    </button>
                                    <button
                                        className="pag-btn"
                                        onClick={() => mudarPagina(paginaAtual - 1)}
                                        disabled={paginaAtual === 1}
                                    >
                                        ← Anterior
                                    </button>
                                    
                                    {/* Páginas ao redor da página atual */}
                                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                                        let pageNum;
                                        if (totalPaginas <= 5) {
                                            pageNum = i + 1;
                                        } else if (paginaAtual <= 3) {
                                            pageNum = i + 1;
                                        } else if (paginaAtual >= totalPaginas - 2) {
                                            pageNum = totalPaginas - 4 + i;
                                        } else {
                                            pageNum = paginaAtual - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                className={`pag-btn-num ${paginaAtual === pageNum ? "active" : ""}`}
                                                onClick={() => mudarPagina(pageNum)}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    
                                    <button
                                        className="pag-btn"
                                        onClick={() => mudarPagina(paginaAtual + 1)}
                                        disabled={paginaAtual === totalPaginas}
                                    >
                                        Próxima →
                                    </button>
                                    <button
                                        className="pag-btn"
                                        onClick={() => mudarPagina(totalPaginas)}
                                        disabled={paginaAtual === totalPaginas}
                                    >
                                        Última ⏭
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Rodapé ── */}
                        </>
                        )}
                        {lastUpdate && (
                            <div className="last-update">
                                <span>🕐</span>
                                Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")} ·
                                Cotações: Yahoo Finance · Notícias: Google News PT-BR
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
}