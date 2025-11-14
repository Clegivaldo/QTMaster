# Script para executar o sistema completo no Docker
# Sistema de Laudos com Assinatura Digital e Compartilhamento Seguro

$ErrorActionPreference = "Stop"

Write-Host ">> Iniciando Sistema de Laudos no Docker..." -ForegroundColor Cyan
Write-Host ""

# Funcao para verificar se Docker esta rodando
function Test-Docker {
    try {
        docker info | Out-Null
        Write-Host "[OK] Docker esta rodando" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERRO] Docker nao esta rodando. Por favor, inicie o Docker Desktop e tente novamente." -ForegroundColor Red
        return $false
    }
}

# Funcao para verificar se docker-compose esta instalado
function Test-DockerCompose {
    try {
        docker-compose --version | Out-Null
        Write-Host "[OK] docker-compose esta instalado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERRO] docker-compose nao esta instalado" -ForegroundColor Red
        return $false
    }
}

# Verificar pre-requisitos
Write-Host ">> Verificando pre-requisitos..." -ForegroundColor Blue
if (-not (Test-Docker)) { exit 1 }
if (-not (Test-DockerCompose)) { exit 1 }
Write-Host ""

# Parar containers existentes
Write-Host ">> Parando containers existentes..." -ForegroundColor Blue
docker-compose down
Write-Host ""

# Criar diretorios necessarios
Write-Host ">> Criando diretorios necessarios..." -ForegroundColor Blue
$dirs = @(
    "backend\uploads\reports",
    "backend\templates",
    "backend\public\images\gallery",
    "backend\signatures",
    "backend\certificates",
    "backend\logs",
    "backend\backups"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "[OK] Diretorios criados" -ForegroundColor Green
Write-Host ""

# Build das imagens
Write-Host ">> Construindo imagens Docker..." -ForegroundColor Blue
docker-compose build --no-cache
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao construir imagens" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Imagens construidas" -ForegroundColor Green
Write-Host ""

# Subir os containers
Write-Host ">> Iniciando containers..." -ForegroundColor Blue
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao iniciar containers" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Aguardar banco de dados estar pronto
Write-Host ">> Aguardando PostgreSQL ficar pronto..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Verificar status do banco
$maxAttempts = 30
$attempt = 0
$dbReady = $false

while ($attempt -lt $maxAttempts) {
    try {
        docker-compose exec -T postgres pg_isready -U laudo_user -d laudo_db 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] PostgreSQL esta pronto" -ForegroundColor Green
            $dbReady = $true
            break
        }
    }
    catch {
        # Continuar tentando
    }
    
    $attempt++
    Write-Host "   Tentativa $attempt/$maxAttempts..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

if (-not $dbReady) {
    Write-Host "[ERRO] PostgreSQL nao ficou pronto a tempo" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Executar migrations
Write-Host ">> Executando migrations do Prisma..." -ForegroundColor Blue
docker-compose exec -T backend npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "[AVISO] Migrations falharam (pode ser normal se ja estiverem aplicadas)" -ForegroundColor Yellow
}
else {
    Write-Host "[OK] Migrations executadas" -ForegroundColor Green
}
Write-Host ""

# Gerar Prisma Client
Write-Host ">> Gerando Prisma Client..." -ForegroundColor Blue
docker-compose exec -T backend npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Erro ao gerar Prisma Client" -ForegroundColor Red
}
else {
    Write-Host "[OK] Prisma Client gerado" -ForegroundColor Green
}
Write-Host ""

# Verificar status dos servicos
Write-Host ">> Verificando status dos servicos..." -ForegroundColor Blue
docker-compose ps
Write-Host ""

# Mostrar logs
Write-Host ">> Ultimas linhas dos logs:" -ForegroundColor Blue
docker-compose logs --tail=20
Write-Host ""

# Informacoes finais
Write-Host "================================================================" -ForegroundColor Green
Write-Host "[OK] Sistema iniciado com sucesso!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host ">> URLs de Acesso:" -ForegroundColor Blue
Write-Host "   Frontend: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Backend API: " -NoNewline; Write-Host "http://localhost:5000/api" -ForegroundColor Yellow
Write-Host "   Health Check: " -NoNewline; Write-Host "http://localhost:5000/api/health" -ForegroundColor Yellow
Write-Host ""
Write-Host ">> Banco de Dados:" -ForegroundColor Blue
Write-Host "   Host: " -NoNewline; Write-Host "localhost:5432" -ForegroundColor Yellow
Write-Host "   Database: " -NoNewline; Write-Host "laudo_db" -ForegroundColor Yellow
Write-Host "   User: " -NoNewline; Write-Host "laudo_user" -ForegroundColor Yellow
Write-Host ""
Write-Host ">> Redis:" -ForegroundColor Blue
Write-Host "   Host: " -NoNewline; Write-Host "localhost:6379" -ForegroundColor Yellow
Write-Host ""
Write-Host ">> Novos Recursos:" -ForegroundColor Blue
Write-Host "   [X] Assinatura Digital de PDFs"
Write-Host "   [X] Compartilhamento Seguro"
Write-Host "   [X] Links Temporarios"
Write-Host "   [X] Controle de Acesso (IP, Senha, Limites)"
Write-Host "   [X] Auditoria de Acessos"
Write-Host ""
Write-Host ">> Comandos Uteis:" -ForegroundColor Blue
Write-Host "   Ver logs: " -NoNewline; Write-Host "docker-compose logs -f" -ForegroundColor Yellow
Write-Host "   Ver logs do backend: " -NoNewline; Write-Host "docker-compose logs -f backend" -ForegroundColor Yellow
Write-Host "   Parar sistema: " -NoNewline; Write-Host "docker-compose down" -ForegroundColor Yellow
Write-Host "   Reiniciar sistema: " -NoNewline; Write-Host "docker-compose restart" -ForegroundColor Yellow
Write-Host "   Acessar backend: " -NoNewline; Write-Host "docker-compose exec backend sh" -ForegroundColor Yellow
Write-Host "   Executar migrations: " -NoNewline; Write-Host "docker-compose exec backend npx prisma migrate deploy" -ForegroundColor Yellow
Write-Host "   Ver banco de dados: " -NoNewline; Write-Host "docker-compose exec backend npx prisma studio" -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
