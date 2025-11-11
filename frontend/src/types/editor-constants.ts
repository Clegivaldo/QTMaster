// Editor Layout Profissional - Constantes e Enums

import { EditorConfig, GlobalStyles, PageSettings } from './editor';

// Constantes para zoom
export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;

// Constantes para grid
export const DEFAULT_GRID_SIZE = 10;
export const SNAP_THRESHOLD = 5;

// Constantes para elementos
export const MIN_ELEMENT_SIZE = { width: 20, height: 20 };
export const DEFAULT_ELEMENT_SIZE = { width: 100, height: 50 };
export const MAX_ELEMENTS = 1000;

// Constantes para histórico
export const MAX_HISTORY_SIZE = 50;
export const AUTO_SAVE_INTERVAL = 30000; // 30 segundos

// Constantes para página A4 (em pixels, 96 DPI)
export const A4_SIZE = {
  portrait: { width: 794, height: 1123 },
  landscape: { width: 1123, height: 794 }
};

// Constantes para outras páginas
export const PAGE_SIZES = {
  A4: { width: 794, height: 1123 },
  A3: { width: 1123, height: 1587 },
  Letter: { width: 816, height: 1056 },
  Legal: { width: 816, height: 1344 }
};

// Margens padrão (em pixels) - 2cm todos os lados
export const DEFAULT_MARGINS = {
  top: 76,    // ~2cm (20mm)
  right: 76,  // ~2cm (20mm)
  bottom: 76, // ~2cm (20mm)
  left: 76    // ~2cm (20mm)
};

// Estilos globais padrão
export const DEFAULT_GLOBAL_STYLES: GlobalStyles = {
  fontFamily: 'Arial, sans-serif',
  fontSize: 14,
  color: '#333333',
  backgroundColor: '#ffffff',
  lineHeight: 1.4
};

// Configurações de página padrão
export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  margins: DEFAULT_MARGINS,
  backgroundColor: '#ffffff',
  showMargins: true
};

// Configuração padrão do editor
export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  maxElements: MAX_ELEMENTS,
  maxHistorySize: MAX_HISTORY_SIZE,
  autoSaveInterval: AUTO_SAVE_INTERVAL,
  gridSize: DEFAULT_GRID_SIZE,
  snapThreshold: SNAP_THRESHOLD,
  zoomLevels: ZOOM_LEVELS,
  defaultPageSettings: DEFAULT_PAGE_SETTINGS,
  defaultGlobalStyles: DEFAULT_GLOBAL_STYLES
};

// Cores padrão para elementos
export const DEFAULT_COLORS = {
  text: '#333333',
  background: '#ffffff',
  border: '#cccccc',
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444'
};

// Fontes disponíveis
export const AVAILABLE_FONTS = [
  'Arial, sans-serif',
  'Helvetica, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Courier New, monospace',
  'Verdana, sans-serif',
  'Tahoma, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, sans-serif',
  'Comic Sans MS, cursive'
];

// Tamanhos de fonte disponíveis
export const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 42, 48, 56, 64, 72];

// Atalhos de teclado
export const KEYBOARD_SHORTCUTS = {
  UNDO: 'Ctrl+Z',
  REDO: 'Ctrl+Y',
  COPY: 'Ctrl+C',
  PASTE: 'Ctrl+V',
  CUT: 'Ctrl+X',
  SELECT_ALL: 'Ctrl+A',
  DELETE: 'Delete',
  ZOOM_IN: 'Ctrl+=',
  ZOOM_OUT: 'Ctrl+-',
  ZOOM_FIT: 'Ctrl+0',
  SAVE: 'Ctrl+S',
  NEW: 'Ctrl+N',
  OPEN: 'Ctrl+O'
};

// Tipos de elementos com suas configurações padrão
export const ELEMENT_DEFAULTS = {
  text: {
    content: 'Texto',
    size: { width: 100, height: 30 },
    styles: {
      fontSize: 14,
      color: DEFAULT_COLORS.text,
      fontFamily: DEFAULT_GLOBAL_STYLES.fontFamily
    }
  },
  heading: {
    content: 'Título',
    size: { width: 200, height: 40 },
    styles: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      color: DEFAULT_COLORS.primary,
      fontFamily: DEFAULT_GLOBAL_STYLES.fontFamily
    }
  },
  image: {
    content: {
      src: '',
      alt: 'Imagem',
      originalSize: { width: 200, height: 150 }
    },
    size: { width: 200, height: 150 },
    styles: {
      border: {
        width: 1,
        style: 'solid' as const,
        color: DEFAULT_COLORS.border
      }
    }
  },
  table: {
    content: {
      rows: 3,
      columns: 3,
      data: [
        ['Cabeçalho 1', 'Cabeçalho 2', 'Cabeçalho 3'],
        ['Linha 1, Col 1', 'Linha 1, Col 2', 'Linha 1, Col 3'],
        ['Linha 2, Col 1', 'Linha 2, Col 2', 'Linha 2, Col 3']
      ],
      headers: ['Cabeçalho 1', 'Cabeçalho 2', 'Cabeçalho 3']
    },
    size: { width: 300, height: 120 },
    styles: {
      border: {
        width: 1,
        style: 'solid' as const,
        color: DEFAULT_COLORS.border
      }
    }
  },
  line: {
    content: {
      startPoint: { x: 0, y: 1 },
      endPoint: { x: 100, y: 1 },
      thickness: 2,
      style: {
        width: 2,
        style: 'solid' as const,
        color: DEFAULT_COLORS.text
      }
    },
    size: { width: 100, height: 2 },
    styles: {
      backgroundColor: 'transparent'
    }
  },
  rectangle: {
    content: {
      fillColor: DEFAULT_COLORS.background,
      strokeColor: DEFAULT_COLORS.border,
      strokeWidth: 1
    },
    size: { width: 100, height: 100 },
    styles: {
      backgroundColor: DEFAULT_COLORS.background,
      border: {
        width: 1,
        style: 'solid' as const,
        color: DEFAULT_COLORS.border
      }
    }
  },
  circle: {
    content: {
      fillColor: DEFAULT_COLORS.background,
      strokeColor: DEFAULT_COLORS.border,
      strokeWidth: 1
    },
    size: { width: 100, height: 100 },
    styles: {
      backgroundColor: DEFAULT_COLORS.background,
      border: {
        width: 1,
        style: 'solid' as const,
        color: DEFAULT_COLORS.border
      },
      borderRadius: 50
    }
  },
  chart: {
    content: {
      type: 'bar' as const,
      data: [],
      config: {}
    },
    size: { width: 300, height: 200 },
    styles: {
      border: {
        width: 1,
        style: 'solid' as const,
        color: DEFAULT_COLORS.border
      }
    }
  },
  signature: {
    content: 'Área de Assinatura',
    size: { width: 200, height: 80 },
    styles: {
      fontSize: 12,
      color: DEFAULT_COLORS.secondary,
      textAlign: 'center' as const,
      border: {
        width: 1,
        style: 'dashed' as const,
        color: DEFAULT_COLORS.border
      }
    }
  },
  barcode: {
    content: '123456789',
    size: { width: 150, height: 50 },
    styles: {
      backgroundColor: DEFAULT_COLORS.background
    }
  },
  qrcode: {
    content: 'https://example.com',
    size: { width: 100, height: 100 },
    styles: {
      backgroundColor: DEFAULT_COLORS.background
    }
  }
};

// Configurações de exportação
export const EXPORT_SETTINGS = {
  pdf: {
    defaultDPI: 300,
    maxDPI: 600,
    quality: 1.0
  },
  png: {
    defaultDPI: 96,
    maxDPI: 300,
    quality: 1.0
  },
  html: {
    includeStyles: true,
    includeScripts: false
  }
};

// Mensagens de erro padrão
export const ERROR_MESSAGES = {
  TEMPLATE_LOAD_FAILED: 'Falha ao carregar o template',
  TEMPLATE_SAVE_FAILED: 'Falha ao salvar o template',
  EXPORT_FAILED: 'Falha ao exportar o template',
  INVALID_ELEMENT_DATA: 'Dados do elemento inválidos',
  CANVAS_RENDER_ERROR: 'Erro ao renderizar o canvas',
  NETWORK_ERROR: 'Erro de conexão com o servidor',
  VALIDATION_ERROR: 'Erro de validação dos dados'
};

// Tooltips e textos de ajuda
export const TOOLTIPS = {
  ADD_TEXT: 'Adicionar elemento de texto',
  ADD_HEADING: 'Adicionar título',
  ADD_IMAGE: 'Adicionar imagem',
  ADD_TABLE: 'Adicionar tabela',
  ADD_LINE: 'Adicionar linha',
  ADD_RECTANGLE: 'Adicionar retângulo',
  ADD_CIRCLE: 'Adicionar círculo',
  ZOOM_IN: 'Aumentar zoom',
  ZOOM_OUT: 'Diminuir zoom',
  ZOOM_FIT: 'Ajustar zoom à tela',
  UNDO: 'Desfazer última ação',
  REDO: 'Refazer ação',
  SAVE: 'Salvar template',
  LOAD: 'Carregar template',
  EXPORT: 'Exportar template',
  TOGGLE_GRID: 'Mostrar/ocultar grade',
  TOGGLE_RULERS: 'Mostrar/ocultar réguas',
  TOGGLE_SNAP: 'Ativar/desativar snap to grid'
};