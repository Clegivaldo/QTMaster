import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useBreadcrumbs } from '@/hooks/useNavigation';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  const autoBreadcrumbs = useBreadcrumbs();
  
  // Use provided items or auto-generated breadcrumbs
  const breadcrumbItems = items || autoBreadcrumbs.map(crumb => ({
    name: crumb.name,
    href: crumb.isLast ? undefined : crumb.href,
  }));

  if (breadcrumbItems.length === 0) {
    return null;
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {/* Home link */}
        <li>
          <Link
            to="/"
            className="text-gray-400 hover:text-gray-500 flex items-center"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={item.name} className="flex items-center">
              <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
              {isLast || !item.href ? (
                <span className="text-sm font-medium text-gray-900">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;