$file = "frontend/src/components/EditorLayoutProfissional/index.tsx"
$lines = Get-Content $file

# Encontrar o PreviewModal
$previewModalLine = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "<PreviewModal") {
        # Encontrar o final deste modal (próximo />)
        for ($j = $i; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "^\s*/>") {
                $previewModalLine = $j
                break
            }
        }
        break
    }
}

# Adicionar modais após PreviewModal
$newModals = @(
    "",
    "      <ValidationResultModal",
    "        isOpen={showValidationModal}",
    "        onClose={() => setShowValidationModal(false)}",
    "        result={validationResults}",
    "      />",
    "",
    "      <ValidationSelectorModal",
    "        isOpen={showValidationSelector}",
    "        onClose={() => setShowValidationSelector(false)}",
    "        onSelect={handleValidationSelect}",
    "        templateId={templateId}",
    "        onGeneratePDF={handleGeneratePDF}",
    "      />",
    "",
    "      <PDFPreviewModal",
    "        isOpen={showPDFPreview}",
    "        onClose={() => setShowPDFPreview(false)}",
    "        templateId={templateId}",
    "        validationId={selectedValidationId || ''}",
    "        onGeneratePDF={handleGeneratePDF}",
    "      />"
)

$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
    if ($i -eq $previewModalLine) {
        $newLines += $newModals
    }
}

# Salvar arquivo
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Modais adicionados com sucesso!"
