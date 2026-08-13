import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export default function FloatingInput({ 
  label, 
  id, 
  type = 'text', 
  icon: Icon, 
  value, 
  onChange, 
  required = false,
  disabled = false,
  error = null,
  placeholder = " ",
  autoComplete,
  ...props 
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const visiblePlaceholder = placeholder === ' ' ? undefined : placeholder;

  return (
    <div className="mb-5 w-full">
      <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${error ? 'text-rose-500' : 'text-slate-400'}`}
            aria-hidden="true"
          />
        )}
        <input
          type={type}
          id={inputId}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          placeholder={visiblePlaceholder}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm font-medium outline-none transition-colors duration-150 placeholder:text-slate-400
            ${Icon ? 'pl-9' : ''}
            ${disabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
              : error
              ? 'border-rose-400 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
              : 'border-slate-200 bg-white hover:border-slate-300 focus:border-univ-blue focus:ring-2 focus:ring-univ-blue/15'
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <div id={errorId} className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-rose-600">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
