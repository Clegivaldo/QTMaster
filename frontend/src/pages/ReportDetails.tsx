import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SignaturePanel } from '@/components/ReportSignature/SignaturePanel';
import { parseToDate, formatBRShort } from '@/utils/parseDate';
import { buildApiUrl } from '@/config/api';
import { SharingPanel } from '@/components/ReportSharing/SharingPanel';

interface Report {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  pdfPath?: string;
}

export const ReportDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'signature' | 'sharing'>('details');

  useEffect(() => {
    const fetchReport = async () => {
      if (!id) return;

      try {
        const token = localStorage.getItem('token');

        const response = await fetch(buildApiUrl(`/reports/${id}`), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar relatório');
        }

        const result = await response.json();
        setReport(result.data);
      } catch (error) {
        console.error('Erro ao buscar relatório:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Relatório não encontrado</p>
          <button
            onClick={() => navigate('/reports')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Voltar para Relatórios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/reports')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{report.name}</h1>
            <p className="text-gray-600 mt-1">Criado em {formatBRShort(report.createdAt)}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              report.status === 'completed'
                ? 'bg-green-100 text-green-800'
                : report.status === 'processing'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {report.status === 'completed' ? 'Concluído' : report.status === 'processing' ? 'Processando' : report.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'signature'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Assinatura Digital
          </button>
          <button
            onClick={() => setActiveTab('sharing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sharing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Compartilhamento
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'details' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Relatório</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{report.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nome</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{report.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Data de Criação</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatBRShort(report.createdAt)}
                </dd>
              </div>
            </dl>

            {report.pdfPath && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <a
                  href={report.pdfPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Visualizar PDF
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === 'signature' && (
          <SignaturePanel
            reportId={report.id}
            onSignatureChange={() => {
              // Refresh report data if needed
              console.log('Assinatura alterada');
            }}
          />
        )}

        {activeTab === 'sharing' && <SharingPanel reportId={report.id} reportName={report.name} />}
      </div>
    </div>
  );
};

export default ReportDetails;
