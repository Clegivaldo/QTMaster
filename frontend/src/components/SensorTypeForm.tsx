import React from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { SensorType, SensorTypeFormData } from '@/types/sensor';

interface SensorTypeFormProps {
  sensorType?: SensorType;
  onSubmit: (data: SensorTypeFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SensorTypeForm: React.FC<SensorTypeFormProps> = ({
  sensorType,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<SensorTypeFormData>({
    defaultValues: {
      name: sensorType?.name || '',
      description: sensorType?.description || '',
      dataConfig: {
        temperatureColumn: sensorType?.dataConfig.temperatureColumn || '',
        humidityColumn: sensorType?.dataConfig.humidityColumn || '',
        timestampColumn: sensorType?.dataConfig.timestampColumn || '',
        startRow: sensorType?.dataConfig.startRow || 1,
        dateFormat: sensorType?.dataConfig.dateFormat || 'DD/MM/YYYY HH:mm:ss',
        hasHeader: sensorType?.dataConfig.hasHeader ?? true,
        separator: sensorType?.dataConfig.separator || ',',
      },
    },
  });

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={sensorType ? 'Editar Tipo de Sensor' : 'Novo Tipo de Sensor'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
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
                placeholder="Ex: Temperatura e Umidade"
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
                placeholder="Descrição opcional do tipo de sensor"
              />
            </div>

            {/* Configuração de Dados */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Configuração de Importação</h3>
              <p className="text-sm text-gray-600 mb-4">
                Configure como os dados deste tipo de sensor são lidos dos arquivos
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Coluna de Temperatura */}
                <div>
                  <label htmlFor="dataConfig.temperatureColumn" className="mobile-form-label">
                    Coluna de Temperatura *
                  </label>
                  <input
                    {...register('dataConfig.temperatureColumn', {
                      required: 'Coluna de temperatura é obrigatória',
                    })}
                    type="text"
                    className="mobile-form-input"
                    placeholder="Ex: Temperatura, Temp, T"
                  />
                  {errors.dataConfig?.temperatureColumn && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dataConfig.temperatureColumn.message}
                    </p>
                  )}
                </div>

                {/* Coluna de Umidade */}
                <div>
                  <label htmlFor="dataConfig.humidityColumn" className="mobile-form-label">
                    Coluna de Umidade
                  </label>
                  <input
                    {...register('dataConfig.humidityColumn')}
                    type="text"
                    className="mobile-form-input"
                    placeholder="Ex: Umidade, Hum, U (opcional)"
                  />
                </div>

                {/* Coluna de Timestamp */}
                <div className="sm:col-span-2">
                  <label htmlFor="dataConfig.timestampColumn" className="mobile-form-label">
                    Coluna de Data/Hora *
                  </label>
                  <input
                    {...register('dataConfig.timestampColumn', {
                      required: 'Coluna de timestamp é obrigatória',
                    })}
                    type="text"
                    className="mobile-form-input"
                    placeholder="Ex: Data, Timestamp, Date"
                  />
                  {errors.dataConfig?.timestampColumn && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dataConfig.timestampColumn.message}
                    </p>
                  )}
                </div>

                {/* Linha Inicial */}
                <div>
                  <label htmlFor="dataConfig.startRow" className="mobile-form-label">
                    Linha Inicial *
                  </label>
                  <input
                    {...register('dataConfig.startRow', {
                      required: 'Linha inicial é obrigatória',
                      min: {
                        value: 1,
                        message: 'Linha inicial deve ser no mínimo 1',
                      },
                    })}
                    type="number"
                    min="1"
                    className="mobile-form-input"
                    defaultValue="1"
                  />
                  {errors.dataConfig?.startRow && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dataConfig.startRow.message}
                    </p>
                  )}
                </div>

                {/* Formato de Data */}
                <div>
                  <label htmlFor="dataConfig.dateFormat" className="mobile-form-label">
                    Formato de Data *
                  </label>
                  <select
                    {...register('dataConfig.dateFormat', {
                      required: 'Formato de data é obrigatório',
                    })}
                    className="mobile-form-input"
                  >
                    <option value="DD/MM/YYYY HH:mm:ss">DD/MM/YYYY HH:mm:ss</option>
                    <option value="MM/DD/YYYY HH:mm:ss">MM/DD/YYYY HH:mm:ss</option>
                    <option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="ISO">ISO 8601</option>
                  </select>
                  {errors.dataConfig?.dateFormat && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dataConfig.dateFormat.message}
                    </p>
                  )}
                </div>

                {/* Separador */}
                <div>
                  <label htmlFor="dataConfig.separator" className="mobile-form-label">
                    Separador *
                  </label>
                  <select
                    {...register('dataConfig.separator', {
                      required: 'Separador é obrigatório',
                    })}
                    className="mobile-form-input"
                  >
                    <option value=",">Vírgula (,)</option>
                    <option value=";">Ponto e vírgula (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                  {errors.dataConfig?.separator && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.dataConfig.separator.message}
                    </p>
                  )}
                </div>

                {/* Tem Cabeçalho */}
                <div className="sm:col-span-2">
                  <label className="flex items-center">
                    <input
                      {...register('dataConfig.hasHeader')}
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      O arquivo possui cabeçalho (primeira linha com nomes das colunas)
                    </span>
                  </label>
                </div>
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
              sensorType ? 'Atualizar' : 'Criar'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default SensorTypeForm;