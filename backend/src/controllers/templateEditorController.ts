import { Request, Response } from 'express';
import { ReportGenerationService } from '../services/reportGenerationService.js';
import fs from 'fs';
import path from 'path';

const reportService = new ReportGenerationService();

export interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'table' | 'chart' | 'signature' | 'header' | 'footer';
  content: string;
  styles: {
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    backgroundColor?: string;
    textAlign?: string;
    padding?: string;
    margin?: string;
    border?: string;
    borderRadius?: string;
    width?: string;
    height?: string;
    position?: string;
    top?: string;
    left?: string;
    zIndex?: number;
  };
  data?: any;
}

export interface TemplateLayout {
  id: string;
  name: string;
  description: string;
  elements: TemplateElement[];
  globalStyles: {
    fontFamily?: string;
    backgroundColor?: string;
    backgroundImage?: string;
    pageSize?: string;
    margins?: {
      top: string;
      right: string;
      bottom: string;
      left: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateEditorController {
  /**
   * Retorna a interface do editor visual
   */
  static async getEditor(req: Request, res: Response) {
    try {
      const editorHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor Visual de Templates - FastReport</title>
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f7fa;
            height: 100vh;
            overflow: hidden;
        }
        
        .editor-container {
            display: grid;
            grid-template-columns: 300px 1fr 350px;
            grid-template-rows: 60px 1fr;
            height: 100vh;
        }
        
        .toolbar {
            grid-column: 1 / -1;
            background: #2563eb;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 20px;
            gap: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .toolbar h1 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .toolbar button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        
        .toolbar button:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .sidebar {
            background: white;
            border-right: 1px solid #e2e8f0;
            overflow-y: auto;
        }
        
        .sidebar-section {
            border-bottom: 1px solid #e2e8f0;
        }
        
        .sidebar-header {
            background: #f8fafc;
            padding: 15px 20px;
            font-weight: 600;
            color: #374151;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .sidebar-content {
            padding: 20px;
        }
        
        .element-palette {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .palette-item {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            cursor: grab;
            transition: all 0.2s;
            font-size: 12px;
            color: #64748b;
        }
        
        .palette-item:hover {
            border-color: #2563eb;
            background: #eff6ff;
            color: #2563eb;
        }
        
        .palette-item:active {
            cursor: grabbing;
        }
        
        .canvas-container {
            background: #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 40px;
            overflow: auto;
        }
        
        .canvas {
            background: white;
            width: 794px;
            min-height: 1123px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            border-radius: 8px;
            position: relative;
            padding: 40px;
        }
        
        .canvas-element {
            position: relative;
            border: 2px solid transparent;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
            min-height: 30px;
            margin: 10px 0;
        }
        
        .canvas-element:hover {
            border-color: #3b82f6;
            background: rgba(59, 130, 246, 0.05);
        }
        
        .canvas-element.selected {
            border-color: #2563eb;
            background: rgba(37, 99, 235, 0.1);
        }
        
        .canvas-element .element-controls {
            position: absolute;
            top: -30px;
            right: 0;
            display: none;
            gap: 5px;
        }
        
        .canvas-element:hover .element-controls,
        .canvas-element.selected .element-controls {
            display: flex;
        }
        
        .element-control {
            background: #2563eb;
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .properties-panel {
            background: white;
            border-left: 1px solid #e2e8f0;
            overflow-y: auto;
        }
        
        .property-group {
            border-bottom: 1px solid #e2e8f0;
            padding: 20px;
        }
        
        .property-group h3 {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
        }
        
        .property-item {
            margin-bottom: 15px;
        }
        
        .property-label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .property-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .property-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .color-picker {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .color-swatch {
            width: 30px;
            height: 30px;
            border-radius: 6px;
            border: 1px solid #d1d5db;
            cursor: pointer;
        }
        
        .font-controls {
            display: flex;
            gap: 5px;
        }
        
        .font-control {
            flex: 1;
            padding: 6px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            text-align: center;
            font-size: 12px;
        }
        
        .font-control.active {
            background: #2563eb;
            color: white;
            border-color: #2563eb;
        }
        
        .image-gallery {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        
        .gallery-item {
            aspect-ratio: 1;
            background: #f3f4f6;
            border: 2px solid #e5e7eb;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: #6b7280;
            transition: all 0.2s;
        }
        
        .gallery-item:hover {
            border-color: #2563eb;
            background: #eff6ff;
        }
        
        .drop-zone {
            border: 2px dashed #cbd5e1;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            color: #64748b;
            margin: 10px 0;
            transition: all 0.2s;
        }
        
        .drop-zone.drag-over {
            border-color: #2563eb;
            background: #eff6ff;
            color: #2563eb;
        }
        
        .preview-button {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: #16a34a;
            color: white;
            border: none;
            padding: 15px 25px;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);
            transition: all 0.2s;
        }
        
        .preview-button:hover {
            background: #15803d;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
        }
    </style>
</head>
<body>
    <div class="editor-container">
        <!-- Toolbar -->
        <div class="toolbar">
            <h1>🎨 Editor Visual de Templates</h1>
            <button onclick="newTemplate()">📄 Novo</button>
            <button onclick="saveTemplate()">💾 Salvar</button>
            <button onclick="loadTemplate()">📂 Carregar</button>
            <button onclick="exportTemplate()">📤 Exportar</button>
            <button onclick="loadImageGallery()">🔄 Recarregar</button>
            <span style="margin-left: auto; font-size: 14px;">
                Elementos: <span id="elementCount">0</span>
            </span>
        </div>
        
        <!-- Sidebar Esquerda - Elementos -->
        <div class="sidebar">
            <div class="sidebar-section">
                <div class="sidebar-header">📦 Elementos</div>
                <div class="sidebar-content">
                    <div class="element-palette">
                        <div class="palette-item" draggable="true" data-type="text">
                            📝<br>Texto
                        </div>
                        <div class="palette-item" draggable="true" data-type="header">
                            🏷️<br>Cabeçalho
                        </div>
                        <div class="palette-item" draggable="true" data-type="image">
                            🖼️<br>Imagem
                        </div>
                        <div class="palette-item" draggable="true" data-type="table">
                            📊<br>Tabela
                        </div>
                        <div class="palette-item" draggable="true" data-type="chart">
                            📈<br>Gráfico
                        </div>
                        <div class="palette-item" draggable="true" data-type="signature">
                            ✍️<br>Assinatura
                        </div>
                        <div class="palette-item" draggable="true" data-type="footer">
                            🦶<br>Rodapé
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-section">
                <div class="sidebar-header">🖼️ Galeria de Imagens</div>
                <div class="sidebar-content">
                    <div class="image-gallery" id="imageGallery">
                        <div class="gallery-item loading">Carregando...</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Canvas Central -->
        <div class="canvas-container">
            <div class="canvas" id="canvas">
                <div class="drop-zone" id="dropZone">
                    🎯 Arraste elementos aqui para começar a criar seu template
                </div>
            </div>
        </div>
        
        <!-- Sidebar Direita - Propriedades -->
        <div class="properties-panel">
            <div class="property-group">
                <h3>🎨 Aparência</h3>
                <div class="property-item">
                    <label class="property-label">Tamanho da Fonte</label>
                    <input type="number" class="property-input" id="fontSize" min="8" max="72" value="16" step="1">
                </div>
                <div class="property-item">
                    <label class="property-label">Cor do Texto</label>
                    <div class="color-picker">
                        <input type="color" id="textColor" value="#000000">
                        <div class="color-swatch" style="background: #000000;"></div>
                    </div>
                </div>
                <div class="property-item">
                    <label class="property-label">Cor de Fundo</label>
                    <div class="color-picker">
                        <input type="color" id="backgroundColor" value="#ffffff">
                        <div class="color-swatch" style="background: #ffffff;"></div>
                    </div>
                </div>
            </div>
            
            <div class="property-group">
                <h3>📝 Formatação</h3>
                <div class="property-item">
                    <label class="property-label">Estilo do Texto</label>
                    <div class="font-controls">
                        <button class="font-control" id="boldBtn" onclick="toggleBold()">B</button>
                        <button class="font-control" id="italicBtn" onclick="toggleItalic()">I</button>
                        <button class="font-control" id="underlineBtn" onclick="toggleUnderline()">U</button>
                    </div>
                </div>
                <div class="property-item">
                    <label class="property-label">Alinhamento</label>
                    <div class="font-controls">
                        <button class="font-control" onclick="setAlignment('left')">⬅️</button>
                        <button class="font-control" onclick="setAlignment('center')">↔️</button>
                        <button class="font-control" onclick="setAlignment('right')">➡️</button>
                    </div>
                </div>
            </div>
            
            <div class="property-group">
                <h3>📐 Posicionamento</h3>
                <div class="property-item">
                    <label class="property-label">Espaçamento Interno</label>
                    <input type="text" class="property-input" id="padding" placeholder="10px">
                </div>
                <div class="property-item">
                    <label class="property-label">Margem Externa</label>
                    <input type="text" class="property-input" id="margin" placeholder="10px">
                </div>
                <div class="property-item">
                    <label class="property-label">Largura</label>
                    <input type="text" class="property-input" id="width" placeholder="auto">
                </div>
                <div class="property-item">
                    <label class="property-label">Altura</label>
                    <input type="text" class="property-input" id="height" placeholder="auto">
                </div>
            </div>
            
            <div class="property-group">
                <h3>📄 Configurações da Página</h3>
                <div class="property-item">
                    <label class="property-label">Margem Superior</label>
                    <input type="text" class="property-input" id="pageMarginTop" placeholder="20mm" value="20mm">
                </div>
                <div class="property-item">
                    <label class="property-label">Margem Inferior</label>
                    <input type="text" class="property-input" id="pageMarginBottom" placeholder="20mm" value="20mm">
                </div>
                <div class="property-item">
                    <label class="property-label">Margem Esquerda</label>
                    <input type="text" class="property-input" id="pageMarginLeft" placeholder="15mm" value="15mm">
                </div>
                <div class="property-item">
                    <label class="property-label">Margem Direita</label>
                    <input type="text" class="property-input" id="pageMarginRight" placeholder="15mm" value="15mm">
                </div>
            </div>
            
            <div class="property-group" id="imageControls" style="display: none;">
                <h3>🖼️ Controles de Imagem</h3>
                <div class="property-item">
                    <label class="property-label">Largura da Imagem</label>
                    <input type="number" class="property-input" id="imageWidth" min="50" max="800" step="10" placeholder="200">
                </div>
                <div class="property-item">
                    <label class="property-label">Altura da Imagem</label>
                    <input type="number" class="property-input" id="imageHeight" min="50" max="600" step="10" placeholder="150">
                </div>
                <div class="property-item">
                    <label class="property-label">Ajuste da Imagem</label>
                    <select class="property-input" id="imageFit">
                        <option value="contain">Conter</option>
                        <option value="cover">Cobrir</option>
                        <option value="fill">Preencher</option>
                    </select>
                </div>
            </div>
        </div>
    </div>
    
    <button class="preview-button" onclick="previewTemplate()">👁️ Visualizar PDF</button>
    
    <script>
        let selectedElement = null;
        let elementCounter = 0;
        let currentTemplate = {
            id: 'template-' + Date.now(),
            name: 'Novo Template',
            description: 'Template criado no editor visual',
            elements: [],
            globalStyles: {
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#ffffff',
                pageSize: 'A4',
                margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        // Inicializar drag and drop
        document.addEventListener('DOMContentLoaded', function() {
            initializeDragAndDrop();
            setupPropertyListeners();
            loadImageGallery();
        });
        
        function initializeDragAndDrop() {
            const paletteItems = document.querySelectorAll('.palette-item');
            const canvas = document.getElementById('canvas');
            const dropZone = document.getElementById('dropZone');
            
            paletteItems.forEach(item => {
                item.addEventListener('dragstart', function(e) {
                    e.dataTransfer.setData('text/plain', this.dataset.type);
                });
            });
            
            canvas.addEventListener('dragover', function(e) {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            canvas.addEventListener('dragleave', function(e) {
                if (!canvas.contains(e.relatedTarget)) {
                    dropZone.classList.remove('drag-over');
                }
            });
            
            canvas.addEventListener('drop', function(e) {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                
                const elementType = e.dataTransfer.getData('text/plain');
                if (elementType) {
                    createElement(elementType);
                }
            });
        }
        
        function createElement(type) {
            elementCounter++;
            const elementId = type + '-' + elementCounter;
            
            const element = {
                id: elementId,
                type: type,
                content: getDefaultContent(type),
                styles: getDefaultStyles(type),
                data: {}
            };
            
            currentTemplate.elements.push(element);
            renderElement(element);
            
            // Esconder drop zone se houver elementos
            if (currentTemplate.elements.length > 0) {
                const dropZone = document.getElementById('dropZone');
                if (dropZone) dropZone.style.display = 'none';
            }
            
            // Atualizar contador
            updateElementCount();
            
            console.log(\`✅ Elemento "\${type}" adicionado: \${elementId}\`);
        }
        
        function updateElementCount() {
            const countElement = document.getElementById('elementCount');
            if (countElement) {
                countElement.textContent = currentTemplate.elements.length;
            }
        }
        
        function getDefaultContent(type) {
            const defaults = {
                text: 'Clique para editar este texto',
                header: 'CABEÇALHO DO DOCUMENTO',
                image: '[Imagem]',
                table: '[Tabela de Dados]',
                chart: '[Gráfico]',
                signature: '[Área de Assinatura]',
                footer: 'Rodapé do documento - Página {pageNumber}'
            };
            return defaults[type] || 'Elemento';
        }
        
        function getDefaultStyles(type) {
            const defaults = {
                text: { fontSize: '14px', color: '#333333' },
                header: { fontSize: '24px', fontWeight: 'bold', color: '#2563eb', textAlign: 'center' },
                image: { width: '200px', height: '150px', border: '1px solid #ddd' },
                table: { width: '100%', border: '1px solid #ddd' },
                chart: { width: '400px', height: '300px' },
                signature: { height: '80px', border: '1px dashed #ccc', textAlign: 'center' },
                footer: { fontSize: '12px', color: '#666666', textAlign: 'center', borderTop: '1px solid #ccc', paddingTop: '10px', marginTop: '20px' }
            };
            return defaults[type] || {};
        }
        
        function renderElement(element) {
            const canvas = document.getElementById('canvas');
            const elementDiv = document.createElement('div');
            elementDiv.className = 'canvas-element';
            elementDiv.dataset.elementId = element.id;
            
            // Aplicar estilos
            Object.assign(elementDiv.style, element.styles);
            
            // Conteúdo baseado no tipo
            switch (element.type) {
                case 'image':
                    if (element.data && element.data.imageUrl) {
                        elementDiv.innerHTML = \`
                            <div style="background-image: url(\${element.data.imageUrl}); background-size: contain; background-repeat: no-repeat; background-position: center; min-height: 100px; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; color: #666;">
                                \${element.content}
                            </div>
                        \`;
                    } else {
                        elementDiv.innerHTML = \`
                            <div style="background: #f3f4f6; padding: 20px; text-align: center; border: 2px dashed #d1d5db; min-height: 100px; display: flex; align-items: center; justify-content: center;">
                                🖼️ \${element.content}
                            </div>
                        \`;
                    }
                    break;
                case 'header':
                    elementDiv.innerHTML = \`<h1>\${element.content}</h1>\`;
                    break;
                case 'table':
                    elementDiv.innerHTML = \`
                        <div style="border: 1px solid #ddd; padding: 20px; text-align: center; background: #f9f9f9;">
                            📊 \${element.content}
                        </div>
                    \`;
                    break;
                case 'chart':
                    elementDiv.innerHTML = \`
                        <div style="border: 1px solid #ddd; padding: 20px; text-align: center; background: #f0f9ff;">
                            📈 \${element.content}
                        </div>
                    \`;
                    break;
                case 'signature':
                    elementDiv.innerHTML = \`
                        <div style="border: 2px dashed #ccc; padding: 30px; text-align: center; background: #fefefe;">
                            ✍️ \${element.content}
                        </div>
                    \`;
                    break;
                case 'footer':
                    elementDiv.innerHTML = \`
                        <div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 12px; color: #666;">
                            🦶 \${element.content}
                        </div>
                    \`;
                    break;
                default:
                    elementDiv.innerHTML = element.content;
            }
            
            // Controles
            elementDiv.innerHTML += \`
                <div class="element-controls">
                    <button class="element-control" onclick="editElement('\${element.id}')" title="Editar">✏️</button>
                    <button class="element-control" onclick="duplicateElement('\${element.id}')" title="Duplicar">📋</button>
                    <button class="element-control" onclick="deleteElement('\${element.id}')" title="Excluir">🗑️</button>
                </div>
            \`;
            
            // Event listeners
            elementDiv.addEventListener('click', function() {
                selectElement(element.id);
            });
            
            canvas.appendChild(elementDiv);
        }
        
        function selectElement(elementId) {
            // Remover seleção anterior
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Selecionar novo elemento
            const elementDiv = document.querySelector(\`[data-element-id="\${elementId}"]\`);
            if (elementDiv) {
                elementDiv.classList.add('selected');
                selectedElement = currentTemplate.elements.find(el => el.id === elementId);
                updatePropertiesPanel();
                
                // Mostrar/esconder controles específicos
                const imageControls = document.getElementById('imageControls');
                if (selectedElement && selectedElement.type === 'image') {
                    imageControls.style.display = 'block';
                } else {
                    imageControls.style.display = 'none';
                }
            }
        }
        
        function updatePropertiesPanel() {
            if (!selectedElement) return;
            
            const styles = selectedElement.styles;
            
            // Atualizar controles gerais
            document.getElementById('fontSize').value = parseInt(styles.fontSize) || 16;
            document.getElementById('textColor').value = styles.color || '#000000';
            document.getElementById('backgroundColor').value = styles.backgroundColor || '#ffffff';
            document.getElementById('padding').value = styles.padding || '';
            document.getElementById('margin').value = styles.margin || '';
            document.getElementById('width').value = styles.width || '';
            document.getElementById('height').value = styles.height || '';
            
            // Atualizar controles de imagem se for uma imagem
            if (selectedElement.type === 'image') {
                document.getElementById('imageWidth').value = parseInt(styles.width) || 200;
                document.getElementById('imageHeight').value = parseInt(styles.height) || 150;
                document.getElementById('imageFit').value = styles.backgroundSize || 'contain';
            }
            
            // Atualizar botões de formatação
            document.getElementById('boldBtn').classList.toggle('active', styles.fontWeight === 'bold');
            document.getElementById('italicBtn').classList.toggle('active', styles.fontStyle === 'italic');
            document.getElementById('underlineBtn').classList.toggle('active', styles.textDecoration === 'underline');
        }
        
        function setupPropertyListeners() {
            document.getElementById('fontSize').addEventListener('input', function() {
                updateSelectedElementStyle('fontSize', this.value + 'px');
            });
            
            document.getElementById('textColor').addEventListener('change', function() {
                updateSelectedElementStyle('color', this.value);
            });
            
            document.getElementById('backgroundColor').addEventListener('change', function() {
                updateSelectedElementStyle('backgroundColor', this.value);
            });
            
            document.getElementById('padding').addEventListener('input', function() {
                updateSelectedElementStyle('padding', this.value);
            });
            
            document.getElementById('margin').addEventListener('input', function() {
                updateSelectedElementStyle('margin', this.value);
            });
            
            document.getElementById('width').addEventListener('input', function() {
                updateSelectedElementStyle('width', this.value);
            });
            
            document.getElementById('height').addEventListener('input', function() {
                updateSelectedElementStyle('height', this.value);
            });
            
            // Listeners para controles de imagem
            document.getElementById('imageWidth').addEventListener('input', function() {
                updateSelectedElementStyle('width', this.value + 'px');
            });
            
            document.getElementById('imageHeight').addEventListener('input', function() {
                updateSelectedElementStyle('height', this.value + 'px');
            });
            
            document.getElementById('imageFit').addEventListener('change', function() {
                updateSelectedElementStyle('backgroundSize', this.value);
            });
            
            // Listeners para margens da página
            document.getElementById('pageMarginTop').addEventListener('input', function() {
                updatePageMargin('top', this.value);
            });
            
            document.getElementById('pageMarginBottom').addEventListener('input', function() {
                updatePageMargin('bottom', this.value);
            });
            
            document.getElementById('pageMarginLeft').addEventListener('input', function() {
                updatePageMargin('left', this.value);
            });
            
            document.getElementById('pageMarginRight').addEventListener('input', function() {
                updatePageMargin('right', this.value);
            });
        }
        
        function updateSelectedElementStyle(property, value) {
            if (!selectedElement) return;
            
            selectedElement.styles[property] = value;
            const elementDiv = document.querySelector(\`[data-element-id="\${selectedElement.id}"]\`);
            if (elementDiv) {
                elementDiv.style[property] = value;
            }
        }
        
        function toggleBold() {
            const isActive = document.getElementById('boldBtn').classList.contains('active');
            updateSelectedElementStyle('fontWeight', isActive ? 'normal' : 'bold');
            document.getElementById('boldBtn').classList.toggle('active');
        }
        
        function toggleItalic() {
            const isActive = document.getElementById('italicBtn').classList.contains('active');
            updateSelectedElementStyle('fontStyle', isActive ? 'normal' : 'italic');
            document.getElementById('italicBtn').classList.toggle('active');
        }
        
        function toggleUnderline() {
            const isActive = document.getElementById('underlineBtn').classList.contains('active');
            updateSelectedElementStyle('textDecoration', isActive ? 'none' : 'underline');
            document.getElementById('underlineBtn').classList.toggle('active');
        }
        
        function setAlignment(align) {
            updateSelectedElementStyle('textAlign', align);
        }
        
        function updatePageMargin(side, value) {
            if (!currentTemplate.globalStyles.margins) {
                currentTemplate.globalStyles.margins = {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                };
            }
            currentTemplate.globalStyles.margins[side] = value;
            console.log(\`📐 Margem \${side} atualizada para: \${value}\`);
        }
        
        async function loadImageGallery() {
            try {
                console.log('🖼️ Carregando galeria de imagens...');
                
                const response = await fetch('/api/template-editor/gallery');
                if (response.ok) {
                    const data = await response.json();
                    const gallery = document.getElementById('imageGallery');
                    
                    if (data.success && data.data.images) {
                        gallery.innerHTML = '';
                        data.data.images.forEach(image => {
                            const item = document.createElement('div');
                            item.className = 'gallery-item';
                            item.dataset.imageUrl = image.url;
                            item.dataset.imageName = image.name;
                            item.innerHTML = image.name.substring(0, 8);
                            item.title = image.name;
                            
                            item.addEventListener('click', function() {
                                addImageToCanvas(image.url, image.name);
                            });
                            
                            gallery.appendChild(item);
                        });
                        console.log(\`✅ \${data.data.images.length} imagens carregadas na galeria\`);
                    } else {
                        gallery.innerHTML = '<div class="gallery-item">Sem imagens</div>';
                    }
                } else {
                    console.error('❌ Erro ao carregar galeria');
                    document.getElementById('imageGallery').innerHTML = '<div class="gallery-item">Erro</div>';
                }
            } catch (error) {
                console.error('❌ Erro de rede ao carregar galeria:', error);
                document.getElementById('imageGallery').innerHTML = '<div class="gallery-item">Erro</div>';
            }
        }
        
        function addImageToCanvas(imageUrl, imageName) {
            elementCounter++;
            const elementId = 'image-' + elementCounter;
            
            const element = {
                id: elementId,
                type: 'image',
                content: imageName,
                styles: { 
                    width: '200px', 
                    height: '150px', 
                    border: '1px solid #ddd',
                    backgroundImage: \`url(\${imageUrl})\`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center'
                },
                data: { imageUrl: imageUrl }
            };
            
            currentTemplate.elements.push(element);
            renderElement(element);
            
            // Esconder drop zone se houver elementos
            if (currentTemplate.elements.length > 0) {
                const dropZone = document.getElementById('dropZone');
                if (dropZone) dropZone.style.display = 'none';
            }
            
            // Atualizar contador
            updateElementCount();
            
            console.log(\`🖼️ Imagem "\${imageName}" adicionada ao canvas\`);
        }
        
        function editElement(elementId) {
            const element = currentTemplate.elements.find(el => el.id === elementId);
            if (element) {
                const newContent = prompt('Editar conteúdo:', element.content);
                if (newContent !== null) {
                    element.content = newContent;
                    const elementDiv = document.querySelector(\`[data-element-id="\${elementId}"]\`);
                    if (elementDiv && element.type !== 'image') {
                        elementDiv.innerHTML = newContent + elementDiv.querySelector('.element-controls').outerHTML;
                    }
                }
            }
        }
        
        function duplicateElement(elementId) {
            const element = currentTemplate.elements.find(el => el.id === elementId);
            if (element) {
                const newElement = {
                    ...element,
                    id: element.type + '-' + (++elementCounter)
                };
                currentTemplate.elements.push(newElement);
                renderElement(newElement);
            }
        }
        
        function deleteElement(elementId) {
            if (confirm('Tem certeza que deseja excluir este elemento?')) {
                currentTemplate.elements = currentTemplate.elements.filter(el => el.id !== elementId);
                const elementDiv = document.querySelector(\`[data-element-id="\${elementId}"]\`);
                if (elementDiv) {
                    elementDiv.remove();
                }
                
                // Mostrar drop zone se não houver elementos
                if (currentTemplate.elements.length === 0) {
                    const dropZone = document.getElementById('dropZone');
                    if (dropZone) dropZone.style.display = 'block';
                }
                
                // Atualizar contador
                updateElementCount();
            }
        }
        
        function newTemplate() {
            if (confirm('Criar novo template? As alterações não salvas serão perdidas.')) {
                currentTemplate = {
                    id: 'template-' + Date.now(),
                    name: 'Novo Template',
                    description: 'Template criado no editor visual',
                    elements: [],
                    globalStyles: {
                        fontFamily: 'Arial, sans-serif',
                        backgroundColor: '#ffffff',
                        pageSize: 'A4',
                        margins: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                
                document.getElementById('canvas').innerHTML = '<div class="drop-zone" id="dropZone">🎯 Arraste elementos aqui para começar a criar seu template</div>';
                selectedElement = null;
                elementCounter = 0;
                updateElementCount();
            }
        }
        
        function saveTemplate() {
            // Pedir nome do template
            const templateName = prompt('Nome do template:', currentTemplate.name);
            if (templateName) {
                currentTemplate.name = templateName;
                currentTemplate.updatedAt = new Date();
                
                // Salvar no localStorage para demonstração
                localStorage.setItem('template-' + currentTemplate.id, JSON.stringify(currentTemplate));
                
                // Salvar no servidor
                saveTemplateToServer();
            }
        }
        
        function loadTemplate() {
            const templates = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('template-')) {
                    const template = JSON.parse(localStorage.getItem(key));
                    templates.push(template);
                }
            }
            
            if (templates.length === 0) {
                alert('Nenhum template salvo encontrado.');
                return;
            }
            
            const templateList = templates.map((t, i) => \`\${i + 1}. \${t.name}\`).join('\\n');
            const choice = prompt('Escolha um template:\\n' + templateList);
            
            if (choice && !isNaN(choice)) {
                const index = parseInt(choice) - 1;
                if (templates[index]) {
                    loadTemplateData(templates[index]);
                }
            }
        }
        
        function loadTemplateData(template) {
            currentTemplate = template;
            const canvas = document.getElementById('canvas');
            canvas.innerHTML = '';
            
            if (template.elements.length === 0) {
                canvas.innerHTML = '<div class="drop-zone" id="dropZone">🎯 Arraste elementos aqui para começar a criar seu template</div>';
            } else {
                template.elements.forEach(element => {
                    renderElement(element);
                });
            }
            
            selectedElement = null;
        }
        
        function exportTemplate() {
            const templateJson = JSON.stringify(currentTemplate, null, 2);
            const blob = new Blob([templateJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = currentTemplate.name + '.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        async function previewTemplate() {
            try {
                console.log('🔄 Gerando preview do template...');
                
                const response = await fetch('/api/template-editor/preview', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(currentTemplate)
                });
                
                if (response.ok) {
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    window.open(url, '_blank');
                    console.log('✅ Preview gerado com sucesso!');
                } else {
                    const errorData = await response.json();
                    console.error('❌ Erro do servidor:', errorData);
                    alert('Erro ao gerar preview: ' + (errorData.details || 'Erro desconhecido'));
                }
            } catch (error) {
                console.error('❌ Erro de rede:', error);
                alert('Erro de conexão ao gerar preview. Verifique se o servidor está rodando.');
            }
        }
        
        async function saveTemplateToServer() {
            try {
                console.log('💾 Salvando template no servidor...');
                
                const templateToSave = {
                    ...currentTemplate,
                    updatedAt: new Date()
                };
                
                const response = await fetch('/api/template-editor/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(templateToSave)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Template salvo:', result);
                    alert('Template salvo com sucesso no servidor!');
                    
                    // Fechar a janela do editor e recarregar a página principal
                    if (window.opener) {
                        window.opener.location.reload();
                        window.close();
                    }
                } else {
                    const errorData = await response.json();
                    console.error('❌ Erro ao salvar:', errorData);
                    alert('Erro ao salvar template: ' + (errorData.details || 'Erro desconhecido'));
                }
            } catch (error) {
                console.error('❌ Erro ao salvar:', error);
                alert('Erro de conexão ao salvar template.');
            }
        }
    </script>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.send(editorHtml);

    } catch (error) {
      console.error('❌ Erro ao carregar editor:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao carregar editor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Gera preview do template criado no editor
   */
  static async previewTemplate(req: Request, res: Response) {
    try {
      const templateLayout: TemplateLayout = req.body;

      if (!templateLayout || !templateLayout.elements) {
        return res.status(400).json({
          success: false,
          error: 'Layout do template é obrigatório'
        });
      }

      // Converter layout para HTML
      const html = TemplateEditorController.convertLayoutToHTML(templateLayout);

      try {
        // Tentar gerar PDF
        const pdfBuffer = await reportService.generatePDFFromHTML(html);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="preview-template.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        return res.send(pdfBuffer);
      } catch (pdfError) {
        console.warn('⚠️ Erro no Puppeteer, retornando HTML:', pdfError);
        
        // Fallback: retornar HTML para visualização
        const previewHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview - ${templateLayout.name}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: #f5f5f5; 
        }
        .preview-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            box-shadow: 0 0 10px rgba(0,0,0,0.1); 
        }
        .preview-header {
            background: #2563eb;
            color: white;
            padding: 10px 20px;
            margin: -40px -40px 20px -40px;
            font-size: 18px;
            font-weight: bold;
        }
        .error-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="preview-container">
        <div class="preview-header">
            📄 Preview: ${templateLayout.name}
        </div>
        <div class="error-notice">
            ⚠️ <strong>Modo Preview HTML:</strong> O PDF não pôde ser gerado devido a problemas com o Puppeteer. 
            Visualizando em HTML para demonstração.
        </div>
        ${html.replace('<!DOCTYPE html>', '').replace(/<html[^>]*>/, '').replace('</html>', '').replace(/<head>[\s\S]*?<\/head>/, '').replace(/<body[^>]*>/, '').replace('</body>', '')}
    </div>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.send(previewHtml);
      }

    } catch (error) {
      console.error('❌ Erro ao gerar preview:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar preview',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Converte layout do editor para HTML
   */
  private static convertLayoutToHTML(layout: TemplateLayout): string {
    const elementsHtml = layout.elements.map(element => {
      const styles = Object.entries(element.styles)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
        .join('; ');

      switch (element.type) {
        case 'text':
          return `<div style="${styles}">${element.content}</div>`;
        case 'header':
          return `<h1 style="${styles}">${element.content}</h1>`;
        case 'image':
          return `<div style="${styles}; background: #f3f4f6; padding: 20px; text-align: center; border: 2px dashed #d1d5db;">🖼️ ${element.content}</div>`;
        case 'table':
          return `<div style="${styles}; border: 1px solid #ddd; padding: 20px; text-align: center;">📊 ${element.content}</div>`;
        case 'chart':
          return `<div style="${styles}; border: 1px solid #ddd; padding: 20px; text-align: center;">📈 ${element.content}</div>`;
        case 'signature':
          return `<div style="${styles}; border: 1px dashed #ccc; padding: 20px; text-align: center;">✍️ ${element.content}</div>`;
        case 'footer':
          return `<div style="${styles}; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; text-align: center; font-size: 12px; color: #666;">🦶 ${element.content}</div>`;
        default:
          return `<div style="${styles}">${element.content}</div>`;
      }
    }).join('\n');

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${layout.name}</title>
    <style>
        body {
            font-family: ${layout.globalStyles.fontFamily || 'Arial, sans-serif'};
            background-color: ${layout.globalStyles.backgroundColor || '#ffffff'};
            margin: ${layout.globalStyles.margins?.top || '20mm'} ${layout.globalStyles.margins?.right || '15mm'} ${layout.globalStyles.margins?.bottom || '20mm'} ${layout.globalStyles.margins?.left || '15mm'};
            padding: 0;
            color: #333;
            line-height: 1.6;
        }
        
        @page {
            size: ${layout.globalStyles.pageSize || 'A4'};
            margin: ${layout.globalStyles.margins?.top || '20mm'} ${layout.globalStyles.margins?.right || '15mm'} ${layout.globalStyles.margins?.bottom || '20mm'} ${layout.globalStyles.margins?.left || '15mm'};
        }
    </style>
</head>
<body>
    ${elementsHtml}
</body>
</html>
    `;
  }

  /**
   * Retorna a galeria de imagens disponíveis
   */
  static async getImageGallery(req: Request, res: Response) {
    try {
      const galleryDir = path.join(process.cwd(), 'public', 'images', 'gallery');
      const indexPath = path.join(galleryDir, 'index.json');
      
      if (fs.existsSync(indexPath)) {
        const galleryIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        return res.json({
          success: true,
          data: galleryIndex
        });
      } else {
        // Se não existe o índice, criar um básico
        const files = fs.readdirSync(galleryDir).filter(file => 
          file.endsWith('.svg') || file.endsWith('.png') || file.endsWith('.jpg')
        );
        
        const basicIndex = {
          images: files.map(filename => ({
            name: filename.replace(/\.[^/.]+$/, "").replace('-', ' ').toUpperCase(),
            filename: filename,
            type: filename.split('.').pop(),
            category: 'general',
            url: `/public/images/gallery/${filename}`
          })),
          categories: ['general'],
          total: files.length,
          lastUpdated: new Date().toISOString()
        };
        
        return res.json({
          success: true,
          data: basicIndex
        });
      }

    } catch (error) {
      console.error('❌ Erro ao carregar galeria:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao carregar galeria de imagens',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Salva template criado no editor
   */
  static async saveTemplate(req: Request, res: Response) {
    try {
      const templateLayout: TemplateLayout = req.body;

      if (!templateLayout || !templateLayout.name) {
        return res.status(400).json({
          success: false,
          error: 'Nome do template é obrigatório'
        });
      }

      // Criar diretório de templates se não existir
      const templatesDir = path.join(process.cwd(), 'backend', 'templates');
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }

      // Salvar como arquivo .hbs
      const templateHtml = TemplateEditorController.convertLayoutToHTML(templateLayout);
      const fileName = `${templateLayout.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
      const templatePath = path.join(templatesDir, `${fileName}.hbs`);
      
      fs.writeFileSync(templatePath, templateHtml);

      // Também salvar o layout JSON para futuras edições
      const layoutPath = path.join(templatesDir, `${fileName}.json`);
      fs.writeFileSync(layoutPath, JSON.stringify(templateLayout, null, 2));

      // Recarregar templates
      try {
        reportService.templateService.reloadTemplates();
      } catch (reloadError) {
        console.warn('⚠️ Aviso: Não foi possível recarregar templates:', reloadError);
      }

      return res.json({
        success: true,
        message: 'Template salvo com sucesso',
        data: {
          templateName: templateLayout.name,
          fileName: fileName,
          templatePath: templatePath,
          layoutPath: layoutPath
        }
      });

    } catch (error) {
      console.error('❌ Erro ao salvar template:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar template',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}