import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEnrollment } from '../context/EnrollmentContext';

export default function PortalRefreshButton({ className = '', onRefresh, variant = 'button' }) {
  const { refreshStudents } = useEnrollment();
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await (onRefresh ? onRefresh() : refreshStudents());
      toast.success('Portal data refreshed.');
    } catch (error) {
      console.error('Failed to refresh portal data:', error);
      toast.error(error.message || 'Unable to refresh portal data.');
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`${variant === 'text'
        ? 'shrink-0 text-xs font-semibold text-univ-blue transition-colors hover:text-blue-700 hover:underline'
        : 'inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-univ-indigo focus:outline-none focus:ring-2 focus:ring-univ-indigo/30'
      } disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      aria-label="Refresh"
    >
      {variant !== 'text' && <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
      {isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}
