import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Busca e Filtros ────────────────────────────────────────────────────────
  busca: '',
  setBusca: (busca) => set({ busca, paginaAtual: 1 }),
  
  setorSelecionado: 'todos',
  setSetorSelecionado: (setorSelecionado) => set({ setorSelecionado, paginaAtual: 1 }),
  
  filtroSinal: 'todos',
  setFiltroSinal: (filtroSinal) => set({ filtroSinal }),

  // ── UI State ───────────────────────────────────────────────────────────────
  paginaAtual: 1,
  setPaginaAtual: (paginaAtual) => set({ paginaAtual }),
  
  ativoSelecionado: null,
  setAtivoSelecionado: (ativoSelecionado) => set({ ativoSelecionado }),
  
  abaAtual: 'lista',
  setAbaAtual: (abaAtual) => set({ abaAtual }),
  
  subAbaOportunidades: 'compra',
  setSubAbaOportunidades: (subAbaOportunidades) => set({ subAbaOportunidades }),
  
  modoVisualizacao: 'lista',
  setModoVisualizacao: (modoVisualizacao) => set({ modoVisualizacao }),

  // Comparação de Ativos
  comparisonList: [], // tickers
  toggleComparison: (ticker) => set((state) => {
    const isSelected = state.comparisonList.includes(ticker);
    if (isSelected) {
      return { comparisonList: state.comparisonList.filter(t => t !== ticker) };
    }
    if (state.comparisonList.length >= 4) return state; // Limite de 4
    return { comparisonList: [...state.comparisonList, ticker] };
  }),
  clearComparison: () => set({ comparisonList: [] }),

  // ── Helpers de Filtragem ──────────────────────────────────────────────────
  getFilteredAtivos: (ativos) => {
    if (!ativos) return [];
    const { busca, setorSelecionado, filtroSinal } = get();
    
    return ativos.filter(ativo => {
      // 1. Filtro de Busca (Ticker ou Nome)
      if (busca) {
        const query = busca.toLowerCase().replace('engie', 'egie');
        const matchesBusca = ativo.ticker.toLowerCase().includes(query) || 
                           (ativo.nome || '').toLowerCase().includes(query);
        if (!matchesBusca) return false;
      }

      // 2. Filtro de Setor
      if (setorSelecionado !== 'todos') {
        const matchesSetor = ativo.detalhes?.setor === setorSelecionado || 
                            ativo.fundamentais?.sector === setorSelecionado;
        if (!matchesSetor) return false;
      }

      // 3. Filtro de Sinal
      if (filtroSinal !== 'todos' && ativo.sinal !== filtroSinal) return false;

      return true;
    });
  }
}))
