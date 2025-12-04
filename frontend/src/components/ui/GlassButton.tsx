import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'orange';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  isLoading = false,
  disabled,
  ...props 
}) => {
  const baseStyles = `
    rounded-2xl 
    font-semibold 
    text-white 
    backdrop-blur-lg 
    border border-white/20 
    transition-all duration-300 
    active:scale-[0.98]
    flex items-center justify-center
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const hoverStyles = !disabled && !isLoading ? 'hover:brightness-110 hover:scale-[1.02]' : '';

  const variants = {
    primary: 'bg-gradient-to-br from-[#6EA8FF] to-[#1A73E8] shadow-[0_4px_20px_rgba(66,133,244,0.4)]',
    secondary: 'bg-white/20 text-gray-800 shadow-[0_4px_18px_rgba(15,23,42,0.12)] hover:bg-white/30',
    danger: 'bg-gradient-to-br from-red-400 to-red-600 shadow-[0_4px_20px_rgba(239,68,68,0.4)]',
    orange: 'bg-gradient-to-br from-[#FFB46A] to-[#FF7A3D] shadow-[0_4px_20px_rgba(255,150,70,0.35)]',
  };

  const sizes = {
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button 
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${hoverStyles}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </span>
      ) : children}
    </button>
  );
};
