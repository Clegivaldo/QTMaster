# Plano rápido

## Entendimento
- Bug atual: ao abrir um template persistido no editor, apenas elementos recém-adicionados aparecem na tela do editor. A visualização (preview) mostra todos os elementos (novos + antigos).
- Suspeita: elementos persistidos podem ter `pageId` ausente ou referenciar um `page.id` que não existe no objeto `pages[]`. O editor filtra os elementos pelo `pageId` atual e portanto esconde-os. O preview não aplica o mesmo filtro.

## Plano de ação
- [x] Inspecionar `useTemplateEditor.loadTemplate` e lógica de normalização de `pages`/`elements`.
- [x] Ajustar `loadTemplate` para atribuir `pageId` válido a elementos que estejam sem `pageId` ou referenciem páginas desconhecidas.
- [ ] Testar manualmente com templates antigos (backend rodando) para confirmar que elementos aparecem no editor.
- [ ] Rodar testes relevantes do frontend (se existirem) e smoke test de abrir/salvar templates.
- [ ] Se necessário, ajustar lógica de persistência (`useTemplateStorage`) para garantir que novos templates tenham `pageId` definidos na hora de salvar.

## TODO
- [x] Implementar correção em `frontend/src/hooks/useTemplateEditor.ts` (atribuição de pageId fallback)
- [ ] Reiniciar frontend dev server e carregar um template persistido para validar fix
- [ ] Se bug persistir: instrumentar console.log temporários em `EditorLayout` e `Canvas` para comparar o payload recebido vs renderizado

## Notas
- A modificação é de baixo risco: apenas garante que elementos tenham `pageId` coerente ao carregar template. Mantive a compatibilidade com templates que já vêm corretos.
- Próximo passo sugerido: abrir um template antigo (o usuário indicou que a preview mostra os elementos) e confirmar que agora os elementos aparecem no canvas.
