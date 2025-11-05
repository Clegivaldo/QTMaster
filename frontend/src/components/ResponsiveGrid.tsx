import React from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import clsx from 'clsx';

interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, lg: 3, xl: 4 },
  gap = 'md',
  className,
}) => {
  const { getColumnsForBreakpoint } = useResponsive();
  
  const currentColumns = getColumnsForBreakpoint(columns);
  
  const gapClasses = {
    none: 'gap-0',
    sm: 'gap-2 sm:gap-3',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
    xl: 'gap-8 sm:gap-10',
  };

  const gridClasses = clsx(
    'grid',
    {
      'grid-cols-1': currentColumns === 1,
      'grid-cols-2': currentColumns === 2,
      'grid-cols-3': currentColumns === 3,
      'grid-cols-4': currentColumns === 4,
      'grid-cols-5': currentColumns === 5,
      'grid-cols-6': currentColumns === 6,
    },
    gapClasses[gap],
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

export default ResponsiveGrid;