import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { EquipmentModel, EquipmentModelFormData, Brand } from '@/types/equipment';

interface EquipmentModelFormProps {
  model?: EquipmentModel;
  brands: Brand[];
  onSubmit: (data: EquipmentModelFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onCreateBrand?: () => void;
}

const EquipmentModelForm: React.FC<EquipmentModelFormProps> = ({
  model,
  brands,
  onSubmit,
  onCancel,
  isLoading = false,
  onCreateBrand,
}) => {
  const [specifications, setSpecifications] = useState<Record<string, any>>(
    model?.specifications || {}
  );
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<EquipmentModelFormData>({
    defaultValues: {
      brandId: model?.brandId || '',
      name: model?.name || '',
      description: model?.description || '',
      specifications: model?.specifications || {},
    },
  });

  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      const newSpecs = { ...specifications, [newSpecKey]: newSpecValue };
      setSpecifications(newSpecs);
      setValue('specifications', newSpecs);
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    const newSpecs = { ...specifications };
    delete newSpecs[key];
    setSpecifications(newSpecs);
    setValue('specifications', newSpecs);
  };

  const onFormSubmit = (data: EquipmentModelFormData) => {
    const finalData = {
      ...data,
      specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
    };
    onSubmit(finalData);
  };

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={model ? 'Editar Modelo' : 'Novo Modelo'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-6">
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
                className="mobile-form-input"
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

            {/* Name */}
            <div>
              <label htmlFor="name" className="mobile-form-label">
                Nome do Modelo *
              </label>
              <input
                {...register('name', {
                  required: 'Nome do modelo é obrigatório',
                  maxLength: {
                    value: 100,
                    message: 'Nome muito longo',
                  },
                })}
                type="text"
                className="mobile-form-input"
                placeholder="Ex: C700, Ultra Freezer, Pharma 500"
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
                placeholder="Descrição detalhada do modelo (opcional)"
              />
            </div>

            {/* Specifications */}
            <div>
              <label className="mobile-form-label">Especificações Técnicas</label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    placeholder="Nome da especificação"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <input
                    type="text"
                    value={newSpecValue}
                    onChange={(e) => setNewSpecValue(e.target.value)}
                    placeholder="Valor"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700"
                  >
                    Adicionar
                  </button>
                </div>

                {Object.keys(specifications).length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Especificações Adicionadas</h4>
                    <div className="space-y-2">
                      {Object.entries(specifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <span className="text-sm">
                            <strong>{key}:</strong> {value}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSpecification(key)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>
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
              model ? 'Atualizar Modelo' : 'Criar Modelo'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default EquipmentModelForm;