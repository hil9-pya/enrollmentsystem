import React, { createContext, useContext, useState, useRef } from 'react';
import { AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

const ConfirmationContext = createContext(null);

export function ConfirmationProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'info', // 'info' | 'success' | 'warning' | 'danger'
  });

  const resolverRef = useRef(null);

  const confirm = (options) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message || 'Are you sure you want to proceed?',
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      type: options.type || 'info',
    });
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) resolverRef.current(true);
  };

  const handleCancel = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) resolverRef.current(false);
  };

  // Render Icon based on type
  const renderIcon = () => {
    switch (modalState.type) {
      case 'success':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle className="h-4.5 w-4.5 stroke-[2]" />
          </span>
        );
      case 'warning':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="h-4.5 w-4.5 stroke-[2]" />
          </span>
        );
      case 'danger':
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle className="h-4.5 w-4.5 stroke-[2]" />
          </span>
        );
      default:
        return (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-univ-indigo">
            <HelpCircle className="h-4.5 w-4.5 stroke-[2]" />
          </span>
        );
    }
  };

  const getConfirmButtonClass = () => {
    switch (modalState.type) {
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      default:
        return 'bg-univ-blue hover:bg-blue-700 text-white';
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            className="mx-4 w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="flex items-start gap-3">
              {renderIcon()}
              <div className="min-w-0 pt-0.5">
                <h3 id="confirmation-title" className="text-sm font-semibold text-univ-navy">{modalState.title}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{modalState.message}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={handleCancel}
                className="min-w-24 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
              >
                {modalState.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`min-w-24 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors cursor-pointer ${getConfirmButtonClass()}`}
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmationProvider');
  }
  return context;
};
