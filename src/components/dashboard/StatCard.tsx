import React, { ReactNode } from 'react';
import Card from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
  };
  prefix?: string;
  suffix?: string;
  gradientClass?: string
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  prefix = '',
  suffix = '',
  gradientClass,
  onClick,
}) => {
  return (
    <Card
      className={`h-full ${gradientClass}`}
      hoverable={!!onClick}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">
            {prefix}
            {value}
            {suffix}
          </p>

          {change && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${change.isPositive ? 'text-success-600' : 'text-error-600'
                  }`}
              >
                {change.isPositive ? '+' : ''}
                {change.value}%
              </span>
              <span className="ml-1 text-xs text-white/70">from previous period</span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-full bg-primary-50 text-primary-600">
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default StatCard;