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
  Layout,
  Wrench
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAppVersion } from '@/hooks/useAppVersion';
import clsx from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarCollapsed?: boolean;
}

type NavIcon = React.ComponentType<{ className?: string }>;

interface NavigationItem {
  name: string;
  href?: string;
  icon?: NavIcon;
  adminOnly?: boolean;
  badge?: string;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    name: 'Clientes',
    icon: Users,
    children: [
      { name: 'Cliente', href: '/clients', icon: Users },
      { name: 'Equipamento de Cliente', href: '/client-equipments', icon: Wrench },
    ],
  },
  {
    name: 'Sensores',
    icon: Thermometer,
    children: [
      { name: 'Tipo de Sensor', href: '/sensor-types', icon: Thermometer },
      { name: 'Sensor', href: '/sensors', icon: Thermometer },
      { name: 'Maleta', href: '/suitcases', icon: Package },
    ],
  },
  {
    name: 'Equipamentos',
    icon: Wrench,
    children: [
      { name: 'Tipo', href: '/equipment-types', icon: Wrench },
      { name: 'Marca', href: '/brands', icon: Wrench },
      { name: 'Modelo', href: '/models', icon: Wrench },
    ],
  },
  { name: 'Importar Dados', href: '/import', icon: Upload },
  { name: 'Validações', href: '/validations', icon: BarChart3 },
  { name: 'Relatórios', href: '/reports', icon: FileText },
  { name: 'Templates', href: '/templates', icon: Layout },
  // Configurações removed from sidebar (available in header avatar)
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, sidebarCollapsed = false }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { version, buildDate } = useAppVersion();

  const filterNav = (items: NavigationItem[]) => {
    return items
      .map(i => {
        if (i.children) {
          const children = i.children.filter(c => !c.adminOnly || user?.role === 'ADMIN');
          if (children.length === 0) return null;
          return { ...i, children };
        }
        if (i.adminOnly && user?.role !== 'ADMIN') return null;
        return i;
      })
      .filter(Boolean) as NavigationItem[];
  };

  const filteredNavigation = filterNav(navigation);

  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const toggleGroup = (name: string) => setOpenGroup(prev => (prev === name ? null : name));

  return (
    <>
      {/* Desktop sidebar */}
      <div id="app-sidebar" className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0 lg:left-0 lg:z-50">
        <div className={clsx('flex flex-col', sidebarCollapsed ? 'w-16' : 'w-64')}>
          <div className={clsx('flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 overflow-y-auto h-screen', sidebarCollapsed ? 'items-center' : '')}>
            {/* Logo */}
            <div className={clsx('flex items-center flex-shrink-0', sidebarCollapsed ? 'px-2' : 'px-4')}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
                    <Thermometer className="h-5 w-5 text-white" />
                  </div>
                </div>
                {!sidebarCollapsed && (
                  <div className="ml-3">
                    <h1 className="text-lg font-semibold text-gray-900">
                      Laudos Térmicos
                    </h1>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className={clsx('mt-8 flex-1 space-y-1', sidebarCollapsed ? 'px-2' : 'px-2')}>
              {filteredNavigation.map((item) => {
                if (item.children && item.children.length > 0) {
                  const open = openGroup === item.name;
                  return (
                    <div key={item.name}>
                      <button
                        onClick={() => toggleGroup(item.name)}
                        className={clsx(
                          'w-full group flex items-center py-3 text-sm font-medium rounded-md transition-colors duration-150',
                          'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        {item.icon && (
                          <item.icon className={clsx('flex-shrink-0 h-6 w-6', sidebarCollapsed ? '' : 'mr-3', 'text-gray-400')} />
                        )}
                        {!sidebarCollapsed && item.name}
                        <ChevronRight className={clsx('ml-auto h-4 w-4 transition-transform', open ? 'rotate-90' : '')} />
                      </button>

                      {open && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.children.map(child => {
                            const isActive = child.href && location.pathname === child.href;
                            return (
                              <NavLink
                                key={child.name}
                                to={child.href || '#'}
                                className={clsx(
                                  'group flex items-center py-2 text-sm rounded-md transition-colors duration-150',
                                  isActive ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )}
                              >
                                {child.icon && (
                                  <child.icon className={clsx('flex-shrink-0 h-4 w-4 mr-2', isActive ? 'text-primary-600' : 'text-gray-400')} />
                                )}
                                {!sidebarCollapsed && child.name}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = item.href && location.pathname === item.href;
                return (
                  <NavLink
                    key={item.name}
                    to={item.href || '#'}
                    className={clsx(
                      'group flex items-center py-3 text-sm font-medium rounded-md transition-colors duration-150',
                      isActive
                        ? clsx(
                            'bg-primary-100 text-primary-900 border-r-2 border-primary-600',
                            sidebarCollapsed ? 'pr-1' : 'pl-2'
                          )
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    {item.icon && (
                      <item.icon
                        className={clsx(
                          'flex-shrink-0 h-6 w-6',
                          sidebarCollapsed ? '' : 'mr-3',
                          isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                    )}
                    {!sidebarCollapsed && item.name}
                    {item.badge && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className={clsx('ml-auto h-4 w-4 text-primary-600', sidebarCollapsed ? 'hidden' : '')} />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            {/* System info */}
            <div className={clsx('flex-shrink-0 border-t border-gray-200', sidebarCollapsed ? 'px-2' : 'px-4')}>
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="py-3">
                  <div className="flex flex-col md:flex-row justify-center items-center">
                    <div className="text-xs text-gray-500">
                      <span>Versão: {version} - {buildDate}</span>
                    </div>
                  </div>
                </div>
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
              if (item.children && item.children.length > 0) {
                const open = openGroup === item.name;
                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={clsx(
                        'w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                        'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      {item.icon && (
                        <item.icon className={clsx('mr-3 flex-shrink-0 h-5 w-5 text-gray-400')} />
                      )}
                      {item.name}
                      <ChevronRight className={clsx('ml-auto h-4 w-4 transition-transform', open ? 'rotate-90' : '')} />
                    </button>

                    {open && (
                      <div className="pl-6 mt-1 space-y-1">
                        {item.children.map(child => (
                          <NavLink
                            key={child.name}
                            to={child.href || '#'}
                            onClick={onClose}
                            className={clsx(
                              'group flex items-center px-2 py-2 text-sm rounded-md transition-colors duration-150',
                              location.pathname === child.href ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )}
                          >
                            {child.icon && (
                              <child.icon className="mr-3 flex-shrink-0 h-4 w-4 text-gray-400" />
                            )}
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.name}
                  to={item.href || '#'}
                  onClick={onClose}
                  className={clsx(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150',
                    location.pathname === item.href ? 'bg-primary-100 text-primary-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.icon && (
                    <item.icon className={clsx('mr-3 flex-shrink-0 h-5 w-5 text-gray-400')} />
                  )}
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile system info */}
          <div className="flex-shrink-0 border-t border-gray-200">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="py-3">
                <div className="flex flex-col md:flex-row justify-center items-center">
                  <div className="text-xs text-gray-500">
                    <span>Versão: {version} - {buildDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;