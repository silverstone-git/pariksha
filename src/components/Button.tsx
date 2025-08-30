import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export const Button = ({ children, className, variant = 'primary', disabled = false, ...props }: ButtonProps) => {
  const baseClasses =
    "px-6 py-3 font-semibold rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all duration-300 ease-in-out transform flex items-center justify-center gap-2 hover:shadow-xl";
  
  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };

  const disabledClasses = "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-lg";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : "hover:scale-105"} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};