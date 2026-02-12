import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', sticky = false }) => {
  const stickyClass = sticky ? 'sticky top-8' : '';
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${stickyClass} ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle }) => (
  <div className="mb-6 pb-4 border-b border-gray-200">
    <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
    {subtitle && <p className="text-gray-600 text-sm mt-1">{subtitle}</p>}
  </div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`pt-6 border-t border-gray-200 ${className}`}>{children}</div>
);
