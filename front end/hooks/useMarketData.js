import { useEffect } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import axios from 'axios'
import io from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

export function useMarketData(options = {}) {
  const queryClient = useQueryClient()
  const { sector = 'todos', page = 1, limit = 50, ticker = null, busca = '' } = options

  // 1. Fetch de Análise Rápida (Paginada)
  const quickAnalysis = useQuery({
    queryKey: ['quick_analysis', sector, page, busca],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/analise-rapida?setor=${sector}&pagina=${page}&limite=${limit}&busca=${busca}`)
      return res.data;
    },
    placeholderData: keepPreviousData,
    enabled: !ticker,
  })

  // 2. Fetch de Oportunidades
  const opportunities = useQuery({
    queryKey: ['opportunities'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/oportunidades-compra?limite=200`)
      return res.data;
    },
    enabled: !ticker,
  })

  // 3. Fetch de Ativo Único
  const detailedAnalysis = useQuery({
    queryKey: ['detailed_analysis', ticker],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/analise?ativo=${ticker}`)
      return res.data;
    },
    enabled: !!ticker,
  })

  // 4. Fetch de Setores
  const sectors = useQuery({
    queryKey: ['sectors'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/ativos`)
      return res.data.setores ?? []
    },
    staleTime: Infinity, // Setores mudam raramente
  })

  // 5. WebSocket Listener
  useEffect(() => {
    const socket = io(API_URL)

    socket.on('market_update', (event) => {
      const { type, data } = event
      console.log(`[WS] Received: ${type}`, data)

      if (type === 'quick_analysis') {
        // Atualiza cache de análise rápida
        queryClient.setQueryData(['quick_analysis', sector, page], (oldData) => {
          if (!oldData) return data
          // Se for uma atualização global, precisamos filtrar se o usuário estiver em um setor
          if (sector !== 'todos') {
             // Lógica simplificada: invalidamos a query para garantir consistência
             queryClient.invalidateQueries({ queryKey: ['quick_analysis'] })
             return oldData
          }
          return { ...oldData, ...data }
        })
      }

      if (type === 'opportunities') {
        queryClient.setQueryData(['opportunities'], data)
      }

      if (type === 'detailed_analysis') {
        // Se o ativo que recebemos é o que está sendo visualizado, atualizamos
        data.resultados.forEach(res => {
          queryClient.setQueryData(['detailed_analysis', res.ticker], (old) => {
             if (!old) return { resultados: [res] }
             return { ...old, resultados: [res] }
          })
        })
      }
    })

    return () => socket.disconnect()
  }, [queryClient, sector, page])

  return {
    quickAnalysis,
    opportunities,
    detailedAnalysis,
    sectors,
    refetchAll: () => {
        queryClient.invalidateQueries()
    }
  }
}
