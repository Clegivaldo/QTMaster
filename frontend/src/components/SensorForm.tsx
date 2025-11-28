import React from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { parseToDate } from '@/utils/parseDate';
import { Sensor, SensorFormData, SensorType } from '@/types/sensor';

interface SensorFormProps {
  sensor?: Sensor;
  sensorTypes: SensorType[];
  onSubmit: (data: SensorFormData) => void;
  onCancel: () => void;
  onCreateType?: () => void;
  isLoading?: boolean;
}

const SensorForm: React.FC<SensorFormProps> = ({
  sensor,
  sensorTypes,
  onSubmit,
  onCancel,
  onCreateType,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SensorFormData>({
    defaultValues: {
      serialNumber: sensor?.serialNumber || '',
      model: sensor?.model || '',
      typeId: sensor?.typeId || '',
      calibrationDate: sensor?.calibrationDate ? parseToDate(sensor.calibrationDate).toISOString().split('T')[0] : '',
    },
  });

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={sensor ? 'Editar Sensor' : 'Novo Sensor'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Número de Série */}
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
                className="mobile-form-input"
                placeholder="SN-123456789"
              />
              {errors.serialNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.serialNumber.message}</p>
              )}
            </div>

            {/* Modelo */}
            <div>
              <label htmlFor="model" className="mobile-form-label">
                Modelo *
              </label>
              <input
                {...register('model', {
                  required: 'Modelo é obrigatório',
                  maxLength: {
                    value: 100,
                    message: 'Modelo muito longo',
                  },
                })}
                type="text"
                className="mobile-form-input"
                placeholder="Modelo do sensor"
              />
              {errors.model && (
                <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
              )}
            </div>

            {/* Tipo de Sensor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="typeId" className="mobile-form-label">
                  Tipo de Sensor *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (onCreateType) {
                      onCreateType();
                    } else if (window.confirm('Deseja criar um novo tipo de sensor?')) {
                      onCancel();
                    }
                  }}
                  className="text-xs text-primary-600 hover:text-primary-800"
                >
                  + Novo Tipo
                </button>
              </div>
              <select
                {...register('typeId', {
                  required: 'Tipo de sensor é obrigatório',
                })}
                className="mobile-form-input"
              >
                <option value="">Selecione um tipo</option>
                {sensorTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.typeId && (
                <p className="mt-1 text-sm text-red-600">{errors.typeId.message}</p>
              )}
            </div>

            {/* Data de Calibração */}
            <div>
              <label htmlFor="calibrationDate" className="mobile-form-label">
                Data de Calibração
              </label>
              <input
                {...register('calibrationDate')}
                type="date"
                className="mobile-form-input"
              />
              <p className="mt-1 text-xs text-gray-500">
                Opcional - Data da última calibração do sensor
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
              sensor ? 'Atualizar' : 'Criar'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default SensorForm;