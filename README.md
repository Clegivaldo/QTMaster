# Sistema QT-Master

Sistema de gestão térmica para laudos e diagnósticos.

## Arquitetura Docker Completa

- **Backend**: API REST em Node.js/Express na porta 3000
- **Frontend**: React/TypeScript servido via nginx na porta 3001
- **Banco**: PostgreSQL na porta 5432
- **Cache**: Redis na porta 6379

## Como executar

### Iniciar todos os serviços Docker

```bash
docker-compose up -d
```

### Ou iniciar individualmente

```bash
# Apenas banco e cache
docker-compose up -d postgres redis

# Adicionar backend
docker-compose up -d backend

# Adicionar frontend
docker-compose up -d frontend
```

### Acesso:
- **API Backend**: http://localhost:3000
- **Frontend**: http://localhost:3001

## Desenvolvimento

Para desenvolvimento com hot-reload:

```bash
# Backend
cd backend && npm run dev

# Frontend (em outro terminal)
cd frontend && npm run dev
```

## Configuração

Sistema configurado para rede local Docker, sem necessidade de:
- Proxies complexos
- Domínios
- Certificados SSL
- Configurações de rede avançadas
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
