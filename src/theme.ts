export const colors = {
  bg: '#07090D',
  bgElevated: '#0E1218',
  card: '#151B24',
  cardHover: '#1C2430',
  line: 'rgba(255,255,255,0.08)',
  text: '#F4F7FB',
  muted: '#8B95A8',
  faint: '#5C6575',
  lime: '#D8F830',
  limeDim: '#9BB61C',
  limeSoft: 'rgba(216,248,48,0.14)',
  purple: '#8B7CFF',
  danger: '#FF4D6D',
  warning: '#FFB020',
  pitch: '#0A3A22',
  pitchDeep: '#062616',
  pitchLine: 'rgba(255,255,255,0.16)',
  white: '#FFFFFF',
  overlay: 'rgba(7,9,13,0.72)',
  ATK: '#FF5C8A',
  MID: '#4DA3FF',
  DEF: '#3DDC84',
  GK: '#FFB020',
  SUB: '#8B93A7',
};

export const positionColor = (position: string) => {
  const key = String(position || '').toUpperCase();
  if (key === 'ATK' || key === 'MID' || key === 'DEF' || key === 'GK') {
    return colors[key];
  }
  return colors.SUB;
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
};
