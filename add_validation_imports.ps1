$file = "frontend/src/components/EditorLayoutProfissional/index.tsx"
$lines = Get-Content $file

# Encontrar a linha com PageSettingsModal
$pageSettingsLine = 0
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "import PageSettingsModal") {
        $pageSettingsLine = $i
        break
    }
}

# Adicionar imports após PageSettingsModal
$newImports = @(
    "import ValidationResultModal from './components/Modals/ValidationResultModal';",
    "import PDFPreviewModal from './components/Modals/PDFPreviewModal';",
    "import ValidationSelectorModal from './components/Modals/ValidationSelectorModal';",
    "import { validateTemplate } from '../../utils/templateValidation';",
    "import type { ValidationResult } from '../../utils/templateValidation';",
    "import LoadingButton from '../common/LoadingButton';",
    "import { FileCheck, FileSearch } from 'lucide-react';"
)

$newLines = @()
for ($i = 0; $i -lt $lines.Count; $i++) {
    $newLines += $lines[$i]
    if ($i -eq $pageSettingsLine) {
        $newLines += $newImports
    }
}

# Encontrar a linha com galleryTarget
$galleryTargetLine = 0
for ($i = 0; $i -lt $newLines.Count; $i++) {
    if ($newLines[$i] -match "galleryTarget.*useState") {
        $galleryTargetLine = $i
        break
    }
}

# Adicionar estados após galleryTarget
$newStates = @(
    "",
    "  // Novos estados para validação e preview",
    "  const [showValidationModal, setShowValidationModal] = useState(false);",
    "  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);",
    "  const [showValidationSelector, setShowValidationSelector] = useState(false);",
    "  const [showPDFPreview, setShowPDFPreview] = useState(false);",
    "  const [selectedValidationId, setSelectedValidationId] = useState<string | null>(null);",
    "  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);"
)

$newLines2 = @()
for ($i = 0; $i -lt $newLines.Count; $i++) {
    $newLines2 += $newLines[$i]
    if ($i -eq $galleryTargetLine) {
        $newLines2 += $newStates
    }
}

# Salvar arquivo
$newLines2 | Set-Content $file -Encoding UTF8
Write-Host "Imports e estados adicionados com sucesso!"
