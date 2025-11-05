import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Thermometer, 
  Package, 
  Upload, 
  BarChart3, 
  FileText, 
  Settings,
  X,
  ChevronRight,
  Layout
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppVersion } from '@/hooks/useAppVersion';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  badge?: string;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Clientes', href: '/clients', icon: Users },
  { name: 'Sensores', href: '/sensors', icon: Thermometer },
  { name: 'Maletas', href: '/suitcases', icon: Package },
  { name: 'Importar Dados', href: '/import', icon: Upload },
  { name: 'Validações', href: '/validations', icon: BarChart3 },
  { name: 'Relatórios', href: '/reports', icon: FileText },
  { name: 'Templates', href: '/templates', icon: Layout },
  { name: 'Configurações', href: '/settings', icon: Settings, adminOnly: true },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { version, buildDate } = useAppVersion();

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.role === 'ADMIN'
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto h-screen">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Thermometer className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">
                    Laudos Térmicos
                  </h1>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                      isActive
                        ? 'bg-primary-100 text-primary-900 border-r-2 border-primary-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                      )}
                    />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="ml-auto h-4 w-4 text-primary-600" />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* System info */}
            <div className="flex-shrink-0 border-t border-gray-200 py-3 px-4">
              <div className="text-xs text-gray-500 text-center">
                <span>Versão: {version} - {buildDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={clsx(
        'lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Mobile header */}
          <div className="flex items-center justify-between flex-shrink-0 px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Thermometer className="h-5 w-5 text-white" />
              </div>
              <h1 className="ml-3 text-lg font-semibold text-gray-900">
                Laudos Térmicos
              </h1>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 flex-shrink-0 h-5 w-5',
                      isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile system info */}
          <div className="flex-shrink-0 border-t border-gray-200 py-3 px-4">
            <div className="text-xs text-gray-500 text-center">
              <span>Versão: {version} - {buildDate}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;