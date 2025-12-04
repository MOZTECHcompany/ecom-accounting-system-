import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        backdrop-blur-xl 
        bg-white/30 
        border border-white/20 
        shadow-[0_8px_32px_rgba(31,38,135,0.15)] 
        rounded-3xl 
        p-6 
        ${onClick ? 'cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:bg-white/40' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
