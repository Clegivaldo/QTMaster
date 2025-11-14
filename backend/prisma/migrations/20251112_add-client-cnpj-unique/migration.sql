-- Migration: add unique constraint on clients.cnpj
-- Automatically created by agent to enforce unique CNPJ

ALTER TABLE public.clients
ADD CONSTRAINT clients_cnpj_unique UNIQUE (cnpj);
