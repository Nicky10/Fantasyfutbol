export function youtubeId(url?: string | null) {
  const value = String(url || '').trim();
  if (!value) return null;
  const match = value.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})|^([A-Za-z0-9_-]{11})$/,
  );
  return match ? match[1] || match[2] : null;
}

export function youtubeEmbedUrl(url?: string | null) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?playsinline=1&rel=0` : null;
}
