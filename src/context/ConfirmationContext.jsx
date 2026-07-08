import React, { createContext, useContext, useState, useRef } from 'react';
import { ShieldCheck, AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';

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
          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-100/50 shadow-sm mb-2">
            <CheckCircle className="w-6 h-6 stroke-[2]" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 bg-amber-50 text-univ-gold rounded-full flex items-center justify-center border border-univ-gold/20 shadow-sm mb-2 animate-pulse">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
        );
      case 'danger':
        return (
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center border border-rose-100/50 shadow-sm mb-2">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 bg-indigo-50 text-univ-indigo rounded-full flex items-center justify-center border border-indigo-100/50 shadow-sm mb-2">
            <HelpCircle className="w-6 h-6 stroke-[2]" />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    switch (modalState.type) {
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      case 'danger':
        return 'bg-rose-600 hover:bg-rose-700 text-white';
      case 'warning':
        return 'bg-univ-gold hover:bg-amber-600 text-white';
      default:
        return 'bg-univ-indigo hover:bg-univ-blue text-white';
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium max-w-sm w-full mx-4 p-6 flex flex-col items-center text-center space-y-4">
            {renderIcon()}
            <div className="space-y-1.5">
              <h3 className="text-xs font-extrabold text-univ-navy uppercase tracking-wider">{modalState.title}</h3>
              <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{modalState.message}</p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-350 transition-all cursor-pointer shadow-sm"
              >
                {modalState.cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm ${getConfirmButtonClass()}`}
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
