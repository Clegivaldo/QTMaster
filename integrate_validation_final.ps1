# Script robusto para integrar validação no EditorLayoutProfissional
$ErrorActionPreference = "Stop"

$file = "frontend\src\components\EditorLayoutProfissional\index.tsx"
Write-Host "Lendo arquivo: $file" -ForegroundColor Cyan

# Ler todas as linhas
$lines = Get-Content $file -Encoding UTF8

Write-Host "Total de linhas no arquivo: $($lines.Count)" -ForegroundColor Yellow

# Criar novo array para as linhas modificadas
$newLines = New-Object System.Collections.ArrayList

# Flags para controlar inserções
$importsAdded = $false
$statesAdded = $false
$handlersAdded = $false
$buttonsAdded = $false
$modalsAdded = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # 1. Adicionar imports após PageSettingsModal
    if (-not $importsAdded -and $line -match "import PageSettingsModal") {
        [void]$newLines.Add($line)
        [void]$newLines.Add("import ValidationResultModal from './components/Modals/ValidationResultModal';")
        [void]$newLines.Add("import PDFPreviewModal from './components/Modals/PDFPreviewModal';")
        [void]$newLines.Add("import ValidationSelectorModal from './components/Modals/ValidationSelectorModal';")
        [void]$newLines.Add("import { validateTemplate } from '../../utils/templateValidation';")
        [void]$newLines.Add("import type { ValidationResult } from '../../utils/templateValidation';")
        [void]$newLines.Add("import LoadingButton from '../common/LoadingButton';")
        [void]$newLines.Add("import { FileCheck, FileSearch } from 'lucide-react';")
        $importsAdded = $true
        Write-Host "✓ Imports adicionados" -ForegroundColor Green
        continue
    }
    
    # 2. Adicionar estados após galleryTarget
    if (-not $statesAdded -and $line -match "galleryTarget.*useState") {
        [void]$newLines.Add($line)
        [void]$newLines.Add("")
        [void]$newLines.Add("  // Novos estados para validação e preview")
        [void]$newLines.Add("  const [showValidationModal, setShowValidationModal] = useState(false);")
        [void]$newLines.Add("  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);")
        [void]$newLines.Add("  const [showValidationSelector, setShowValidationSelector] = useState(false);")
        [void]$newLines.Add("  const [showPDFPreview, setShowPDFPreview] = useState(false);")
        [void]$newLines.Add("  const [selectedValidationId, setSelectedValidationId] = useState<string | null>(null);")
        [void]$newLines.Add("  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);")
        $statesAdded = $true
        Write-Host "✓ Estados adicionados" -ForegroundColor Green
        continue
    }
    
    # 3. Adicionar handlers após handlePreview
    if (-not $handlersAdded -and $line -match "const handlePreview = useCallback") {
        # Adicionar a linha atual
        [void]$newLines.Add($line)
        # Copiar até o final da função handlePreview
        $i++
        while ($i -lt $lines.Count -and $lines[$i] -notmatch "^\s*\}, \[\]\);") {
            [void]$newLines.Add($lines[$i])
            $i++
        }
        # Adicionar a linha de fechamento
        [void]$newLines.Add($lines[$i])
        
        # Agora adicionar os novos handlers
        [void]$newLines.Add("")
        [void]$newLines.Add("  const handleValidateTemplate = useCallback(() => {")
        [void]$newLines.Add("    if (!editor.template) return;")
        [void]$newLines.Add("    const results = validateTemplate(editor.template);")
        [void]$newLines.Add("    setValidationResults(results);")
        [void]$newLines.Add("    setShowValidationModal(true);")
        [void]$newLines.Add("  }, [editor.template]);")
        [void]$newLines.Add("")
        [void]$newLines.Add("  const handleOpenPDFPreview = useCallback(() => {")
        [void]$newLines.Add("    setShowValidationSelector(true);")
        [void]$newLines.Add("  }, []);")
        [void]$newLines.Add("")
        [void]$newLines.Add("  const handleValidationSelect = useCallback((validation: any) => {")
        [void]$newLines.Add("    setSelectedValidationId(validation.id);")
        [void]$newLines.Add("    setShowValidationSelector(false);")
        [void]$newLines.Add("    setShowPDFPreview(true);")
        [void]$newLines.Add("  }, []);")
        [void]$newLines.Add("")
        [void]$newLines.Add("  const handleGeneratePDF = useCallback(async (validationId: string) => {")
        [void]$newLines.Add("    setIsGeneratingPDF(true);")
        [void]$newLines.Add("    try {")
        [void]$newLines.Add("      const token = localStorage.getItem('token');")
        [void]$newLines.Add("      const response = await fetch(`/api/editor-templates/`${templateId}/generate-pdf`, {")
        [void]$newLines.Add("        method: 'POST',")
        [void]$newLines.Add("        headers: {")
        [void]$newLines.Add("          'Authorization': `Bearer `${token}`,")
        [void]$newLines.Add("          'Content-Type': 'application/json'")
        [void]$newLines.Add("        },")
        [void]$newLines.Add("        body: JSON.stringify({ validationId })")
        [void]$newLines.Add("      });")
        [void]$newLines.Add("")
        [void]$newLines.Add("      if (!response.ok) {")
        [void]$newLines.Add("        throw new Error('Falha ao gerar PDF');")
        [void]$newLines.Add("      }")
        [void]$newLines.Add("")
        [void]$newLines.Add("      const blob = await response.blob();")
        [void]$newLines.Add("      const url = window.URL.createObjectURL(blob);")
        [void]$newLines.Add("      const a = document.createElement('a');")
        [void]$newLines.Add("      a.href = url;")
        [void]$newLines.Add("      a.download = `relatorio_`${templateId}_`${Date.now()}.pdf`;")
        [void]$newLines.Add("      a.click();")
        [void]$newLines.Add("      window.URL.revokeObjectURL(url);")
        [void]$newLines.Add("    } catch (error) {")
        [void]$newLines.Add("      console.error('Erro ao gerar PDF:', error);")
        [void]$newLines.Add("    } finally {")
        [void]$newLines.Add("      setIsGeneratingPDF(false);")
        [void]$newLines.Add("    }")
        [void]$newLines.Add("  }, [templateId]);")
        
        $handlersAdded = $true
        Write-Host "✓ Handlers adicionados" -ForegroundColor Green
        continue
    }
    
    # 4. Adicionar botões antes do botão handlePreview
    if (-not $buttonsAdded -and $line -match "onClick=\{handlePreview\}") {
        # Voltar para encontrar o início do botão
        $buttonStart = $newLines.Count - 1
        while ($buttonStart -ge 0 -and $newLines[$buttonStart] -notmatch "^\s*<button") {
            $buttonStart--
        }
        
        # Inserir novos botões antes
        $tempLines = New-Object System.Collections.ArrayList
        for ($j = 0; $j -lt $buttonStart; $j++) {
            [void]$tempLines.Add($newLines[$j])
        }
        
        # Adicionar novos botões
        [void]$tempLines.Add("            <button")
        [void]$tempLines.Add("              onClick={handleValidateTemplate}")
        [void]$tempLines.Add('              className="bg-yellow-600 hover:bg-yellow-700 p-2 rounded-full flex items-center justify-center transition-colors"')
        [void]$tempLines.Add('              title="Validar Template"')
        [void]$tempLines.Add("            >")
        [void]$tempLines.Add('              <FileCheck className="h-4 w-4" />')
        [void]$tempLines.Add("            </button>")
        [void]$tempLines.Add("")
        [void]$tempLines.Add("            <button")
        [void]$tempLines.Add("              onClick={handleOpenPDFPreview}")
        [void]$tempLines.Add('              className="bg-orange-600 hover:bg-orange-700 p-2 rounded-full flex items-center justify-center transition-colors"')
        [void]$tempLines.Add('              title="Preview PDF"')
        [void]$tempLines.Add("            >")
        [void]$tempLines.Add('              <FileSearch className="h-4 w-4" />')
        [void]$tempLines.Add("            </button>")
        [void]$tempLines.Add("")
        
        # Adicionar o resto
        for ($j = $buttonStart; $j -lt $newLines.Count; $j++) {
            [void]$tempLines.Add($newLines[$j])
        }
        [void]$tempLines.Add($line)
        
        $newLines = $tempLines
        $buttonsAdded = $true
        Write-Host "✓ Botões adicionados" -ForegroundColor Green
        continue
    }
    
    # 5. Adicionar modais após PreviewModal
    if (-not $modalsAdded -and $line -match "<PreviewModal") {
        # Adicionar a linha atual
        [void]$newLines.Add($line)
        # Copiar até o final do modal
        $i++
        while ($i -lt $lines.Count -and $lines[$i].Trim() -ne "/>") {
            [void]$newLines.Add($lines[$i])
            $i++
        }
        # Adicionar a linha de fechamento
        [void]$newLines.Add($lines[$i])
        
        # Adicionar novos modais
        [void]$newLines.Add("")
        [void]$newLines.Add("      <ValidationResultModal")
        [void]$newLines.Add("        isOpen={showValidationModal}")
        [void]$newLines.Add("        onClose={() => setShowValidationModal(false)}")
        [void]$newLines.Add("        result={validationResults}")
        [void]$newLines.Add("      />")
        [void]$newLines.Add("")
        [void]$newLines.Add("      <ValidationSelectorModal")
        [void]$newLines.Add("        isOpen={showValidationSelector}")
        [void]$newLines.Add("        onClose={() => setShowValidationSelector(false)}")
        [void]$newLines.Add("        onSelect={handleValidationSelect}")
        [void]$newLines.Add("        templateId={templateId}")
        [void]$newLines.Add("        onGeneratePDF={handleGeneratePDF}")
        [void]$newLines.Add("      />")
        [void]$newLines.Add("")
        [void]$newLines.Add("      <PDFPreviewModal")
        [void]$newLines.Add("        isOpen={showPDFPreview}")
        [void]$newLines.Add("        onClose={() => setShowPDFPreview(false)}")
        [void]$newLines.Add("        templateId={templateId}")
        [void]$newLines.Add("        validationId={selectedValidationId || ''}")
        [void]$newLines.Add("        onGeneratePDF={handleGeneratePDF}")
        [void]$newLines.Add("      />")
        
        $modalsAdded = $true
        Write-Host "✓ Modais adicionados" -ForegroundColor Green
        continue
    }
    
    # Adicionar linha normal
    [void]$newLines.Add($line)
}

# Salvar arquivo
$newLines | Set-Content $file -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ INTEGRAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resumo das modificações:" -ForegroundColor Yellow
Write-Host "  ✓ Imports: $importsAdded" -ForegroundColor $(if($importsAdded){"Green"}else{"Red"})
Write-Host "  ✓ Estados: $statesAdded" -ForegroundColor $(if($statesAdded){"Green"}else{"Red"})
Write-Host "  ✓ Handlers: $handlersAdded" -ForegroundColor $(if($handlersAdded){"Green"}else{"Red"})
Write-Host "  ✓ Botões: $buttonsAdded" -ForegroundColor $(if($buttonsAdded){"Green"}else{"Red"})
Write-Host "  ✓ Modais: $modalsAdded" -ForegroundColor $(if($modalsAdded){"Green"}else{"Red"})
Write-Host ""
Write-Host "Linhas originais: $($lines.Count)" -ForegroundColor Yellow
Write-Host "Linhas modificadas: $($newLines.Count)" -ForegroundColor Yellow
Write-Host "Linhas adicionadas: $($newLines.Count - $lines.Count)" -ForegroundColor Yellow
