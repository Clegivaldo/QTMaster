import { describe, it, expect, vi, beforeEach } from 'vitest'
import { equipmentService } from '../equipmentService'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      order: vi.fn(),
      ilike: vi.fn()
    }))
  }
}))

describe('equipmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Brands', () => {
    it('deve buscar todas as marcas', async () => {
      const mockBrands = [
        { id: '1', name: 'Test Brand', description: 'Test Description' }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBrands, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getBrands()

      expect(supabase.from).toHaveBeenCalledWith('brands')
      expect(mockSelect.select).toHaveBeenCalledWith('*')
      expect(mockSelect.order).toHaveBeenCalledWith('name', { ascending: true })
      expect(result).toEqual(mockBrands)
    })

    it('deve criar nova marca', async () => {
      const newBrand = { name: 'New Brand', description: 'New Description' }
      const mockResponse = { id: '2', ...newBrand }

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockInsert as any)

      const result = await equipmentService.createBrand(newBrand)

      expect(supabase.from).toHaveBeenCalledWith('brands')
      expect(mockInsert.insert).toHaveBeenCalledWith([newBrand])
      expect(result).toEqual(mockResponse)
    })

    it('deve atualizar marca existente', async () => {
      const updatedBrand = { name: 'Updated Brand' }
      const mockResponse = { id: '1', ...updatedBrand }

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockUpdate as any)

      const result = await equipmentService.updateBrand('1', updatedBrand)

      expect(supabase.from).toHaveBeenCalledWith('brands')
      expect(mockUpdate.update).toHaveBeenCalledWith(updatedBrand)
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockResponse)
    })

    it('deve deletar marca', async () => {
      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockDelete as any)

      await equipmentService.deleteBrand('1')

      expect(supabase.from).toHaveBeenCalledWith('brands')
      expect(mockDelete.delete).toHaveBeenCalled()
      expect(mockDelete.eq).toHaveBeenCalledWith('id', '1')
    })
  })

  describe('Equipment Types', () => {
    it('deve buscar todos os tipos de equipamento', async () => {
      const mockTypes = [
        { id: '1', name: 'Temperature', description: 'Temperature sensors' }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTypes, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getEquipmentTypes()

      expect(supabase.from).toHaveBeenCalledWith('equipment_types')
      expect(result).toEqual(mockTypes)
    })
  })

  describe('Models', () => {
    it('deve buscar todos os modelos', async () => {
      const mockModels = [
        {
          id: '1',
          name: 'Model 123',
          brandId: '1',
          equipmentTypeId: '1',
          description: 'Test Model'
        }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockModels, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getModels()

      expect(supabase.from).toHaveBeenCalledWith('equipment_models')
      expect(result).toEqual(mockModels)
    })

    it('deve buscar modelos por marca e tipo', async () => {
      const mockModels = [
        {
          id: '1',
          name: 'Model 123',
          brandId: '1',
          equipmentTypeId: '1'
        }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockModels, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getModelsByBrandAndType('1', '1')

      expect(supabase.from).toHaveBeenCalledWith('equipment_models')
      expect(mockSelect.eq).toHaveBeenCalledWith('brandId', '1')
      expect(mockSelect.eq).toHaveBeenCalledWith('equipmentTypeId', '1')
      expect(result).toEqual(mockModels)
    })

    it('deve criar novo modelo', async () => {
      const newModel = {
        name: 'New Model',
        brandId: '1',
        equipmentTypeId: '1',
        description: 'New Description',
        specifications: { range: '0-100' }
      }
      const mockResponse = { id: '2', ...newModel }

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockInsert as any)

      const result = await equipmentService.createModel(newModel)

      expect(supabase.from).toHaveBeenCalledWith('equipment_models')
      expect(mockInsert.insert).toHaveBeenCalledWith([newModel])
      expect(result).toEqual(mockResponse)
    })

    it('deve atualizar modelo existente', async () => {
      const updatedModel = { name: 'Updated Model' }
      const mockResponse = { id: '1', ...updatedModel }

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockUpdate as any)

      const result = await equipmentService.updateModel('1', updatedModel)

      expect(supabase.from).toHaveBeenCalledWith('equipment_models')
      expect(mockUpdate.update).toHaveBeenCalledWith(updatedModel)
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Client Equipment', () => {
    it('deve buscar equipamentos do cliente', async () => {
      const mockEquipment = [
        {
          id: '1',
          clientId: '1',
          equipmentTypeId: '1',
          brandId: '1',
          modelId: '1',
          series: 'SN123456',
          tag: 'TAG-001'
        }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getClientEquipment('1')

      expect(supabase.from).toHaveBeenCalledWith('client_equipment')
      expect(mockSelect.eq).toHaveBeenCalledWith('clientId', '1')
      expect(result).toEqual(mockEquipment)
    })

    it('deve criar equipamento do cliente', async () => {
      const newEquipment = {
        clientId: '1',
        equipmentTypeId: '1',
        brandId: '1',
        modelId: '1',
        series: 'SN123456',
        tag: 'TAG-001',
        acceptanceConditions: { temperatureRange: { min: 2, max: 8 } }
      }
      const mockResponse = { id: '2', ...newEquipment }

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockInsert as any)

      const result = await equipmentService.createClientEquipment(newEquipment)

      expect(supabase.from).toHaveBeenCalledWith('client_equipment')
      expect(mockInsert.insert).toHaveBeenCalledWith([newEquipment])
      expect(result).toEqual(mockResponse)
    })

    it('deve atualizar equipamento do cliente', async () => {
      const updatedEquipment = { series: 'SN999999' }
      const mockResponse = { id: '1', ...updatedEquipment }

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockUpdate as any)

      const result = await equipmentService.updateClientEquipment('1', updatedEquipment)

      expect(supabase.from).toHaveBeenCalledWith('client_equipment')
      expect(mockUpdate.update).toHaveBeenCalledWith(updatedEquipment)
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Validations', () => {
    it('deve buscar validações', async () => {
      const mockValidations = [
        {
          id: '1',
          validationNumber: 'VAL-001',
          clientId: '1',
          equipmentId: '1',
          startDate: '2024-01-01T00:00:00Z',
          status: 'InProgress'
        }
      ]

      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockValidations, error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      const result = await equipmentService.getValidations()

      expect(supabase.from).toHaveBeenCalledWith('validations')
      expect(result).toEqual(mockValidations)
    })

    it('deve criar validação', async () => {
      const newValidation = {
        validationNumber: 'VAL-002',
        clientId: '1',
        equipmentId: '1',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z',
        cycles: [],
        status: 'InProgress'
      }
      const mockResponse = { id: '2', ...newValidation }

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockInsert as any)

      const result = await equipmentService.createValidation(newValidation)

      expect(supabase.from).toHaveBeenCalledWith('validations')
      expect(mockInsert.insert).toHaveBeenCalledWith([newValidation])
      expect(result).toEqual(mockResponse)
    })

    it('deve atualizar validação', async () => {
      const updatedValidation = { status: 'Completed' }
      const mockResponse = { id: '1', ...updatedValidation }

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [mockResponse], error: null })
      }

      vi.mocked(supabase.from).mockReturnValue(mockUpdate as any)

      const result = await equipmentService.updateValidation('1', updatedValidation)

      expect(supabase.from).toHaveBeenCalledWith('validations')
      expect(mockUpdate.update).toHaveBeenCalledWith(updatedValidation)
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Data Import', () => {
    it('deve processar dados CSV corretamente', async () => {
      const csvContent = `timestamp,temperature,humidity,equipmentStatus
2024-01-01T08:00:00Z,5.2,50.1,Normal
2024-01-01T09:00:00Z,5.8,49.8,Normal`

      const expectedResult = [
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

      const result = await equipmentService.processImportedData(csvContent)

      expect(result).toEqual(expectedResult)
    })

    it('deve calcular tempo dentro das condições de aceitação', async () => {
      const dataPoints = [
        {
          timestamp: '2024-01-01T08:00:00Z',
          temperature: 5.2,
          humidity: 50.1,
          equipmentStatus: 'Normal'
        },
        {
          timestamp: '2024-01-01T09:00:00Z',
          temperature: 1.5, // Fora da faixa
          humidity: 49.8,
          equipmentStatus: 'Normal'
        },
        {
          timestamp: '2024-01-01T10:00:00Z',
          temperature: 6.1,
          humidity: 51.2,
          equipmentStatus: 'Normal'
        }
      ]

      const acceptanceConditions = {
        temperatureRange: { min: 2, max: 8 },
        humidityRange: { min: 40, max: 60 }
      }

      const result = equipmentService.calculateUninterruptedTime(
        dataPoints,
        acceptanceConditions
      )

      expect(result.totalPoints).toBe(3)
      expect(result.pointsWithinConditions).toBe(2)
      expect(result.uninterruptedTime).toBeGreaterThan(0)
      expect(result.percentageWithinConditions).toBeCloseTo(66.67, 1)
    })

    it('deve detectar interrupções nas condições', async () => {
      const dataPoints = [
        {
          timestamp: '2024-01-01T08:00:00Z',
          temperature: 5.2,
          humidity: 50.1,
          equipmentStatus: 'Normal'
        },
        {
          timestamp: '2024-01-01T09:00:00Z',
          temperature: 1.5, // Fora - interrompe
          humidity: 49.8,
          equipmentStatus: 'Normal'
        },
        {
          timestamp: '2024-01-01T10:00:00Z',
          temperature: 6.1, // Dentro - reinicia
          humidity: 51.2,
          equipmentStatus: 'Normal'
        },
        {
          timestamp: '2024-01-01T11:00:00Z',
          temperature: 7.5,
          humidity: 48.9,
          equipmentStatus: 'Normal'
        }
      ]

      const acceptanceConditions = {
        temperatureRange: { min: 2, max: 8 },
        humidityRange: { min: 40, max: 60 }
      }

      const result = equipmentService.calculateUninterruptedTime(
        dataPoints,
        acceptanceConditions
      )

      expect(result.interruptions).toBe(1)
      expect(result.longestUninterruptedPeriod).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('deve lidar com erro ao buscar dados', async () => {
      const mockSelect = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      }

      vi.mocked(supabase.from).mockReturnValue(mockSelect as any)

      await expect(equipmentService.getBrands()).rejects.toThrow('Database error')
    })

    it('deve lidar com erro ao criar registro', async () => {
      const newBrand = { name: 'New Brand', description: 'New Description' }

      const mockInsert = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: null, error: new Error('Insert error') })
      }

      vi.mocked(supabase.from).mockReturnValue(mockInsert as any)

      await expect(equipmentService.createBrand(newBrand)).rejects.toThrow('Insert error')
    })

    it('deve lidar com erro ao processar CSV inválido', async () => {
      const invalidCsv = 'conteúdo inválido sem cabeçalho'

      await expect(equipmentService.processImportedData(invalidCsv)).rejects.toThrow()
    })
  })
})