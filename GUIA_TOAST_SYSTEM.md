# 🔔 Guia de Uso - Sistema Toast

## O que é Toast?

Toast é um sistema de notificações não-invasivo que aparece no canto da tela, dá feedback ao usuário e desaparece automaticamente.

---

## 📍 Localização

```
frontend/src/
├── components/Toast/
│   ├── Toast.tsx          # Componente individual
│   ├── ToastContainer.tsx # Container que renderiza toasts
│   └── Toast.css          # Estilos e animações
└── hooks/
    └── useToast.ts        # Hook para gerenciar toasts
```

---

## 🚀 Como Usar

### 1. Importar o Hook

```tsx
import { useToast } from '../hooks/useToast';
```

### 2. Usar em um Componente

```tsx
const MyComponent = () => {
  const { toasts, removeToast, success, error, info, warning } = useToast();

  const handleAction = async () => {
    try {
      // Fazer algo
      success('Ação realizada com sucesso!', 'Sucesso');
    } catch (err) {
      error('Ocorreu um erro!', 'Erro');
    }
  };

  return (
    <div>
      <button onClick={handleAction}>Clique aqui</button>
      
      {/* Renderizar o container de toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};
```

---

## 📚 API do Hook useToast

### Métodos Disponíveis

#### 1. `showToast(message, type, title?, duration?)`
Mostra um toast genérico.

```tsx
showToast('Operação concluída', 'success', 'Sucesso', 3000);
```

#### 2. `success(message, title?, duration?)`
Atalho para toast de sucesso (verde).

```tsx
success('Template salvo com sucesso!', 'Salvo', 3000);
```

#### 3. `error(message, title?, duration?)`
Atalho para toast de erro (vermelho).

```tsx
error('Falha ao salvar template', 'Erro', 5000);
```

#### 4. `info(message, title?, duration?)`
Atalho para toast informativo (azul).

```tsx
info('Template carregando...', 'Aguarde');
```

#### 5. `warning(message, title?, duration?)`
Atalho para toast de aviso (amarelo).

```tsx
warning('Essa ação não pode ser desfeita', 'Atenção');
```

#### 6. `removeToast(id)`
Remove um toast manualmente.

```tsx
const id = success('Mensagem');
setTimeout(() => removeToast(id), 2000); // Remove após 2s
```

### State

```tsx
const { toasts } = useToast();
// toasts é um array de:
// {
//   id: string,
//   type: 'success' | 'error' | 'warning' | 'info',
//   message: string,
//   title?: string,
//   duration?: number
// }
```

---

## 🎨 Tipos e Temas

### Success (Verde)
```tsx
success('Template salvo!');
```

**Cor:** #10b981 (green-600)
**Duração padrão:** 4000ms

### Error (Vermelho)
```tsx
error('Falha na operação');
```

**Cor:** #ef4444 (red-600)
**Duração padrão:** 5000ms

### Info (Azul)
```tsx
info('Aguarde...');
```

**Cor:** #3b82f6 (blue-600)
**Duração padrão:** 4000ms

### Warning (Amarelo)
```tsx
warning('Ação irreversível');
```

**Cor:** #eab308 (yellow-600)
**Duração padrão:** 4000ms

---

## ⚙️ Configuração

### Duração
A duração padrão é 4000ms (4 segundos), exceto para erros (5000ms).

```tsx
// Customizar duração
success('Rápido!', 'Ok', 1000);  // 1 segundo
error('Espere mais...', 'Erro', 10000);  // 10 segundos
```

### Título Opcional
Você pode omitir o título:

```tsx
success('Salvo com sucesso!');  // Sem título
success('Template salvo!', 'Salvo');  // Com título
```

---

## 📋 Exemplo Completo

```tsx
import React from 'react';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/Toast/ToastContainer';

const TemplateEditor = () => {
  const { toasts, removeToast, success, error } = useToast();

  const handleSave = async () => {
    try {
      const response = await fetch('/api/templates', {
        method: 'PUT',
        body: JSON.stringify({ /* dados */ })
      });

      if (!response.ok) throw new Error();

      success('Template atualizado com sucesso!', 'Salvo', 3000);
    } catch (err) {
      error('Falha ao salvar template. Tente novamente.', 'Erro');
    }
  };

  return (
    <>
      <button onClick={handleSave}>Salvar</button>
      
      {/* Renderizar toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};

export default TemplateEditor;
```

---

## 🔐 Melhores Práticas

### ✅ Fazer

```tsx
// Use títulos descritivos
success('Arquivo enviado com sucesso', 'Upload Concluído');

// Customize a duração para errros graves
error('Conexão perdida', 'Erro Crítico', 0);  // 0 = sem auto-dismiss

// Forneça contexto ao usuário
info(`Carregando ${fileName}...`, 'Processando');

// Use sucesso para confirmação
success(`${itemCount} itens deletados`, 'Deletado');
```

### ❌ Evitar

```tsx
// Não use mensagens genéricas
success('Ok');  // Muito vago

// Não use duração muito curta
success('Salvo', 'Ok', 500);  // Usuário não terá tempo de ler

// Não use muitos toasts ao mesmo tempo
for (let i = 0; i < 10; i++) {
  success(`Item ${i} salvo`);  // Spam!
}

// Não mostre informações técnicas
error('ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:5000');
// Ao invés:
error('Não foi possível conectar ao servidor. Tente novamente.');
```

---

## 🎯 Casos de Uso Típicos

### 1. Confirmação de Salvar
```tsx
const handleSaveComplete = (template) => {
  showSuccessToast('Template salvo com sucesso!', 'Salvo', 3000);
};
```

### 2. Erro de Rede
```tsx
catch (error) {
  if (error.response?.status === 500) {
    error('Erro no servidor. Tente novamente.');
  } else if (error.code === 'ECONNREFUSED') {
    error('Servidor indisponível.');
  } else {
    error('Erro desconhecido.');
  }
}
```

### 3. Validação de Formulário
```tsx
if (!name) {
  warning('Preencha o nome do template', 'Campo obrigatório');
  return;
}
```

### 4. Operação Longa
```tsx
const handleLongOperation = () => {
  info('Processando... Esta operação pode levar alguns segundos', 'Aguarde', 0);
  
  await processFile();
  
  removeToastById(loadingToastId);
  success('Arquivo processado com sucesso!');
};
```

---

## 🐛 Troubleshooting

### Toast não aparece?

1. Verifique se `ToastContainer` está renderizado
2. Verifique se o hook é de um componente filho dentro do contexto
3. Verifique console para erros

### Toast aparece mas sumo muito rápido?

```tsx
// Aumentar duração
success('Mensagem', 'Título', 5000);  // 5 segundos
```

### Múltiplos toasts aparecem stackados?

Isso é normal! O CSS cuida do positioning vertical automaticamente.

```tsx
// CSS auto-stacks em column com gap
.toast-container {
  flex-direction: column;
  gap: 10px;
}
```

---

## 📱 Responsividade

O sistema Toast é totalmente responsivo:

- **Desktop:** Aparecem no canto superior direito
- **Tablet:** Posição ajustada para respeitar viewport
- **Mobile:** Full-width (menos 20px de padding)

```css
@media (max-width: 640px) {
  .toast-container {
    left: 10px;
    right: 10px;
    max-width: none;
  }
}
```

---

## ♿ Acessibilidade

O Toast usa:
- Role `alert` para screen readers
- Cores + iconografia (não apenas cores)
- Suficiente contraste de cores
- Texto claro e descritivo

---

## 📦 Dependências

- React 18+
- Lucide React (para ícones)
- Tailwind CSS (para estilos)

---

## 🔮 Futuras Melhorias

- [ ] Integração com Redux/Context API
- [ ] Custom actions no toast (botões)
- [ ] Som de notificação
- [ ] Posição customizável
- [ ] Tema escuro/claro
- [ ] Queue de toasts prioritários

---

**Criado:** 10 de Novembro, 2025
**Última atualização:** 10 de Novembro, 2025
**Versão:** 1.0.0
