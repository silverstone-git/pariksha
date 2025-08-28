import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button = ({ children, className, variant = 'primary', ...props }: ButtonProps) => {
  const baseClasses = 'text-white font-bold py-2 px-4 rounded';
  
  const variantClasses = {
    primary: 'bg-green-500 hover:bg-green-700',
    secondary: 'bg-gray-500 hover:bg-gray-700',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
