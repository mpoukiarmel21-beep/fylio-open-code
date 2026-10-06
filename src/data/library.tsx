/** Indexation réelle : photos/vidéos/audios (expo-media-library, requêtes légères) + fichiers du sandbox (expo-file-system).
 *  Les flux Nearby/Transfer restent en démo jusqu'à la Phase C (moteur réseau). */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Query, Asset, AssetField, MediaType, getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';
import type { AssetMetadata } from 'expo-media-library';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import type { FileItem, Song, FileKind } from './mock';

const IMG_MAX = 240;
const VID_MAX = 120;
const AUD_MAX = 200;
const AUDIO_EXT = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg', 'opus', 'wma'];
const PHOTO_EXT = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp'];
const VIDEO_EXT = ['mp4', 'mov', 'm4v', 'avi', 'mkv', 'webm'];
const DOC_EXT = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'pages', 'numbers', 'key', 'rtf'];
const DIRS = ['Docs', 'Downloads', 'Received'] as const;
type SandboxDir = (typeof DIRS)[number];

const kindForExt = (name: string): FileKind => {
  const ext = (name.split('.').pop() ?? '').toLowerCase();
  if (AUDIO_EXT.includes(ext)) return 'music';
  if (ext === 'pdf') return 'pdf';
  if (PHOTO_EXT.includes(ext)) return 'photo';
  if (VIDEO_EXT.includes(ext)) return 'video';
  if (DOC_EXT.includes(ext)) return 'doc';
  return 'other';
};
const stripExt = (name: string) => name.replace(/\.[^.]+$/, '') || name;

/* ---------- résolution d'URI (media → file://) ---------- */
const thumbCache = new Map<string, string>();
const withPrefix = (id: string) => (Platform.OS === 'ios' && !id.startsWith('ph://') && !id.startsWith('file://') ? 'ph://' + id : id);
const isDirect = (u?: string | null) => !!u && (u.startsWith('file://') || u.startsWith('content://'));

/** Résout un asset média (id iOS ph://, Android content://) vers une URI lisible. null = échec. */
export const resolveMediaUri = async (idOrUri?: string | null): Promise<string | null> => {
  if (!idOrUri) return null;
  if (isDirect(idOrUri)) return idOrUri;
  const cached = thumbCache.get(idOrUri);
  if (cached) return cached;
  try {
    const uri = await new Asset(withPrefix(idOrUri)).getUri();
    if (uri) thumbCache.set(idOrUri, uri);
    return uri;
  } catch {
    return null;
  }
};

/** URI pour une vignette de grille : tente l'asset brut, sinon file:// local (sans déclencher de téléchargement iCloud massif). */
export const thumbUri = async (idOrUri?: string | null): Promise<string | null> => {
  if (!idOrUri) return null;
  if (isDirect(idOrUri)) return idOrUri;
  const cached = thumbCache.get(idOrUri);
  if (cached) return cached;
  try {
    const asset = new Asset(withPrefix(idOrUri));
    if (Platform.OS === 'ios') {
      const inCloud = await asset.getIsInCloud().catch(() => false);
      if (inCloud) return null; // vignette de grille : jamais de téléchargement d'original
    }
    const uri = await asset.getUri();
    if (uri) thumbCache.set(idOrUri, uri);
    return uri;
  } catch {
    return null;
  }
};

/* ---------- conversion ---------- */
const toFile = (m: AssetMetadata): FileItem => ({
  id: m.id,
  name: m.filename ?? stripExt(m.id),
  kind: m.mediaType === MediaType.IMAGE ? 'photo' : m.mediaType === MediaType.VIDEO ? 'video' : 'music',
  size: 0, // la taille n'expose pas dans la metadata légère
  date: m.creationTime ?? m.modificationTime ?? Date.now(),
  uri: m.id,
  duration: m.duration && m.duration > 0 ? Math.round(m.duration / 1000) : undefined,
  w: m.width ?? undefined,
  h: m.height ?? undefined,
});
const toSong = (f: FileItem): Song => ({ id: f.id, title: stripExt(f.name), artist: '', duration: f.duration ?? 0, uri: f.uri ?? f.id, name: f.name });

const ensureDir = (name: SandboxDir): Directory => {
  const d = new Directory(Paths.document, name);
  try {
    if (!d.exists) d.create({ intermediates: true });
  } catch {
    /* déjà présent ou non créable : on continue */
  }
  return d;
};
const scanDir = (name: SandboxDir): FileItem[] => {
  try {
    const d = new Directory(Paths.document, name);
    if (!d.exists) return [];
    return d
      .list()
      .filter((e): e is File => e instanceof File)
      .map((f) => ({
        id: f.uri,
        name: f.name,
        kind: kindForExt(f.name),
        size: f.size ?? 0,
        date: f.lastModified ?? f.creationTime ?? Date.now(),
        uri: f.uri,
      }))
      .sort((a, b) => b.date - a.date);
  } catch {
    return [];
  }
};

/* ---------- contexte ---------- */
export type Perm = 'granted' | 'denied' | 'unknown';
type Lib = {
  ready: boolean;
  loading: boolean;
  perm: Perm;
  images: FileItem[];
  videos: FileItem[];
  music: FileItem[];
  docs: FileItem[];
  downloads: FileItem[];
  received: FileItem[];
  songs: Song[];
  counts: { images: number; videos: number; music: number; docs: number; downloads: number; received: number };
  itemsFor: (kind: string) => FileItem[];
  ensure: () => Promise<void>;
  ask: () => Promise<boolean>;
  refresh: () => Promise<void>;
  importDocs: () => Promise<number>;
};
const Ctx = createContext<Lib | null>(null);
export const useLibrary = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('LibraryProvider');
  return v;
};

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [perm, setPerm] = useState<Perm>('unknown');
  const [images, setImages] = useState<FileItem[]>([]);
  const [videos, setVideos] = useState<FileItem[]>([]);
  const [music, setMusic] = useState<FileItem[]>([]);
  const [docs, setDocs] = useState<FileItem[]>([]);
  const [downloads, setDownloads] = useState<FileItem[]>([]);
  const [received, setReceived] = useState<FileItem[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const permRef = useRef<Perm>('unknown');
  const loadedRef = useRef(false);
  const loadedPermRef = useRef<Perm>('unknown');
  const busyRef = useRef(false);

  const load = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const p = await getPermissionsAsync();
      permRef.current = p.status === 'granted' ? 'granted' : p.status === 'denied' ? 'denied' : 'unknown';
      setPerm(permRef.current);
      loadedPermRef.current = permRef.current;
      let media: { im: FileItem[]; vi: FileItem[]; au: FileItem[] } = { im: [], vi: [], au: [] };
      if (p.status === 'granted') {
        try {
          const [im, vi, au] = await Promise.all([
            new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE).orderBy({ key: AssetField.CREATION_TIME, ascending: false }).limit(IMG_MAX).exeForMetadata(),
            new Query().eq(AssetField.MEDIA_TYPE, MediaType.VIDEO).orderBy({ key: AssetField.CREATION_TIME, ascending: false }).limit(VID_MAX).exeForMetadata(),
            new Query().eq(AssetField.MEDIA_TYPE, MediaType.AUDIO).orderBy({ key: AssetField.CREATION_TIME, ascending: false }).limit(AUD_MAX).exeForMetadata(),
          ]);
          media = { im: im.map(toFile), vi: vi.map(toFile), au: au.map(toFile) };
        } catch {
          media = { im: [], vi: [], au: [] };
        }
      }
      const sbDocs = scanDir('Docs');
      const sbDl = scanDir('Downloads');
      const sbRcv = scanDir('Received');
      const sandboxAll = [...sbDocs, ...sbDl, ...sbRcv];
      const sandboxMusic = sandboxAll.filter((f) => f.kind === 'music');
      setImages(media.im);
      setVideos(media.vi);
      setMusic([...media.au, ...sandboxMusic]);
      setDocs(sbDocs);
      setDownloads(sbDl);
      setReceived(sbRcv);
      const seen = new Set<string>();
      setSongs(
        [...media.au, ...sandboxMusic].map(toSong).filter((s) => (seen.has(s.uri ?? s.id) ? false : (seen.add(s.uri ?? s.id), true)))
      );
      loadedRef.current = true;
    } finally {
      busyRef.current = false;
      setLoading(false);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ensure = useCallback(async () => {
    if (busyRef.current) return;
    const p = await getPermissionsAsync();
    const status: Perm = p.status === 'granted' ? 'granted' : p.status === 'denied' ? 'denied' : 'unknown';
    if (status !== permRef.current) {
      permRef.current = status;
      setPerm(status);
    }
    if (status === 'granted' && (!loadedRef.current || loadedPermRef.current !== 'granted')) await load();
  }, [load]);

  const ask = useCallback(async () => {
    const p = await requestPermissionsAsync();
    const status: Perm = p.status === 'granted' ? 'granted' : p.status === 'denied' ? 'denied' : 'unknown';
    permRef.current = status;
    setPerm(status);
    if (status === 'granted') await load();
    else setReady(true);
    return status === 'granted';
  }, [load]);

  const importDocs = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true, type: '*/*' });
      if (res.canceled || !res.assets?.length) return 0;
      const dir = ensureDir('Docs');
      let n = 0;
      for (const a of res.assets) {
        try {
          await new File(a.uri).copy(new File(dir, a.name), { overwrite: true });
          n++;
        } catch {
          /* fichier illisible ou déjà présent */
        }
      }
      const sbDocs = scanDir('Docs');
      setDocs(sbDocs);
      if (n > 0) await load();
      return n;
    } catch {
      return 0;
    }
  }, []);

  const itemsFor = useCallback(
    (kind: string) =>
      kind === 'images' ? images : kind === 'videos' ? videos : kind === 'music' ? music : kind === 'docs' ? docs : kind === 'downloads' ? downloads : kind === 'received' ? received : [],
    [images, videos, music, docs, downloads, received]
  );

  const value: Lib = {
    ready,
    loading,
    perm,
    images,
    videos,
    music,
    docs,
    downloads,
    received,
    songs,
    counts: { images: images.length, videos: videos.length, music: music.length, docs: docs.length, downloads: downloads.length, received: received.length },
    itemsFor,
    ensure,
    ask,
    refresh: load,
    importDocs,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
