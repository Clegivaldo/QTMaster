# 📋 Guia de Importação de Arquivos com Feedback de Erros

## 🎯 Visão Geral

O sistema de importação de arquivos foi aprimorado para fornecer feedback detalhado sobre erros, permitindo que você identifique e corrija problemas rapidamente antes de concluir a importação.

## 🚀 Como Usar

### 1. Preparando seu Arquivo

**Formatos Suportados:**
- CSV (delimitado por ponto e vírgula `;`)
- Excel (.xlsx)

**Estrutura Obrigatória:**
```csv
Equipamento;Marca;Modelo;Número de Série;Data de Calibração;Validade;Status;Temperatura Mínima (°C);Temperatura Máxima (°C);Umidade Mínima (%);Umidade Máxima (%);Localização;Observações
```

### 2. Fazendo Upload do Arquivo

1. **Acesse a página de importação** no sistema
2. **Arraste e solte** o arquivo na área designada ou clique para selecionar
3. **Aguarde** o processamento automático
4. **Revise** o feedback de erros (se houver)
5. **Corrija** os erros identificados
6. **Reenvie** o arquivo corrigido

### 3. Interpretando os Resultados

#### ✅ Importação Bem-sucedida
- **Indicador Verde**: Arquivo processado com sucesso
- **Taxa de Sucesso**: 100%
- **Mensagem**: "Importação concluída com sucesso"

#### ⚠️ Importação com Erros
- **Indicador Amarelo**: Algumas linhas contêm erros
- **Taxa de Sucesso**: < 100%
- **Ação Necessária**: Corrigir erros identificados

#### ❌ Importação Falhou
- **Indicador Vermelho**: Erros críticos impediram a importação
- **Taxa de Sucesso**: 0%
- **Ação Necessária**: Corrigir todos os erros antes de reenviar

## 📊 Tipos de Erros e Soluções

### 1. Erros de Campo Obrigatório
**Causa**: Campos obrigatórios estão vazios
**Exemplo**: Marca em branco
**Solução**: Preencha todos os campos obrigatórios

### 2. Erros de Formato
**Causa**: Dados no formato incorreto
**Exemplos**:
- Data: `2024-13-45` (mês/inválido)
- Número: `abc` (deve ser numérico)
**Solução**: Use o formato correto (YYYY-MM-DD para datas)

### 3. Erros de Validação
**Causa**: Valores fora dos limites permitidos
**Exemplos**:
- Temperatura mínima > temperatura máxima
- Data de validade vencida
- Status inválido (deve ser: Válido, Vencido, Em Calibração)
**Solução**: Ajuste os valores para dentro dos limites permitidos

### 4. Erros de Integridade
**Causa**: Inconsistências entre campos
**Exemplo**: Data de calibração futura
**Solução**: Verifique a consistência lógica dos dados

## 📈 Tabela de Erros Detalhada

| Linha | Campo | Valor | Erro | Tipo | Solução |
|-------|-------|--------|------|------|---------|
| 2 | Marca | "" | Marca é obrigatória | Obrigatório | Preencha a marca do equipamento |
| 3 | calibrationDate | "invalid-date" | Formato de data inválido | Formato | Use formato YYYY-MM-DD |
| 4 | validityDate | "2023-01-01" | Data de validade vencida | Validação | Atualize a data de validade |
| 5 | status | "Ativo" | Status inválido | Validação | Use: Válido, Vencido ou Em Calibração |

## 🔧 Dicas para Sucesso

### 1. Valide seus Dados Antes
- **Datas**: Certifique-se de que todas as datas estejam no formato `YYYY-MM-DD`
- **Números**: Verifique se os valores numéricos estão dentro dos limites
- **Status**: Use apenas os status permitidos: `Válido`, `Vencido`, `Em Calibração`

### 2. Organize seu Arquivo
- **Cabeçalho**: Mantenha o cabeçalho exatamente como especificado
- **Linhas em Branco**: Remova linhas completamente vazias
- **Caracteres Especiais**: Evite caracteres que possam causar problemas de codificação

### 3. Teste em Pequena Escala
- **Amostra**: Teste com 5-10 linhas primeiro
- **Validação**: Verifique se os dados de amostra são aceitos
- **Escala**: Após validação, processe o arquivo completo

## 📋 Checklist de Validação

Antes de importar, verifique:

- [ ] Todos os campos obrigatórios estão preenchidos
- [ ] Datas estão no formato YYYY-MM-DD
- [ ] Números estão dentro dos limites permitidos
- [ ] Status são válidos (Válido, Vencido, Em Calibração)
- [ ] Não há linhas completamente vazias
- [ ] Temperatura mínima < temperatura máxima
- [ ] Datas de validade são futuras (para novos equipamentos)

## 🚨 Cenários Comuns de Erro

### "Marca é obrigatória"
**Causa**: Campo Marca está vazio
**Solução**: Preencha a marca do equipamento

### "Data de calibração inválida"
**Causa**: Formato incorreto ou data impossível
**Solução**: Use formato YYYY-MM-DD e verifique se a data existe

### "Data de validade vencida"
**Causa**: Data de validade está no passado
**Solução**: Atualize para uma data futura ou marque como "Vencido"

### "Status inválido"
**Causa**: Status diferente dos permitidos
**Solução**: Use apenas: Válido, Vencido, Em Calibração

### "Temperatura mínima deve ser menor que temperatura máxima"
**Causa**: Valores inconsistentes
**Solução**: Corrija para que min < max

## 💡 Dicas Avançadas

### Para Arquivos Grandes (>1000 linhas)
1. **Divida em lotes**: Processe em arquivos menores
2. **Verifique progresso**: Monitore o progresso durante o processamento
3. **Backup**: Mantenha backup do arquivo original

### Para Dados Sensíveis
1. **Validação extra**: Revise cuidadosamente antes de importar
2. **Teste em staging**: Use ambiente de teste primeiro
3. **Auditoria**: Mantenha registro das importações

## 🆘 Suporte

Se encontrar problemas:

1. **Verifique este guia** para soluções comuns
2. **Use os arquivos de teste** fornecidos como referência
3. **Contate o suporte** com o relatório de erro detalhado
4. **Inclua** o arquivo que está tentando importar

## 📞 Contato

Para dúvidas ou problemas:
- **Email**: suporte@sistema-laudos.com.br
- **Telefone**: (11) 1234-5678
- **Horário**: Seg-Sex, 9h-18h

---

**Versão**: 1.0.0  
**Data**: Novembro 2025  
**Última Atualização**: 18/11/2025