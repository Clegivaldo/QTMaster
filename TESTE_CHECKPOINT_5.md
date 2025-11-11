# 🧪 Teste Checkpoint 5 - Persistência e Redimensionamento

## Descrição
Este documento contém os passos para testar as correções aplicadas no **Checkpoint 5** da sessão de debugging de header/footer.

---

## ✅ Teste 1: Persistência de Checkboxes (Header/Footer)

### Passos:
1. **Abra a aplicação** → `http://localhost:3000`
2. **Navegue até a página do editor** de templates
3. **Clique no botão "Configurações da Página"** (ícone de engrenagem)
4. **Na modal que abrir:**
   - Procure pela seção "Cabeçalho"
   - Marque o checkbox ☑️ "Ativar cabeçalho"
   - Clique em "Aplicar"
5. **Feche a modal** (clicando em X ou fora dela)
6. **Reabra a modal** "Configurações da Página"
7. **Verifique:**
   - ✅ **ESPERADO:** O checkbox de "Cabeçalho" deve estar ☑️ **MARCADO**
   - ❌ **FALHO:** Se estiver desmarcado, há um problema na persistência

### Console Debug:
Abra o DevTools (F12 → Console) e procure por:
```
[PageSettingsModal] Modal opened. initialHeader: {...}
```
- Se mostrar um objeto com propriedades, significa que o header foi persistido ✅
- Se mostrar `null`, significa que não foi persistido ❌

---

## ⚠️ Teste 2: Redimensionamento Visual (Preview)

### Passos:
1. **Com a modal de Configurações aberta:**
   - Marque o checkbox ☑️ de "Cabeçalho"
   - Clique em "Aplicar"
   - Feche a modal

2. **No canvas principal:**
   - No topo da página, você deve ver uma **linha azul** fina
   - Passe o mouse sobre a linha azul
   - O cursor deve mudar para **↕️ (redimensionar verticalmente)**

3. **Clique e arraste:**
   - Clique sobre a linha azul
   - Arraste para **CIMA** (diminuir altura) ou **BAIXO** (aumentar altura)
   - Você deve ver um **overlay azul semitransparente** seguindo o cursor

4. **Verifique:**
   - ✅ **ESPERADO:** Overlay azul aparece e segue o cursor durante o arrasto
   - ✅ **ESPERADO:** Ao liberar o mouse, overlay desaparece

### Console Debug:
Abra DevTools (F12 → Console) e procure por:
```
[Canvas] Header resize start - clientY: 123
[Canvas] Header move - delta: 45, newH: 123
Header resize - finalPx: 123, finalMm: 32.5, zoom: 1, mmToPxFactor: 3.78
[Canvas] Calling onUpdatePageRegions with newHeader
```

Se esses logs aparecerem, o evento de redimensionamento está sendo disparado ✅

---

## 🎯 Teste 3: Persistência de Redimensionamento

### Passos:
1. **No canvas, redimensione o header** conforme Teste 2
2. **Libere o mouse** quando atingir a altura desejada
3. **Feche a aplicação** ou recarregue a página (F5)
4. **Verifique:**
   - ✅ **ESPERADO:** A altura do header deve estar **persistida** (não voltou ao original)
   - ❌ **FALHO:** Se voltou para a altura padrão, a persistência não funcionou

### Console Debug:
Procure por qualquer mensagem de erro em vermelho relacionada a:
```
Erro ao atualizar header height
```

Se aparecer, há um erro no callback ❌

---

## 📊 Checklist de Validação

### ✅ Problema 1: Checkboxes
- [ ] Checkbox de header marcado após modal reabrir?
- [ ] Checkpoint foi persistido no template?
- [ ] Logs mostram `initialHeader: {...}` quando modal abre?

### ✅ Problema 2: Redimensionamento Visual
- [ ] Linha azul aparece no topo do cabeçalho?
- [ ] Cursor muda para ↕️ ao passar sobre a linha?
- [ ] Overlay azul segue o mouse durante o arrasto?

### ✅ Problema 3: Persistência de Altura
- [ ] Altura do header mudou após o arrasto?
- [ ] Altura persiste após fechar/reabrir modal?
- [ ] Logs mostram `finalMm` com novo valor?

---

## 🐛 Troubleshooting

### Se os checkboxes não persistem:
1. Verifique se `initialHeader` está sendo passado como prop do EditorLayout
2. Procure no console: `[PageSettingsModal] Modal opened`
3. Verifique se o objeto tem a estrutura: `{ height: 20, elements: [...], ...}`

### Se o redimensionamento não funciona:
1. Verifique se a linha azul aparece no canvas
2. Procure no console: `[Canvas] Header resize start`
3. Se não aparecer, o listener de mousedown não está funcionando
4. Verifique o computed style do elemento: `top: X, height: Y, background: #3b82f6`

### Se a altura não persiste após arrasto:
1. Procure no console: `[Canvas] Calling onUpdatePageRegions`
2. Se não aparecer, o callback não foi disparado
3. Verifique se há erros em vermelho no console
4. Tente recarregar (F5) após o arrasto para testar persistência

---

## 📝 Notas

- Todos os console.log serão removidos após validação de que tudo funciona
- Os valores de altura estão em **milímetros (mm)**
- Conversão: `1mm ≈ 3.78 pixels` (em zoom 1.0)
- A fórmula de conversão é: `pxToMm = px / (96/25.4 * zoom)`

