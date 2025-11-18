import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { ValidationFormData, Validation } from '@/types/validation';
import { Suitcase } from '@/types/suitcase';
import { Client } from '@/types/client';
import { ClientEquipment, EquipmentType, Brand, EquipmentModel } from '@/types/equipment';

interface EnhancedValidationFormProps {
  validation?: Validation;
  onSubmit: (data: EnhancedValidationFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  suitcases?: Suitcase[];
  clients?: Client[];
  clientEquipments?: ClientEquipment[];
  equipmentTypes?: EquipmentType[];
  brands?: Brand[];
  models?: EquipmentModel[];
  onImportData?: (validationId: string, file: File, suitcaseIds: string[]) => void;
  onCalculateStatistics?: (validationId: string) => void;
  importLoading?: boolean;
  calculateLoading?: boolean;
}

export interface EnhancedValidationFormData {
  validationNumber: string;
  clientId: string;
  equipmentId: string;
  equipmentTypeId: string;
  brandId: string;
  modelId: string;
  serialNumber: string;
  assetNumber?: string;
  tag?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  cycles: ValidationCycleData[];
  parameters: {
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number;
    maxHumidity?: number;
  };
}

export interface ValidationCycleData {
  id?: string;
  cycleType: 'EMPTY' | 'FULL' | 'OPEN_DOOR' | 'POWER_OUTAGE' | 'NORMAL';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes?: string;
}

const EnhancedValidationForm: React.FC<EnhancedValidationFormProps> = ({
  validation,
  onSubmit,
  onCancel,
  isLoading = false,
  suitcases = [],
  clients = [],
  clientEquipments = [],
  equipmentTypes = [],
  brands = [],
  models = [],
  onImportData,
  onCalculateStatistics,
  importLoading = false,
  calculateLoading = false,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [cycles, setCycles] = useState<ValidationCycleData[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedSuitcaseIds, setSelectedSuitcaseIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EnhancedValidationFormData>({
    defaultValues: {
      validationNumber: validation?.name ? validation.name.split(' - ')[0] : '',
      clientId: validation?.clientId || '',
      equipmentId: '',
      equipmentTypeId: '',
      brandId: '',
      modelId: '',
      serialNumber: '',
      assetNumber: '',
      tag: '',
      name: validation?.name || '',
      description: validation?.description || '',
      startDate: validation ? new Date(validation.createdAt).toISOString().split('T')[0] : '',
      endDate: '',
      cycles: [],
      parameters: {
        minTemperature: validation?.minTemperature || 0,
        maxTemperature: validation?.maxTemperature || 0,
        minHumidity: validation?.minHumidity || undefined,
        maxHumidity: validation?.maxHumidity || undefined,
      },
    },
  });

  const watchedClientId = watch('clientId');
  const watchedEquipmentId = watch('equipmentId');

  // Filter equipment by client
  const filteredEquipments = clientEquipments.filter(eq => eq.clientId === watchedClientId);

  // Auto-fill equipment details when equipment is selected
  useEffect(() => {
    if (watchedEquipmentId) {
      const equipment = clientEquipments.find(eq => eq.id === watchedEquipmentId);
      if (equipment) {
        setValue('equipmentTypeId', equipment.equipmentTypeId);
        setValue('brandId', equipment.brandId);
        setValue('modelId', equipment.modelId);
        setValue('serialNumber', equipment.serialNumber);
        setValue('assetNumber', equipment.assetNumber || '');
        setValue('tag', equipment.tag || '');
        setValue('parameters.minTemperature', equipment.acceptanceConditions.minTemperature);
        setValue('parameters.maxTemperature', equipment.acceptanceConditions.maxTemperature);
        setValue('parameters.minHumidity', equipment.acceptanceConditions.minHumidity || undefined);
        setValue('parameters.maxHumidity', equipment.acceptanceConditions.maxHumidity || undefined);
      }
    }
  }, [watchedEquipmentId, clientEquipments, setValue]);

  const addCycle = () => {
    const newCycle: ValidationCycleData = {
      cycleType: 'NORMAL',
      startDate: '',
      startTime: '',
      endDate: '',
      endTime: '',
      notes: '',
    };
    setCycles([...cycles, newCycle]);
  };

  const updateCycle = (index: number, field: keyof ValidationCycleData, value: string) => {
    const updatedCycles = [...cycles];
    updatedCycles[index] = { ...updatedCycles[index], [field]: value };
    setCycles(updatedCycles);
  };

  const removeCycle = (index: number) => {
    setCycles(cycles.filter((_, i) => i !== index));
  };

  const handleImportSubmit = () => {
    if (!importFile || !onImportData) return;

    if (selectedSuitcaseIds.length === 0) {
      alert('Selecione ao menos uma maleta para associar os dados importados.');
      return;
    }

    onImportData(validation?.id || 'new', importFile, selectedSuitcaseIds);
    setShowImportModal(false);
    setImportFile(null);
    setSelectedSuitcaseIds([]);
  };

  const onFormSubmit = (data: EnhancedValidationFormData) => {
    // Validate cycles
    for (const cycle of cycles) {
      if (!cycle.startDate || !cycle.startTime || !cycle.endDate || !cycle.endTime) {
        alert('Por favor, preencha todas as datas e horários dos ciclos.');
        return;
      }
      
      const startDateTime = new Date(`${cycle.startDate}T${cycle.startTime}`);
      const endDateTime = new Date(`${cycle.endDate}T${cycle.endTime}`);
      
      if (endDateTime <= startDateTime) {
        alert('A data/hora final deve ser posterior à data/hora inicial em cada ciclo.');
        return;
      }
    }

    // Validate temperature limits
    if (data.parameters.minTemperature >= data.parameters.maxTemperature) {
      alert('A temperatura mínima deve ser menor que a temperatura máxima.');
      return;
    }

    // Validate humidity limits if provided
    if (data.parameters.minHumidity !== undefined && data.parameters.maxHumidity !== undefined) {
      if (data.parameters.minHumidity >= data.parameters.maxHumidity) {
        alert('A umidade mínima deve ser menor que a umidade máxima.');
        return;
      }
    }

    const finalData = {
      ...data,
      cycles: cycles.length > 0 ? cycles : undefined,
    };

    onSubmit(finalData);
  };

  return (
    <>
      <ResponsiveModal
        isOpen={true}
        onClose={onCancel}
        title={validation ? 'Editar Validação' : 'Nova Validação'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Validation Number */}
              <div>
                <label htmlFor="validationNumber" className="mobile-form-label">
                  Número da Validação *
                </label>
                <input
                  {...register('validationNumber', {
                    required: 'Número da validação é obrigatório',
                  })}
                  type="text"
                  className="mobile-form-input"
                  placeholder="VAL-2024-001"
                />
                {errors.validationNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.validationNumber.message}</p>
                )}
              </div>

              {/* Client */}
              <div>
                <label htmlFor="clientId" className="mobile-form-label">
                  Cliente *
                </label>
                <select
                  {...register('clientId', {
                    required: 'Cliente é obrigatório',
                  })}
                  className="mobile-form-input"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
                )}
              </div>

              {/* Equipment Selection */}
              {watchedClientId && (
                <div>
                  <label htmlFor="equipmentId" className="mobile-form-label">
                    Equipamento *
                  </label>
                  <select
                    {...register('equipmentId', {
                      required: 'Equipamento é obrigatório',
                    })}
                    className="mobile-form-input"
                  >
                    <option value="">Selecione um equipamento</option>
                    {filteredEquipments.map((equipment) => (
                      <option key={equipment.id} value={equipment.id}>
                        {equipment.serialNumber} - {equipment.equipmentType?.name}
                      </option>
                    ))}
                  </select>
                  {errors.equipmentId && (
                    <p className="mt-1 text-sm text-red-600">{errors.equipmentId.message}</p>
                  )}
                </div>
              )}

              {/* Equipment Details (Auto-filled) */}
              {watchedEquipmentId && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <input
                      {...register('equipmentTypeId')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <input
                      {...register('brandId')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                    <input
                      {...register('modelId')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Série</label>
                    <input
                      {...register('serialNumber')}
                      type="text"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                      readOnly
                    />
                  </div>
                </div>
              )}

              {/* Asset Number and Tag */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="assetNumber" className="mobile-form-label">
                    Patrimônio
                  </label>
                  <input
                    {...register('assetNumber')}
                    type="text"
                    className="mobile-form-input"
                    placeholder="Número do patrimônio"
                  />
                </div>
                <div>
                  <label htmlFor="tag" className="mobile-form-label">
                    TAG
                  </label>
                  <input
                    {...register('tag')}
                    type="text"
                    className="mobile-form-input"
                    placeholder="TAG do equipamento"
                  />
                </div>
              </div>

              {/* Validation Name */}
              <div>
                <label htmlFor="name" className="mobile-form-label">
                  Nome da Validação *
                </label>
                <input
                  {...register('name', {
                    required: 'Nome da validação é obrigatório',
                  })}
                  type="text"
                  className="mobile-form-input"
                  placeholder="Validação de Câmara Fria"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="mobile-form-label">
                  Descrição
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="mobile-form-input"
                  placeholder="Descreva o objetivo desta validação..."
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="mobile-form-label">
                    Data de Início *
                  </label>
                  <input
                    {...register('startDate', {
                      required: 'Data de início é obrigatória',
                    })}
                    type="date"
                    className="mobile-form-input"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="endDate" className="mobile-form-label">
                    Data de Finalização *
                  </label>
                  <input
                    {...register('endDate', {
                      required: 'Data de finalização é obrigatória',
                    })}
                    type="date"
                    className="mobile-form-input"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              {/* Validation Cycles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="mobile-form-label">Ciclos de Validação</label>
                  <button
                    type="button"
                    onClick={addCycle}
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    + Adicionar Ciclo
                  </button>
                </div>
                
                {cycles.length === 0 && (
                  <p className="text-sm text-gray-500 mb-3">Nenhum ciclo adicionado. Clique em "+ Adicionar Ciclo" para começar.</p>
                )}

                {cycles.map((cycle, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 mb-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Ciclo</label>
                        <select
                          value={cycle.cycleType}
                          onChange={(e) => updateCycle(index, 'cycleType', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="EMPTY">Vazio</option>
                          <option value="FULL">Cheio</option>
                          <option value="OPEN_DOOR">Porta Aberta</option>
                          <option value="POWER_OUTAGE">Falta de Energia</option>
                          <option value="NORMAL">Normal</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Início</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={cycle.startDate}
                            onChange={(e) => updateCycle(index, 'startDate', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="time"
                            value={cycle.startTime}
                            onChange={(e) => updateCycle(index, 'startTime', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Data/Hora Fim</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={cycle.endDate}
                            onChange={(e) => updateCycle(index, 'endDate', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                          <input
                            type="time"
                            value={cycle.endTime}
                            onChange={(e) => updateCycle(index, 'endTime', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <input
                          type="text"
                          value={cycle.notes}
                          onChange={(e) => updateCycle(index, 'notes', e.target.value)}
                          placeholder="Observações sobre este ciclo..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCycle(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Temperature Parameters */}
              <div>
                <label className="mobile-form-label">Condições de Aceitação - Temperatura</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="parameters.minTemperature" className="block text-sm font-medium text-gray-700 mb-1">
                      Mínima (°C)
                    </label>
                    <input
                      {...register('parameters.minTemperature', {
                        required: 'Temperatura mínima é obrigatória',
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.1"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="parameters.maxTemperature" className="block text-sm font-medium text-gray-700 mb-1">
                      Máxima (°C)
                    </label>
                    <input
                      {...register('parameters.maxTemperature', {
                        required: 'Temperatura máxima é obrigatória',
                        valueAsNumber: true,
                      })}
                      type="number"
                      step="0.1"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                {errors.parameters?.minTemperature && (
                  <p className="mt-1 text-sm text-red-600">{errors.parameters.minTemperature.message}</p>
                )}
              </div>

              {/* Humidity Parameters */}
              <div>
                <label className="mobile-form-label">Condições de Aceitação - Umidade (Opcional)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="parameters.minHumidity" className="block text-sm font-medium text-gray-700 mb-1">
                      Mínima (%)
                    </label>
                    <input
                      {...register('parameters.minHumidity', {
                        valueAsNumber: true,
                        min: { value: 0, message: 'Mínimo 0%' },
                        max: { value: 100, message: 'Máximo 100%' },
                      })}
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label htmlFor="parameters.maxHumidity" className="block text-sm font-medium text-gray-700 mb-1">
                      Máxima (%)
                    </label>
                    <input
                      {...register('parameters.maxHumidity', {
                        valueAsNumber: true,
                        min: { value: 0, message: 'Mínimo 0%' },
                        max: { value: 100, message: 'Máximo 100%' },
                      })}
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Import Data Section */}
              {validation && onImportData && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">Importar Dados</h4>
                    <button
                      type="button"
                      onClick={() => setShowImportModal(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Importar Arquivo
                    </button>
                  </div>
                  {onCalculateStatistics && (
                    <button
                      type="button"
                      onClick={() => onCalculateStatistics(validation.id)}
                      disabled={calculateLoading}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {calculateLoading ? 'Calculando...' : 'Calcular Estatísticas'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="btn-mobile-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus-mobile disabled-mobile sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-mobile-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus-mobile disabled-mobile sm:text-sm"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                validation ? 'Atualizar Validação' : 'Criar Validação'
              )}
            </button>
          </div>
        </form>
      </ResponsiveModal>

      {/* Import Modal */}
      {showImportModal && (
        <ResponsiveModal
          isOpen={true}
          onClose={() => setShowImportModal(false)}
          title="Importar Dados de Validação"
          size="md"
        >
          <div className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar arquivo de dados
                </label>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formatos aceitos: CSV, Excel (.xlsx, .xls), TXT
                </p>
              </div>
              {suitcases && suitcases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Associar a maleta(s)
                  </label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {suitcases.map((s) => (
                      <label key={s.id} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-primary-600"
                          checked={selectedSuitcaseIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSuitcaseIds(prev => [...prev, s.id]);
                            } else {
                              setSelectedSuitcaseIds(prev => prev.filter(id => id !== s.id));
                            }
                          }}
                        />
                        <span className="ml-2 text-sm text-gray-700">{s.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Selecione uma ou mais maletas para associar os dados importados.</p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-col-reverse space-y-2 space-y-reverse sm:flex-row sm:space-y-0 sm:space-x-3 sm:justify-end">
            <button
              type="button"
              onClick={() => setShowImportModal(false)}
              className="btn-mobile-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus-mobile disabled-mobile sm:text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={!importFile || importLoading}
              className="btn-mobile-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus-mobile disabled-mobile sm:text-sm"
            >
              {importLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importando...
                </div>
              ) : (
                'Importar'
              )}
            </button>
          </div>
        </ResponsiveModal>
      )}
    </>
  );
};

export default EnhancedValidationForm;