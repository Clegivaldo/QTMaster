import React from 'react';

interface ReportStatisticsCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'gray' | 'yellow' | 'green' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  gray: 'bg-gray-50 text-gray-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
};

export function ReportStatisticsCard({ title, value, icon: Icon, color }: ReportStatisticsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}