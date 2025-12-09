import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Plus, Minus, Settings, Grid } from 'lucide-react';
import { TableElement as TableElementType, TableData } from '../../../../types/editor';

interface TableElementProps {
  element: TableElementType;
  isSelected: boolean;
  zoom: number;
  onEdit?: (elementId: string, newContent: TableData) => void;
}

interface CellPosition {
  row: number;
  col: number;
}

const TableElement: React.FC<TableElementProps> = ({
  element,
  isSelected,
  zoom,
  onEdit
}) => {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingValue, setEditingValue] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Garantir que os dados da tabela existam
  // Normalizar columns para ser sempre um número
  const rawColumns = element.content.columns;
  const columnsCount = Array.isArray(rawColumns) ? rawColumns.length : (typeof rawColumns === 'number' ? rawColumns : 2);

  const tableData: TableData = {
    rows: element.content.rows ?? 2,
    columns: columnsCount,
    data: element.content.data || [],
    headers: element.content.headers || [],
    columnWidths: element.content.columnWidths || [],
    rowHeights: element.content.rowHeights || []
  };

  // Inicializar dados da tabela se necessário
  useEffect(() => {
    let needsUpdate = false;
    const newData = { ...tableData };

    // Garantir que a matriz de dados tenha o tamanho correto
    if (!newData.data || newData.data.length !== newData.rows) {
      newData.data = Array.from({ length: newData.rows }, (_, rowIndex) =>
        Array.from({ length: newData.columns }, (_, colIndex) =>
          newData.data?.[rowIndex]?.[colIndex] || `R${rowIndex + 1}C${colIndex + 1}`
        )
      );
      needsUpdate = true;
    }

    // Garantir que cada linha tenha o número correto de colunas
    newData.data.forEach((row, rowIndex) => {
      if (row.length !== newData.columns) {
        newData.data[rowIndex] = Array.from({ length: newData.columns }, (_, colIndex) =>
          row[colIndex] || `R${rowIndex + 1}C${colIndex + 1}`
        );
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      onEdit?.(element.id, newData);
    }
  }, [tableData.rows, tableData.columns, element.id, onEdit]);

  // Handler para adicionar linha
  const handleAddRow = useCallback(() => {
    const newData = { ...tableData };
    newData.rows += 1;
    const newRow = Array.from({ length: newData.columns }, (_, colIndex) =>
      `R${newData.rows}C${colIndex + 1}`
    );
    newData.data = [...newData.data, newRow];
    onEdit?.(element.id, newData);
  }, [tableData, element.id, onEdit]);

  // Handler para remover linha
  const handleRemoveRow = useCallback(() => {
    if (tableData.rows <= 1) return;

    const newData = { ...tableData };
    newData.rows -= 1;
    newData.data = newData.data.slice(0, -1);
    onEdit?.(element.id, newData);
  }, [tableData, element.id, onEdit]);

  // Handler para adicionar coluna
  const handleAddColumn = useCallback(() => {
    const newData = { ...tableData };
    newData.columns += 1;
    newData.data = newData.data.map((row, rowIndex) => [
      ...row,
      `R${rowIndex + 1}C${newData.columns}`
    ]);
    onEdit?.(element.id, newData);
  }, [tableData, element.id, onEdit]);

  // Handler para remover coluna
  const handleRemoveColumn = useCallback(() => {
    if (tableData.columns <= 1) return;

    const newData = { ...tableData };
    newData.columns -= 1;
    newData.data = newData.data.map(row => row.slice(0, -1));
    onEdit?.(element.id, newData);
  }, [tableData, element.id, onEdit]);

  // Handler para clique em célula
  const handleCellClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelected) {
      setSelectedCell({ row, col });
      setIsEditing(true);
      setEditingValue(tableData.data[row]?.[col] || '');
    }
  }, [isSelected, tableData.data]);

  // Handler para duplo clique em célula (edição)
  const handleCellDoubleClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCell({ row, col });
    setIsEditing(true);
    setEditingValue(tableData.data[row]?.[col] || '');

    // Focar no input após um pequeno delay
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }, [tableData.data]);

  // Handler para salvar edição da célula
  const handleSaveCell = useCallback(() => {
    if (!selectedCell) return;

    const newData = { ...tableData };
    if (!newData.data[selectedCell.row]) {
      newData.data[selectedCell.row] = [];
    }
    newData.data[selectedCell.row][selectedCell.col] = editingValue;

    onEdit?.(element.id, newData);
    setIsEditing(false);
    setSelectedCell(null);
    setEditingValue('');
  }, [selectedCell, editingValue, tableData, element.id, onEdit]);

  // Handler para cancelar edição
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setSelectedCell(null);
    setEditingValue('');
  }, []);

  // Handler para teclas durante edição
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveCell();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveCell, handleCancelEdit]);

  // Calcular estilos da tabela baseados no zoom
  const getTableStyles = () => ({
    fontSize: `${Math.max(8, 12 * zoom)}px`,
    borderWidth: `${Math.max(1, zoom)}px`
  });

  return (
    <div className="w-full h-full relative">
      {/* Controles da tabela (visíveis apenas quando selecionado) */}
      {isSelected && (
        <div className="absolute -top-10 left-0 flex items-center gap-1 bg-white border border-gray-300 rounded shadow-lg px-2 py-1 z-10">
          <button
            onClick={handleAddRow}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Adicionar linha"
          >
            <Plus className="h-3 w-3 text-green-600" />
          </button>
          <button
            onClick={handleRemoveRow}
            disabled={tableData.rows <= 1}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remover linha"
          >
            <Minus className="h-3 w-3 text-red-600" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={handleAddColumn}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Adicionar coluna"
          >
            <Plus className="h-3 w-3 text-blue-600" />
          </button>
          <button
            onClick={handleRemoveColumn}
            disabled={tableData.columns <= 1}
            className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Remover coluna"
          >
            <Minus className="h-3 w-3 text-orange-600" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Configurações da tabela"
          >
            <Settings className="h-3 w-3 text-gray-600" />
          </button>
        </div>
      )}

      {/* Tabela */}
      <table
        ref={tableRef}
        className="w-full h-full border-collapse border border-gray-400"
        style={getTableStyles()}
      >
        <tbody>
          {Array.from({ length: tableData.rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: tableData.columns }).map((_, colIndex) => {
                const cellValue = tableData.data[rowIndex]?.[colIndex] || '';
                const isSelectedCell = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

                return (
                  <td
                    key={colIndex}
                    className={`
                      border border-gray-300 p-1 relative cursor-pointer
                      hover:bg-blue-50 transition-colors
                      ${isSelectedCell ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                    `}
                    onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    onDoubleClick={(e) => handleCellDoubleClick(rowIndex, colIndex, e)}
                    style={{
                      minWidth: `${Math.max(40, 60 * zoom)}px`,
                      minHeight: `${Math.max(20, 24 * zoom)}px`
                    }}
                  >
                    {isEditing && isSelectedCell ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={handleSaveCell}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full border-none outline-none bg-transparent text-xs"
                        style={{ fontSize: `${Math.max(8, 10 * zoom)}px` }}
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-start text-xs overflow-hidden"
                        style={{ fontSize: `${Math.max(8, 10 * zoom)}px` }}
                      >
                        {cellValue || `R${rowIndex + 1}C${colIndex + 1}`}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Indicador de tabela quando não há conteúdo */}
      {tableData.rows === 0 || tableData.columns === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 border-2 border-dashed border-gray-300">
          <div className="text-center">
            <Grid className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm font-medium">Tabela</div>
            <div className="text-xs">Clique para configurar</div>
          </div>
        </div>
      ) : null}

      {/* Informações da tabela (quando selecionada) */}
      {isSelected && (
        <div className="absolute -bottom-6 left-0 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {tableData.rows} × {tableData.columns} células
        </div>
      )}
    </div>
  );
};

export default TableElement;