import { useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-lg', zIndex = 'z-50', animate = true }) {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let animationFrame;
    let exitTimer;

    if (!animate) {
      setIsMounted(isOpen);
      setIsVisible(isOpen);
      return undefined;
    }

    if (isOpen) {
      setIsMounted(true);
      animationFrame = window.requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      exitTimer = window.setTimeout(() => setIsMounted(false), 200);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(exitTimer);
    };
  }, [animate, isOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const focusInitialControl = () => {
      const firstFocusable = dialogRef.current?.querySelector(focusableSelector);
      (firstFocusable || closeButtonRef.current)?.focus();
    };
    const focusTimer = window.setTimeout(focusInitialControl, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(focusableSelector)];
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen]);

  if (!isMounted) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 ${zIndex} flex items-center justify-center bg-slate-950/50 p-4 ${animate ? 'transition-opacity duration-[160ms] ease-out' : ''} ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      aria-hidden={!isVisible}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`flex max-h-[85vh] w-full ${maxWidth} flex-col rounded-lg border border-slate-200 bg-white shadow-lg ${animate ? 'transition-opacity duration-200 ease-out' : ''} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors duration-150"
            aria-label={`Close ${title}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
