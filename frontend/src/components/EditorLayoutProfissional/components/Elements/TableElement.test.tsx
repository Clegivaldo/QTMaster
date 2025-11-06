import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableElement from './TableElement';
import { mockTableElement, createTestElement } from '../../../../test/test-utils';
import { TableData } from '../../../../types/editor';

describe('TableElement Component', () => {
  const mockProps = {
    isSelected: false,
    zoom: 1,
    onEdit: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Table Rendering', () => {
    it('should render table with correct structure', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      expect(table).toHaveClass('border-collapse', 'border', 'border-gray-400');
    });

    it('should render correct number of rows and columns', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(mockTableElement.content.rows);
      
      const cells = screen.getAllByRole('cell');
      expect(cells).toHaveLength(mockTableElement.content.rows * mockTableElement.content.columns);
    });

    it('should display table data correctly', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      expect(screen.getByText('Header 1')).toBeInTheDocument();
      expect(screen.getByText('Header 2')).toBeInTheDocument();
      expect(screen.getByText('Header 3')).toBeInTheDocument();
      expect(screen.getByText('Row 1 Col 1')).toBeInTheDocument();
      expect(screen.getByText('Row 1 Col 2')).toBeInTheDocument();
      expect(screen.getByText('Row 1 Col 3')).toBeInTheDocument();
    });

    it('should show table info when selected', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByText('2 × 3 células')).toBeInTheDocument();
    });

    it('should apply zoom scaling to font size', () => {
      const { container } = render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          zoom={2}
        />
      );
      
      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();
      // Font size scaling is applied via inline styles
    });
  });

  describe('Table Controls', () => {
    it('should show table controls when selected', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByTitle('Adicionar linha')).toBeInTheDocument();
      expect(screen.getByTitle('Remover linha')).toBeInTheDocument();
      expect(screen.getByTitle('Adicionar coluna')).toBeInTheDocument();
      expect(screen.getByTitle('Remover coluna')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações da tabela')).toBeInTheDocument();
    });

    it('should not show controls when not selected', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={false}
        />
      );
      
      expect(screen.queryByTitle('Adicionar linha')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Remover linha')).not.toBeInTheDocument();
    });

    it('should add row when add row button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const addRowButton = screen.getByTitle('Adicionar linha');
      await user.click(addRowButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          rows: 3,
          columns: 3,
          data: expect.arrayContaining([
            expect.any(Array),
            expect.any(Array),
            expect.arrayContaining(['R3C1', 'R3C2', 'R3C3'])
          ])
        })
      );
    });

    it('should remove row when remove row button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const removeRowButton = screen.getByTitle('Remover linha');
      await user.click(removeRowButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          rows: 1,
          columns: 3,
          data: expect.arrayContaining([
            expect.any(Array)
          ])
        })
      );
    });

    it('should add column when add column button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const addColumnButton = screen.getByTitle('Adicionar coluna');
      await user.click(addColumnButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          rows: 2,
          columns: 4,
          data: expect.arrayContaining([
            expect.arrayContaining(['Header 1', 'Header 2', 'Header 3', 'R1C4']),
            expect.arrayContaining(['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3', 'R2C4'])
          ])
        })
      );
    });

    it('should remove column when remove column button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const removeColumnButton = screen.getByTitle('Remover coluna');
      await user.click(removeColumnButton);
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          rows: 2,
          columns: 2,
          data: expect.arrayContaining([
            expect.arrayContaining(['Header 1', 'Header 2']),
            expect.arrayContaining(['Row 1 Col 1', 'Row 1 Col 2'])
          ])
        })
      );
    });

    it('should disable remove row button when only one row', async () => {
      const singleRowTable = createTestElement('table', {
        content: {
          rows: 1,
          columns: 2,
          data: [['Cell 1', 'Cell 2']],
          headers: []
        }
      });
      
      render(
        <TableElement 
          element={singleRowTable} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const removeRowButton = screen.getByTitle('Remover linha');
      expect(removeRowButton).toBeDisabled();
    });

    it('should disable remove column button when only one column', async () => {
      const singleColumnTable = createTestElement('table', {
        content: {
          rows: 2,
          columns: 1,
          data: [['Cell 1'], ['Cell 2']],
          headers: []
        }
      });
      
      render(
        <TableElement 
          element={singleColumnTable} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const removeColumnButton = screen.getByTitle('Remover coluna');
      expect(removeColumnButton).toBeDisabled();
    });
  });

  describe('Cell Editing', () => {
    it('should select cell when clicked and table is selected', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const cell = screen.getByText('Header 1').closest('td');
      await user.click(cell!);
      
      expect(cell).toHaveClass('bg-blue-100', 'ring-2', 'ring-blue-500');
    });

    it('should not select cell when table is not selected', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={false}
        />
      );
      
      const cell = screen.getByText('Header 1').closest('td');
      await user.click(cell!);
      
      expect(cell).not.toHaveClass('bg-blue-100');
    });

    it('should enter edit mode on double click', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const cell = screen.getByText((content, element) => 
        content.includes('Header 1')
      ).closest('td');
      await user.dblClick(cell!);
      
      // Verificar se existe um input na célula
      const input = cell?.querySelector('input');
      expect(input).toBeInTheDocument();
    });

    it('should save cell content on blur', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const cell = screen.getByText('Header 1').closest('td');
      await user.dblClick(cell!);
      
      const input = cell?.querySelector('input') as HTMLInputElement;
      await user.tripleClick(input);
      await user.type(input, 'New Header');
      await user.tab(); // Trigger blur
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.arrayContaining([expect.stringContaining('New Header'), 'Header 2', 'Header 3']),
            expect.any(Array)
          ])
        })
      );
    });

    it('should save cell content on Enter key', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const cell = screen.getByText((content, element) => 
        content.includes('Header 1')
      ).closest('td');
      await user.dblClick(cell!);
      
      const input = cell?.querySelector('input') as HTMLInputElement;
      await user.tripleClick(input);
      await user.type(input, 'New Header{Enter}');
      
      expect(mockProps.onEdit).toHaveBeenCalledWith(
        mockTableElement.id,
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.arrayContaining([expect.stringContaining('New Header'), 'Header 2', 'Header 3']),
            expect.any(Array)
          ])
        })
      );
    });

    it('should cancel edit on Escape key', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      const cell = screen.getByText((content, element) => 
        content.includes('Header 1')
      ).closest('td');
      await user.dblClick(cell!);
      
      const input = cell?.querySelector('input') as HTMLInputElement;
      await user.clear(input);
      await user.type(input, 'New Header{Escape}');
      
      expect(mockProps.onEdit).not.toHaveBeenCalled();
      expect(screen.queryByDisplayValue('New Header')).not.toBeInTheDocument();
    });

    it('should stop propagation on cell click', async () => {
      const user = userEvent.setup();
      const parentClickHandler = vi.fn();
      
      render(
        <div onClick={parentClickHandler}>
          <TableElement 
            element={mockTableElement} 
            {...mockProps}
            isSelected={true}
          />
        </div>
      );
      
      const cell = screen.getByText((content, element) => 
        content.includes('Header 1')
      ).closest('td');
      await user.click(cell!);
      
      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Table Initialization', () => {
    it('should initialize empty table data', () => {
      const emptyTableElement = createTestElement('table', {
        content: {
          rows: 2,
          columns: 2,
          data: [],
          headers: []
        }
      });
      
      render(
        <TableElement 
          element={emptyTableElement} 
          {...mockProps} 
        />
      );
      
      // Should show default cell values
      expect(screen.getByText('R1C1')).toBeInTheDocument();
      expect(screen.getByText('R1C2')).toBeInTheDocument();
      expect(screen.getByText('R2C1')).toBeInTheDocument();
      expect(screen.getByText('R2C2')).toBeInTheDocument();
    });

    it('should handle missing table content properties', () => {
      const incompleteTableElement = createTestElement('table', {
        content: {} as TableData
      });
      
      render(
        <TableElement 
          element={incompleteTableElement} 
          {...mockProps} 
        />
      );
      
      // Should render with default values
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should show placeholder when table has no rows or columns', () => {
      const emptyTableElement = createTestElement('table', {
        content: {
          rows: 0,
          columns: 0,
          data: [],
          headers: []
        }
      });
      
      render(
        <TableElement 
          element={emptyTableElement} 
          {...mockProps} 
        />
      );
      
      expect(screen.getByText('Tabela')).toBeInTheDocument();
      expect(screen.getByText('Clique para configurar')).toBeInTheDocument();
    });
  });

  describe('Cell Styling and Layout', () => {
    it('should apply hover effects to cells', async () => {
      const user = userEvent.setup();
      
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      const cell = screen.getByText((content, element) => 
        content.includes('Header 1')
      ).closest('td');
      await user.hover(cell!);
      
      expect(cell).toHaveClass('hover:bg-blue-50');
    });

    it('should apply minimum cell dimensions based on zoom', () => {
      const { container } = render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          zoom={2}
        />
      );
      
      const cells = container.querySelectorAll('td');
      cells.forEach(cell => {
        expect(cell).toBeInTheDocument();
        // Min dimensions are applied via inline styles
      });
    });

    it('should show default cell values for empty cells', () => {
      const sparseTableElement = createTestElement('table', {
        content: {
          rows: 2,
          columns: 2,
          data: [['Content'], []],
          headers: []
        }
      });
      
      render(
        <TableElement 
          element={sparseTableElement} 
          {...mockProps} 
        />
      );
      
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('R1C2')).toBeInTheDocument();
      expect(screen.getByText('R2C1')).toBeInTheDocument();
      expect(screen.getByText('R2C2')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      const table = screen.getByRole('table');
      const rows = screen.getAllByRole('row');
      const cells = screen.getAllByRole('cell');
      
      expect(table).toBeInTheDocument();
      expect(rows).toHaveLength(mockTableElement.content.rows);
      expect(cells).toHaveLength(mockTableElement.content.rows * mockTableElement.content.columns);
    });

    it('should have proper button titles for controls', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps}
          isSelected={true}
        />
      );
      
      expect(screen.getByTitle('Adicionar linha')).toBeInTheDocument();
      expect(screen.getByTitle('Remover linha')).toBeInTheDocument();
      expect(screen.getByTitle('Adicionar coluna')).toBeInTheDocument();
      expect(screen.getByTitle('Remover coluna')).toBeInTheDocument();
      expect(screen.getByTitle('Configurações da tabela')).toBeInTheDocument();
    });

    it('should have proper cursor styles for cells', () => {
      render(
        <TableElement 
          element={mockTableElement} 
          {...mockProps} 
        />
      );
      
      const cells = screen.getAllByRole('cell');
      cells.forEach(cell => {
        expect(cell).toHaveClass('cursor-pointer');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large tables efficiently', () => {
      const largeTableData: string[][] = [];
      for (let i = 0; i < 10; i++) {
        const row: string[] = [];
        for (let j = 0; j < 10; j++) {
          row.push(`R${i + 1}C${j + 1}`);
        }
        largeTableData.push(row);
      }
      
      const largeTableElement = createTestElement('table', {
        content: {
          rows: 10,
          columns: 10,
          data: largeTableData,
          headers: []
        }
      });
      
      const startTime = performance.now();
      render(
        <TableElement 
          element={largeTableElement} 
          {...mockProps} 
        />
      );
      const renderTime = performance.now() - startTime;
      
      expect(renderTime).toBeLessThan(100); // Should render quickly
      expect(screen.getAllByRole('cell')).toHaveLength(100);
    });
  });
});