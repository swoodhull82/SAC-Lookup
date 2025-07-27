import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`card bg-base-200 shadow-lg border border-base-300 ${className}`}>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
};

export default Card;