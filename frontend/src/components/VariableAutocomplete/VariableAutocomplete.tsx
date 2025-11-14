import React, { useState, useEffect, useRef } from 'react';
import { useTemplateVariables } from '../../hooks/useTemplateVersioning';

interface VariableAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onInsertVariable?: (variable: string) => void;
  placeholder?: string;
  className?: string;
}

export const VariableAutocomplete: React.FC<VariableAutocompleteProps> = ({
  value,
  onChange,
  onInsertVariable,
  placeholder = 'Digite {{ para inserir variável...',
  className = '',
}) => {
  const { variables, grouped, loading } = useTemplateVariables();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredVariables, setFilteredVariables] = useState(variables);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detectar se usuário está digitando uma variável
  useEffect(() => {
    const text = value.substring(0, cursorPosition);
    const lastOpenBrace = text.lastIndexOf('{{');
    const lastCloseBrace = text.lastIndexOf('}}');

    // Verificar se está dentro de {{ }}
    if (lastOpenBrace > lastCloseBrace) {
      const query = text.substring(lastOpenBrace + 2).trim().toLowerCase();
      
      // Filtrar variáveis
      const filtered = variables.filter((v) =>
        v.name.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query)
      );
      
      setFilteredVariables(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  }, [value, cursorPosition, variables]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredVariables.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredVariables.length - 1 : prev - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredVariables[selectedIndex]) {
          insertVariable(filteredVariables[selectedIndex].name);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const insertVariable = (variableName: string) => {
    if (!inputRef.current) return;

    const text = value;
    const cursorPos = cursorPosition;
    const lastOpenBrace = text.substring(0, cursorPos).lastIndexOf('{{');

    // Substituir {{ query por {{variableName}}
    const before = text.substring(0, lastOpenBrace);
    const after = text.substring(cursorPos);
    const newValue = `${before}{{${variableName}}}${after}`;
    
    onChange(newValue);
    setShowSuggestions(false);
    
    // Mover cursor para após a variável inserida
    const newCursorPos = before.length + variableName.length + 4;
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);

    onInsertVariable?.(variableName);
  };

  const handleSuggestionClick = (variableName: string) => {
    insertVariable(variableName);
  };

  // Scroll para item selecionado
  useEffect(() => {
    if (suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
        placeholder={placeholder}
        className={`w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-vertical ${className}`}
        rows={10}
      />

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg"
        >
          {filteredVariables.map((variable, index) => (
            <div
              key={variable.name}
              onClick={() => handleSuggestionClick(variable.name)}
              className={`px-4 py-2 cursor-pointer ${
                index === selectedIndex
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-sm font-semibold">
                    {`{{${variable.name}}}`}
                  </div>
                  <div
                    className={`text-xs ${
                      index === selectedIndex ? 'text-blue-100' : 'text-gray-600'
                    }`}
                  >
                    {variable.description}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    index === selectedIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {variable.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Variable List Helper */}
      {!loading && Object.keys(grouped).length > 0 && (
        <details className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            📋 Variáveis Disponíveis ({variables.length})
          </summary>
          <div className="mt-3 space-y-3">
            {Object.entries(grouped).map(([category, vars]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  {category}
                </h4>
                <div className="space-y-1">
                  {(vars as any[]).map((v) => (
                    <button
                      key={v.name}
                      onClick={() => {
                        const cursorPos = inputRef.current?.selectionStart || value.length;
                        const before = value.substring(0, cursorPos);
                        const after = value.substring(cursorPos);
                        onChange(`${before}{{${v.name}}}${after}`);
                        onInsertVariable?.(v.name);
                      }}
                      className="w-full text-left px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <span className="text-blue-600">{`{{${v.name}}}`}</span>
                      <span className="ml-2 text-gray-600">- {v.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default VariableAutocomplete;
