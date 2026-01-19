import React from 'react';

interface RiskBadgeProps {
  level: 'low' | 'medium' | 'high';
  className?: string;
}

const RiskBadge: React.FC<RiskBadgeProps> = ({ level, className = '' }) => {
  const badgeStyles = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const levelLabels = {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyles[level]} ${className}`}>
      {levelLabels[level]}
    </span>
  );
};

export default RiskBadge;