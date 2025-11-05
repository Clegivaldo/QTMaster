import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
}) => {
  return (
    <div className="mb-8">
      {/* Page header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold leading-7 text-gray-900 sm:text-2xl lg:text-3xl sm:truncate">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 md:ml-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;