import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function FloatingInput({ 
  label, 
  id, 
  type = 'text', 
  icon: Icon, 
  value, 
  onChange, 
  required = false,
  error = null,
  placeholder = " ",
  ...props 
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative mb-6 w-full">
      <div className="relative">
        {Icon && (
          <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors duration-300 ${
            error ? 'text-rose-400' : isFocused ? 'text-univ-blue' : 'text-slate-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          type={type}
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`peer w-full px-4 pt-5 pb-2 rounded-xl text-sm font-medium transition-all duration-300 outline-none placeholder-slate-400/70
            ${Icon ? 'pl-11' : ''}
            ${error 
              ? 'bg-rose-50/50 border border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
              : 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-univ-blue focus:ring-4 focus:ring-univ-blue/10 hover:border-slate-300'
            }
          `}
          {...props}
        />
        <label
          htmlFor={id}
          className={`absolute transition-all duration-300 transform top-4 z-10 origin-[0]
            ${Icon ? 'left-11' : 'left-4'}
            ${
              (placeholder !== " " || type === "date" || type === "time")
                ? "text-xs font-extrabold uppercase tracking-widest -translate-y-3 scale-75"
                : "text-xs font-extrabold uppercase tracking-widest -translate-y-3 scale-75 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:font-extrabold peer-focus:uppercase peer-focus:tracking-widest"
            }
            ${error 
              ? 'text-rose-500' 
              : 'text-slate-500 peer-focus:text-univ-blue'
            }
          `}
        >
          {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      </div>
      {error && (
        <div className="absolute -bottom-5 left-0 flex items-center gap-1 mt-1 animate-in slide-in-from-top-1">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">{error}</span>
        </div>
      )}
    </div>
  );
}
