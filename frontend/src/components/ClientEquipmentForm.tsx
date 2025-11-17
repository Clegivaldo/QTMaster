import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { ClientEquipment, ClientEquipmentFormData, EquipmentType, Brand, EquipmentModel } from '@/types/equipment';
import { Client } from '@/types/client';

interface ClientEquipmentFormProps {
  equipment?: ClientEquipment;
  onSubmit: (data: ClientEquipmentFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  clients?: Client[];
  equipmentTypes?: EquipmentType[];
  brands?: Brand[];
  models?: EquipmentModel[];
  onCreateBrand?: () => void;
  onCreateModel?: () => void;
  onCreateType?: () => void;
}

const ClientEquipmentForm: React.FC<ClientEquipmentFormProps> = ({
  equipment,
  onSubmit,
  onCancel,
  isLoading = false,
  clients = [],
  equipmentTypes = [],
  brands = [],
  models = [],
  onCreateBrand,
  onCreateModel,
  onCreateType,
}) => {
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ClientEquipmentFormData>({
    defaultValues: {
      clientId: equipment?.clientId || '',
      equipmentTypeId: equipment?.equipmentTypeId || '',
      brandId: equipment?.brandId || '',
      modelId: equipment?.modelId || '',
      serialNumber: equipment?.serialNumber || '',
      assetNumber: equipment?.assetNumber || '',
      tag: equipment?.tag || '',
      acceptanceConditions: {
        minTemperature: equipment?.acceptanceConditions.minTemperature || 2,
        maxTemperature: equipment?.acceptanceConditions.maxTemperature || 8,
        minHumidity: equipment?.acceptanceConditions.minHumidity || undefined,
        maxHumidity: equipment?.acceptanceConditions.maxHumidity || undefined,
      },
      notes: equipment?.notes || '',
    },
  });

  const watchedBrandId = watch('brandId');
  const watchedTypeId = watch('equipmentTypeId');

  // Filter models by brand
  const filteredModels = models.filter(model => model.brandId === watchedBrandId);

  // Update selected IDs when form values change
  useEffect(() => {
    setSelectedBrandId(watchedBrandId);
  }, [watchedBrandId]);

  useEffect(() => {
    setSelectedTypeId(watchedTypeId);
  }, [watchedTypeId]);

  const onFormSubmit = (data: ClientEquipmentFormData) => {
    // Validate temperature limits
    if (data.acceptanceConditions.minTemperature >= data.acceptanceConditions.maxTemperature) {
      alert('A temperatura mínima deve ser menor que a temperatura máxima.');
      return;
    }

    // Validate humidity limits if provided
    if (data.acceptanceConditions.minHumidity !== undefined && data.acceptanceConditions.maxHumidity !== undefined) {
      if (data.acceptanceConditions.minHumidity >= data.acceptanceConditions.maxHumidity) {
        alert('A umidade mínima deve ser menor que a umidade máxima.');
        return;
      }
    }

    onSubmit(data);
  };

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={equipment ? 'Editar Equipamento' : 'Novo Equipamento'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Client */}
            <div>
              <label htmlFor="clientId" className="mobile-form-label">
                Cliente *
              </label>
              <select
                {...register('clientId', {
                  required: 'Cliente é obrigatório',
                })}
                className="mobile-form-input h-10 w-full"
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

            {/* Equipment Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="equipmentTypeId" className="mobile-form-label">
                  Tipo de Equipamento *
                </label>
                {onCreateType && (
                  <button
                    type="button"
                    onClick={onCreateType}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    + Novo Tipo
                  </button>
                )}
              </div>
              <select
                {...register('equipmentTypeId', {
                  required: 'Tipo de equipamento é obrigatório',
                })}
                className="mobile-form-input h-10 w-full"
              >
                <option value="">Selecione um tipo</option>
                {equipmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.equipmentTypeId && (
                <p className="mt-1 text-sm text-red-600">{errors.equipmentTypeId.message}</p>
              )}
            </div>

            {/* Brand */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="brandId" className="mobile-form-label">
                  Marca *
                </label>
                {onCreateBrand && (
                  <button
                    type="button"
                    onClick={onCreateBrand}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    + Nova Marca
                  </button>
                )}
              </div>
              <select
                {...register('brandId', {
                  required: 'Marca é obrigatória',
                })}
                className="mobile-form-input h-10 w-full"
              >
                <option value="">Selecione uma marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {errors.brandId && (
                <p className="mt-1 text-sm text-red-600">{errors.brandId.message}</p>
              )}
            </div>

            {/* Model */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="modelId" className="mobile-form-label">
                  Modelo *
                </label>
                {onCreateModel && (
                  <button
                    type="button"
                    onClick={onCreateModel}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    + Novo Modelo
                  </button>
                )}
              </div>
              <select
                {...register('modelId', {
                  required: 'Modelo é obrigatório',
                })}
                className="mobile-form-input h-10 w-full"
                disabled={!watchedBrandId}
              >
                <option value="">Selecione um modelo</option>
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {errors.modelId && (
                <p className="mt-1 text-sm text-red-600">{errors.modelId.message}</p>
              )}
              {!watchedBrandId && (
                <p className="mt-1 text-sm text-gray-500">Selecione uma marca primeiro</p>
              )}
            </div>

            {/* Identification Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="serialNumber" className="mobile-form-label">
                  Número de Série *
                </label>
                <input
                  {...register('serialNumber', {
                    required: 'Número de série é obrigatório',
                    maxLength: {
                      value: 100,
                      message: 'Número de série muito longo',
                    },
                  })}
                  type="text"
                  className="mobile-form-input h-10 w-full"
                  placeholder="SN123456789"
                />
                {errors.serialNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.serialNumber.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="assetNumber" className="mobile-form-label">
                  Patrimônio
                </label>
                <input
                  {...register('assetNumber')}
                  type="text"
                  className="mobile-form-input h-10 w-full"
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
                  className="mobile-form-input h-10 w-full"
                  placeholder="TAG do equipamento"
                />
              </div>
            </div>

            {/* Acceptance Conditions */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Condições de Aceitação</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Temperature */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Temperatura</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="acceptanceConditions.minTemperature" className="block text-sm text-gray-600 mb-1">
                        Mínima (°C) *
                      </label>
                      <input
                        {...register('acceptanceConditions.minTemperature', {
                          required: 'Temperatura mínima é obrigatória',
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.1"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label htmlFor="acceptanceConditions.maxTemperature" className="block text-sm text-gray-600 mb-1">
                        Máxima (°C) *
                      </label>
                      <input
                        {...register('acceptanceConditions.maxTemperature', {
                          required: 'Temperatura máxima é obrigatória',
                          valueAsNumber: true,
                        })}
                        type="number"
                        step="0.1"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Humidity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Umidade (Opcional)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="acceptanceConditions.minHumidity" className="block text-sm text-gray-600 mb-1">
                        Mínima (%)
                      </label>
                      <input
                        {...register('acceptanceConditions.minHumidity', {
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
                      <label htmlFor="acceptanceConditions.maxHumidity" className="block text-sm text-gray-600 mb-1">
                        Máxima (%)
                      </label>
                      <input
                        {...register('acceptanceConditions.maxHumidity', {
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
              </div>

              {(errors.acceptanceConditions?.minTemperature || errors.acceptanceConditions?.maxTemperature || 
                errors.acceptanceConditions?.minHumidity || errors.acceptanceConditions?.maxHumidity) && (
                <p className="mt-2 text-sm text-red-600">
                  {errors.acceptanceConditions.minTemperature?.message || 
                   errors.acceptanceConditions.maxTemperature?.message ||
                   errors.acceptanceConditions.minHumidity?.message ||
                   errors.acceptanceConditions.maxHumidity?.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="mobile-form-label">
                Observações
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="mobile-form-input h-24 w-full"
                placeholder="Observações adicionais sobre o equipamento..."
              />
            </div>
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
              equipment ? 'Atualizar Equipamento' : 'Criar Equipamento'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default ClientEquipmentForm;