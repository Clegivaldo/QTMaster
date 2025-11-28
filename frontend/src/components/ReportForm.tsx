import { useState, useEffect } from 'react';
import { X as XMarkIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useCreateReport, useUpdateReport, useActiveReportTemplates } from '../hooks/useReports';
import { useValidations } from '../hooks/useValidations';
import { Report, CreateReportData, UpdateReportData, ReportStatus } from '../types/report';
import { parseToDate, formatBRShort } from '@/utils/parseDate';

interface ReportFormProps {
  report?: Report | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  validationId: string;
  templateId: string;
  status?: ReportStatus;
}

export function ReportForm({ report, onClose }: ReportFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!report;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: report?.name || '',
      validationId: report?.validationId || '',
      templateId: report?.templateId || '',
      status: report?.status || 'DRAFT',
    },
  });

  const { data: templatesData } = useActiveReportTemplates();
  const { data: validationsData } = useValidations({});
  const createReportMutation = useCreateReport();
  const updateReportMutation = useUpdateReport();

  const selectedValidationId = watch('validationId');

  useEffect(() => {
    if (report) {
      reset({
        name: report.name,
        validationId: report.validationId,
        templateId: report.templateId,
        status: report.status,
      });
    }
  }, [report, reset]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      if (isEditing && report) {
        const updateData: UpdateReportData = {
          name: data.name,
          status: data.status,
        };
        await updateReportMutation.mutateAsync({ id: report.id, data: updateData });
      } else {
        const createData: CreateReportData = {
          name: data.name,
          validationId: data.validationId,
          templateId: data.templateId,
        };
        await createReportMutation.mutateAsync(createData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedValidation = validationsData?.validations?.find((v: any) => v.id === selectedValidationId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Editar Relatório' : 'Novo Relatório'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Relatório *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Nome é obrigatório' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome do relatório"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Validation Selection (only for new reports) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Validação *
              </label>
              <select
                {...register('validationId', { required: 'Validação é obrigatória' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione uma validação</option>
                {validationsData?.validations?.map((validation: any) => (
                  <option key={validation.id} value={validation.id}>
                    {validation.name} - {validation.client?.name}
                  </option>
                ))}
              </select>
              {errors.validationId && (
                <p className="mt-1 text-sm text-red-600">{errors.validationId.message}</p>
              )}
              {selectedValidation && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Cliente:</strong> {selectedValidation.client?.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Maleta:</strong> {selectedValidation.suitcase?.name}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Template Selection (only for new reports) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template *
              </label>
              <select
                {...register('templateId', { required: 'Template é obrigatório' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Selecione um template</option>
                {templatesData?.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {errors.templateId && (
                <p className="mt-1 text-sm text-red-600">{errors.templateId.message}</p>
              )}
            </div>
          )}

          {/* Status (only for editing) */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={report?.status === 'FINALIZED'}
              >
                <option value="DRAFT">Rascunho</option>
                <option value="VALIDATED">Validado</option>
                <option value="FINALIZED">Finalizado</option>
              </select>
              {report?.status === 'FINALIZED' && (
                <p className="mt-1 text-sm text-gray-500">
                  Relatórios finalizados não podem ter o status alterado
                </p>
              )}
            </div>
          )}

          {/* Current Report Info (for editing) */}
          {isEditing && report && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Informações do Relatório</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Cliente:</strong> {report.client.name}</p>
                <p><strong>Validação:</strong> {report.validation.name}</p>
                <p><strong>Template:</strong> {report.template.name}</p>
                <p><strong>Criado em:</strong> {formatBRShort(report.createdAt)}</p>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Relatório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}