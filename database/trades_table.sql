-- Tabela para histórico de sinais de trade (especialmente Longo Prazo)
create table trades (
  id uuid default uuid_generate_v4() primary key,
  ativo text not null,
  sinal text not null,
  preco numeric not null,
  sma50 numeric,
  sma200 numeric,
  detalhes jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

-- Ativar extensões necessárias se não estiverem ativas
create extension if not exists "uuid-ossp";

-- Criar índice para performance
create index idx_trades_ativo on trades(ativo);
create index idx_trades_created_at on trades(created_at);
