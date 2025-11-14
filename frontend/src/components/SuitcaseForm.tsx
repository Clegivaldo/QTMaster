import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { Suitcase, SuitcaseFormData, Sensor } from '@/types/suitcase';
import { Plus, Trash2 } from 'lucide-react';

interface SuitcaseFormProps {
  suitcase?: Suitcase;
  onSubmit: (data: SuitcaseFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  availableSensors?: Sensor[];
}

const SuitcaseForm: React.FC<SuitcaseFormProps> = ({
  suitcase,
  onSubmit,
  onCancel,
  isLoading = false,
  availableSensors = [],
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SuitcaseFormData>({
    defaultValues: {
      name: suitcase?.name || '',
      description: suitcase?.description || '',
      sensors: suitcase?.sensors?.map(s => ({
        sensorId: s.sensorId,
        position: s.position || undefined,
      })) || [],
    },
  });

  const watchedSensors = watch('sensors') || [];

  const addSensor = () => {
    const currentSensors = watchedSensors;
    setValue('sensors', [...currentSensors, { sensorId: '', position: undefined }]);
  };

  const removeSensor = (index: number) => {
    const currentSensors = watchedSensors;
    setValue('sensors', currentSensors.filter((_, i) => i !== index));
  };

  const updateSensor = (index: number, field: 'sensorId' | 'position', value: string | number) => {
    const currentSensors = watchedSensors;
    const updatedSensors = [...currentSensors];
    updatedSensors[index] = {
      ...updatedSensors[index],
      [field]: field === 'position' ? (value ? Number(value) : undefined) : value,
    };
    setValue('sensors', updatedSensors);
  };

  // Filtrar sensores já selecionados
  const getAvailableSensors = (currentIndex: number) => {
    const selectedSensorIds = watchedSensors
      .map((s, index) => index !== currentIndex ? s.sensorId : null)
      .filter(Boolean);
    
    return availableSensors.filter(sensor => !selectedSensorIds.includes(sensor.id));
  };

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={suitcase ? 'Editar Maleta' : 'Nova Maleta'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="space-y-6">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="mobile-form-label">
                Nome *
              </label>
              <input
                {...register('name', {
                  required: 'Nome é obrigatório',
                  maxLength: {
                    value: 100,
                    message: 'Nome muito longo',
                  },
                })}
                type="text"
                className="mobile-form-input"
                placeholder="Ex: Maleta de Congeladores"
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
                placeholder="Descrição opcional da maleta"
              />
            </div>

            {/* Sensores */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-700">
                  Sensores ({watchedSensors.length})
                </label>
                <button
                  type="button"
                  onClick={addSensor}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar Sensor
                </button>
              </div>

              {/* Lista de Sensores */}
              <div className="space-y-3">
                {watchedSensors.map((sensor, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Sensor */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sensor *
                        </label>
                        <select
                          value={sensor.sensorId}
                          onChange={(e) => updateSensor(index, 'sensorId', e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                        >
                          <option value="">Selecione um sensor</option>
                          {getAvailableSensors(index).map((availableSensor) => (
                            <option key={availableSensor.id} value={availableSensor.id}>
                              {availableSensor.serialNumber} - {availableSensor.model} ({availableSensor.type?.name})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Posição */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Posição
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="1"
                            value={sensor.position || ''}
                            onChange={(e) => updateSensor(index, 'position', e.target.value)}
                            className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 text-sm"
                            placeholder="Pos."
                          />
                          <button
                            type="button"
                            onClick={() => removeSensor(index)}
                            className="inline-flex items-center p-1.5 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="Remover sensor"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {watchedSensors.length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-sm text-gray-500">Nenhum sensor adicionado</p>
                    <button
                      type="button"
                      onClick={addSensor}
                      className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Adicionar primeiro sensor
                    </button>
                  </div>
                )}
              </div>
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
              suitcase ? 'Atualizar' : 'Criar'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default SuitcaseForm;