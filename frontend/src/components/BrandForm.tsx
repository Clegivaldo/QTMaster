import React from 'react';
import { useForm } from 'react-hook-form';
import ResponsiveModal from './ResponsiveModal';
import { Brand, BrandFormData } from '@/types/equipment';

interface BrandFormProps {
  brand?: Brand;
  onSubmit: (data: BrandFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const BrandForm: React.FC<BrandFormProps> = ({
  brand,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandFormData>({
    defaultValues: {
      name: brand?.name || '',
      description: brand?.description || '',
    },
  });

  return (
    <ResponsiveModal
      isOpen={true}
      onClose={onCancel}
      title={brand ? 'Editar Marca' : 'Nova Marca'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Name */}
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
                className="mobile-form-input h-10 w-full"
                placeholder="Ex: Thermo King, Carrier"
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
                className="mobile-form-input h-24 w-full"
                placeholder="Descrição da marca (opcional)"
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
              brand ? 'Atualizar Marca' : 'Criar Marca'
            )}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default BrandForm;