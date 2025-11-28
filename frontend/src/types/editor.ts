export type ElementType = 'text' | 'table' | 'chart' | 'image' | 'header' | 'footer' | 'shape';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface BaseElement {
  id: string;
  type: ElementType;
  position: Position;
  size: Size;
  rotation: number;
  zIndex: number;
  locked: boolean;
  visible: boolean;
}

// Elemento de texto
export interface TextElement extends BaseElement {
  type: 'text';
  properties: {
    content: string;
    isDynamic?: boolean; // If true, content can contain {{variable}} templates
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    textAlign: 'left' | 'center' | 'right' | 'justify';
    fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline' | 'line-through';
    lineHeight: number;
    padding: number;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  };
}

// Elemento de tabela
export interface TableElement extends BaseElement {
  type: 'table';
  properties: {
    dataSource: string; // Template variable, e.g., "{{sensorData}}"
    columns: TableColumn[];
    showHeader: boolean;
    headerStyle: React.CSSProperties;
    rowStyle: React.CSSProperties;
    alternatingRowColors: boolean;
    borderStyle: 'none' | 'grid' | 'horizontal' | 'vertical';
    fontSize: number;
    fontFamily: string;
    maxRows: number;
    pageBreak: boolean;
  };
}

export interface TableColumn {
  field: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'number' | 'date' | 'temperature' | 'humidity' | 'percentage' | 'currency';
  decimalPlaces?: number;
  dateFormat?: string;
  currencySymbol?: string;
}

// Elemento de gráfico
export interface ChartElement extends BaseElement {
  type: 'chart';
  properties: {
    chartType: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'scatter' | 'area';
    dataSource: string; // Template variable, e.g., "{{sensorData}}"
    xAxis: string; // Field name for X-axis
    yAxis: string | string[]; // Field name(s) for Y-axis
    title: string;
    width: string | number;
    height: string | number;
    colors: string[];
    showLegend: boolean;
    showGrid: boolean;
    showLabels: boolean;
    responsive: boolean;
    animation: boolean;
    legendPosition: 'top' | 'bottom' | 'left' | 'right';
  };
}

// Elemento de imagem
export interface ImageElement extends BaseElement {
  type: 'image';
  properties: {
    src: string;
    alt: string;
    width: string | number;
    height: string | number;
    objectFit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    shadow: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
  };
}

// Elemento de cabeçalho
export interface HeaderElement extends BaseElement {
  type: 'header';
  properties: {
    title: string;
    subtitle?: string;
    logo?: string;
    logoPosition: 'left' | 'center' | 'right';
    titlePosition: 'left' | 'center' | 'right';
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
    padding: number;
    borderBottomWidth: number;
    borderBottomColor: string;
    showLogo: boolean;
    showDate: boolean;
    showPageNumbers: boolean;
  };
}

// Elemento de rodapé
export interface FooterElement extends BaseElement {
  type: 'footer';
  properties: {
    text: string;
    backgroundColor: string;
    textColor: string;
    fontSize: number;
    fontFamily: string;
    padding: number;
    borderTopWidth: number;
    borderTopColor: string;
    textAlign: 'left' | 'center' | 'right';
    showDate: boolean;
    showPageNumbers: boolean;
    showCompanyInfo: boolean;
    companyInfo?: string;
  };
}

// Elemento de forma (retângulo, círculo, linha)
export interface ShapeElement extends BaseElement {
  type: 'shape';
  properties: {
    shapeType: 'rectangle' | 'circle' | 'line';
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
    width: number;
    height: number;
    rotation: number;
  };
}

// Tipos de elementos unidos
export type EditorElement =
  | TextElement
  | TableElement
  | ChartElement
  | ImageElement
  | HeaderElement
  | FooterElement
  | ShapeElement;

// Configurações do editor
export interface EditorConfig {
  pageSize: 'A4' | 'A3' | 'Letter' | 'Legal' | 'Custom';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  backgroundColor: string;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  gridColor: string;
  zoom: number;
  theme: 'light' | 'dark';
}

// Template completo
export interface Template {
  id: string;
  name: string;
  description?: string;
  category: string;
  elements: EditorElement[];
  config: EditorConfig;
  globalStyles: {
    fontFamily: string;
    fontSize: number;
    color: string;
    backgroundColor: string;
  };
  tags: string[];
  thumbnail?: string;
  isPublic: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Variáveis de template
export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'array' | 'object' | 'boolean';
  description: string;
  example: any;
  required?: boolean;
  category: string;
  path: string; // Caminho no objeto de dados (ex: "client.name")
}

// Dados de contexto para renderização
export interface RenderContext {
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    cnpj?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    complement?: string;
  };
  validation: {
    id: string;
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    duration: string;
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number;
    maxHumidity?: number;
    isApproved?: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  statistics: {
    temperature: {
      min: number;
      max: number;
      average: number;
      standardDeviation: number;
      median?: number;
      q1?: number;
      q3?: number;
    };
    humidity?: {
      min: number;
      max: number;
      average: number;
      standardDeviation: number;
      median?: number;
      q1?: number;
      q3?: number;
    };
    readingsCount: number;
    duration: string;
    outliers?: number;
    dataQuality?: number;
  };
  sensorData: Array<{
    id: string;
    sensorId: string;
    timestamp: Date;
    temperature: number;
    humidity?: number;
    fileName: string;
    rowNumber: number;
    validationId?: string;
  }>;
  sensors: Array<{
    id: string;
    serialNumber: string;
    model: string;
    typeId: string;
    calibrationDate?: Date;
    position?: number;
  }>;
  currentDate: string;
  currentTime: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  pageNumber: number;
  totalPages: number;
}

// Configuração de exportação
export interface ExportConfig {
  format: 'pdf' | 'html' | 'docx';
  quality: 'low' | 'medium' | 'high';
  includeMetadata: boolean;
  password?: string;
  watermark?: string;
  header?: string;
  footer?: string;
}

// Elemento simplificado para Canvas (frontend)
export interface CanvasElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  content?: string;
  config: ElementConfig;
  properties?: Record<string, any>;
}

export interface ElementConfig {
  title?: string;
  subtitle?: string;
  content?: string;
  dataSource?: string;
  chartType?: string;
  text?: string;
  showPageNumber?: boolean;
  alt?: string;
}

// Tipos para drag-and-drop
export interface DragItem {
  id: string;
  type: ElementType;
  isNewElement: boolean;
  element?: CanvasElement;
}

// Tipos para propriedades de elementos
export interface ElementProperty {
  name: string;
  type: 'text' | 'number' | 'color' | 'select' | 'boolean' | 'textarea' | 'file';
  label: string;
  description?: string;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  group?: string;
}

// Resposta da API de templates
export interface TemplateResponse {
  success: boolean;
  data?: Template;
  error?: string;
  message?: string;
}

// Lista de templates
export interface TemplateListResponse {
  success: boolean;
  data: {
    templates: Template[];
    total: number;
    page: number;
    limit: number;
    categories: string[];
  };
  error?: string;
}
