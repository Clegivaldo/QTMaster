import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnhancedValidationForm from '../EnhancedValidationForm'
import { equipmentService } from '../../services/equipmentService'
import { toast } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

vi.mock('../../services/equipmentService')
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
)

describe('EnhancedValidationForm', () => {
  const mockClients = [
    { id: '1', name: 'Test Client', email: 'test@example.com' }
  ]

  const mockEquipment = [
    {
      id: '1',
      clientId: '1',
      equipmentTypeId: '1',
      brandId: '1',
      modelId: '1',
      series: 'SN123456',
      tag: 'TAG-001',
      assetNumber: 'ASSET001',
      description: 'Test Equipment',
      acceptanceConditions: {
        temperatureRange: { min: 2, max: 8 },
        humidityRange: { min: 40, max: 60 }
      },
      isActive: true
    }
  ]

  const mockValidation = {
    id: '1',
    validationNumber: 'VAL-001',
    clientId: '1',
    equipmentId: '1',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-02T00:00:00Z',
    cycles: [
      {
        id: '1',
        type: 'Empty',
        startDate: '2024-01-01T08:00:00Z',
        endDate: '2024-01-01T16:00:00Z',
        dataPoints: []
      }
    ],
    status: 'InProgress'
  }

  const mockImportedData = [
    {
      timestamp: '2024-01-01T08:00:00Z',
      temperature: 5.2,
      humidity: 50.1,
      equipmentStatus: 'Normal'
    },
    {
      timestamp: '2024-01-01T09:00:00Z',
      temperature: 5.8,
      humidity: 49.8,
      equipmentStatus: 'Normal'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(equipmentService.getClients).mockResolvedValue(mockClients)
    vi.mocked(equipmentService.getClientEquipment).mockResolvedValue(mockEquipment)
  })

  it('deve renderizar formulário de criação', async () => {
    render(<EnhancedValidationForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/número da validação/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/equipamento/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data de início/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data de finalização/i)).toBeInTheDocument()
    })
  })

  it('deve carregar clientes e equipamentos', async () => {
    render(<EnhancedValidationForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toHaveTextContent('Test Client')
      expect(screen.getByLabelText(/equipamento/i)).toHaveTextContent('TAG-001')
    })
  })

  it('deve preencher formulário para edição', async () => {
    render(<EnhancedValidationForm validation={mockValidation} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/número da validação/i)).toHaveValue('VAL-001')
      expect(screen.getByLabelText(/cliente/i)).toHaveValue('1')
      expect(screen.getByLabelText(/equipamento/i)).toHaveValue('1')
    })
  })

  it('deve validar campos obrigatórios', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/número da validação é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/cliente é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/equipamento é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/data de início é obrigatória/i)).toBeInTheDocument()
      expect(screen.getByText(/data de finalização é obrigatória/i)).toBeInTheDocument()
    })
  })

  it('deve adicionar ciclo de validação', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar ciclo/i })).toBeInTheDocument()
    })

    const addCycleButton = screen.getByRole('button', { name: /adicionar ciclo/i })
    await user.click(addCycleButton)

    await waitFor(() => {
      expect(screen.getByLabelText(/tipo de ciclo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data de início do ciclo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/data de fim do ciclo/i)).toBeInTheDocument()
    })
  })

  it('deve criar validação com ciclos', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.createValidation).mockResolvedValue({
      ...mockValidation,
      id: '2'
    })

    render(<EnhancedValidationForm onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/número da validação/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/número da validação/i), 'VAL-002')
    await user.selectOptions(screen.getByLabelText(/cliente/i), '1')
    await user.selectOptions(screen.getByLabelText(/equipamento/i), '1')
    
    const startDate = screen.getByLabelText(/data de início/i)
    const endDate = screen.getByLabelText(/data de finalização/i)
    
    await user.type(startDate, '2024-01-01T00:00')
    await user.type(endDate, '2024-01-02T00:00')

    // Adicionar ciclo
    const addCycleButton = screen.getByRole('button', { name: /adicionar ciclo/i })
    await user.click(addCycleButton)

    await user.selectOptions(screen.getByLabelText(/tipo de ciclo/i), 'Empty')
    await user.type(screen.getByLabelText(/data de início do ciclo/i), '2024-01-01T08:00')
    await user.type(screen.getByLabelText(/data de fim do ciclo/i), '2024-01-01T16:00')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.createValidation).toHaveBeenCalledWith({
        validationNumber: 'VAL-002',
        clientId: '1',
        equipmentId: '1',
        startDate: expect.any(String),
        endDate: expect.any(String),
        cycles: [
          {
            type: 'Empty',
            startDate: expect.any(String),
            endDate: expect.any(String),
            dataPoints: []
          }
        ],
        status: 'InProgress'
      })
      expect(toast.success).toHaveBeenCalledWith('Validação criada com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve abrir modal de importação de dados', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /importar dados/i })).toBeInTheDocument()
    })

    const importButton = screen.getByRole('button', { name: /importar dados/i })
    await user.click(importButton)

    await waitFor(() => {
      expect(screen.getByText(/importar dados de validação/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/arquivo csv/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /processar/i })).toBeInTheDocument()
    })
  })

  it('deve processar arquivo CSV importado', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    // Abrir modal de importação
    const importButton = screen.getByRole('button', { name: /importar dados/i })
    await user.click(importButton)

    // Criar arquivo mock
    const csvContent = 'timestamp,temperature,humidity,equipmentStatus\n2024-01-01T08:00:00Z,5.2,50.1,Normal\n2024-01-01T09:00:00Z,5.8,49.8,Normal'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

    const fileInput = screen.getByLabelText(/arquivo csv/i)
    await user.upload(fileInput, file)

    // Mock do processamento
    vi.mocked(equipmentService.processImportedData).mockResolvedValue(mockImportedData)

    const processButton = screen.getByRole('button', { name: /processar/i })
    await user.click(processButton)

    await waitFor(() => {
      expect(equipmentService.processImportedData).toHaveBeenCalled()
      expect(screen.getByText(/dados importados com sucesso/i)).toBeInTheDocument()
      expect(screen.getByText(/2 pontos de dados/i)).toBeInTheDocument()
    })
  })

  it('deve marcar/desmarcar dados importados', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.createValidation).mockResolvedValue({
      ...mockValidation,
      id: '2'
    })

    render(<EnhancedValidationForm onSuccess={onSuccess} />, { wrapper })

    // Preencher formulário básico
    await user.type(screen.getByLabelText(/número da validação/i), 'VAL-002')
    await user.selectOptions(screen.getByLabelText(/cliente/i), '1')
    await user.selectOptions(screen.getByLabelText(/equipamento/i), '1')
    await user.type(screen.getByLabelText(/data de início/i), '2024-01-01T00:00')
    await user.type(screen.getByLabelText(/data de finalização/i), '2024-01-02T00:00')

    // Importar dados
    const importButton = screen.getByRole('button', { name: /importar dados/i })
    await user.click(importButton)

    const csvContent = 'timestamp,temperature,humidity,equipmentStatus\n2024-01-01T08:00:00Z,5.2,50.1,Normal'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const fileInput = screen.getByLabelText(/arquivo csv/i)
    await user.upload(fileInput, file)

    vi.mocked(equipmentService.processImportedData).mockResolvedValue(mockImportedData)
    const processButton = screen.getByRole('button', { name: /processar/i })
    await user.click(processButton)

    await waitFor(() => {
      expect(screen.getByText(/dados importados com sucesso/i)).toBeInTheDocument()
    })

    // Marcar/demarcar dados
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    const confirmButton = screen.getByRole('button', { name: /confirmar seleção/i })
    await user.click(confirmButton)

    // Salvar validação com dados selecionados
    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)
  })

  it('deve calcular tempo sem interrupção automaticamente', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    // Importar dados com condições de aceitação
    const importButton = screen.getByRole('button', { name: /importar dados/i })
    await user.click(importButton)

    const csvContent = `timestamp,temperature,humidity,equipmentStatus
2024-01-01T08:00:00Z,5.2,50.1,Normal
2024-01-01T09:00:00Z,5.8,49.8,Normal
2024-01-01T10:00:00Z,6.1,51.2,Normal`
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    const fileInput = screen.getByLabelText(/arquivo csv/i)
    await user.upload(fileInput, file)

    vi.mocked(equipmentService.processImportedData).mockResolvedValue([
      {
        timestamp: '2024-01-01T08:00:00Z',
        temperature: 5.2,
        humidity: 50.1,
        equipmentStatus: 'Normal'
      },
      {
        timestamp: '2024-01-01T09:00:00Z',
        temperature: 5.8,
        humidity: 49.8,
        equipmentStatus: 'Normal'
      },
      {
        timestamp: '2024-01-01T10:00:00Z',
        temperature: 6.1,
        humidity: 51.2,
        equipmentStatus: 'Normal'
      }
    ])

    const processButton = screen.getByRole('button', { name: /processar/i })
    await user.click(processButton)

    await waitFor(() => {
      expect(screen.getByText(/3 pontos de dados/i)).toBeInTheDocument()
    })
  })

  it('deve validar datas dos ciclos', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm />, { wrapper })

    // Preencher datas principais
    await user.type(screen.getByLabelText(/data de início/i), '2024-01-01T00:00')
    await user.type(screen.getByLabelText(/data de finalização/i), '2024-01-02T00:00')

    // Adicionar ciclo com data fora do período
    const addCycleButton = screen.getByRole('button', { name: /adicionar ciclo/i })
    await user.click(addCycleButton)

    await user.type(screen.getByLabelText(/data de início do ciclo/i), '2024-01-03T08:00')
    await user.type(screen.getByLabelText(/data de fim do ciclo/i), '2024-01-03T16:00')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/data do ciclo deve estar dentro do período da validação/i)).toBeInTheDocument()
    })
  })

  it('deve remover ciclo', async () => {
    const user = userEvent.setup()
    render(<EnhancedValidationForm validation={mockValidation} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText(/ciclo 1/i)).toBeInTheDocument()
    })

    const removeButton = screen.getByRole('button', { name: /remover ciclo/i })
    await user.click(removeButton)

    await waitFor(() => {
      expect(screen.queryByText(/ciclo 1/i)).not.toBeInTheDocument()
    })
  })

  it('deve editar validação existente', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.updateValidation).mockResolvedValue({
      ...mockValidation,
      validationNumber: 'VAL-UPDATED'
    })

    render(<EnhancedValidationForm validation={mockValidation} onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/número da validação/i)).toHaveValue('VAL-001')
    })

    const validationNumberInput = screen.getByLabelText(/número da validação/i)
    await user.clear(validationNumberInput)
    await user.type(validationNumberInput, 'VAL-UPDATED')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.updateValidation).toHaveBeenCalledWith('1', expect.objectContaining({
        validationNumber: 'VAL-UPDATED'
      }))
      expect(toast.success).toHaveBeenCalledWith('Validação atualizada com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve lidar com erro ao salvar', async () => {
    const user = userEvent.setup()
    vi.mocked(equipmentService.createValidation).mockRejectedValue(new Error('Erro ao salvar'))

    render(<EnhancedValidationForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/número da validação/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/número da validação/i), 'VAL-002')
    await user.selectOptions(screen.getByLabelText(/cliente/i), '1')
    await user.selectOptions(screen.getByLabelText(/equipamento/i), '1')
    await user.type(screen.getByLabelText(/data de início/i), '2024-01-01T00:00')
    await user.type(screen.getByLabelText(/data de finalização/i), '2024-01-02T00:00')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao salvar validação')
    })
  })

  it('deve cancelar formulário', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    
    render(<EnhancedValidationForm onCancel={onCancel} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })
})