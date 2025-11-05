
import { X as XMarkIcon, Download as ArrowDownTrayIcon, Edit as PencilIcon } from 'lucide-react';
import { Report, ReportStatus } from '../types/report';

interface ReportDetailsModalProps {
  report: Report;
  onClose: () => void;
  onEdit?: (report: Report) => void;
  onDownload?: (report: Report) => void;
}

const statusColors: Record<ReportStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  VALIDATED: 'bg-yellow-100 text-yellow-800',
  FINALIZED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<ReportStatus, string> = {
  DRAFT: 'Rascunho',
  VALIDATED: 'Validado',
  FINALIZED: 'Finalizado',
};

export function ReportDetailsModal({ report, onClose, onEdit, onDownload }: ReportDetailsModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Detalhes do Relatório</h2>
          <div className="flex items-center gap-2">
            {report.pdfPath && onDownload && (
              <button
                onClick={() => onDownload(report)}
                className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg"
                title="Download PDF"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
              </button>
            )}
            {report.status !== 'FINALIZED' && onEdit && (
              <button
                onClick={() => onEdit(report)}
                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg"
                title="Editar"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-sm text-gray-900">{report.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[report.status]}`}>
                    {statusLabels[report.status]}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Criado em</label>
                  <p className="text-sm text-gray-900">{formatDate(report.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Atualizado em</label>
                  <p className="text-sm text-gray-900">{formatDate(report.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relacionamentos</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Cliente</label>
                  <p className="text-sm text-gray-900">{report.client.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Validação</label>
                  <p className="text-sm text-gray-900">{report.validation.name}</p>
                  {report.validation.isApproved !== undefined && (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                      report.validation.isApproved 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {report.validation.isApproved ? 'Aprovada' : 'Não Aprovada'}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Template</label>
                  <p className="text-sm text-gray-900">{report.template.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Criado por</label>
                  <p className="text-sm text-gray-900">{report.user.name}</p>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Information */}
          {report.pdfPath && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-green-800">PDF Gerado</h4>
                  <p className="text-sm text-green-600">O relatório em PDF está disponível para download</p>
                </div>
                {onDownload && (
                  <button
                    onClick={() => onDownload(report)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Download
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Status Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Informações de Status</h4>
            <div className="text-sm text-gray-600">
              {report.status === 'DRAFT' && (
                <p>Este relatório está em rascunho e pode ser editado.</p>
              )}
              {report.status === 'VALIDATED' && (
                <p>Este relatório foi validado e está pronto para finalização.</p>
              )}
              {report.status === 'FINALIZED' && (
                <p>Este relatório foi finalizado e não pode mais ser editado.</p>
              )}
            </div>
          </div>

          {/* Validation Details */}
          {report.validation && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detalhes da Validação</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800">Nome da Validação</label>
                    <p className="text-sm text-blue-900">{report.validation.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800">Status de Aprovação</label>
                    <p className="text-sm text-blue-900">
                      {report.validation.isApproved !== undefined 
                        ? (report.validation.isApproved ? 'Aprovada' : 'Não Aprovada')
                        : 'Pendente'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}