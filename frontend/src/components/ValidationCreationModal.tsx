import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useClientEquipments } from '@/hooks/useEquipment';

interface ValidationCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ValidationCreationData) => void;
  isLoading?: boolean;
}

export interface ValidationCreationData {
  clientId: string;
  equipmentId: string;
  certificateNumber: string;
  name: string;
  description?: string;
}

const ValidationCreationModal: React.FC<ValidationCreationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<ValidationCreationData>({
    clientId: '',
    equipmentId: '',
    certificateNumber: '',
    name: '',
    description: '',
  });

  const { data: clientsData } = useClients({ page: 1, limit: 100 });
  const { data: equipmentData } = useClientEquipments();
  

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        clientId: '',
        equipmentId: '',
        certificateNumber: '',
        name: '',
        description: '',
      });
      setErrors({});
    }
  }, [isOpen]);

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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      >
                        <option value="">Selecione um equipamento</option>
                        {equipmentData?.map((equipment) => (
                          <option key={equipment.id} value={equipment.id}>
                            {equipment.model?.brand?.name} - {equipment.model?.name} - {equipment.serialNumber}
                          </option>
                        ))}
                      </select>
                      {errors.equipmentId && (
                        <p className="mt-1 text-sm text-red-600">{errors.equipmentId}</p>
                      )}
                    </div>
 
                    <div>
                      <label htmlFor="suitcaseId" className="block text-sm font-medium text-gray-700">
                        Maleta *
                      </label>
                      <select
                        id="suitcaseId"
                        value={formData.suitcaseId}
                        onChange={(e) => handleChange('suitcaseId', e.target.value)}
                        className={`mt-1 block w-full h-10 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 ${
                          errors.suitcaseId ? 'border-red-300' : ''
                        }`}
                        disabled={isLoading}
                      >
                        <option value="">Selecione uma maleta</option>
                        {suitcasesData?.suitcases?.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      {errors.suitcaseId && (
                        <p className="mt-1 text-sm text-red-600">{errors.suitcaseId}</p>
                      )}
                    </div>

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
                        disabled={isLoading}
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
                        disabled={isLoading}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        value={formData.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        className="mt-1 block w-full h-24 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Descreva os objetivos desta validação..."
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-blue-800">
                          Próximos Passos
                        </h3>
                        <div className="mt-2 text-sm text-blue-700">
                          <p>Após criar a validação, você poderá:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li>Importar dados dos sensores</li>
                            <li>Configurar ciclos (vazio, cheio, porta aberta, falta de energia)</li>
                            <li>Definir períodos de início e fim</li>
                            <li>Analisar os resultados e gerar relatórios</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Criando...' : 'Criar Validação'}
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