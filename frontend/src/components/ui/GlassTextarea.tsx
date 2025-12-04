import React from 'react';

interface GlassTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const GlassTextarea: React.FC<GlassTextareaProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-slate-700 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={`
          bg-white/40 
          border border-white/20 
          backdrop-blur-md 
          rounded-xl 
          px-4 py-3 
          text-gray-800 
          placeholder:text-gray-500 
          shadow-inner 
          focus:outline-none 
          focus:ring-2 focus:ring-blue-300 focus:border-transparent
          transition-all duration-200
          min-h-[100px]
          ${error ? 'ring-2 ring-red-300 border-red-300' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
    </div>
  );
};
