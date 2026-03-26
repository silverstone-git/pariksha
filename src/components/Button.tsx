import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'blue';
  disabled?: boolean;
}

export const Button = ({
  onClick,
  children,
  className = "",
  variant = "primary",
  disabled = false,
  ...props
}: ButtonProps) => {
  const baseClasses =
    "px-6 py-3 font-semibold rounded-xl shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-all duration-300 ease-in-out transform flex items-center justify-center gap-2 active:scale-95";
  
  const variantClasses = {
    primary: "glowing-primary",
    secondary:
      "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 focus:ring-slate-500 border border-slate-300 dark:border-slate-700",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-red-900/20",
    blue: "glowing-blue",
  };
  
  const disabledClasses =
    "opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-md pointer-events-none";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${disabled ? disabledClasses : "hover:-translate-y-1"} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
