# Sistema de Assinatura Digital e Compartilhamento Seguro

## 📋 Visão Geral

Sistema completo para assinatura digital de relatórios PDF e compartilhamento seguro com controle de acesso multicamadas.

## 🏗️ Arquitetura

### Backend

#### Modelos Prisma
```prisma
model Report {
  // Campos de assinatura
  digitalSignature  String?
  signedAt         DateTime?
  signedBy         String?
  certificateInfo  Json?
  
  // Relação com compartilhamentos
  sharedLinks      ReportSharedLink[]
}

model ReportSharedLink {
  id          String    @id @default(cuid())
  reportId    String
  token       String    @unique
  expiresAt   DateTime
  maxAccess   Int?
  accessCount Int       @default(0)
  password    String?
  allowedIPs  String[]
  createdBy   String
  isActive    Boolean   @default(true)
  
  report      Report    @relation(...)
  accesses    SharedLinkAccess[]
}

model SharedLinkAccess {
  id        String   @id @default(cuid())
  linkId    String
  ip        String
  userAgent String?
  timestamp DateTime @default(now())
  success   Boolean
  
  link      ReportSharedLink @relation(...)
}
```

#### Serviços

**DigitalSignatureService** (`backend/src/services/digitalSignatureService.ts`)
- `signReport(reportId, userId, pdfBuffer, options?)` - Assina PDF
  - Suporta RSA-SHA256/512 (com certificado)
  - Fallback HMAC-SHA256/512 (sem certificado)
  - Salva PDF assinado em `backend/signatures/`
  - Atualiza modelo Report com metadados
  
- `verifySignature(reportId)` - Verifica integridade
  - Recomputa hash do PDF
  - Compara com assinatura armazenada
  - Retorna status de validação
  
- `removeSignature(reportId, userId)` - Revoga assinatura
  - Apenas quem assinou pode remover
  - Limpa campos de assinatura
  
- `getSignatureInfo(reportId)` - Obtém detalhes
  - Retorna certificateInfo, signedBy, signedAt

**ReportSharingService** (`backend/src/services/reportSharingService.ts`)
- `createSharedLink(options)` - Cria link temporário
  - Token criptográfico 32-byte (base64url)
  - Senha opcional (bcrypt hash)
  - IPs permitidos (whitelist)
  - Limite de acessos
  - Expiração configurável (padrão 24h)
  
- `accessSharedLink(options)` - Acessa relatório
  - Validações multicamadas:
    1. Token existe e está ativo
    2. Não expirou
    3. Não atingiu limite de acessos
    4. IP está na whitelist (se configurado)
    5. Senha correta (se protegido)
  - Registra acesso na auditoria
  - Incrementa contador
  - Retorna PDF path
  
- `listSharedLinks(reportId)` - Lista todos os links
  
- `revokeSharedLink(linkId, userId)` - Desativa link
  - Apenas criador pode revogar
  
- `getLinkStatistics(linkId)` - Estatísticas
  - Total de acessos, sucessos, falhas
  - Acessos por IP
  - Histórico recente (últimos 10)
  
- `cleanupExpiredLinks()` - Job de manutenção
  - Desativa links expirados

#### Rotas REST (`backend/src/routes/reportSecurity.ts`)

**Assinatura Digital:**
```
POST   /api/reports/:id/sign              # Assinar (autenticado)
GET    /api/reports/:id/signature/verify  # Verificar (público)
GET    /api/reports/:id/signature         # Info (autenticado)
DELETE /api/reports/:id/signature         # Remover (autenticado)
```

**Compartilhamento:**
```
POST   /api/reports/:id/share           # Criar link (autenticado)
GET    /api/reports/:id/share           # Listar links (autenticado)
DELETE /api/reports/share/:linkId       # Revogar (autenticado)
GET    /api/reports/share/:linkId/stats # Estatísticas (autenticado)
POST   /api/reports/shared/:token       # Acessar via token (público)
```

### Frontend

#### Hooks (`frontend/src/hooks/useReportSecurity.ts`)

**useSignature(reportId)**
```typescript
const {
  signatureInfo,        // Informações da assinatura
  loading,              // Estado de carregamento
  error,                // Mensagem de erro
  fetchSignatureInfo,   // Buscar info
  signReport,           // Assinar (options?)
  verifySignature,      // Verificar
  removeSignature       // Remover
} = useSignature(reportId);
```

**useSharing(reportId)**
```typescript
const {
  sharedLinks,          // Lista de links
  loading,
  error,
  fetchSharedLinks,     // Buscar links
  createSharedLink,     // Criar (options?)
  revokeSharedLink,     // Revogar (linkId)
  getLinkStatistics,    // Stats (linkId)
  copyLinkToClipboard   // Copiar (token)
} = useSharing(reportId);
```

#### Componentes

**SignaturePanel** (`frontend/src/components/ReportSignature/SignaturePanel.tsx`)
- Badge de status (assinado/não assinado)
- Formulário de assinatura com opções:
  - Motivo
  - Localização
  - Informação de contato
- Botão "Verificar Assinatura" com resultado visual
- Exibição de certificado (JSON expandido)
- Botão remover com confirmação
- Loading states e error handling

**SharingPanel** (`frontend/src/components/ReportSharing/SharingPanel.tsx`)
- Botão "Criar Link"
- Formulário de criação:
  - Expiração (horas)
  - Máximo de acessos
  - Senha
  - IPs permitidos
- Lista de links compartilhados:
  - Badges de status (ativo/expirado/revogado)
  - Indicador de proteção por senha
  - Contador de acessos
  - Botão copiar (com feedback visual)
  - Botão revogar
  - Botão estatísticas
- Modal de estatísticas:
  - Total, sucessos, falhas
  - Acessos por IP
  - Histórico recente

**SharedReport** (`frontend/src/pages/SharedReport.tsx`)
- Página pública: `/shared/:token`
- Detecção automática de proteção por senha
- Formulário de senha (se necessário)
- Visualizador PDF (iframe)
- Botão download
- Estados de erro detalhados:
  - Link expirado
  - Limite de acessos atingido
  - Link revogado
  - IP não autorizado
  - Senha incorreta

**ReportDetails** (`frontend/src/pages/ReportDetails.tsx`)
- Página de detalhes: `/reports/:id`
- Tabs:
  - Detalhes (informações básicas)
  - Assinatura Digital (SignaturePanel)
  - Compartilhamento (SharingPanel)

## 🚀 Como Usar

### 1. Assinar Relatório

```typescript
// No componente
import { SignaturePanel } from '@/components/ReportSignature/SignaturePanel';

<SignaturePanel
  reportId="report-123"
  onSignatureChange={() => console.log('Assinado!')}
/>
```

### 2. Compartilhar Relatório

```typescript
// No componente
import { SharingPanel } from '@/components/ReportSharing/SharingPanel';

<SharingPanel
  reportId="report-123"
  reportName="Relatório de Validação"
/>
```

### 3. API Direta

```typescript
// Assinar
const response = await fetch('/api/reports/abc123/sign', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reason: 'Aprovação final',
    location: 'São Paulo, Brasil',
    contactInfo: 'admin@exemplo.com'
  })
});

// Criar link compartilhado
const response = await fetch('/api/reports/abc123/share', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    expiresInHours: 48,
    maxAccess: 10,
    password: 'senha123',
    allowedIPs: ['192.168.1.100', '10.0.0.50']
  })
});

// Acessar link público
const response = await fetch('/api/reports/shared/TOKEN_AQUI', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    password: 'senha123'
  })
});
// Retorna PDF diretamente
```

## 🔒 Segurança

### Assinatura Digital
- **RSA-SHA256/512**: Usa certificado digital (se disponível)
- **HMAC-SHA256/512**: Fallback com salt aleatório
- **Formato**: `algorithm:salt:signedHash`
- **Armazenamento**: 
  - Assinatura no banco (Report.digitalSignature)
  - PDF assinado em `backend/signatures/`
  - Metadados em `Report.certificateInfo`

### Compartilhamento
- **Token**: 32 bytes criptográficos (base64url)
- **Senha**: bcrypt hash (cost 10)
- **IP Whitelist**: Array de IPs permitidos
- **Expiração**: Timestamp validado no acesso
- **Limites**: Contador incrementado a cada acesso
- **Auditoria**: Todos os acessos registrados (IP, userAgent, timestamp, sucesso)

### Validações
1. **Token único**: Index no banco
2. **Não expirado**: `expiresAt > now()`
3. **Link ativo**: `isActive = true`
4. **Limite não atingido**: `accessCount < maxAccess`
5. **IP permitido**: `allowedIPs.includes(ip) || allowedIPs.length === 0`
6. **Senha correta**: `bcrypt.compare(password, storedHash)`

## 📊 Estatísticas

Dados disponíveis por link:
- Total de acessos
- Acessos bem-sucedidos
- Tentativas falhas
- Último acesso (timestamp)
- Mapa de IPs (IP → contagem)
- Histórico recente (últimos 50, exibidos 10)

## 🧪 Testes

### Teste Manual

1. **Assinar relatório:**
   - Acesse `/reports/[ID]`
   - Tab "Assinatura Digital"
   - Clique "Assinar Relatório"
   - Preencha opções → "Confirmar"
   - Verificar badge "Assinado"

2. **Criar link compartilhado:**
   - Tab "Compartilhamento"
   - Clique "+ Criar Link"
   - Configure: 24h, senha "teste123"
   - Copiar link

3. **Acessar link público:**
   - Abrir link em navegador anônimo
   - Inserir senha
   - Visualizar PDF

4. **Visualizar estatísticas:**
   - Voltar à tab "Compartilhamento"
   - Clicar "Estatísticas"
   - Verificar 1 acesso registrado

## 🔧 Configuração

### Variáveis de Ambiente

**Backend (.env):**
```env
# Assinatura Digital (opcional)
RSA_PRIVATE_KEY_PATH=/path/to/private.key
RSA_CERTIFICATE_PATH=/path/to/certificate.crt
SIGNATURE_ALGORITHM=RSA-SHA256  # ou RSA-SHA512

# Compartilhamento
DEFAULT_LINK_EXPIRATION_HOURS=24
MAX_LINK_EXPIRATION_HOURS=720  # 30 dias
CLEANUP_INTERVAL_MINUTES=10
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000/api
```

## 📁 Estrutura de Arquivos

```
backend/
├── src/
│   ├── services/
│   │   ├── digitalSignatureService.ts
│   │   └── reportSharingService.ts
│   ├── routes/
│   │   └── reportSecurity.ts
│   └── prisma/
│       └── schema.prisma
├── signatures/        # PDFs assinados
└── certificates/      # Certificados digitais

frontend/
├── src/
│   ├── hooks/
│   │   └── useReportSecurity.ts
│   ├── components/
│   │   ├── ReportSignature/
│   │   │   └── SignaturePanel.tsx
│   │   └── ReportSharing/
│   │       └── SharingPanel.tsx
│   └── pages/
│       ├── SharedReport.tsx
│       └── ReportDetails.tsx
```

## ✅ Checklist de Implementação

- [x] Modelos Prisma (Report, ReportSharedLink, SharedLinkAccess)
- [x] DigitalSignatureService (sign, verify, remove, getInfo)
- [x] ReportSharingService (create, access, list, revoke, stats, cleanup)
- [x] REST API (10 endpoints)
- [x] Hooks React (useSignature, useSharing, useReportSecurity)
- [x] SignaturePanel (UI de assinatura)
- [x] SharingPanel (UI de compartilhamento)
- [x] SharedReport (página pública)
- [x] ReportDetails (página de detalhes com tabs)
- [x] Rotas integradas em App.tsx
- [x] TypeScript: 0 erros de compilação

## 🎯 Próximos Passos Sugeridos

1. **Testes Automatizados**
   - Unit tests para services
   - Integration tests para API
   - E2E tests com Playwright

2. **Melhorias de UX**
   - QR Code no link compartilhado
   - Preview do PDF antes de compartilhar
   - Notificações de acesso via email

3. **Recursos Avançados**
   - Múltiplas assinaturas (workflow)
   - Assinatura em lote
   - Templates de compartilhamento
   - Integração com certificados A1/A3

4. **Monitoramento**
   - Dashboard de acessos
   - Alertas de tentativas suspeitas
   - Relatório de uso de links

---

**Documentação criada em:** 14 de Novembro de 2025  
**Versão:** 1.0.0  
**Status:** ✅ Implementação Completa
