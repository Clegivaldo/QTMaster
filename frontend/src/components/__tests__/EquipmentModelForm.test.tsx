import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EquipmentModelForm from '../EquipmentModelForm'
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

describe('EquipmentModelForm', () => {
  const mockBrands = [
    { id: '1', name: 'Test Brand', description: 'Test Description' }
  ]

  const mockEquipmentTypes = [
    { id: '1', name: 'Temperature', description: 'Temperature sensors' }
  ]

  const mockModel = {
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

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(equipmentService.getBrands).mockResolvedValue(mockBrands)
    vi.mocked(equipmentService.getEquipmentTypes).mockResolvedValue(mockEquipmentTypes)
  })

  it('deve renderizar formulário de criação', async () => {
    render(<EquipmentModelForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/marca/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tipo de equipamento/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument()
    })
  })

  it('deve carregar marcas e tipos de equipamento', async () => {
    render(<EquipmentModelForm />, { wrapper })

    await waitFor(() => {
      const brandSelect = screen.getByLabelText(/marca/i)
      const typeSelect = screen.getByLabelText(/tipo de equipamento/i)
      
      expect(brandSelect).toHaveTextContent('Test Brand')
      expect(typeSelect).toHaveTextContent('Temperature')
    })
  })

  it('deve preencher formulário para edição', async () => {
    render(<EquipmentModelForm model={mockModel} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Model 123')
      expect(screen.getByLabelText(/descrição/i)).toHaveValue('Test Model')
      expect(screen.getByLabelText(/marca/i)).toHaveValue('1')
      expect(screen.getByLabelText(/tipo de equipamento/i)).toHaveValue('1')
    })
  })

  it('deve validar campos obrigatórios', async () => {
    const user = userEvent.setup()
    render(<EquipmentModelForm />, { wrapper })

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
      expect(screen.getByText(/marca é obrigatória/i)).toBeInTheDocument()
      expect(screen.getByText(/tipo de equipamento é obrigatório/i)).toBeInTheDocument()
    })
  })

  it('deve criar novo modelo com sucesso', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.createModel).mockResolvedValue({
      ...mockModel,
      id: '2'
    })

    render(<EquipmentModelForm onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/nome/i), 'New Model')
    await user.selectOptions(screen.getByLabelText(/marca/i), '1')
    await user.selectOptions(screen.getByLabelText(/tipo de equipamento/i), '1')
    await user.type(screen.getByLabelText(/descrição/i), 'New Description')

    const addSpecButton = screen.getByRole('button', { name: /adicionar especificação/i })
    await user.click(addSpecButton)

    const specInputs = screen.getAllByPlaceholderText(/chave/i)
    const valueInputs = screen.getAllByPlaceholderText(/valor/i)

    await user.type(specInputs[0], 'Range')
    await user.type(valueInputs[0], '0-100')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.createModel).toHaveBeenCalledWith({
        name: 'New Model',
        brandId: '1',
        equipmentTypeId: '1',
        description: 'New Description',
        specifications: {
          Range: '0-100'
        }
      })
      expect(toast.success).toHaveBeenCalledWith('Modelo criado com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve editar modelo existente', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    
    vi.mocked(equipmentService.updateModel).mockResolvedValue({
      ...mockModel,
      name: 'Updated Model'
    })

    render(<EquipmentModelForm model={mockModel} onSuccess={onSuccess} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Model 123')
    })

    const nameInput = screen.getByLabelText(/nome/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Model')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(equipmentService.updateModel).toHaveBeenCalledWith('1', {
        name: 'Updated Model',
        brandId: '1',
        equipmentTypeId: '1',
        description: 'Test Model',
        specifications: {
          temperatureRange: '-40 to 85°C',
          accuracy: '±0.1°C'
        }
      })
      expect(toast.success).toHaveBeenCalledWith('Modelo atualizado com sucesso!')
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('deve adicionar múltiplas especificações', async () => {
    const user = userEvent.setup()
    render(<EquipmentModelForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar especificação/i })).toBeInTheDocument()
    })

    const addSpecButton = screen.getByRole('button', { name: /adicionar especificação/i })
    
    // Adicionar primeira especificação
    await user.click(addSpecButton)
    let specInputs = screen.getAllByPlaceholderText(/chave/i)
    let valueInputs = screen.getAllByPlaceholderText(/valor/i)
    
    await user.type(specInputs[0], 'Spec1')
    await user.type(valueInputs[0], 'Value1')

    // Adicionar segunda especificação
    await user.click(addSpecButton)
    specInputs = screen.getAllByPlaceholderText(/chave/i)
    valueInputs = screen.getAllByPlaceholderText(/valor/i)
    
    await user.type(specInputs[1], 'Spec2')
    await user.type(valueInputs[1], 'Value2')

    expect(specInputs).toHaveLength(2)
    expect(valueInputs).toHaveLength(2)
  })

  it('deve remover especificações', async () => {
    const user = userEvent.setup()
    render(<EquipmentModelForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar especificação/i })).toBeInTheDocument()
    })

    const addSpecButton = screen.getByRole('button', { name: /adicionar especificação/i })
    
    // Adicionar duas especificações
    await user.click(addSpecButton)
    await user.click(addSpecButton)

    let removeButtons = screen.getAllByRole('button', { name: /remover/i })
    expect(removeButtons).toHaveLength(2)

    // Remover primeira especificação
    await user.click(removeButtons[0])

    removeButtons = screen.getAllByRole('button', { name: /remover/i })
    expect(removeButtons).toHaveLength(1)
  })

  it('deve lidar com erro ao salvar', async () => {
    const user = userEvent.setup()
    vi.mocked(equipmentService.createModel).mockRejectedValue(new Error('Erro ao salvar'))

    render(<EquipmentModelForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/nome/i), 'New Model')
    await user.selectOptions(screen.getByLabelText(/marca/i), '1')
    await user.selectOptions(screen.getByLabelText(/tipo de equipamento/i), '1')

    const submitButton = screen.getByRole('button', { name: /salvar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Erro ao salvar modelo')
    })
  })

  it('deve cancelar formulário', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    
    render(<EquipmentModelForm onCancel={onCancel} />, { wrapper })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)

    expect(onCancel).toHaveBeenCalled()
  })
})