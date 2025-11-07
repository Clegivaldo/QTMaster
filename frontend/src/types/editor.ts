// Editor Layout Profissional - Interfaces e Tipos TypeScript

// Tipos básicos para elementos
export type ElementType = 
  | 'text'
  | 'heading'
  | 'image'
  | 'table'
  | 'chart'
  | 'line'
  | 'rectangle'
  | 'circle'
  | 'signature'
  | 'barcode'
  | 'qrcode';

// Tipos para estilos
export type FontWeight = 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
export type FontStyle = 'normal' | 'italic' | 'oblique';
export type TextDecoration = 'none' | 'underline' | 'overline' | 'line-through';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
export type PageSize = 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';

// Interfaces para espaçamento e bordas
export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BorderConfig {
  width: number;
  style: BorderStyle;
  color: string;
}

export interface ShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
}

// Interface principal para estilos de elementos
export interface ElementStyles {
  // Typography
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textDecoration?: TextDecoration;
  color?: string;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  
  // Layout
  padding?: Spacing;
  margin?: Spacing;
  border?: BorderConfig;
  borderRadius?: number;
  backgroundColor?: string;
  
  // Advanced
  opacity?: number;
  rotation?: number;
  shadow?: ShadowStyle;
  zIndex?: number;
}

// Posição e tamanho
export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

// Dados específicos para diferentes tipos de elementos
export interface ImageData {
  src: string;
  alt: string;
  originalSize: Size;
  aspectRatio?: number;
}

export interface TableData {
  rows: number;
  columns: number;
  data: string[][];
  headers?: string[];
  columnWidths?: number[];
  rowHeights?: number[];
}

export interface EditorChartData {
  type: 'bar' | 'line' | 'pie' | 'area';
  data: any[];
  config: Record<string, any>;
}

export interface LineData {
  startPoint: Position;
  endPoint: Position;
  thickness: number;
  style: BorderConfig;
}

export interface ShapeData {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

// Interface principal para elementos do template
export interface TemplateElement {
  id: string;
  type: ElementType;
  content: string | ImageData | TableData | EditorChartData | LineData | ShapeData;
  position: Position;
  size: Size;
  styles: ElementStyles;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  groupId?: string;
  metadata?: Record<string, any>;
}

// Interfaces específicas para diferentes tipos de elementos
export interface TextElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'text' | 'heading';
  content: string;
}

export interface ImageElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'image';
  content: ImageData;
}

export interface TableElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'table';
  content: TableData;
}

export interface ChartElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'chart';
  content: EditorChartData;
}

export interface LineElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'line';
  content: LineData;
}

export interface ShapeElement extends Omit<TemplateElement, 'content' | 'type'> {
  type: 'rectangle' | 'circle';
  content: ShapeData;
}

// Configurações globais do template
export interface GlobalStyles {
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  lineHeight: number;
}

export interface PageSettings {
  size: PageSize;
  orientation: PageOrientation;
  margins: Spacing;
  backgroundColor: string;
  showMargins: boolean;
  customSize?: Size;
}

export interface BackgroundImageSettings {
  url: string;
  repeat: 'repeat' | 'no-repeat' | 'repeat-x' | 'repeat-y';
  opacity: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

// Interface principal do template
export interface EditorTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  
  // Content
  elements: TemplateElement[];
  globalStyles: GlobalStyles;
  pageSettings: PageSettings;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
  
  // Settings
  isPublic: boolean;
  tags: string[];
  thumbnail?: string;
  backgroundImage?: BackgroundImageSettings | null;
}

// Estado do editor
export interface EditorState {
  // Template data
  template: EditorTemplate;
  
  // Editor state
  selectedElementIds: string[];
  clipboard: TemplateElement[];
  isDragging: boolean;
  isResizing: boolean;
  
  // Canvas state
  zoom: number;
  panOffset: Position;
  canvasSize: Size;
  
  // History
  history: EditorTemplate[];
  historyIndex: number;
  maxHistorySize: number;
  
  // UI state
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  gridSize: number;
  
  // Modals and panels
  showElementPalette: boolean;
  showPropertiesPanel: boolean;
  activeModal?: 'save' | 'load' | 'export' | 'settings';
}

// Props para componentes
export interface EditorProps {
  isOpen: boolean;
  onClose: () => void;
  templateId?: string;
  onSave?: (template: EditorTemplate) => void;
  onExport?: (template: EditorTemplate, format: ExportFormat) => void;
}

export interface CanvasProps {
  elements: TemplateElement[];
  selectedElementIds: string[];
  zoom: number;
  panOffset: Position;
  onElementSelect: (elementId: string, multiSelect?: boolean) => void;
  onElementMove: (elementId: string, newPosition: Position) => void;
  onElementResize: (elementId: string, newSize: Size) => void;
  onElementEdit: (elementId: string, newContent: any) => void;
  showGrid?: boolean;
  gridSize?: number;
  snapToGrid?: (position: Position) => Position;
  pageSettings?: any; // Configurações da página (tamanho, orientação, etc.)
  backgroundImage?: any; // Imagem de fundo da página
  onAddElement?: (type: ElementType, position?: Position) => void;
  onPanChange?: (offset: Position) => void;
  onWheel?: (e: WheelEvent) => void;
  showRuler?: boolean;
}

export interface ElementPaletteProps {
  onAddElement: (type: ElementType, position?: Position) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export interface PropertiesPanelProps {
  selectedElements: TemplateElement[];
  onUpdateStyles: (elementIds: string[], styles: Partial<ElementStyles>) => void;
  onUpdateContent: (elementId: string, content: any) => void;
  onGroupElements?: () => void;
  onUngroupElements?: () => void;
  onBringToFront?: (elementId: string) => void;
  onSendToBack?: (elementId: string) => void;
  onBringForward?: (elementId: string) => void;
  onSendBackward?: (elementId: string) => void;
  canGroup?: boolean;
  canUngroup?: boolean;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

// Tipos para operações
export type EditorAction = 
  | { type: 'ADD_ELEMENT'; payload: { element: TemplateElement } }
  | { type: 'REMOVE_ELEMENT'; payload: { elementId: string } }
  | { type: 'UPDATE_ELEMENT'; payload: { elementId: string; updates: Partial<TemplateElement> } }
  | { type: 'SELECT_ELEMENTS'; payload: { elementIds: string[] } }
  | { type: 'MOVE_ELEMENT'; payload: { elementId: string; position: Position } }
  | { type: 'RESIZE_ELEMENT'; payload: { elementId: string; size: Size } }
  | { type: 'UPDATE_STYLES'; payload: { elementIds: string[]; styles: Partial<ElementStyles> } }
  | { type: 'SET_ZOOM'; payload: { zoom: number } }
  | { type: 'SET_PAN'; payload: { panOffset: Position } }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_HISTORY' };

// Tipos para exportação
export type ExportFormat = 'pdf' | 'png' | 'html' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  quality?: number;
  dpi?: number;
  includeMetadata?: boolean;
}

// Tipos para erros
export enum EditorErrorType {
  TEMPLATE_LOAD_FAILED = 'TEMPLATE_LOAD_FAILED',
  TEMPLATE_SAVE_FAILED = 'TEMPLATE_SAVE_FAILED',
  EXPORT_FAILED = 'EXPORT_FAILED',
  INVALID_ELEMENT_DATA = 'INVALID_ELEMENT_DATA',
  CANVAS_RENDER_ERROR = 'CANVAS_RENDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface EditorError {
  type: EditorErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
}

// Tipos para validação
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Tipos para configurações do editor
export interface EditorConfig {
  maxElements: number;
  maxHistorySize: number;
  autoSaveInterval: number;
  gridSize: number;
  snapThreshold: number;
  zoomLevels: number[];
  defaultPageSettings: PageSettings;
  defaultGlobalStyles: GlobalStyles;
}

// Tipos para eventos do editor
export interface EditorEvent {
  type: string;
  timestamp: Date;
  data?: any;
}

// Tipos para plugins/extensões (futuro)
export interface EditorPlugin {
  id: string;
  name: string;
  version: string;
  elementTypes?: ElementType[];
  hooks?: Record<string, Function>;
}