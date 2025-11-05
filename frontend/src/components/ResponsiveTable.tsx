import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  mobileRender?: (item: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  mobileCardRender?: (item: T) => React.ReactNode;
  actions?: (item: T) => React.ReactNode;
}

function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onSort,
  sortKey,
  sortOrder,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  mobileCardRender,
  actions,
}: ResponsiveTableProps<T>) {
  const { isMobile } = useResponsive();

  const handleSort = (key: string) => {
    if (onSort) {
      onSort(key);
    }
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return '↕️';
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const renderCellContent = (item: T, column: Column<T>) => {
    if (column.render) {
      return column.render(item);
    }
    
    const value = item[column.key as keyof T];
    return value?.toString() || '-';
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-t-lg"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-t border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {data.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {data.map((item) => (
              <div key={keyExtractor(item)} className="p-4 hover:bg-gray-50">
                {mobileCardRender ? (
                  mobileCardRender(item)
                ) : (
                  <div className="space-y-2">
                    {columns
                      .filter(col => !col.hideOnMobile)
                      .map((column) => (
                        <div key={column.key.toString()} className="flex justify-between">
                          <span className="text-sm font-medium text-gray-500">
                            {column.header}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {column.mobileRender 
                              ? column.mobileRender(item)
                              : renderCellContent(item, column)
                            }
                          </span>
                        </div>
                      ))}
                    {actions && (
                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        {actions(item)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key.toString()}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key.toString())}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <span className="text-gray-400">
                        {getSortIcon(column.key.toString())}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (actions ? 1 : 0)} 
                  className="px-6 py-12 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.key.toString()} className="px-6 py-4 whitespace-nowrap">
                      {renderCellContent(item, column)}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {actions(item)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ResponsiveTable;