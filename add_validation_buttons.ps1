$file = "frontend/src/components/EditorLayoutProfissional/index.tsx"
$lines = Get-Content $file

# Encontrar o botão handlePreview na toolbar
$previewButtonLine = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "onClick=\{handlePreview\}" -and $lines[$i] -match "button") {
        # Voltar para encontrar o início do botão
        for ($j = $i; $j -ge 0; $j--) {
            if ($lines[$j] -match "^\s*<button") {
                $previewButtonLine = $j - 1  # Inserir antes do botão
                break
            }
        }
        break
    }
}

# Adicionar botões antes do handlePreview
$newButtons = @(
    "            <button",
    "              onClick={handleValidateTemplate}",
    "              className=`"bg-yellow-600 hover:bg-yellow-700 p-2 rounded-full flex items-center justify-center transition-colors`"",
    "              title=`"Validar Template`"",
    "            >",
    "              <FileCheck className=`"h-4 w-4`" />",
    "            </button>",
    "",
    "            <button",
    "              onClick={handleOpenPDFPreview}",
    "              className=`"bg-orange-600 hover:bg-orange-700 p-2 rounded-full flex items-center justify-center transition-colors`"",
    "              title=`"Preview PDF`"",
    "            >",
    "              <FileSearch className=`"h-4 w-4`" />",
    "            </button>",
    ""
)

$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($i -eq $previewButtonLine) {
        $newLines += $newButtons
    }
    $newLines += $lines[$i]
}

# Salvar arquivo
$newLines | Set-Content $file -Encoding UTF8
Write-Host "Botões adicionados com sucesso!"
