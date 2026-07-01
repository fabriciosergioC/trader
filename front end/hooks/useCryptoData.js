import { useEffect } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function useCryptoData(options = {}) {
  const queryClient = useQueryClient();
  const { page = 1, limit = 10, ticker = null, busca = '' } = options;

  // 1. Fetch de Análise Rápida (Paginada) para Crypto
  const quickAnalysis = useQuery({
    queryKey: ['crypto_quick_analysis', page, busca],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/crypto/analise-rapida?pagina=${page}&limite=${limit}&busca=${busca}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
    enabled: !ticker,
  });

  // 2. Fetch de Oportunidades para Crypto
  const opportunities = useQuery({
    queryKey: ['crypto_opportunities'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/crypto/oportunidades?limite=10`);
      return res.data;
    },
    enabled: !ticker,
  });

  // 3. Fetch de Ativo Único para Crypto
  const detailedAnalysis = useQuery({
    queryKey: ['crypto_detailed_analysis', ticker],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/api/crypto/analise?ativo=${ticker}`);
      return res.data;
    },
    enabled: !!ticker,
  });

  // 4. WebSocket Listener para atualizações de cripto
  useEffect(() => {
    const socket = io(API_URL);

    socket.on('market_update', (event) => {
      const { type, data } = event;
      console.log(`[WS Crypto] Received: ${type}`, data);

      if (type === 'crypto_quick_analysis') {
        queryClient.invalidateQueries({ queryKey: ['crypto_quick_analysis'] });
      }

      if (type === 'crypto_opportunities') {
        queryClient.setQueryData(['crypto_opportunities'], data);
      }

      if (type === 'crypto_detailed_analysis') {
        data.resultados.forEach(res => {
          queryClient.setQueryData(['crypto_detailed_analysis', res.ticker], (old) => {
             if (!old) return { resultados: [res] };
             return { ...old, resultados: [res] };
          });
        });
      }
    });

    return () => socket.disconnect();
  }, [queryClient]);

  return {
    quickAnalysis,
    opportunities,
    detailedAnalysis,
    refetchAll: () => {
        queryClient.invalidateQueries({ queryKey: ['crypto_quick_analysis'] });
        queryClient.invalidateQueries({ queryKey: ['crypto_opportunities'] });
        if (ticker) {
            queryClient.invalidateQueries({ queryKey: ['crypto_detailed_analysis', ticker] });
        }
    }
  };
}
