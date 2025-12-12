import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientEquipments } from '@/hooks/useEquipment';

interface ValidationCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ValidationCreationData) => void;
  isLoading?: boolean;
  initialData?: Partial<ValidationCreationData> | null;
  isEdit?: boolean;
}

export interface ValidationCreationData {
  clientId: string;
  equipmentId: string;
  certificateNumber: string;
  name: string;
  description?: string;
  minTemperature: number;
  maxTemperature: number;
  minHumidity?: number;
  maxHumidity?: number;
}

const ValidationCreationModal: React.FC<ValidationCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  initialData = null,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<ValidationCreationData>({
    clientId: '',
    equipmentId: '',
    certificateNumber: '',
    name: '',
    description: '',
    minTemperature: 2,
    maxTemperature: 8,
    minHumidity: undefined,
    maxHumidity: undefined,
  });

  const { data: clientsData } = useClients({ page: 1, limit: 100 });
  const { data: equipmentData } = useClientEquipments(formData.clientId || undefined);
  

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if ((initialData && Object.keys(initialData).length > 0)) {
        setFormData(prev => ({
          ...prev,
          ...(initialData as Partial<ValidationCreationData>),
        } as ValidationCreationData));
      } else {
        setFormData({
          clientId: '',
          equipmentId: '',
          certificateNumber: '',
          name: '',
          description: '',
          minTemperature: 2,
          maxTemperature: 8,
          minHumidity: undefined,
          maxHumidity: undefined,
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientId) {
      newErrors.clientId = 'Cliente é obrigatório';
    }

    

    if (!formData.equipmentId) {
      newErrors.equipmentId = 'Equipamento é obrigatório';
    }

    if (!formData.certificateNumber.trim()) {
      newErrors.certificateNumber = 'Número do certificado é obrigatório';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da validação é obrigatório';
    }

    if (formData.minTemperature >= formData.maxTemperature) {
      newErrors.minTemperature = 'Temperatura mínima deve ser menor que máxima';
    }

    if (formData.minHumidity !== undefined && formData.maxHumidity !== undefined) {
      if (formData.minHumidity >= formData.maxHumidity) {
        newErrors.minHumidity = 'Umidade mínima deve ser menor que máxima';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: keyof ValidationCreationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Nova Validação Térmica
                  </h3>
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                        Cliente *
                      </label>
                      <select
                        id="clientId"
                        value={formData.clientId}
                        onChange={(e) => handleChange('clientId', e.target.value)}
                        className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.clientId ? 'border-red-300' : ''
                        }`}
                        disabled={isLoading || !!isEdit}
                      >
                        <option value="">Selecione um cliente</option>
                        {clientsData?.clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name} - {client.cnpj}
                          </option>
                        ))}
                      </select>
                      {errors.clientId && (
                        <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="equipmentId" className="block text-sm font-medium text-gray-700">
                        Equipamento *
                      </label>
                      <select
                        id="equipmentId"
                        value={formData.equipmentId}
                        onChange={(e) => handleChange('equipmentId', e.target.value)}
                        className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.equipmentId ? 'border-red-300' : ''
                        }`}
                        disabled={isLoading || !!isEdit}
                      >
                        <option value="">Selecione um equipamento</option>
                        {equipmentData?.map((equipment) => {
                          const parts: string[] = [];
                          if (equipment.model?.brand?.name) parts.push(equipment.model.brand.name);
                          if (equipment.model?.name) parts.push(equipment.model.name);
                          if (equipment.serialNumber) parts.push(equipment.serialNumber);
                          const label = parts.join(' - ');
                          return (
                            <option key={equipment.id} value={equipment.id}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      {errors.equipmentId && (
                        <p className="mt-1 text-sm text-red-600">{errors.equipmentId}</p>
                      )}
                    </div>
 
                    {/* A seleção de maleta não é feita aqui; será feita na importação de dados. */}

                    <div>
                      <label htmlFor="certificateNumber" className="block text-sm font-medium text-gray-700">
                        Número do Certificado *
                      </label>
                      <input
                        type="text"
                        id="certificateNumber"
                        value={formData.certificateNumber}
                        onChange={(e) => handleChange('certificateNumber', e.target.value)}
                        className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.certificateNumber ? 'border-red-300' : ''
                        }`}
                        placeholder="Ex: CERT-2024-001"
                        disabled={isLoading || !!isEdit}
                      />
                      {errors.certificateNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.certificateNumber}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nome da Validação *
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.name ? 'border-red-300' : ''
                        }`}
                        placeholder="Ex: Validação Câmara Fria 01"
                        disabled={isLoading || !!isEdit}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      {/* descrição removida conforme solicitado */}
                    </div>

                    {/* Critérios de Aceitação */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Critérios de Aceitação</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="minTemperature" className="block text-sm font-medium text-gray-700">
                            Temperatura Mínima (°C) *
                          </label>
                          <input
                            type="number"
                            id="minTemperature"
                            step="0.1"
                            value={formData.minTemperature}
                            onChange={(e) => setFormData(prev => ({ ...prev, minTemperature: parseFloat(e.target.value) }))}
                            className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.minTemperature ? 'border-red-300' : ''}`}
                            disabled={isLoading}
                          />
                          {errors.minTemperature && <p className="mt-1 text-sm text-red-600">{errors.minTemperature}</p>}
                        </div>
                        
                        <div>
                          <label htmlFor="maxTemperature" className="block text-sm font-medium text-gray-700">
                            Temperatura Máxima (°C) *
                          </label>
                          <input
                            type="number"
                            id="maxTemperature"
                            step="0.1"
                            value={formData.maxTemperature}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxTemperature: parseFloat(e.target.value) }))}
                            className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            disabled={isLoading}
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="minHumidity" className="block text-sm font-medium text-gray-700">
                            Umidade Mínima (%)
                          </label>
                          <input
                            type="number"
                            id="minHumidity"
                            step="1"
                            value={formData.minHumidity || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, minHumidity: e.target.value ? parseFloat(e.target.value) : undefined }))}
                            className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${errors.minHumidity ? 'border-red-300' : ''}`}
                            placeholder="Opcional"
                            disabled={isLoading}
                          />
                          {errors.minHumidity && <p className="mt-1 text-sm text-red-600">{errors.minHumidity}</p>}
                        </div>
                        
                        <div>
                          <label htmlFor="maxHumidity" className="block text-sm font-medium text-gray-700">
                            Umidade Máxima (%)
                          </label>
                          <input
                            type="number"
                            id="maxHumidity"
                            step="1"
                            value={formData.maxHumidity || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxHumidity: e.target.value ? parseFloat(e.target.value) : undefined }))}
                            className="mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Opcional"
                            disabled={isLoading}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Próximos Passos removido conforme solicitado */}
                </div>
              </div>
              </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar Alterações' : 'Criar Validação')}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ValidationCreationModal;