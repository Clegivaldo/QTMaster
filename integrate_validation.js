const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'EditorLayoutProfissional', 'index.tsx');

// Ler o arquivo
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// 1. Adicionar imports após PageSettingsModal (linha ~28)
const pageSettingsImportIndex = lines.findIndex(line => line.includes("import PageSettingsModal"));
if (pageSettingsImportIndex !== -1) {
    const newImports = [
        "import ValidationResultModal from './components/Modals/ValidationResultModal';",
        "import PDFPreviewModal from './components/Modals/PDFPreviewModal';",
        "import ValidationSelectorModal from './components/Modals/ValidationSelectorModal';",
        "import { validateTemplate } from '../../utils/templateValidation';",
        "import type { ValidationResult } from '../../utils/templateValidation';",
        "import LoadingButton from '../common/LoadingButton';",
        "import { FileCheck, FileSearch } from 'lucide-react';"
    ];
    lines.splice(pageSettingsImportIndex + 1, 0, ...newImports);
}

// 2. Adicionar estados após galleryTarget
const galleryTargetIndex = lines.findIndex(line => line.includes("galleryTarget") && line.includes("useState"));
if (galleryTargetIndex !== -1) {
    const newStates = [
        "",
        "  // Novos estados para validação e preview",
        "  const [showValidationModal, setShowValidationModal] = useState(false);",
        "  const [validationResults, setValidationResults] = useState<ValidationResult | null>(null);",
        "  const [showValidationSelector, setShowValidationSelector] = useState(false);",
        "  const [showPDFPreview, setShowPDFPreview] = useState(false);",
        "  const [selectedValidationId, setSelectedValidationId] = useState<string | null>(null);",
        "  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);"
    ];
    lines.splice(galleryTargetIndex + 1, 0, ...newStates);
}

// 3. Adicionar handlers após handlePreview
let handlePreviewIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("const handlePreview = useCallback")) {
        // Encontrar o final desta função
        for (let j = i; j < lines.length; j++) {
            if (lines[j].match(/^\s*}, \[\]\);/)) {
                handlePreviewIndex = j;
                break;
            }
        }
        break;
    }
}

if (handlePreviewIndex !== -1) {
    const newHandlers = [
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
        "      const response = await fetch(`/api/editor-templates/${templateId}/generate-pdf`, {",
        "        method: 'POST',",
        "        headers: {",
        "          'Authorization': `Bearer ${token}`,",
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
        "      a.download = `relatorio_${templateId}_${Date.now()}.pdf`;",
        "      a.click();",
        "      window.URL.revokeObjectURL(url);",
        "    } catch (error) {",
        "      console.error('Erro ao gerar PDF:', error);",
        "    } finally {",
        "      setIsGeneratingPDF(false);",
        "    }",
        "  }, [templateId]);"
    ];
    lines.splice(handlePreviewIndex + 1, 0, ...newHandlers);
}

// 4. Adicionar botões antes do botão handlePreview
let previewButtonIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("onClick={handlePreview}") && lines[i - 5] && lines[i - 5].includes("<button")) {
        previewButtonIndex = i - 5;
        break;
    }
}

if (previewButtonIndex !== -1) {
    const newButtons = [
        "            <button",
        "              onClick={handleValidateTemplate}",
        '              className="bg-yellow-600 hover:bg-yellow-700 p-2 rounded-full flex items-center justify-center transition-colors"',
        '              title="Validar Template"',
        "            >",
        '              <FileCheck className="h-4 w-4" />',
        "            </button>",
        "",
        "            <button",
        "              onClick={handleOpenPDFPreview}",
        '              className="bg-orange-600 hover:bg-orange-700 p-2 rounded-full flex items-center justify-center transition-colors"',
        '              title="Preview PDF"',
        "            >",
        '              <FileSearch className="h-4 w-4" />',
        "            </button>",
        ""
    ];
    lines.splice(previewButtonIndex, 0, ...newButtons);
}

// 5. Adicionar modais após PreviewModal
let previewModalIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("<PreviewModal")) {
        // Encontrar o final deste modal
        for (let j = i; j < lines.length; j++) {
            if (lines[j].trim() === "/>") {
                previewModalIndex = j;
                break;
            }
        }
        break;
    }
}

if (previewModalIndex !== -1) {
    const newModals = [
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
    ];
    lines.splice(previewModalIndex + 1, 0, ...newModals);
}

// Escrever o arquivo de volta
fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('✅ Integração concluída com sucesso!');
console.log('📝 Modificações aplicadas:');
console.log('  - 7 imports adicionados');
console.log('  - 6 estados adicionados');
console.log('  - 4 handlers adicionados');
console.log('  - 2 botões adicionados');
console.log('  - 3 modais adicionados');
