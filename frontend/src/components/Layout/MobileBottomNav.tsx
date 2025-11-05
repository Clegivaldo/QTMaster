import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Upload, 
  BarChart3, 
  FileText,
  Menu
} from 'lucide-react';
import clsx from 'clsx';

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  shortName: string;
}

const mainNavItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home, shortName: 'Início' },
  { name: 'Clientes', href: '/clients', icon: Users, shortName: 'Clientes' },
  { name: 'Importar', href: '/import', icon: Upload, shortName: 'Importar' },
  { name: 'Validações', href: '/validations', icon: BarChart3, shortName: 'Validar' },
  { name: 'Relatórios', href: '/reports', icon: FileText, shortName: 'Relatórios' },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const location = useLocation();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-6 h-16">
        {/* Main navigation items */}
        {mainNavItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center justify-center space-y-1 text-xs font-medium transition-colors duration-150',
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <item.icon
                className={clsx(
                  'h-5 w-5',
                  isActive ? 'text-primary-600' : 'text-gray-400'
                )}
              />
              <span className="truncate">{item.shortName}</span>
            </NavLink>
          );
        })}

        {/* Menu button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center space-y-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150"
        >
          <Menu className="h-5 w-5 text-gray-400" />
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileBottomNav;