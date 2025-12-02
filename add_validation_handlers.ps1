$file = "frontend/src/components/EditorLayoutProfissional/index.tsx"
$lines = Get-Content $file

# Encontrar a linha com handlePreview
$handlePreviewLine = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const handlePreview = useCallback") {
        # Encontrar o final desta função (próximo }, []);)
        for ($j = $i; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "^\s*\}, \[\]\);") {
                $handlePreviewLine = $j
                break
            }
        }
        break
    }
}

# Adicionar handlers após handlePreview
$newHandlers = @(
    "",
    "  const handleValidateTemplate = useCallback(() => {",
    "    if (!editor.template) return;",
    "    const results = validateTemplate(editor.template);",
    "    setValidationResults(results);",
    "    setShowValidationModal(true);",
    "  }, [editor.template]);",
    "",
    "  const handleOpenPDFPreview = useCallback(() => {",
    "    setShowValidationSelector(true);",
    "  }, []);",
    "",
    "  const handleValidationSelect = useCallback((validation: any) => {",
    "    setSelectedValidationId(validation.id);",
    "    setShowValidationSelector(false);",
    "    setShowPDFPreview(true);",
    "  }, []);",
    "",
    "  const handleGeneratePDF = useCallback(async (validationId: string) => {",
    "    setIsGeneratingPDF(true);",
    "    try {",
    "      const token = localStorage.getItem('token');",
    "      const response = await fetch(``/api/editor-templates/`${templateId}/generate-pdf``, {",
    "        method: 'POST',",
    "        headers: {",
    "          'Authorization': ``Bearer `${token}``,",
    "          'Content-Type': 'application/json'",
    "        },",
    "        body: JSON.stringify({ validationId })",
    "      });",
    "",
    "      if (!response.ok) {",
    "        throw new Error('Falha ao gerar PDF');",
    "      }",
    "",
    "      const blob = await response.blob();",
    "      const url = window.URL.createObjectURL(blob);",
    "      const a = document.createElement('a');",
    "      a.href = url;",
    "      a.download = ``relatorio_`${templateId}_`${Date.now()}.pdf``;",
    "      a.click();",
    "      window.URL.revokeObjectURL(url);",
    "    } catch (error) {",
    "      console.error('Erro ao gerar PDF:', error);",
    "    } finally {",
    "      setIsGeneratingPDF(false);",
    "    }",
    "  }, [templateId]);"
)

$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
    if ($i -eq $handlePreviewLine) {
        $newLines += $newHandlers
    }
}

# Salvar arquivo
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Handlers adicionados com sucesso!"
