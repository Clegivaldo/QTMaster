import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClientEquipmentForm from '../ClientEquipmentForm'
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

describe('ClientEquipmentForm', () => {
  const mockBrands = [
    { id: '1', name: 'Test Brand', description: 'Test Description' }
  ]

  const mockEquipmentTypes = [
    { id: '1', name: 'Temperature', description: 'Temperature sensors' }
  ]

  const mockModels = [
    {
      id: '1',
      name: 'Model 123',
      brandId: '1',
      equipmentTypeId: '1',
      description: 'Test Model',
      specifications: {
        temperatureRange: '-40 to 85°C',
        accuracy: '±0.1°C'
      }
    }
  ]

  const mockClients = [
    { id: '1', name: 'Test Client', email: 'test@example.com' }
  ]

  const mockEquipment = {
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(equipmentService.getBrands).mockResolvedValue(mockBrands)
    vi.mocked(equipmentService.getEquipmentTypes).mockResolvedValue(mockEquipmentTypes)
    vi.mocked(equipmentService.getModels).mockResolvedValue(mockModels)
    vi.mocked(equipmentService.getClients).mockResolvedValue(mockClients)
  })

  it('deve renderizar formulário de criação', async () => {
    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tipo de equipamento/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/marca/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/modelo/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/série/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tag/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/patrimônio/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument()
    })
  })

  it('deve carregar dados dinamicamente', async () => {
    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toHaveTextContent('Test Client')
      expect(screen.getByLabelText(/tipo de equipamento/i)).toHaveTextContent('Temperature')
      expect(screen.getByLabelText(/marca/i)).toHaveTextContent('Test Brand')
      expect(screen.getByLabelText(/modelo/i)).toHaveTextContent('Model 123')
    })
  })

  it('deve preencher formulário para edição', async () => {
    render(<ClientEquipmentForm equipment={mockEquipment} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toHaveValue('1')
      expect(screen.getByLabelText(/tipo de equipamento/i)).toHaveValue('1')
      expect(screen.getByLabelText(/marca/i)).toHaveValue('1')
      expect(screen.getByLabelText(/modelo/i)).toHaveValue('1')
      expect(screen.getByLabelText(/série/i)).toHaveValue('SN123456')
      expect(screen.getByLabelText(/tag/i)).toHaveValue('TAG-001')
      expect(screen.getByLabelText(/patrimônio/i)).toHaveValue('ASSET001')
      expect(screen.getByLabelText(/descrição/i)).toHaveValue('Test Equipment')
    })
  })

  it('deve validar campos obrigatórios', async () => {
    const user = userEvent.setup()
    render(<ClientEquipmentForm />, { wrapper })

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/cliente é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/tipo de equipamento é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/marca é obrigatória/i)).toBeInTheDocument()
      expect(screen.getByText(/modelo é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/série é obrigatória/i)).toBeInTheDocument()
      expect(screen.getByText(/tag é obrigatória/i)).toBeInTheDocument()
    })
  })

  it('deve criar novo equipamento com sucesso', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.createClientEquipment).mockResolvedValue({
      ...mockEquipment,
      id: '2'
    })

    render(<ClientEquipmentForm onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText(/cliente/i), '1')
    await user.selectOptions(screen.getByLabelText(/tipo de equipamento/i), '1')
    await user.selectOptions(screen.getByLabelText(/marca/i), '1')
    await user.selectOptions(screen.getByLabelText(/modelo/i), '1')
    await user.type(screen.getByLabelText(/série/i), 'SN789012')
    await user.type(screen.getByLabelText(/tag/i), 'TAG-002')
    await user.type(screen.getByLabelText(/patrimônio/i), 'ASSET002')
    await user.type(screen.getByLabelText(/descrição/i), 'New Equipment')

    // Configurar condições de aceitação
    await user.type(screen.getByLabelText(/temperatura mínima/i), '2')
    await user.type(screen.getByLabelText(/temperatura máxima/i), '8')
    await user.type(screen.getByLabelText(/umidade mínima/i), '40')
    await user.type(screen.getByLabelText(/umidade máxima/i), '60')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.createClientEquipment).toHaveBeenCalledWith({
        clientId: '1',
        equipmentTypeId: '1',
        brandId: '1',
        modelId: '1',
        series: 'SN789012',
        tag: 'TAG-002',
        assetNumber: 'ASSET002',
        description: 'New Equipment',
        acceptanceConditions: {
          temperatureRange: { min: 2, max: 8 },
          humidityRange: { min: 40, max: 60 }
        },
        isActive: true
      })
      expect(toast.success).toHaveBeenCalledWith('Equipamento criado com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve editar equipamento existente', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.updateClientEquipment).mockResolvedValue({
      ...mockEquipment,
      series: 'SN999999'
    })

    render(<ClientEquipmentForm equipment={mockEquipment} onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/série/i)).toHaveValue('SN123456')
    })

    const seriesInput = screen.getByLabelText(/série/i)
    await user.clear(seriesInput)
    await user.type(seriesInput, 'SN999999')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.updateClientEquipment).toHaveBeenCalledWith('1', {
        clientId: '1',
        equipmentTypeId: '1',
        brandId: '1',
        modelId: '1',
        series: 'SN999999',
        tag: 'TAG-001',
        assetNumber: 'ASSET001',
        description: 'Test Equipment',
        acceptanceConditions: {
          temperatureRange: { min: 2, max: 8 },
          humidityRange: { min: 40, max: 60 }
        },
        isActive: true
      })
      expect(toast.success).toHaveBeenCalledWith('Equipamento atualizado com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve filtrar modelos baseado na marca e tipo selecionados', async () => {
    const user = userEvent.setup()
    
    const mockModelsFiltered = [
      {
        id: '2',
        name: 'Model 456',
        brandId: '2',
        equipmentTypeId: '2',
        description: 'Another Model'
      }
    ]

    vi.mocked(equipmentService.getModels).mockResolvedValue([
      ...mockModels,
      ...mockModelsFiltered
    ])

    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/tipo de equipamento/i)).toBeInTheDocument()
    })

    // Selecionar tipo diferente
    await user.selectOptions(screen.getByLabelText(/tipo de equipamento/i), '1')
    
    // Aguardar carregamento dos modelos filtrados
    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/modelo/i)
      expect(modelSelect).toHaveTextContent('Model 123')
    })
  })

  it('deve validar faixas de aceitação', async () => {
    const user = userEvent.setup()
    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/temperatura mínima/i)).toBeInTheDocument()
    })

    // Temperatura mínima maior que máxima
    await user.type(screen.getByLabelText(/temperatura mínima/i), '10')
    await user.type(screen.getByLabelText(/temperatura máxima/i), '5')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/temperatura mínima deve ser menor que a máxima/i)).toBeInTheDocument()
    })
  })

  it('deve lidar com erro ao carregar dados', async () => {
    vi.mocked(equipmentService.getBrands).mockRejectedValue(new Error('Erro ao carregar'))
    
    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao carregar dados')
    })
  })

  it('deve lidar com erro ao salvar', async () => {
    const user = userEvent.setup()
    vi.mocked(equipmentService.createClientEquipment).mockRejectedValue(new Error('Erro ao salvar'))

    render(<ClientEquipmentForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText(/cliente/i), '1')
    await user.selectOptions(screen.getByLabelText(/tipo de equipamento/i), '1')
    await user.selectOptions(screen.getByLabelText(/marca/i), '1')
    await user.selectOptions(screen.getByLabelText(/modelo/i), '1')
    await user.type(screen.getByLabelText(/série/i), 'SN789012')
    await user.type(screen.getByLabelText(/tag/i), 'TAG-002')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao salvar equipamento')
    })
  })

  it('deve cancelar formulário', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    
    render(<ClientEquipmentForm onCancel={onCancel} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })
})