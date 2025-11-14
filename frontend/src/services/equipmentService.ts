import { supabase } from '../lib/supabase'
import { 
  Brand, 
  EquipmentModel, 
  EquipmentType, 
  ClientEquipment, 
  Validation,
  ValidationCycle,
  ValidationDataPoint
} from '../types/equipment'

export const equipmentService = {
  // Brands
  async getBrands(): Promise<Brand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async createBrand(brand: Omit<Brand, 'id'>): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .insert([brand])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateBrand(id: string, brand: Partial<Brand>): Promise<Brand> {
    const { data, error } = await supabase
      .from('brands')
      .update(brand)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async deleteBrand(id: string): Promise<void> {
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Equipment Types
  async getEquipmentTypes(): Promise<EquipmentType[]> {
    const { data, error } = await supabase
      .from('equipment_types')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Models
  async getModels(): Promise<EquipmentModel[]> {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async getModelsByBrandAndType(brandId: string, equipmentTypeId: string): Promise<EquipmentModel[]> {
    const { data, error } = await supabase
      .from('equipment_models')
      .select('*')
      .eq('brandId', brandId)
      .eq('equipmentTypeId', equipmentTypeId)
      .order('name', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async createModel(model: Omit<EquipmentModel, 'id'>): Promise<EquipmentModel> {
    const { data, error } = await supabase
      .from('equipment_models')
      .insert([model])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateModel(id: string, model: Partial<EquipmentModel>): Promise<EquipmentModel> {
    const { data, error } = await supabase
      .from('equipment_models')
      .update(model)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Client Equipment
  async getClientEquipment(clientId?: string): Promise<ClientEquipment[]> {
    let query = supabase
      .from('client_equipment')
      .select(`
        *,
        brands (id, name),
        equipment_models (id, name),
        equipment_types (id, name)
      `)
      .order('tag', { ascending: true })

    if (clientId) {
      query = query.eq('clientId', clientId)
    }

    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  async createClientEquipment(equipment: Omit<ClientEquipment, 'id'>): Promise<ClientEquipment> {
    const { data, error } = await supabase
      .from('client_equipment')
      .insert([equipment])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateClientEquipment(id: string, equipment: Partial<ClientEquipment>): Promise<ClientEquipment> {
    const { data, error } = await supabase
      .from('client_equipment')
      .update(equipment)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Validations
  async getValidations(): Promise<Validation[]> {
    const { data, error } = await supabase
      .from('validations')
      .select(`
        *,
        clients (id, name),
        client_equipment (id, tag, series, assetNumber)
      `)
      .order('validationNumber', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  async createValidation(validation: Omit<Validation, 'id'>): Promise<Validation> {
    const { data, error } = await supabase
      .from('validations')
      .insert([validation])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateValidation(id: string, validation: Partial<Validation>): Promise<Validation> {
    const { data, error } = await supabase
      .from('validations')
      .update(validation)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Data Import
  processImportedData(csvContent: string): ValidationDataPoint[] {
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',')
    
    return lines.slice(1).map(line => {
      const values = line.split(',')
      const row: any = {}
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim()
      })
      
      return {
        timestamp: row.timestamp || row.time || new Date().toISOString(),
        temperature: parseFloat(row.temperature) || 0,
        humidity: parseFloat(row.humidity) || 0,
        equipmentStatus: row.equipmentStatus || 'Normal'
      }
    })
  },

  calculateUninterruptedTime(
    dataPoints: ValidationDataPoint[], 
    acceptanceConditions: { temperatureRange: { min: number; max: number }; humidityRange: { min: number; max: number } }
  ): {
    totalPoints: number
    pointsWithinConditions: number
    uninterruptedTime: number
    longestUninterruptedPeriod: number
    interruptions: number
    percentageWithinConditions: number
  } {
    if (!dataPoints.length) {
      return {
        totalPoints: 0,
        pointsWithinConditions: 0,
        uninterruptedTime: 0,
        longestUninterruptedPeriod: 0,
        interruptions: 0,
        percentageWithinConditions: 0
      }
    }

    let pointsWithinConditions = 0
    let interruptions = 0
    let currentUninterruptedPeriod = 0
    let longestUninterruptedPeriod = 0
    let lastWasWithinConditions = false

    dataPoints.forEach(point => {
      const isWithinTemp = point.temperature >= acceptanceConditions.temperatureRange.min && 
                          point.temperature <= acceptanceConditions.temperatureRange.max
      const isWithinHumidity = point.humidity >= acceptanceConditions.humidityRange.min && 
                              point.humidity <= acceptanceConditions.humidityRange.max
      const isWithinConditions = isWithinTemp && isWithinHumidity

      if (isWithinConditions) {
        pointsWithinConditions++
        currentUninterruptedPeriod++
        if (!lastWasWithinConditions) {
          // Reiniciou após interrupção
          currentUninterruptedPeriod = 1
        }
        longestUninterruptedPeriod = Math.max(longestUninterruptedPeriod, currentUninterruptedPeriod)
        lastWasWithinConditions = true
      } else {
        if (lastWasWithinConditions) {
          interruptions++
        }
        currentUninterruptedPeriod = 0
        lastWasWithinConditions = false
      }
    })

    // Calcular tempo total (assumindo intervalos de 1 hora entre pontos)
    const totalTime = dataPoints.length * 60 * 60 * 1000 // milissegundos
    const uninterruptedTime = (pointsWithinConditions / dataPoints.length) * totalTime

    return {
      totalPoints: dataPoints.length,
      pointsWithinConditions,
      uninterruptedTime,
      longestUninterruptedPeriod,
      interruptions,
      percentageWithinConditions: (pointsWithinConditions / dataPoints.length) * 100
    }
  }
}