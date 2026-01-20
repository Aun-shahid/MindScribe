// src/components/InfoSection.tsx
import React from 'react';

interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const InfoSection: React.FC<InfoSectionProps> = ({ 
  title, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-100 pb-2">
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );
};