export const money = (value: number) => `$${value.toFixed(2)}`;

export const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`);

export const ordinal = (value: number) => {
  const j = value % 10;
  const k = value % 100;
  if (j === 1 && k !== 11) return `${value}st`;
  if (j === 2 && k !== 12) return `${value}nd`;
  if (j === 3 && k !== 13) return `${value}rd`;
  return `${value}th`;
};

export const initials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const deadlineLabel = (iso: string) => {
  if (!iso) return 'Kickoff TBD';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const countdown = (iso: string) => {
  const end = new Date(iso).getTime();
  const delta = end - Date.now();
  if (!Number.isFinite(end)) return 'TBD';
  if (delta <= 0) return 'Locked';
  const hours = Math.floor(delta / 36e5);
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  const minutes = Math.floor((delta % 36e5) / 6e4);
  if (days > 0) return `${days}d ${remHours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const chipLabel = (chip: string) => {
  if (chip === 'triple_captain') return 'Triple Captain';
  if (chip === 'bench_boost') return 'Bench Boost';
  return 'No chip';
};
