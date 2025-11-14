## Objetivos
- Endurecer segurança (segredos, autenticação, uploads) e estabilizar build/testes
- Otimizar importação massiva e geração de PDFs (memória, throughput)
- Entregar requisitos funcionais (gráficos exportáveis, variáveis no editor, versionamento de layouts)
- Implementar observabilidade, backups e plano de escalabilidade

## Prioridades (P0 críticas)
1. Autenticação: exigir `JWT_SECRET/REFRESH`, desabilitar `test-token` fora de testes, revisão de rate limits
2. Uploads: trocar `memoryStorage` por `diskStorage` com MIME/limites, remoção de temporários
3. Importação: CSV por streaming e XLS/XLSX por chunks; validação por linha e progresso
4. Geração de PDF: compatibilidade de tipos do Puppeteer, preparar base para pool e fila
5. Build/Tipos: corrigir erros TypeScript estritos (Bull/Redis/Prisma/TemplateEngine/ValidationUtils)

## Fase 1 — Correções Críticas e Build
- Corrigir tipos Bull/Redis: ajustar criação de filas para assinatura válida, tratar `unknown` em catch e campos opcionais (`error?: string`)
- Prisma: remover usos de modelos inexistentes (`jobLog`) ou criar modelo; corrigir filtros com `mode: 'insensitive'` conforme versão (usar `LOWER()` com raw quando necessário)
- Puppeteer: usar `headless: true` e APIs compatíveis; substituir `waitForTimeout` por `page.waitForTimeout` se disponível, senão remover
- ValidationService/Utils: importar `AppError` corretamente, ajustar tipos de retornos com `exactOptionalPropertyTypes`
- Editor/Frontend: garantir `data-element-id` nos elementos para export por gráfico
- Ajustar scripts e tsconfig sem relaxar `strict` (manter qualidade)

## Fase 2 — Importação e Persistência Massiva
- CSV: pipeline com `csv-parse` + streaming, chunking e validação incremental; atualizar progresso em Redis
- XLS/XLSX: leitura em faixas (`range`) e mapeamento de colunas; chunking com pausas curtas
- Banco: implementar caminho de alta performance via `COPY FROM STDIN` com tabela de staging e reconciliação (deduplicação por chaves)
- Índices: criar índices em `sensorData(sensorId,timestamp)`, `clients(cnpj)`, `reports(createdAt,status)`, etc.

## Fase 3 — PDFs, Cache e Fila
- Pool Puppeteer: instanciar browser único, reuso de páginas, throttling por fila (BullMQ) e pré-aquecimento
- Cache Redis: substituir `Map` por Redis (TTL/LRU) para templates compilados/HTML; métricas de hit/miss
- Export de gráficos: rota ou captura client-side para `PNG/JPG/SVG`; unificar no editor e módulo de validações

## Fase 4 — Editor de Layout Dinâmico
- Sistema de variáveis: painel de variáveis, binding reativo, validação e preview imediato (frontend), compatível com Handlebars no backend
- Versionamento de layouts: modelo `TemplateVersion` (Prisma), endpoints de commit/listagem/diff/rollback e UI de histórico
- Templates reutilizáveis: CRUD de templates com clonagem e tags

## Fase 5 — Banco de Dados, Backups e Recuperação
- Docker Compose/Infra: parametrizar credenciais via `.env`/secrets, healthchecks e volumes
- Backups: jobs diários `pg_dump`, retenção e verificação de integridade; rotina de restore documentada e testada
- Migrações: revisão e criação de migrações para novos modelos/índices

## Fase 6 — Gestão de Usuários e Cadastros
- RBAC: papéis/permissões por recurso; payload JWT com escopos
- Auditoria: trilha por entidade (clientes, sensores, maletas, relatórios) com quem/quando/antes/depois
- UI: formulários completos de cliente com histórico e associação de sensores/maletas

## Fase 7 — Relatórios
- Produção de PDFs: layouts personalizados, combinação automática de dados importados com templates
- Assinatura digital: pipeline de assinatura (PKCS#7/CAdES), armazenamento seguro de certificados e integração com TSA
- Compartilhamento: armazenamento externo (S3/MinIO), URLs assinadas, expiração e auditoria

## Fase 8 — Testes e Observabilidade
- Testes: aumentar cobertura unitária/integrada; corrigir testes quebrados (clientes/Prisma), metas de cobertura por pasta
- Métricas: `prom-client` com latência, throughput, filas, cache; endpoint `/metrics`; dashboards
- Logs: níveis por ambiente, logs estruturados, correlação por `X-Request-ID`

## Fase 9 — Escalabilidade
- Fila para tarefas pesadas (import/PDF), workers dedicados; HPA/auto-scale (quando aplicável)
- Separação de serviços (API, worker, render), CDN para assets, cache distribuído

## Modelagem e Migrações
- `TemplateVersion`, `JobLog` (se mantido), índices mencionados, ajustes de relações
- Revisão de tipos e DTOs para compatibilidade com `exactOptionalPropertyTypes`

## Entregáveis e Métricas
- Build sem erros e testes passando (mínimo 70% cobertura crítica)
- Importação: tempo/uso de memória reduzidos; throughput medido
- PDFs: tempo médio por página, fila estável, taxa de erro < 1%
- Editor: variáveis e versionamento operacionais com rollback
- Segurança: segredos gerenciados, uploads seguros, RBAC aplicado

## Riscos e Mitigações
- Dependências de libs (Puppeteer/Prisma/Bull): fixar versões e smoke tests
- Migrações de BD: backups antes, rollback scripts
- Performance em grande volume: feature flags e limites de concorrência

Confirma este plano para iniciar a implementação por fases (começando pelas correções críticas e build/types), com entrega incremental e validação por testes e métricas?