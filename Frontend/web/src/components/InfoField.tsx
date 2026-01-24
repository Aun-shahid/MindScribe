// src/components/InfoField.tsx
import React from 'react';

interface InfoFieldProps {
  label: string;
  value: string | null | undefined;
  isColumn?: boolean;
  className?: string;
}

export const InfoField: React.FC<InfoFieldProps> = ({ 
  label, 
  value, 
  isColumn = false,
  className = '' 
}) => {
  const displayValue = value || 'Not provided';

  if (isColumn) {
    return (
      <div className={`space-y-2 ${className}`}>
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <div className="text-gray-900 text-sm leading-relaxed">
          {displayValue}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <p className="text-gray-900 text-sm">{displayValue}</p>
    </div>
  );
};