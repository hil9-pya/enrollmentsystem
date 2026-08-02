import { STATUS_CONFIG } from '../data/mockData';
import Badge from './Badge';

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  const toneMap = {
    slate: 'neutral',
    amber: 'warning',
    emerald: 'success',
    rose: 'danger',
    indigo: 'info',
  };

  return <Badge tone={toneMap[config.color] || 'neutral'}>{config.label}</Badge>;
}
