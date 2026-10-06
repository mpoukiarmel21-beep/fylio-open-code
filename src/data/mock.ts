// Données de démonstration (remplacées par le moteur réseau). Les types sont le contrat attendu par l'UI.
export type DeviceKind = 'pc' | 'android' | 'iphone';
export type Link = 'wifi' | 'hotspot' | 'cable';
export type Device = { id: string; name: string; kind: DeviceKind; link: Link; online: boolean; ip?: string };
export type FileKind = 'photo' | 'video' | 'music' | 'doc' | 'pdf' | 'other';
export type FileItem = { id: string; name: string; kind: FileKind; size: number; date: number; thumb?: any; duration?: number; uri?: string; w?: number; h?: number };
export type HistoryItem = { id: string; name: string; kind: FileKind; size: number; at: number; dir: 'sent' | 'received'; peer: string; status: 'done' | 'failed' };
export type Notif = { id: string; type: 'request' | 'done' | 'failed'; title: string; sub: string; read: boolean; at: number };
export type Song = { id: string; title: string; artist: string; duration: number; fav?: boolean; uri?: string; name?: string };

export const DEMO_DEVICES: Device[] = [
  { id: 'd1', name: 'iPhone 14', kind: 'iphone', link: 'wifi', online: true, ip: '172.20.10.3' },
  { id: 'd2', name: 'PC Bureau', kind: 'pc', link: 'wifi', online: true, ip: '172.20.10.2' },
  { id: 'd3', name: 'Galaxy S23', kind: 'android', link: 'hotspot', online: true, ip: '172.20.10.5' },
  { id: 'd4', name: 'iPad Pro', kind: 'iphone', link: 'wifi', online: false },
];
export const DEMO_HISTORY: HistoryItem[] = [
  { id: 'h1', name: 'Photos famille', kind: 'photo', size: 2.4e9, at: Date.now() - 7.2e6, dir: 'sent', peer: 'PC Bureau', status: 'done' },
  { id: 'h2', name: 'Vidéo vacances.mp4', kind: 'video', size: 1.8e9, at: Date.now() - 1.8e7, dir: 'received', peer: 'Galaxy S23', status: 'done' },
  { id: 'h3', name: 'Musique.mp3', kind: 'music', size: 1.2e7, at: Date.now() - 8.64e7, dir: 'sent', peer: 'iPhone 14', status: 'done' },
];
export const DEMO_FILES: FileItem[] = Array.from({ length: 18 }, (_, i) => ({
  id: 'f' + i, name: `IMG_${2040 + i}.${i % 4 === 1 ? 'mp4' : 'jpg'}`, kind: i % 4 === 1 ? 'video' : 'photo',
  size: 2e6 + i * 4e5, date: Date.now() - i * 3.6e6, duration: i % 4 === 1 ? 42 : undefined,
}));
export const DEMO_DOCS: FileItem[] = [
  { id: 'doc1', name: 'Contrat 2026.pdf', kind: 'pdf', size: 1.2e6, date: Date.now() - 2e6 },
  { id: 'doc2', name: 'Présentation.pptx', kind: 'doc', size: 8.4e6, date: Date.now() - 9e6 },
  { id: 'doc3', name: 'Budget.xlsx', kind: 'doc', size: 2.1e5, date: Date.now() - 4e7 },
  { id: 'doc4', name: 'Notes.txt', kind: 'other', size: 4096, date: Date.now() - 9e7 },
];
export const DEMO_SONGS: Song[] = [
  { id: 's1', title: 'Blue Horizon', artist: 'Nova', duration: 214, fav: true },
  { id: 's2', title: 'Nebula Drive', artist: 'Kaito', duration: 187 },
  { id: 's3', title: 'Paper Plane', artist: 'Léa M.', duration: 243, fav: true },
  { id: 's4', title: 'Midnight Glass', artist: 'Orion', duration: 201 },
  { id: 's5', title: 'Skyline', artist: 'Nova', duration: 176 },
  { id: 's6', title: 'Soft Clouds', artist: 'Aylin', duration: 232 },
];
export const fmtSize = (b: number) => b >= 1e9 ? (b / 1e9).toFixed(1) + ' Go' : b >= 1e6 ? Math.round(b / 1e6) + ' Mo' : Math.round(b / 1e3) + ' Ko';
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** Sous-titre d'une liste de fichiers : taille si connue, sinon dimensions, + durée le cas échéant. */
export const fmtFileSub = (f?: FileItem) => {
  if (!f) return '';
  const bits: string[] = [];
  if (f.size > 0) bits.push(fmtSize(f.size));
  else if (f.w && f.h) bits.push(`${f.w}×${f.h}`);
  if (f.duration) bits.push(fmtDur(f.duration));
  return bits.join(' • ');
};
export const genKey = () => Array.from({ length: 8 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');