# Design Document - Sistema de Laudos de Qualificação Térmica

## Overview

O Sistema de Laudos de Qualificação Térmica é uma aplicação web full-stack que permite importação, análise e geração de relatórios profissionais para dados de sensores térmicos. A arquitetura utiliza tecnologias modernas com foco em escalabilidade, segurança e usabilidade.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[User Interface]
        Auth[Authentication]
        Charts[Chart Components]
        FileUpload[File Upload]
    end
    
    subgraph "Backend (Node.js + Express)"
        API[REST API]
        AuthService[Auth Service]
        FileProcessor[File Processor]
        ReportGenerator[Report Generator]
    end
    
    subgraph "Database Layer"
        PG[(PostgreSQL)]
        Prisma[Prisma ORM]
    end
    
    subgraph "External Services"
        FastReport[FastReport Engine]
        FileStorage[File Storage]
    end
    
    UI --> API
    Auth --> AuthService
    Charts --> API
    FileUpload --> FileProcessor
    API --> Prisma
    Prisma --> PG
    ReportGenerator --> FastReport
    FileProcessor --> FileStorage
```

### Technology Stack

**Frontend:**
- React 18 com TypeScript
- Tailwind CSS para estilização
- React Router para navegação
- React Hook Form para formulários
- Chart.js/Recharts para gráficos
- Axios para requisições HTTP
- React Query para cache e sincronização

**Backend:**
- Node.js com Express.js
- TypeScript
- Prisma ORM
- JWT para autenticação
- Multer para upload de arquivos
- ExcelJS para processamento de planilhas
- FastReport integration

**Database:**
- PostgreSQL 15+
- Redis para cache de sessões

**DevOps:**
- Docker para containerização
- Nginx como reverse proxy

## Components and Interfaces

### Frontend Components

#### 1. Layout Components
```typescript
// Layout principal com sidebar, header e footer
interface LayoutProps {
  children: React.ReactNode;
  user: User;
}

// Sidebar com navegação
interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

// Header com informações do usuário
interface HeaderProps {
  user: User;
  onLogout: () => void;
}
```

#### 2. Authentication Components
```typescript
interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  loading: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}
```

#### 3. Data Management Components
```typescript
// Cadastro de clientes
interface ClientFormProps {
  client?: Client;
  onSubmit: (client: ClientData) => Promise<void>;
  onCancel: () => void;
}

// Cadastro de sensores
interface SensorFormProps {
  sensor?: Sensor;
  onSubmit: (sensor: SensorData) => Promise<void>;
  sensorTypes: SensorType[];
}

// Cadastro de maletas
interface SuitcaseFormProps {
  suitcase?: Suitcase;
  sensors: Sensor[];
  onSubmit: (suitcase: SuitcaseData) => Promise<void>;
}
```

#### 4. File Processing Components
```typescript
interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFormats: string[];
  maxFiles: number;
}

interface FileProcessorProps {
  files: File[];
  suitcase: Suitcase;
  onProcessComplete: (results: ProcessingResult[]) => void;
}
```

#### 5. Validation and Charts Components
```typescript
interface ValidationChartProps {
  data: SensorData[];
  limits: TemperatureLimits;
  onValidationComplete: (isValid: boolean) => void;
}

interface TemperatureLimits {
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number;
  maxHumidity: number;
}
```

### Backend API Interfaces

#### 1. Authentication Endpoints
```typescript
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET /api/auth/me
```

#### 2. Client Management
```typescript
GET /api/clients
POST /api/clients
PUT /api/clients/:id
DELETE /api/clients/:id
GET /api/clients/:id
```

#### 3. Sensor Management
```typescript
GET /api/sensors
POST /api/sensors
PUT /api/sensors/:id
DELETE /api/sensors/:id
GET /api/sensor-types
```

#### 4. Suitcase Management
```typescript
GET /api/suitcases
POST /api/suitcases
PUT /api/suitcases/:id
DELETE /api/suitcases/:id
```

#### 5. File Processing
```typescript
POST /api/files/upload
POST /api/files/process
GET /api/files/processing-status/:jobId
```

#### 6. Validation and Reports
```typescript
POST /api/validations
GET /api/validations
GET /api/validations/:id
POST /api/reports/generate
GET /api/reports
GET /api/reports/:id/pdf
```

## Data Models

### Database Schema

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  reports   Report[]
  validations Validation[]
}

model Client {
  id        String   @id @default(cuid())
  name      String
  email     String?
  phone     String?
  address   String?
  cnpj      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  reports   Report[]
}

model SensorType {
  id          String @id @default(cuid())
  name        String
  description String?
  
  // Configurações específicas para parsing dos arquivos
  dataConfig  Json   // Posições das colunas, formatos, etc.
  
  sensors     Sensor[]
}

model Sensor {
  id           String     @id @default(cuid())
  serialNumber String     @unique
  model        String
  typeId       String
  calibrationDate DateTime?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  
  type         SensorType @relation(fields: [typeId], references: [id])
  suitcaseSensors SuitcaseSensor[]
  sensorData   SensorData[]
}

model Suitcase {
  id          String   @id @default(cuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  sensors     SuitcaseSensor[]
  validations Validation[]
}

model SuitcaseSensor {
  id         String   @id @default(cuid())
  suitcaseId String
  sensorId   String
  position   Int?     // Posição física na maleta
  
  suitcase   Suitcase @relation(fields: [suitcaseId], references: [id])
  sensor     Sensor   @relation(fields: [sensorId], references: [id])
  
  @@unique([suitcaseId, sensorId])
}

model SensorData {
  id          String   @id @default(cuid())
  sensorId    String
  timestamp   DateTime
  temperature Float
  humidity    Float?
  fileName    String   // Arquivo de origem
  rowNumber   Int      // Linha no arquivo original
  createdAt   DateTime @default(now())
  
  sensor      Sensor   @relation(fields: [sensorId], references: [id])
  validationId String?
  validation  Validation? @relation(fields: [validationId], references: [id])
}

model Validation {
  id              String   @id @default(cuid())
  suitcaseId      String
  clientId        String
  userId          String
  name            String
  description     String?
  
  // Parâmetros de validação
  minTemperature  Float
  maxTemperature  Float
  minHumidity     Float?
  maxHumidity     Float?
  
  // Resultados
  isApproved      Boolean?
  statistics      Json?    // Estatísticas calculadas
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  suitcase        Suitcase @relation(fields: [suitcaseId], references: [id])
  client          Client   @relation(fields: [clientId], references: [id])
  user            User     @relation(fields: [userId], references: [id])
  sensorData      SensorData[]
  reports         Report[]
}

model ReportTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  templatePath String  // Caminho para o arquivo FastReport
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  reports     Report[]
}

model Report {
  id           String   @id @default(cuid())
  validationId String
  templateId   String
  userId       String
  clientId     String
  
  name         String
  status       ReportStatus @default(DRAFT)
  pdfPath      String?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  validation   Validation @relation(fields: [validationId], references: [id])
  template     ReportTemplate @relation(fields: [templateId], references: [id])
  user         User @relation(fields: [userId], references: [id])
  client       Client @relation(fields: [clientId], references: [id])
}

enum Role {
  USER
  ADMIN
}

enum ReportStatus {
  DRAFT
  VALIDATED
  FINALIZED
}
```

## Error Handling

### Frontend Error Handling
```typescript
// Error boundary para capturar erros React
class ErrorBoundary extends React.Component {
  // Implementação de error boundary
}

// Hook para tratamento de erros de API
const useErrorHandler = () => {
  const showError = (error: ApiError) => {
    // Toast notification ou modal de erro
  };
  
  return { showError };
};

// Interceptor Axios para erros globais
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect para login
    }
    return Promise.reject(error);
  }
);
```

### Backend Error Handling
```typescript
// Middleware de tratamento de erros
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details
    });
  }
  
  if (err instanceof AuthenticationError) {
    return res.status(401).json({
      error: 'Authentication Required'
    });
  }
  
  // Log do erro
  logger.error(err);
  
  return res.status(500).json({
    error: 'Internal Server Error'
  });
};
```

## Testing Strategy

### Frontend Testing
```typescript
// Testes unitários com Jest e React Testing Library
describe('ClientForm', () => {
  it('should validate required fields', () => {
    // Test implementation
  });
  
  it('should submit form with valid data', () => {
    // Test implementation
  });
});

// Testes de integração com MSW (Mock Service Worker)
describe('Client API Integration', () => {
  it('should fetch clients list', () => {
    // Test implementation
  });
});
```

### Backend Testing
```typescript
// Testes unitários para services
describe('FileProcessorService', () => {
  it('should process Excel file correctly', () => {
    // Test implementation
  });
  
  it('should handle invalid file format', () => {
    // Test implementation
  });
});

// Testes de integração para APIs
describe('Client API', () => {
  it('should create client with valid data', () => {
    // Test implementation
  });
});
```

### Database Testing
```typescript
// Testes com banco de dados em memória
describe('Client Repository', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });
  
  it('should save client to database', () => {
    // Test implementation
  });
});
```

## Security Considerations

### Authentication & Authorization
- JWT tokens com refresh token rotation
- Bcrypt para hash de senhas
- Rate limiting para endpoints de login
- CORS configurado adequadamente

### Data Protection
- Validação de entrada em todos os endpoints
- Sanitização de dados antes de salvar no banco
- Criptografia de dados sensíveis
- Backup automático com criptografia

### File Upload Security
- Validação de tipo de arquivo
- Limite de tamanho de arquivo
- Scan de malware (opcional)
- Armazenamento seguro de arquivos

## Performance Optimization

### Frontend
- Code splitting por rotas
- Lazy loading de componentes
- Memoização de componentes pesados
- Otimização de imagens
- Service Worker para cache

### Backend
- Cache Redis para sessões e dados frequentes
- Paginação em todas as listagens
- Índices otimizados no banco de dados
- Compressão gzip
- Connection pooling

### Database
- Índices compostos para queries complexas
- Particionamento de tabelas grandes (SensorData)
- Vacuum automático
- Monitoramento de performance

## FastReport Integration

### Architecture Integration
```typescript
// Service para integração com FastReport
class FastReportService {
  async generateReport(
    templatePath: string,
    data: ReportData
  ): Promise<Buffer> {
    // Integração com FastReport engine
    // Pode ser via API REST ou biblioteca nativa
  }
  
  async previewReport(
    templatePath: string,
    data: ReportData
  ): Promise<string> {
    // Gerar preview em HTML ou imagem
  }
}

// Interface para dados do relatório
interface ReportData {
  client: Client;
  validation: Validation;
  sensorData: SensorData[];
  statistics: ValidationStatistics;
  charts: ChartData[];
}
```

### Template Management
- Templates armazenados no sistema de arquivos
- Versionamento de templates
- Interface para upload de novos templates
- Validação de templates antes da ativação

## Deployment Architecture

### Docker Configuration
```dockerfile
# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
      
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/laudo_db
      - REDIS_URL=redis://redis:6379
      
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=laudo_db
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    
volumes:
  postgres_data:
```

## Monitoring and Logging

### Application Monitoring
- Health check endpoints
- Metrics collection (Prometheus)
- Error tracking (Sentry)
- Performance monitoring

### Logging Strategy
- Structured logging com Winston
- Log levels apropriados
- Rotation de logs
- Centralização de logs

Este design fornece uma base sólida para implementação do sistema, cobrindo todos os aspectos técnicos necessários para atender aos requisitos especificados.