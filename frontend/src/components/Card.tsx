import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  actions 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4">
        {children}
      </div>
    </div>
  );
};

export default Card;