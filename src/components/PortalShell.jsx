import React, { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function PortalShell({
  sidebar,
  portalTitle,
  mobileTitle,
  mobileSubtitle,
  children,
  className = '',
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const firstFocusable = drawerRef.current?.querySelector('button, a, input, select, textarea');
    firstFocusable?.focus();
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )];
      if (!focusable.length) return;

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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      menuButton?.focus();
    };
  }, [isMenuOpen]);

  return (
    <div className={`flex h-full min-w-0 overflow-hidden bg-[#f4f6fb] ${className}`}>
      <div className="hidden lg:flex shrink-0" aria-label={`${portalTitle} navigation`}>
        {sidebar}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-indigo"
            aria-label={`Open ${portalTitle} navigation`}
            aria-expanded={isMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{mobileTitle || portalTitle}</p>
            {mobileSubtitle && (
              <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {mobileSubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1">
          {children}
        </div>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={`${portalTitle} navigation`}>
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close navigation"
          />
          <div
            ref={drawerRef}
            className="relative flex h-full w-[min(85vw,20rem)] flex-col border-r border-slate-200 bg-white shadow-lg"
          >
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-univ-indigo"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            <div
              className="min-h-0 flex-1 [&>aside]:h-full [&>aside]:w-full [&>aside]:border-r-0"
              onClick={(event) => {
                if (event.target.closest('button')) setIsMenuOpen(false);
              }}
            >
              {sidebar}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
