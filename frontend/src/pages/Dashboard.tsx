import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  TrendingUp, 
  FileText, 
  Users, 
  Thermometer,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '@/components/Layout/PageHeader';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total de Clientes',
      value: '12',
      change: '+2',
      changeType: 'increase',
      icon: Users,
    },
    {
      name: 'Sensores Ativos',
      value: '48',
      change: '+4',
      changeType: 'increase',
      icon: Thermometer,
    },
    {
      name: 'Validações Pendentes',
      value: '3',
      change: '-1',
      changeType: 'decrease',
      icon: Clock,
    },
    {
      name: 'Relatórios Gerados',
      value: '127',
      change: '+12',
      changeType: 'increase',
      icon: FileText,
    },
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'validation',
      title: 'Validação térmica concluída',
      description: 'Cliente ABC - Maleta #001',
      time: '2 horas atrás',
      status: 'success',
      icon: CheckCircle,
    },
    {
      id: 2,
      type: 'import',
      title: 'Dados importados',
      description: '24 arquivos processados com sucesso',
      time: '4 horas atrás',
      status: 'success',
      icon: TrendingUp,
    },
    {
      id: 3,
      type: 'alert',
      title: 'Sensor fora dos limites',
      description: 'Sensor #TH-001 - Temperatura: 28.5°C',
      time: '6 horas atrás',
      status: 'warning',
      icon: AlertTriangle,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo de volta, ${user?.name}!`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
                </div>
                <div className="ml-3 sm:ml-4 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-xs sm:text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Welcome Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Sistema Operacional
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Todas as funcionalidades estão funcionando corretamente
                </p>
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <div className="flex items-center text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-2" />
                <span className="text-gray-600">Autenticação ativa</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-2" />
                <span className="text-gray-600">Banco de dados conectado</span>
              </div>
              <div className="flex items-center text-xs sm:text-sm">
                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-2" />
                <span className="text-gray-600">Layout responsivo implementado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-4">
              Atividades Recentes
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-1 rounded-full ${
                    activity.status === 'success' ? 'bg-green-100' :
                    activity.status === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <activity.icon className={`h-3 w-3 sm:h-4 sm:w-4 ${
                      activity.status === 'success' ? 'text-green-600' :
                      activity.status === 'warning' ? 'text-yellow-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900">
                      {activity.title}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Development Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          Status do Desenvolvimento
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <p><strong>Usuário:</strong> {user?.name} ({user?.email})</p>
            <p><strong>Perfil:</strong> {user?.role}</p>
            <p><strong>Status:</strong> Layout principal implementado</p>
          </div>
          <div>
            <p><strong>Próximas funcionalidades:</strong></p>
            <ul className="mt-1 space-y-1 text-blue-700">
              <li>• Cadastro de clientes</li>
              <li>• Sistema de sensores e maletas</li>
              <li>• Importação de dados</li>
              <li>• Geração de relatórios</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;