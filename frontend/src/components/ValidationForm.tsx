import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { ValidationFormData, Validation } from '@/types/validation';
import { Suitcase } from '@/types/suitcase';
import { Client } from '@/types/client';

interface ValidationFormProps {
  validation?: Validation;
  onSubmit: (data: ValidationFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  suitcases?: Suitcase[];
  clients?: Client[];
}

const ValidationForm: React.FC<ValidationFormProps> = ({
  validation,
  onSubmit,
  onCancel,
  isLoading = false,
  suitcases = [],
  clients = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ValidationFormData>({
    defaultValues: {
      suitcaseId: validation?.suitcaseId || '',
      clientId: validation?.clientId || '',
      name: validation?.name || '',
      description: validation?.description || '',
      parameters: {
        minTemperature: validation?.minTemperature || 0,
        maxTemperature: validation?.maxTemperature || 0,
        minHumidity: validation?.minHumidity || undefined,
        maxHumidity: validation?.maxHumidity || undefined,
      },
      sensorDataIds: [],
      startDate: validation ? new Date(validation.createdAt).toISOString().split('T')[0] : '',
      endDate: '',
    },
  });

  const watchedSuitcaseId = watch('suitcaseId');
  const watchedClientId = watch('clientId');

  // Auto-selecionar cliente baseado na maleta selecionada
  useEffect(() => {
    if (watchedSuitcaseId) {
      const selectedSuitcase = suitcases.find(s => s.id === watchedSuitcaseId);
      if (selectedSuitcase && !watchedClientId) {
        // Tentar encontrar o cliente baseado na maleta
        // Isso pode precisar de ajuste dependendo da estrutura real dos dados
      }
    }
  }, [watchedSuitcaseId, suitcases, watchedClientId]);

  const onFormSubmit = (data: ValidationFormData) => {
    // Validar se a maleta tem sensores
    const selectedSuitcase = suitcases.find(s => s.id === data.suitcaseId);
    if (!selectedSuitcase || !selectedSuitcase.sensors || selectedSuitcase.sensors.length === 0) {
      alert('A maleta selecionada não possui sensores configurados.');
      return;
    }

    // Validar limites de temperatura
    if (data.parameters.minTemperature >= data.parameters.maxTemperature) {
      alert('A temperatura mínima deve ser menor que a temperatura máxima.');
      return;
    }

    // Validar limites de umidade se fornecidos
    if (data.parameters.minHumidity !== undefined && data.parameters.maxHumidity !== undefined) {
      if (data.parameters.minHumidity >= data.parameters.maxHumidity) {
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
      title={validation ? 'Editar Validação' : 'Nova Validação'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Cliente */}
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

            {/* Maleta */}
            <div>
              <label htmlFor="suitcaseId" className="mobile-form-label">
                Maleta *
              </label>
              <select
                {...register('suitcaseId', {
                  required: 'Maleta é obrigatória',
                })}
                className="mobile-form-input"
              >
                <option value="">Selecione uma maleta</option>
                {suitcases.map((suitcase) => (
                  <option key={suitcase.id} value={suitcase.id}>
                    {suitcase.name} ({suitcase.sensors?.length || 0} sensores)
                  </option>
                ))}
              </select>
              {errors.suitcaseId && (
                <p className="mt-1 text-sm text-red-600">{errors.suitcaseId.message}</p>
              )}
            </div>

            {/* Nome da Validação */}
            <div>
              <label htmlFor="name" className="mobile-form-label">
                Nome da Validação *
              </label>
              <input
                {...register('name', {
                  required: 'Nome é obrigatório',
                  maxLength: {
                    value: 200,
                    message: 'Nome muito longo',
                  },
                })}
                type="text"
                className="mobile-form-input"
                placeholder="Ex: Validação Câmara Fria 01"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="description" className="mobile-form-label">
                Descrição
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="mobile-form-input"
                placeholder="Descrição opcional da validação"
              />
            </div>

            {/* Parâmetros de Temperatura */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Limites de Temperatura</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="parameters.minTemperature" className="mobile-form-label">
                    Temperatura Mínima (°C) *
                  </label>
                  <input
                    {...register('parameters.minTemperature', {
                      required: 'Temperatura mínima é obrigatória',
                      valueAsNumber: true,
                    })}
                    type="number"
                    step="0.1"
                    className="mobile-form-input"
                    placeholder="-20"
                  />
                  {errors.parameters?.minTemperature && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parameters.minTemperature.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="parameters.maxTemperature" className="mobile-form-label">
                    Temperatura Máxima (°C) *
                  </label>
                  <input
                    {...register('parameters.maxTemperature', {
                      required: 'Temperatura máxima é obrigatória',
                      valueAsNumber: true,
                    })}
                    type="number"
                    step="0.1"
                    className="mobile-form-input"
                    placeholder="8"
                  />
                  {errors.parameters?.maxTemperature && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parameters.maxTemperature.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Parâmetros de Umidade (Opcional) */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Limites de Umidade (Opcional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="parameters.minHumidity" className="mobile-form-label">
                    Umidade Mínima (%)
                  </label>
                  <input
                    {...register('parameters.minHumidity', {
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: 'Umidade mínima deve ser no mínimo 0%',
                      },
                      max: {
                        value: 100,
                        message: 'Umidade mínima deve ser no máximo 100%',
                      },
                    })}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="mobile-form-input"
                    placeholder="45"
                  />
                  {errors.parameters?.minHumidity && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parameters.minHumidity.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="parameters.maxHumidity" className="mobile-form-label">
                    Umidade Máxima (%)
                  </label>
                  <input
                    {...register('parameters.maxHumidity', {
                      valueAsNumber: true,
                      min: {
                        value: 0,
                        message: 'Umidade máxima deve ser no mínimo 0%',
                      },
                      max: {
                        value: 100,
                        message: 'Umidade máxima deve ser no máximo 100%',
                      },
                    })}
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="mobile-form-input"
                    placeholder="75"
                  />
                  {errors.parameters?.maxHumidity && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.parameters.maxHumidity.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Período de Análise (Opcional) */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Período de Análise (Opcional)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="mobile-form-label">
                    Data Inicial
                  </label>
                  <input
                    {...register('startDate')}
                    type="date"
                    className="mobile-form-input"
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="mobile-form-label">
                    Data Final
                  </label>
                  <input
                    {...register('endDate')}
                    type="date"
                    className="mobile-form-input"
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Se não informado, será analisado todo o período disponível
              </p>
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
              validation ? 'Atualizar' : 'Criar'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default ValidationForm;