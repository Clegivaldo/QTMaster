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
                    </div>
                </div>
            </div>
            
            <div class="sidebar-section">
                <div class="sidebar-header">🖼️ Galeria de Imagens</div>
                <div class="sidebar-content">
                    <div class="image-gallery">
                        <div class="gallery-item" data-image="logo1">Logo 1</div>
                        <div class="gallery-item" data-image="logo2">Logo 2</div>
                        <div class="gallery-item" data-image="bg1">Fundo 1</div>
                        <div class="gallery-item" data-image="bg2">Fundo 2</div>
                        <div class="gallery-item" data-image="seal">Selo</div>
                        <div class="gallery-item" data-image="watermark">Marca</div>
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
                    <input type="range" class="property-input" id="fontSize" min="8" max="72" value="16">
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
                document.getElementById('dropZone').style.display = 'none';
            }
        }
        
        function getDefaultContent(type) {
            const defaults = {
                text: 'Clique para editar este texto',
                header: 'CABEÇALHO DO DOCUMENTO',
                image: '[Imagem]',
                table: '[Tabela de Dados]',
                chart: '[Gráfico]',
                signature: '[Área de Assinatura]'
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
                signature: { height: '80px', border: '1px dashed #ccc', textAlign: 'center' }
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
            
            // Conteúdo
            if (element.type === 'image') {
                elementDiv.innerHTML = \`
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; border: 2px dashed #d1d5db;">
                        🖼️ \${element.content}
                    </div>
                \`;
            } else {
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
            }
        }
        
        function updatePropertiesPanel() {
            if (!selectedElement) return;
            
            const styles = selectedElement.styles;
            
            // Atualizar controles
            document.getElementById('fontSize').value = parseInt(styles.fontSize) || 16;
            document.getElementById('textColor').value = styles.color || '#000000';
            document.getElementById('backgroundColor').value = styles.backgroundColor || '#ffffff';
            document.getElementById('padding').value = styles.padding || '';
            document.getElementById('margin').value = styles.margin || '';
            document.getElementById('width').value = styles.width || '';
            document.getElementById('height').value = styles.height || '';
            
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
                    document.getElementById('dropZone').style.display = 'block';
                }
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
            }
        }
        
        function saveTemplate() {
            const templateName = prompt('Nome do template:', currentTemplate.name);
            if (templateName) {
                currentTemplate.name = templateName;
                currentTemplate.updatedAt = new Date();
                
                // Salvar no localStorage para demonstração
                localStorage.setItem('template-' + currentTemplate.id, JSON.stringify(currentTemplate));
                alert('Template salvo com sucesso!');
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
                } else {
                    alert('Erro ao gerar preview do template');
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao gerar preview do template');
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

      // Gerar PDF
      const pdfBuffer = await reportService.generatePDFFromHTML(html);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="preview-template.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);

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

      // Salvar como arquivo .hbs
      const templateHtml = TemplateEditorController.convertLayoutToHTML(templateLayout);
      const templatePath = path.join(process.cwd(), 'templates', `${templateLayout.name.toLowerCase().replace(/\s+/g, '-')}.hbs`);
      
      fs.writeFileSync(templatePath, templateHtml);

      // Recarregar templates
      reportService.templateService.reloadTemplates();

      return res.json({
        success: true,
        message: 'Template salvo com sucesso',
        data: {
          templateName: templateLayout.name,
          templatePath: templatePath
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