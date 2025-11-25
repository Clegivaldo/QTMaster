import { Request, Response } from 'express';
import { getReportGenerationService } from '../services/serviceInstances.js';
import fs from 'fs';
import path from 'path';



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

export class TemplateEditorControllerSimple {
  /**
   * Retorna uma versão simplificada e funcional do editor
   */
  static async getEditor(req: Request, res: Response) {
    try {
      const editorHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor Simples de Templates</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f7fa; }
        
        .container { display: flex; height: 100vh; }
        .sidebar { width: 250px; background: white; padding: 20px; border-right: 1px solid #ddd; }
        .canvas-area { flex: 1; padding: 20px; }
        .canvas { background: white; min-height: 600px; border: 1px solid #ddd; position: relative; padding: 20px; }
        
        .element-item { 
            background: #f0f0f0; 
            padding: 10px; 
            margin: 5px 0; 
            cursor: pointer; 
            border-radius: 4px;
            text-align: center;
        }
        .element-item:hover { background: #e0e0e0; }
        
        .canvas-element {
            border: 2px solid transparent;
            padding: 10px;
            margin: 10px 0;
            cursor: pointer;
            min-height: 40px;
            position: relative;
        }
        .canvas-element:hover { border-color: #007bff; }
        .canvas-element.selected { border-color: #007bff; background: rgba(0,123,255,0.1); }
        
        .controls { margin-top: 20px; }
        .control-group { margin: 10px 0; }
        .control-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .control-group input, .control-group select { width: 100%; padding: 5px; }
        
        .format-buttons { display: flex; gap: 5px; margin: 10px 0; }
        .format-btn { 
            padding: 8px 12px; 
            border: 1px solid #ddd; 
            background: white; 
            cursor: pointer; 
            border-radius: 4px;
        }
        .format-btn.active { background: #007bff; color: white; }
        .format-btn:hover { background: #f0f0f0; }
        
        .delete-btn {
            position: absolute;
            top: -10px;
            right: -10px;
            background: red;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            cursor: pointer;
            display: none;
        }
        .canvas-element:hover .delete-btn { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <h3>Elementos</h3>
            <div class="element-item" onclick="addElement('text')">📝 Texto</div>
            <div class="element-item" onclick="addElement('header')">🏷️ Cabeçalho</div>
            <div class="element-item" onclick="addElement('image')">🖼️ Imagem</div>
            
            <div class="controls">
                <h3>Propriedades</h3>
                <div class="control-group">
                    <label>Tamanho da Fonte:</label>
                    <input type="number" id="fontSize" min="8" max="72" value="16" onchange="updateStyle('fontSize', this.value + 'px')">
                </div>
                
                <div class="control-group">
                    <label>Cor do Texto:</label>
                    <input type="color" id="textColor" value="#000000" onchange="updateStyle('color', this.value)">
                </div>
                
                <div class="format-buttons">
                    <button class="format-btn" id="boldBtn" onclick="toggleFormat('fontWeight', 'bold', this)">B</button>
                    <button class="format-btn" id="italicBtn" onclick="toggleFormat('fontStyle', 'italic', this)">I</button>
                    <button class="format-btn" id="underlineBtn" onclick="toggleFormat('textDecoration', 'underline', this)">U</button>
                </div>
                
                <div class="format-buttons">
                    <button class="format-btn" onclick="updateStyle('textAlign', 'left')">⬅️</button>
                    <button class="format-btn" onclick="updateStyle('textAlign', 'center')">↔️</button>
                    <button class="format-btn" onclick="updateStyle('textAlign', 'right')">➡️</button>
                </div>
                
                <button onclick="deleteSelected()" style="background: red; color: white; padding: 10px; border: none; border-radius: 4px; width: 100%; margin-top: 10px;">🗑️ Deletar Selecionado</button>
            </div>
        </div>
        
        <div class="canvas-area">
            <h2>Canvas do Template</h2>
            <div class="canvas" id="canvas" onclick="deselectAll(event)">
                <p style="color: #666; text-align: center; margin-top: 50px;">Clique nos elementos da esquerda para adicionar ao template</p>
            </div>
        </div>
    </div>

    <script>
        let selectedElement = null;
        let elementCounter = 0;
        
        function addElement(type) {
            elementCounter++;
            const id = type + '-' + elementCounter;
            
            const element = document.createElement('div');
            element.className = 'canvas-element';
            element.id = id;
            element.onclick = (e) => selectElement(e, element);
            
            // Conteúdo baseado no tipo
            let content = '';
            switch(type) {
                case 'text':
                    content = '<div contenteditable="true" style="outline: none;">Clique para editar este texto</div>';
                    break;
                case 'header':
                    content = '<h2 contenteditable="true" style="outline: none;">Cabeçalho do Documento</h2>';
                    break;
                case 'image':
                    content = '<div style="border: 2px dashed #ccc; padding: 20px; text-align: center;">🖼️ Área de Imagem</div>';
                    break;
            }
            
            element.innerHTML = content + '<button class="delete-btn" onclick="deleteElement(\\''+id+'\\')">×</button>';
            
            document.getElementById('canvas').appendChild(element);
            selectElement(null, element);
            
            console.log('✅ Elemento adicionado:', type, id);
        }
        
        function selectElement(event, element) {
            if (event) event.stopPropagation();
            
            // Remover seleção anterior
            document.querySelectorAll('.canvas-element').forEach(el => {
                el.classList.remove('selected');
            });
            
            // Selecionar novo elemento
            element.classList.add('selected');
            selectedElement = element;
            
            // Atualizar controles
            updateControls();
            
            console.log('🎯 Elemento selecionado:', element.id);
        }
        
        function deselectAll(event) {
            if (event.target.id === 'canvas') {
                document.querySelectorAll('.canvas-element').forEach(el => {
                    el.classList.remove('selected');
                });
                selectedElement = null;
                console.log('🔄 Seleção removida');
            }
        }
        
        function updateStyle(property, value) {
            if (!selectedElement) {
                alert('Selecione um elemento primeiro!');
                return;
            }
            
            const contentDiv = selectedElement.querySelector('[contenteditable]') || selectedElement.querySelector('div');
            if (contentDiv) {
                contentDiv.style[property] = value;
                console.log('🎨 Estilo aplicado:', property, '=', value);
            }
        }
        
        function toggleFormat(property, value, button) {
            if (!selectedElement) {
                alert('Selecione um elemento primeiro!');
                return;
            }
            
            const contentDiv = selectedElement.querySelector('[contenteditable]') || selectedElement.querySelector('div');
            if (contentDiv) {
                const isActive = button.classList.contains('active');
                
                if (isActive) {
                    contentDiv.style[property] = property === 'fontWeight' ? 'normal' : 
                                               property === 'fontStyle' ? 'normal' : 'none';
                    button.classList.remove('active');
                } else {
                    contentDiv.style[property] = value;
                    button.classList.add('active');
                }
                
                console.log('🔤 Formatação alterada:', property, '=', isActive ? 'removido' : value);
            }
        }
        
        function updateControls() {
            if (!selectedElement) return;
            
            const contentDiv = selectedElement.querySelector('[contenteditable]') || selectedElement.querySelector('div');
            if (contentDiv) {
                const styles = window.getComputedStyle(contentDiv);
                
                // Atualizar controles
                document.getElementById('fontSize').value = parseInt(styles.fontSize) || 16;
                document.getElementById('textColor').value = rgbToHex(styles.color) || '#000000';
                
                // Atualizar botões de formatação
                document.getElementById('boldBtn').classList.toggle('active', styles.fontWeight === 'bold' || styles.fontWeight >= 700);
                document.getElementById('italicBtn').classList.toggle('active', styles.fontStyle === 'italic');
                document.getElementById('underlineBtn').classList.toggle('active', styles.textDecoration.includes('underline'));
            }
        }
        
        function deleteElement(id) {
            const element = document.getElementById(id);
            if (element && confirm('Deletar este elemento?')) {
                element.remove();
                selectedElement = null;
                console.log('🗑️ Elemento deletado:', id);
            }
        }
        
        function deleteSelected() {
            if (selectedElement && confirm('Deletar elemento selecionado?')) {
                selectedElement.remove();
                selectedElement = null;
                console.log('🗑️ Elemento selecionado deletado');
            } else if (!selectedElement) {
                alert('Nenhum elemento selecionado!');
            }
        }
        
        function rgbToHex(rgb) {
            if (!rgb || rgb === 'rgba(0, 0, 0, 0)') return '#000000';
            const result = rgb.match(/\\d+/g);
            if (!result) return '#000000';
            return '#' + ((1 << 24) + (parseInt(result[0]) << 16) + (parseInt(result[1]) << 8) + parseInt(result[2])).toString(16).slice(1);
        }
        
        console.log('🚀 Editor Simples carregado com sucesso!');
        console.log('📋 Funcionalidades disponíveis:');
        console.log('   ✅ Adicionar elementos (texto, cabeçalho, imagem)');
        console.log('   ✅ Editar texto diretamente (contentEditable)');
        console.log('   ✅ Selecionar elementos');
        console.log('   ✅ Formatação (negrito, itálico, sublinhado)');
        console.log('   ✅ Alinhamento (esquerda, centro, direita)');
        console.log('   ✅ Alterar cor e tamanho da fonte');
        console.log('   ✅ Deletar elementos');
    </script>
</body>
</html>
      `;

      res.setHeader('Content-Type', 'text/html');
      return res.send(editorHtml);

    } catch (error) {
      console.error('❌ Erro ao carregar editor simples:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao carregar editor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
