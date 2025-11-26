import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  FileSpreadsheet,
  Calendar,
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';

interface SensorDataRow {
  id: string;
  timestamp: string;
  temperature: number;
  humidity: number | null;
  sensor: {
    serialNumber: string;
    type: {
      name: string;
    };
  };
}

interface ValidationData {
  id: string;
  name: string;
  validationNumber: string;
  minTemperature: number;
  maxTemperature: number;
  minHumidity: number | null;
  maxHumidity: number | null;
  client: {
    name: string;
  };
  suitcase: {
    name: string;
  };
  sensorData: SensorDataRow[];
  statistics: {
    totalReadings: number;
    conformityPercentage: number;
    temperature: {
      min: number;
      max: number;
      average: number;
    };
    humidity: {
      min: number;
      max: number;
      average: number;
    };
  };
}

const ValidationDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ValidationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;

  React.useEffect(() => {
    if (id) {
      fetchValidationDetails();
    }
  }, [id]);

  const fetchValidationDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/validations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar dados');

      const result = await response.json();
      const validationData = result.data.validation;
      
      // Calcular statistics se não existir
      if (!validationData.statistics && validationData.sensorData && validationData.sensorData.length > 0) {
        const sensorData = validationData.sensorData;
        const totalReadings = sensorData.length;
        const temperatures = sensorData.map((d: any) => d.temperature);
        const humidities = sensorData.map((d: any) => d.humidity).filter((h: any) => h !== null);
        
        let conformCount = 0;
        sensorData.forEach((row: any) => {
          const tempOk = row.temperature >= validationData.minTemperature && row.temperature <= validationData.maxTemperature;
          let humidOk = true;
          if (validationData.minHumidity !== null && validationData.maxHumidity !== null && row.humidity !== null) {
            humidOk = row.humidity >= validationData.minHumidity && row.humidity <= validationData.maxHumidity;
          }
          if (tempOk && humidOk) conformCount++;
        });
        
        validationData.statistics = {
          totalReadings,
          conformityPercentage: (conformCount / totalReadings) * 100,
          temperature: {
            min: Math.min(...temperatures),
            max: Math.max(...temperatures),
            average: temperatures.reduce((a: number, b: number) => a + b, 0) / temperatures.length
          },
          humidity: humidities.length > 0 ? {
            min: Math.min(...humidities),
            max: Math.max(...humidities),
            average: humidities.reduce((a: number, b: number) => a + b, 0) / humidities.length
          } : null
        };
      }
      
      setData(validationData);
    } catch (error) {
      console.error('Error fetching validation:', error);
      alert('Erro ao carregar dados da validação');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    // Criar CSV
    const headers = ['Data/Hora', 'Sensor', 'Tipo', 'Temperatura (°C)', 'Umidade (%RH)', 'Status'];
    const rows = data.sensorData.map(row => [
      new Date(row.timestamp).toLocaleString('pt-BR'),
      row.sensor.serialNumber,
      row.sensor.type.name,
      row.temperature.toFixed(2),
      row.humidity?.toFixed(2) || 'N/A',
      isWithinLimits(row) ? 'Conforme' : 'Não Conforme'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `validacao_${data.validationNumber}_dados.csv`;
    link.click();
  };

  const isWithinLimits = (row: SensorDataRow): boolean => {
    if (!data) return false;
    
    const tempOk = row.temperature >= data.minTemperature && row.temperature <= data.maxTemperature;
    
    if (data.minHumidity !== null && data.maxHumidity !== null && row.humidity !== null) {
      const humidOk = row.humidity >= data.minHumidity && row.humidity <= data.maxHumidity;
      return tempOk && humidOk;
    }
    
    return tempOk;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Validação não encontrada</p>
        <button onClick={() => navigate('/validations')} className="btn-secondary mt-4">
          Voltar
        </button>
      </div>
    );
  }

  const paginatedData = data.sensorData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalPages = Math.ceil(data.sensorData.length / rowsPerPage);

  return (
    <>
      <PageHeader
        title={data.name}
        description={`Validação #${data.validationNumber} - ${data.client.name}`}
      >
        <button
          onClick={() => navigate('/validations')}
          className="btn-secondary flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
      </PageHeader>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Leituras</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.statistics?.totalReadings?.toLocaleString() || '0'}
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conformidade</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.statistics?.conformityPercentage?.toFixed(1) || '0'}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Temperatura Média</p>
                <p className="text-2xl font-bold text-orange-600">
                  {data.statistics?.temperature?.average?.toFixed(1) || '0'}°C
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.statistics?.temperature?.min?.toFixed(1) || '0'}°C - {data.statistics?.temperature?.max?.toFixed(1) || '0'}°C
                </p>
              </div>
              <Thermometer className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          {data.statistics?.humidity && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Umidade Média</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {data.statistics.humidity.average?.toFixed(1) || '0'}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.statistics.humidity.min?.toFixed(1) || '0'}% - {data.statistics.humidity.max?.toFixed(1) || '0'}%
                  </p>
                </div>
                <Droplets className="h-8 w-8 text-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Exibindo {paginatedData.length} de {data.sensorData.length} leituras
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>
            <button
              onClick={() => navigate(`/validations/${id}/charts`)}
              className="btn-primary flex items-center gap-2"
            >
              📈 Ver Gráficos
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sensor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temperatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Umidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.map((row) => {
                  const withinLimits = isWithinLimits(row);
                  return (
                    <tr key={row.id} className={withinLimits ? '' : 'bg-red-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(row.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.sensor.serialNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.sensor.type.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={
                          row.temperature < data.minTemperature || row.temperature > data.maxTemperature
                            ? 'text-red-600 font-medium'
                            : 'text-gray-900'
                        }>
                          {row.temperature.toFixed(2)}°C
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.humidity !== null ? `${row.humidity.toFixed(2)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          withinLimits
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {withinLimits ? 'Conforme' : 'Não Conforme'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ValidationDetails;
