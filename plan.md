# Plano – Importação, Duplicidade e Toasts (26/11/2025)

## Resumo
Estamos finalizando o fluxo de importação de arquivos (.xls/.xlsx/.csv) com fallback Python, corrigindo a verificação de duplicidade e padronizando UX com toasts. Persistia 400 no `check-duplicate` por falta de timestamps e 0 registros processados nos `.xls` legados. Melhoramos o parser Python e adicionamos logs de DEBUG no backend.

## Plano de Ação
1. Ajustar backend `check-duplicate` para não bloquear sem metadados (timestamps).
2. Substituir `alert()` por toasts na tela de Importação e melhorar parsing da resposta do `check-duplicate`.
3. Validar parser Python com logs de DEBUG e garantir mapeamento de colunas PT-BR (Data/Hora, Temperatura, Umidade).
4. (Opcional) Evoluir `ImportData` para enviar `firstTimestamp/lastTimestamp` quando possível (pré-parse leve no cliente).

## Checklist TODO
- [x] Backend: `checkDuplicate` tolera body incompleto (retorna `isDuplicate=false`).
- [x] Frontend: substituir alerts por toasts em `ImportData.tsx` e tratar resposta flexível (`result.isDuplicate` ou `result.data.isDuplicate`).
- [x] Parser Python: heurísticas de datetime (serial Excel, data+hora separados) e logs `DEBUG` expostos pelo Node.
- [x] Parser Python: aceitar coluna única `time` contendo data+hora (formato Elitech RC-4HC) e evitar NaT quando o valor traz a data completa.
- [x] Frontend: adicionar legenda de cores dos ciclos nos gráficos de validação.
- [x] Login: remover botão "Testar Conexão Backend" da tela de login.
- [ ] Validar importação novamente e conferir logs `Python fallback completed` com `processedRows > 0`.
- [ ] (Opcional) Enviar `firstTimestamp/lastTimestamp` do cliente após um pré-parse simples.
- [ ] (Opcional) Remover `window.confirm` por confirmação via UI (modal).

## Mudanças implementadas nesta entrega
- Backend: `validationController.checkDuplicate` agora não retorna 400 sem timestamps; responde `success: true, isDuplicate: false` com mensagem informativa.
- Frontend: `frontend/src/pages/ImportData.tsx`
  - Uso de `ToastContext` para avisos/erros em seleção de arquivos, verificação ignorada e upload iniciado/falha.
  - Interpretação robusta da resposta de duplicidade (aceita formatos `result.isDuplicate` ou `result.data.isDuplicate`).
  - Mantida confirmação (`window.confirm`) apenas quando a API indicar duplicidade.
- Parser Python: já incluía seleção de primeira aba, mapeamento PT-BR/EN, parsing de datas/tempos e coerção numérica.
  - Suporte adicional: quando a planilha traz apenas a coluna `Time` contendo data e hora completas, fazemos o parse direto como datetime (com `dayfirst=True`). Para valores numéricos, tentamos serial Excel antes de desistir.

## Validação / Próximos Passos
- Reprocessar os `.xls` problemáticos para capturar linhas `Python fallback debug` (colunas detectadas e contagem de datetimes) e verificar se `processedRows > 0`.
- Se ainda der 0, ampliar heurísticas de cabeçalhos conforme nomes exatos vistos nos logs (ex.: "Data e hora", "Umidade Relativa (%)").
- (Opcional) Implementar pré-parse no cliente para enviar `firstTimestamp/lastTimestamp` no `check-duplicate` e evitar falsos negativos/positivos.

``` 
