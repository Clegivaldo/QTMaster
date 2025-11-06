# Sistema de Laudos de Qualificação Térmica

Sistema web completo para geração de laudos de qualificação térmica com funcionalidades de coleta, análise e geração de relatórios em PDF.

## 🚀 Tecnologias

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- React Router
- React Hook Form
- React Query
- Recharts
- Axios

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- ExcelJS
- Winston (Logging)

### DevOps
- Docker & Docker Compose
- Redis (Cache)

## 📋 Funcionalidades

- ✅ Autenticação segura multi-usuário
- ✅ Interface responsiva com sidebar, header e footer
- ✅ Cadastro de clientes, sensores e maletas
- ✅ Importação de arquivos Excel/CSV (até 120 arquivos)
- ✅ Suporte a 6 tipos diferentes de sensores
- ✅ Gráficos de validação térmica
- ✅ Geração de laudos em PDF com templates
- ✅ Gestão completa de relatórios
- ✅ Sistema de auditoria e logs

## 🛠️ Instalação

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- Git

### Opção 1: Setup Automático (Recomendado)

#### Windows
```bash
# Clone o repositório
git clone <repository-url>
cd sistema-laudo-termico

# Execute o script de setup
scripts\dev-setup.bat
```

#### Linux/Mac
```bash
# Clone o repositório
git clone <repository-url>
cd sistema-laudo-termico

# Torne o script executável e execute
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### Opção 2: Setup Manual

#### 1. Clone o repositório
```bash
git clone <repository-url>
cd sistema-laudo-termico
```

#### 2. Inicie os bancos de dados
```bash
docker-compose -f docker-compose.dev.yml up -d
```

#### 3. Configure o Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
```

#### 4. Configure o Frontend
```bash
cd frontend
npm install
```

## 🚀 Executando o Projeto

### Desenvolvimento
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Produção com Docker
```bash
docker-compose up -d
```

### Acessos
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Banco de Dados**: localhost:5432
- **Redis**: localhost:6379

### Credenciais Padrão
- **Email**: admin@sistema.com
- **Senha**: admin123

## 📁 Estrutura do Projeto

```
sistema-laudo-termico/
├── frontend/                 # React + TypeScript
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Serviços de API
│   │   ├── types/          # Tipos TypeScript
│   │   └── utils/          # Utilitários
│   └── ...
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── controllers/    # Controladores
│   │   ├── services/       # Lógica de negócio
│   │   ├── middleware/     # Middlewares
│   │   ├── routes/         # Rotas da API
│   │   ├── types/          # Tipos TypeScript
│   │   └── utils/          # Utilitários
│   ├── prisma/             # Schema e migrações
│   └── ...
└── docker-compose.yml       # Configuração Docker
```

## 🔧 Scripts Disponíveis

### Frontend
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run lint` - Verificar código
- `npm run format` - Formatar código

### Backend
- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build de produção
- `npm run start` - Executar produção
- `npm run db:generate` - Gerar cliente Prisma
- `npm run db:push` - Aplicar schema ao banco
- `npm run db:migrate` - Executar migrações

## 📊 Status do Desenvolvimento

- [x] Setup inicial do projeto
- [ ] Sistema de autenticação
- [ ] Layout principal
- [ ] CRUD de clientes
- [ ] Sistema de sensores
- [ ] Processamento de arquivos
- [ ] Validação térmica
- [ ] Geração de PDFs
- [ ] Deploy

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

docker-compose build --no-cache
docker-compose up -d --force-recreate