import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SensorForm from '../SensorForm';
import { SensorType } from '../../../types/sensor';

// Mock sensor types
const mockSensorTypes: SensorType[] = [
  { id: '1', name: 'Temperatura', description: 'Sensor de temperatura', dataConfig: { temperatureColumn: 'temp', timestampColumn: 'time', startRow: 2, dateFormat: 'DD/MM/YYYY', separator: ';' }, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: '2', name: 'Temperatura e Umidade', description: 'Sensor de temperatura e umidade', dataConfig: { temperatureColumn: 'temp', timestampColumn: 'time', startRow: 2, dateFormat: 'DD/MM/YYYY', separator: ';' }, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

describe('SensorForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnCreateType = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o formulário com tipos de sensores', () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/número de série/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de sensor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/data de calibração/i)).toBeInTheDocument();
  });

  it('deve popular select com tipos de sensores dinamicamente', () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const select = screen.getByLabelText(/tipo de sensor/i) as HTMLSelectElement;
    expect(select.options.length).toBe(3); // "Selecione um tipo" + 2 tipos
    expect(select.options[1].text).toBe('Temperatura');
    expect(select.options[2].text).toBe('Temperatura e Umidade');
  });

  it('deve mostrar botão "+ Novo Tipo" quando onCreateType é fornecido', () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onCreateType={mockOnCreateType}
      />
    );

    const newTypeButton = screen.getByText('+ Novo Tipo');
    expect(newTypeButton).toBeInTheDocument();
  });

  it('deve chamar onCreateType quando botão "+ Novo Tipo" é clicado', async () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        onCreateType={mockOnCreateType}
      />
    );

    const newTypeButton = screen.getByText('+ Novo Tipo');
    await userEvent.click(newTypeButton);

    expect(mockOnCreateType).toHaveBeenCalledTimes(1);
  });

  it('deve validar campos obrigatórios', async () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /criar sensor/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/número de série é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/modelo é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/tipo de sensor é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('deve submeter formulário com dados válidos', async () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await userEvent.type(screen.getByLabelText(/número de série/i), 'SN123456');
    await userEvent.type(screen.getByLabelText(/modelo/i), 'Modelo Teste');
    await userEvent.selectOptions(screen.getByLabelText(/tipo de sensor/i), '1');
    await userEvent.type(screen.getByLabelText(/data de calibração/i), '2024-01-01');

    const submitButton = screen.getByRole('button', { name: /criar sensor/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        serialNumber: 'SN123456',
        model: 'Modelo Teste',
        typeId: '1',
        calibrationDate: '2024-01-01',
      });
    });
  });

  it('deve preencher formulário com dados do sensor ao editar', () => {
    const existingSensor = {
      id: '1',
      serialNumber: 'SN789012',
      model: 'Sensor Existente',
      typeId: '2',
      calibrationDate: '2023-12-01',
      createdAt: '2023-12-01',
      updatedAt: '2023-12-01',
    };

    render(
      <SensorForm
        sensor={existingSensor}
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/número de série/i)).toHaveValue('SN789012');
    expect(screen.getByLabelText(/modelo/i)).toHaveValue('Sensor Existente');
    expect(screen.getByLabelText(/tipo de sensor/i)).toHaveValue('2');
    expect(screen.getByLabelText(/data de calibração/i)).toHaveValue('2023-12-01');
  });

  it('deve chamar onCancel quando botão cancelar é clicado', async () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    await userEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar botões quando isLoading é true', () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /criar sensor/i });
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('deve lidar com lista vazia de tipos de sensores', () => {
    render(
      <SensorForm
        sensorTypes={[]}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const select = screen.getByLabelText(/tipo de sensor/i) as HTMLSelectElement;
    expect(select.options.length).toBe(1); // Apenas "Selecione um tipo"
    expect(select.options[0].text).toBe('Selecione um tipo');
  });

  it('deve validar comprimento máximo dos campos', async () => {
    render(
      <SensorForm
        sensorTypes={mockSensorTypes}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const longString = 'A'.repeat(101);
    await userEvent.type(screen.getByLabelText(/número de série/i), longString);
    await userEvent.type(screen.getByLabelText(/modelo/i), longString);
    await userEvent.selectOptions(screen.getByLabelText(/tipo de sensor/i), '1');

    const submitButton = screen.getByRole('button', { name: /criar sensor/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/número de série muito longo/i)).toBeInTheDocument();
      expect(screen.getByText(/modelo muito longo/i)).toBeInTheDocument();
    });
  });
});