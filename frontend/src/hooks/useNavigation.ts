import { useLocation, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

// interface NavigationItem {
//   name: string;
//   href: string;
//   icon: string;
//   adminOnly?: boolean;
//   badge?: string;
// }

export const useNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPath = location.pathname;

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const goBack = () => {
    navigate(-1);
  };

  const isCurrentPath = (path: string) => {
    return currentPath === path;
  };

  const isParentPath = (path: string) => {
    return currentPath.startsWith(path) && path !== '/';
  };

  return {
    currentPath,
    navigateTo,
    goBack,
    isCurrentPath,
    isParentPath,
  };
};

export const useBreadcrumbs = () => {
  const location = useLocation();

  const breadcrumbs = useMemo(() => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    
    const routeNames: Record<string, string> = {
      '': 'Dashboard',
      'clients': 'Clientes',
      'sensors': 'Sensores',
      'suitcases': 'Maletas',
      'import': 'Importar Dados',
      'validations': 'Validações',
      'reports': 'Relatórios',
      'settings': 'Configurações',
    };

    return pathnames.map((pathname, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
      const name = routeNames[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
      
      return {
        name,
        href: routeTo,
        isLast: index === pathnames.length - 1,
      };
    });
  }, [location.pathname]);

  return breadcrumbs;
};

export const usePageNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const navigateWithState = (path: string, state?: any) => {
    navigate(path, { state });
  };

  const navigateBack = () => {
    navigate(-1);
  };

  const navigateReplace = (path: string) => {
    navigate(path, { replace: true });
  };

  const getCurrentPageName = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const routeNames: Record<string, string> = {
      '': 'Dashboard',
      'clients': 'Clientes',
      'sensors': 'Sensores',
      'suitcases': 'Maletas',
      'import': 'Importar Dados',
      'validations': 'Validações',
      'reports': 'Relatórios',
      'settings': 'Configurações',
    };

    if (pathnames.length === 0) return 'Dashboard';
    const lastPath = pathnames[pathnames.length - 1];
    return routeNames[lastPath] || lastPath.charAt(0).toUpperCase() + lastPath.slice(1);
  };

  return {
    navigate: navigateWithState,
    navigateBack,
    navigateReplace,
    currentPath: location.pathname,
    breadcrumbs,
    currentPageName: getCurrentPageName(),
    searchParams: new URLSearchParams(location.search),
  };
};