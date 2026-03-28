import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const Card = ({ children, className = "", title, icon }: CardProps) => {
  return (
    <div
      className={`glass rounded-2xl p-4 sm:p-6 transition-all duration-300 shadow-sm hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 hover:border-teal-500/30 ${className}`}
    >
      {(title || icon) && (
        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 truncate">
          {icon && <span className="text-teal-500 flex-shrink-0">{icon}</span>} <span className="truncate">{title}</span>
        </h2>
      )}
      {children}
    </div>
  );
};
