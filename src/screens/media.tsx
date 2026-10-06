/** 16 Fichiers, 17 Dossier, 18 Galerie, 19 Visionneuse façon Photos, 20 Vidéo, 21 Musique (+ widget lock-screen), 22 Lecteur plein écran, PDF, 23 Navigateur. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, FlatList, Dimensions, TextInput, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import Pdf from 'react-native-pdf';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Folder, Image as ImgIco, Video, Music, FileText, Download, Inbox, Play, Pause, SkipBack, SkipForward, Heart, Share2, Trash2, Info, X, ChevronLeft, ChevronRight, Globe, Lock, RotateCw, Plus, Bookmark, Volume2, Repeat, Shuffle, Send, ShieldCheck, FolderPlus } from 'lucide-react-native';
import { Screen, Header, HeaderBack, GlassCard, GlassButton, GhostButton, Press, Search, Chip, T, SectionTitle, FadeIn, W, H, Row, IconButton } from '../ui';
import { NAV_H } from '../ui/GlassNav';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { FileItem, Song, fmtSize, fmtDur, fmtFileSub } from '../data/mock';
import { useLibrary, resolveMediaUri } from '../data/library';
import { FileThumb, PhImage } from './send';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;
const useHeaderProps = () => {
  const nav = useNavigation<Nav>(); const app = useApp();
  return { name: app.firstName || 'Chris', avatar: app.avatar >= 0 ? IMG.avatars[app.avatar] : IMG.avatars[0], hasNotif: app.notifs.some((n) => !n.read), onEdit: () => nav.navigate('Who', { fromSettings: true }), onBrowser: () => nav.navigate('Browser'), onNotifs: () => nav.navigate('Notifications'), onSettings: () => nav.navigate('Settings') };
};

/* 16 — Fichiers : recherche, 6 dossiers (2 colonnes), personnage dossiers */
export function FilesScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps();
  const lib = useLibrary();
  const [q, setQ] = useState('');
  const [importing, setImporting] = useState(false);
  useEffect(() => { lib.ensure(); }, []);
  const folders = [
    { k: 'images', i: ImgIco, c: '#5BB8FF', n: lib.counts.images }, { k: 'videos', i: Video, c: '#8E8CFF', n: lib.counts.videos },
    { k: 'docs', i: FileText, c: '#FFB357', n: lib.counts.docs }, { k: 'music', i: Music, c: '#FF7AA2', n: lib.counts.music },
    { k: 'downloads', i: Download, c: '#38D39F', n: lib.counts.downloads }, { k: 'received', i: Inbox, c: '#2E90FA', n: lib.counts.received },
  ] as const;
  const granted = lib.perm === 'granted';
  const total = folders.reduce((a, f) => a + f.n, 0);
  const doImport = async () => { setImporting(true); try { await lib.importDocs(); } finally { setImporting(false); } };
  return (
    <Screen bg={4}>
      <Header {...hp} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.padTight + 4, paddingBottom: NAV_H + 40 }}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1()}>{t('files.title')}</Text><Text style={T.lead()}>{t('files.subtitle')}</Text></View>
          <Image source={IMG.filesMascot} style={{ width: 110, height: 110 }} resizeMode="contain" />
        </FadeIn>
        <Search placeholder={t('files.search')} value={q} onChange={setQ} style={{ marginTop: 6 }} />
        {!granted && (
          <GlassCard style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ShieldCheck size={34} color={C.accent} />
              <Text style={[T.cardT(), { marginTop: 8, textAlign: 'center' }]}>{t('lib.grant')}</Text>
              <Text style={[T.body(), { textAlign: 'center', marginTop: 2 }]}>{t('lib.grantSub')}</Text>
              <View style={{ marginTop: 12 }}><GlassButton label={t('lib.grantBtn')} onPress={() => lib.ask()} /></View>
            </View>
          </GlassCard>
        )}
        {granted && (
          <FadeIn delay={40} style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <GhostButton icon={FolderPlus} label={importing ? t('lib.loading') : t('lib.import')} onPress={doImport} style={{ flex: 1 }} />
          </FadeIn>
        )}
        {granted && total === 0 && (
          <GlassCard style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={[T.cardT(), { textAlign: 'center' }]}>{t('lib.empty')}</Text>
              <View style={{ marginTop: 12 }}><GlassButton label={t('lib.import')} onPress={doImport} /></View>
            </View>
          </GlassCard>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
          {folders.map((f, i) => (
            <FadeIn key={f.k} delay={60 + i * 50} style={{ width: (W - 24 - 10) / 2 }}>
              <Press onPress={() => nav.navigate('Folder', { kind: f.k, title: t(`files.${f.k === 'music' ? 'musicF' : f.k}`) })}>
                <GlassCard padding={14}>
                  <View style={[st.folderIco, { backgroundColor: f.c }]}><f.i size={22} color="#fff" /></View>
                  <Text style={[T.strong(), { marginTop: 10 }]}>{t(`files.${f.k === 'music' ? 'musicF' : f.k}`)}</Text>
                  <Text style={T.body()}>{t('files.items', { count: f.n })}</Text>
                </GlassCard>
              </Press>
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
/* 17 — Dossier : liste des fichiers, tap → visionneuse / vidéo / PDF ; sélection → Envoyer */
export function FolderScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const lib = useLibrary(); const pl = usePlayer();
  const { kind, title } = route.params as { kind: string; title: string };
  const items: FileItem[] = useMemo(() => lib.itemsFor(kind), [kind, lib.images, lib.videos, lib.music, lib.docs, lib.downloads, lib.received]);
  const [sel, setSel] = useState<Set<string>>(new Set()); const [mode, setMode] = useState(false);
  useEffect(() => { lib.ensure(); }, []);
  const open = (f: FileItem) => {
    if (mode) { setSel((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; }); return; }
    if (f.kind === 'photo') nav.navigate('Viewer', { items: items.filter((x) => x.kind === 'photo'), index: items.filter((x) => x.kind === 'photo').indexOf(f) });
    else if (f.kind === 'video') nav.navigate('Video', { item: f });
    else if (f.kind === 'music') { const song = lib.songs.find((s) => s.id === f.id); if (song) pl.play(song); nav.navigate('Player'); }
    else nav.navigate('Pdf', { item: f });
  };
  const sub = (f: FileItem) => fmtFileSub(f);
  return (
    <Screen bg={4}>
      <HeaderBack title={title} sub={t('files.items', { count: items.length })} onBack={() => nav.goBack()} right={<Press onPress={() => { setMode(!mode); setSel(new Set()); }}><Text style={{ fontFamily: F.bodyB, color: C.accent, fontSize: 13 }}>{mode ? t('common.cancel') : t('files.select')}</Text></Press>} />
      <ScrollView contentContainerStyle={{ padding: 10, paddingBottom: 110 }}>
        {!items.length && <Text style={[T.body(), { textAlign: 'center', paddingTop: 40 }]}>{lib.perm === 'granted' ? t('lib.empty') : t('lib.grantSub')}</Text>}
        {!!items.length && <GlassCard padding={4}>{items.map((f) => <Row key={f.id} title={f.name} sub={sub(f)} left={<FileThumb f={f} />} onPress={() => open(f)} right={mode ? <View style={[st.chk, sel.has(f.id) && { backgroundColor: C.accent, borderColor: C.accent }]} /> : undefined} />)}</GlassCard>}
      </ScrollView>
      {mode && sel.size > 0 && <View style={{ position: 'absolute', left: 14, right: 14, bottom: 24 }}><GlassButton label={`${t('common.send')} (${sel.size})`} icon={Send} onPress={() => nav.navigate('Nearby', { files: items.filter((f) => sel.has(f.id)), mode: 'send' })} /></View>}
    </Screen>
  );
}

/* 18 — Galerie : chips Tout/Photos/Vidéos, grille 3 colonnes groupée par date, personnage à droite */
export function GalleryScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps();
  const lib = useLibrary();
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all'); const [q, setQ] = useState('');
  useEffect(() => { lib.ensure(); }, []);
  const items = useMemo(() => {
    const all = filter === 'all' ? [...lib.images, ...lib.videos] : filter === 'photos' ? lib.images : lib.videos;
    const sorted = [...all].sort((a, b) => b.date - a.date);
    return q ? sorted.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : sorted;
  }, [filter, q, lib.images, lib.videos]);
  const cell = (W - 16 - 6 * 2) / 3;
  const now = Date.now();
  const dayMs = 864e5;
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const groups = [
    { k: 'today', list: items.filter((f) => f.date >= startOfToday.getTime()) },
    { k: 'week', list: items.filter((f) => f.date < startOfToday.getTime() && f.date >= now - 7 * dayMs) },
    { k: 'older', list: items.filter((f) => f.date < now - 7 * dayMs) },
  ];
  return (
    <Screen bg={4}>
      <Header {...hp} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: NAV_H + 40 }}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1()}>{t('gallery.title')}</Text><Text style={T.lead()}>{items.length} {t('gallery.photos').toLowerCase()} & {t('gallery.videos').toLowerCase()}</Text></View>
          <Image source={IMG.galleryMascot} style={{ width: 120, height: 125 }} resizeMode="contain" />
        </FadeIn>
        <Search placeholder={t('gallery.search')} value={q} onChange={setQ} />
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>{(['all', 'photos', 'videos'] as const).map((k) => <Chip key={k} label={t(`gallery.${k}`)} active={filter === k} onPress={() => setFilter(k)} />)}</View>
        {!items.length && <Text style={[T.body(), { textAlign: 'center', paddingTop: 24 }]}>{lib.perm === 'granted' ? t('lib.empty') : t('lib.grantSub')}</Text>}
        {groups.map((g) => g.list.length > 0 && (
          <View key={g.k} style={{ marginBottom: 10 }}>
            <Text style={[T.cardT(), { marginBottom: 6, marginLeft: 2 }]}>{g.k === 'older' ? t('lib.older') : t(`gallery.${g.k}`)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {g.list.map((f, i) => (
                <Press key={f.id} scale={0.95} onPress={() => f.kind === 'video' ? nav.navigate('Video', { item: f }) : nav.navigate('Viewer', { items: items.filter((x) => x.kind === 'photo'), index: items.filter((x) => x.kind === 'photo').indexOf(f) })}>
                  <View style={{ width: cell, height: cell, borderRadius: 12, overflow: 'hidden' }}>
                    <LinearGradient colors={[`hsl(${200 + (i * 17) % 50}, 85%, 70%)`, `hsl(${215 + (i * 11) % 40}, 80%, 50%)`]} style={StyleSheet.absoluteFill} />
                    <PhImage uri={f.uri} style={StyleSheet.absoluteFill as any} contentFit="cover" />
                    {f.kind === 'video' && !!f.duration && <View style={st.vidBadge}><Play size={10} color="#fff" fill="#fff" /><Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyB }}>{fmtDur(f.duration)}</Text></View>}
                  </View>
                </Press>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}
/* 19 — Visionneuse façon Photos : pager horizontal, fond noir, barre d'actions (Partager / Favori / Infos / Supprimer) qui se cache au tap */
export function ViewerScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { items, index } = route.params as { items: FileItem[]; index: number };
  const [i, setI] = useState(Math.max(0, index)); const [ui, setUi] = useState(true); const [fav, setFav] = useState(false);
  const op = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.timing(op, { toValue: ui ? 1 : 0, duration: 200, useNativeDriver: true }).start(); }, [ui]);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList data={items} horizontal pagingEnabled initialScrollIndex={i} getItemLayout={(_, k) => ({ length: W, offset: W * k, index: k })} keyExtractor={(f) => f.id} onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))} showsHorizontalScrollIndicator={false}
        renderItem={({ item, index: k }) => <Press onPress={() => setUi(!ui)} scale={1}><View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}><LinearGradient colors={[`hsl(${200 + (k * 17) % 50}, 85%, 70%)`, `hsl(${215 + (k * 11) % 40}, 80%, 45%)`]} style={{ width: W, height: W * 1.25, borderRadius: 4 }} /><PhImage uri={item.uri} direct style={{ width: W, height: W * 1.25, borderRadius: 4 } as any} contentFit="contain" /></View></Press>} />
      <Animated.View style={[st.viewerTop, { opacity: op }]} pointerEvents={ui ? 'auto' : 'none'}>
        <IconButton icon={ChevronLeft} deep onPress={() => nav.goBack()} />
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: '#fff', fontFamily: F.bodyB }}>{items[i]?.name}</Text><Text style={{ color: 'rgba(255,255,255,.7)', fontFamily: F.body, fontSize: 12 }}>{[`${i + 1} / ${items.length}`, fmtFileSub(items[i])].filter(Boolean).join(' • ')}</Text></View>
        <View style={{ width: 40 }} />
      </Animated.View>
      <Animated.View style={[st.viewerBar, { opacity: op }]} pointerEvents={ui ? 'auto' : 'none'}>
        {[{ i: Share2, a: () => {} }, { i: Heart, a: () => setFav(!fav), on: fav }, { i: Info, a: () => {} }, { i: Trash2, a: () => nav.goBack() }].map((b, k) => <Press key={k} onPress={b.a} hit={8}><b.i size={24} color={b.on ? '#FF5A8A' : '#fff'} fill={b.on ? '#FF5A8A' : 'none'} /></Press>)}
      </Animated.View>
    </View>
  );
}
/* 20 — Lecteur vidéo (expo-video réel ; commandes vitrées) */
export function VideoScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { item } = route.params as { item: FileItem };
  const player = useVideoPlayer(null, (p) => { p.loop = false; });
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState({ pos: 0, dur: item.duration ?? 0, playing: false, err: false });
  useEffect(() => {
    let alive = true;
    resolveMediaUri(item.uri).then((u) => {
      if (!alive) return;
      if (!u) { setState((s) => ({ ...s, err: true })); return; }
      setSrc(u);
      player.replaceAsync(u).catch(() => setState((s) => ({ ...s, err: true })));
    }).catch(() => setState((s) => ({ ...s, err: true })));
    return () => { alive = false; };
  }, [item.uri]);
  useEffect(() => {
    const iv = setInterval(() => {
      setState((s) => {
        const pos = player.currentTime ?? 0;
        const dur = player.duration || s.dur;
        if (player.status === 'error') return { ...s, err: true };
        if (dur > 0 && pos >= dur - 0.4 && player.playing) return { ...s, pos: 0, dur, playing: false };
        return { ...s, pos, dur, playing: player.playing };
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);
  const seek = (delta: number) => { const v = Math.max(0, Math.min(state.dur || item.duration || 0, state.pos + delta)); player.currentTime = v; setState((s) => ({ ...s, pos: v })); };
  const dur = state.dur || item.duration || 1;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {src && !state.err ? (
          <VideoView player={player} style={{ width: W, height: W * 0.56 }} contentFit="contain" nativeControls={false} allowsPictureInPicture />
        ) : (
          <LinearGradient colors={['#2E90FA', '#0B52DE']} style={{ width: W, height: W * 0.56, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,.9)', fontFamily: F.bodyB, fontSize: 13, paddingHorizontal: 20, textAlign: 'center' }}>{state.err ? t('lib.mediaErr') : item.name}</Text>
          </LinearGradient>
        )}
      </View>
      <View style={st.viewerTop}><IconButton icon={ChevronLeft} deep onPress={() => nav.goBack()} /><Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontFamily: F.bodyB }}>{item.name}</Text><View style={{ width: 40 }} /></View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 40 }}>
        <GlassCard deep padding={14}>
          <View style={st.track}><View style={[st.fill, { width: `${Math.min(100, (state.pos / dur) * 100)}%` }]} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}><Text style={T.body(true)}>{fmtDur(state.pos)}</Text><Text style={T.body(true)}>{fmtDur(dur)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 26, marginTop: 8 }}>
            <Press onPress={() => seek(-10)}><SkipBack size={26} color="#fff" /></Press>
            <Press onPress={() => (state.playing ? player.pause() : player.play())}><View style={st.playBig}>{state.playing ? <Pause size={26} color={C.ink} fill={C.ink} /> : <Play size={26} color={C.ink} fill={C.ink} />}</View></Press>
            <Press onPress={() => seek(10)}><SkipForward size={26} color="#fff" /></Press>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}
/* PDF — react-native-pdf sur le fichier réel (sandbox ou asset résolu) */
export function PdfScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { item } = route.params as { item: FileItem };
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [page, setPage] = useState(1); const [pages, setPages] = useState(0);
  useEffect(() => {
    let alive = true;
    resolveMediaUri(item.uri).then((u) => { if (!alive) return; if (u) setSrc(u); else setErr(true); }).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [item.uri]);
  return (
    <Screen bg={4}>
      <HeaderBack title={item.name} sub={pages ? t('pdf.page', { n: page, total: pages }) : t('pdf.title')} onBack={() => nav.goBack()} compact />
      <View style={{ flex: 1, margin: 10, borderRadius: R.card, overflow: 'hidden', backgroundColor: '#fff' }}>
        {src && !err ? (
          <Pdf source={{ uri: src, cache: true }} style={{ flex: 1 }} fitPolicy={0}
            onLoadComplete={(n) => setPages(n)} onPageChanged={(p, n) => { setPage(p); setPages(n); }}
            onError={() => setErr(true)} enableAntialiasing />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <FileText size={40} color={C.mute} />
            <Text style={[T.body(), { textAlign: 'center', marginTop: 10 }]}>{err ? t('lib.pdfErr') : t('lib.loading')}</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

/* 21 — Musique (fond foncé) : recherche, bloc Musique récente, bloc Toutes les musiques, mini-lecteur ; 22 — Lecteur plein écran ; 22b — aperçu widget lock-screen */
export const PlayerCtx = React.createContext<{ song: Song | null; playing: boolean; pos: number; dur: number; play: (s: Song) => void; toggle: () => void; next: () => void; prev: () => void } | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { songs } = useLibrary();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [song, setSong] = useState<Song | null>(null);
  const modeRef = useRef(false);
  useEffect(() => {
    if (modeRef.current) return;
    modeRef.current = true;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);
  const play = (s: Song) => {
    setSong(s);
    const raw = s.uri ?? s.id;
    if (!raw) return;
    resolveMediaUri(raw)
      .catch(() => null)
      .then((u) => {
        try { player.replace(u ?? raw); player.play(); } catch { /* audio média iOS non résoluble : on garde l'état UI */ }
        try { player.setActiveForLockScreen(true, { title: s.title, artist: s.artist || undefined }); } catch { /* lock-screen non supporté */ }
      });
  };
  const idx = song ? songs.findIndex((s) => s.id === song.id) : -1;
  const next = () => { if (!songs.length) return; play(songs[(idx + 1) % songs.length]); };
  const prev = () => { if (!songs.length) return; play(songs[(idx - 1 + songs.length) % songs.length]); };
  const done = status.didJustFinish;
  useEffect(() => { if (done) next(); }, [done]);
  const toggle = () => { if (!song) return; if (status.playing) player.pause(); else player.play(); };
  return <PlayerCtx.Provider value={{ song, playing: !!status.playing && !!song, pos: Math.floor(status.currentTime || 0), dur: status.duration || 0, play, toggle, next, prev }}>{children}</PlayerCtx.Provider>;
}
export const usePlayer = () => { const v = React.useContext(PlayerCtx); if (!v) throw new Error('PlayerProvider'); return v; };
const Cover = ({ s, size = 44 }: { s: Song; size?: number }) => <LinearGradient colors={[`hsl(${(s.id.charCodeAt(1) * 47) % 360}, 75%, 65%)`, `hsl(${(s.id.charCodeAt(1) * 47 + 40) % 360}, 80%, 45%)`]} style={{ width: size, height: size, borderRadius: size * 0.25, alignItems: 'center', justifyContent: 'center' }}><Music size={size * 0.45} color="rgba(255,255,255,.9)" /></LinearGradient>;

export function MusicScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps(); const pl = usePlayer();
  const lib = useLibrary();
  const [q, setQ] = useState(''); const [widget, setWidget] = useState(false);
  useEffect(() => { lib.ensure(); }, []);
  const list = lib.songs.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  const recent = list.slice(0, 4);
  const songSub = (s: Song) => [s.artist, s.duration > 0 ? fmtDur(s.duration) : ''].filter(Boolean).join(' • ');
  return (
    <Screen bg={1}>
      <Header {...hp} deep />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: NAV_H + 110 }}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1(true)}>{t('music.title')}</Text><Text style={T.lead(true)}>{t('music.count', { count: lib.songs.length })}</Text></View>
          <Image source={IMG.musicMascot} style={{ width: 115, height: 120 }} resizeMode="contain" />
        </FadeIn>
        <Search deep placeholder={t('music.search')} value={q} onChange={setQ} style={{ marginTop: 4 }} />
        {!lib.songs.length && (
          <GlassCard deep style={{ marginTop: 12 }}>
            <Text style={[T.body(true), { textAlign: 'center', paddingVertical: 8 }]}>{lib.perm === 'granted' ? t('lib.empty') : t('lib.grantSub')}</Text>
          </GlassCard>
        )}
        {!!recent.length && (
          <GlassCard deep padding={10} style={{ marginTop: 12 }}>
            <SectionTitle deep title={t('music.recent')} action={t('music.lockDemo')} onAction={() => setWidget(true)} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>{recent.map((s) => <Press key={s.id} onPress={() => pl.play(s)} style={{ width: 96 }}><Cover s={s} size={96} /><Text style={[T.strong(true), { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>{s.title}</Text><Text style={[T.body(true), { fontSize: 11 }]} numberOfLines={1}>{s.artist}</Text></Press>)}</ScrollView>
          </GlassCard>
        )}
        {!!list.length && (
          <GlassCard deep padding={6} style={{ marginTop: 10 }}>
            <View style={{ paddingHorizontal: 6, paddingTop: 4 }}><SectionTitle deep title={t('music.all')} /></View>
            {list.map((s) => <Row key={s.id} deep tight title={s.title} sub={songSub(s)} left={<Cover s={s} />} onPress={() => pl.play(s)} right={pl.song?.id === s.id ? <Bars /> : s.fav ? <Heart size={16} color="#FF7AA2" fill="#FF7AA2" /> : <View style={{ width: 16 }} />} />)}
          </GlassCard>
        )}
      </ScrollView>
      {pl.song && <MiniPlayer onOpen={() => nav.navigate('Player')} />}
      <Modal visible={widget} transparent animationType="fade" onRequestClose={() => setWidget(false)}><LockWidgetPreview onClose={() => setWidget(false)} /></Modal>
    </Screen>
  );
}
function Bars() {
  const vs = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => { const ls = vs.map((v, i) => Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 300 + i * 90, useNativeDriver: false }), Animated.timing(v, { toValue: 0.3, duration: 300 + i * 70, useNativeDriver: false })]))); ls.forEach((l) => l.start()); return () => ls.forEach((l) => l.stop()); }, []);
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 16 }}>{vs.map((v, i) => <Animated.View key={i} style={{ width: 3, borderRadius: 2, backgroundColor: C.glow, height: v.interpolate({ inputRange: [0, 1], outputRange: [4, 16] }) }} />)}</View>;
}
/* Mini-lecteur au-dessus de la barre du bas */
export function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const pl = usePlayer(); if (!pl.song) return null;
  const dur = pl.dur || pl.song.duration || 1;
  return (
    <View style={{ position: 'absolute', left: 14, right: 14, bottom: NAV_H + 26 }}>
      <Press onPress={onOpen}>
        <GlassCard deep padding={8} radius={R.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Cover s={pl.song} size={40} />
            <View style={{ flex: 1 }}><Text style={T.strong(true)} numberOfLines={1}>{pl.song.title}</Text><Text style={T.body(true)} numberOfLines={1}>{pl.song.artist}</Text></View>
            <Press onPress={pl.toggle} hit={8}>{pl.playing ? <Pause size={24} color="#fff" fill="#fff" /> : <Play size={24} color="#fff" fill="#fff" />}</Press>
            <Press onPress={pl.next} hit={8}><SkipForward size={22} color="#fff" /></Press>
          </View>
          <View style={[st.track, { height: 3, marginTop: 8, backgroundColor: 'rgba(255,255,255,.25)' }]}><View style={[st.fill, { width: `${Math.min(100, (pl.pos / dur) * 100)}%`, backgroundColor: '#fff' }]} /></View>
        </GlassCard>
      </Press>
    </View>
  );
}
/* 22 — Lecteur plein écran : pochette, titre, barre de progression + minutes lisibles, commandes SOUS la barre */
export function PlayerScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const pl = usePlayer();
  const { songs } = useLibrary();
  useEffect(() => { if (!pl.song && songs.length) pl.play(songs[0]); }, [songs.length]);
  const s = pl.song ?? songs[0] ?? null;
  if (!s) return (
    <Screen bg={1}>
      <HeaderBack deep title={t('music.nowPlaying')} onBack={() => nav.goBack()} />
      <Text style={[T.body(true), { textAlign: 'center', paddingTop: 40 }]}>{t('lib.empty')}</Text>
    </Screen>
  );
  const dur = pl.dur || s.duration || 1;
  return (
    <Screen bg={1}>
      <HeaderBack deep title={t('music.nowPlaying')} onBack={() => nav.goBack()} />
      <View style={{ flex: 1, alignItems: 'center', padding: S.pad }}>
        <FadeIn><View style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12 }}><Cover s={s} size={W * 0.7} /></View></FadeIn>
        <Text style={[T.h1(true), { fontSize: 24, marginTop: 24 }]}>{s.title}</Text>
        {!!s.artist && <Text style={T.lead(true)}>{s.artist}</Text>}
        <GlassCard deep padding={14} style={{ alignSelf: 'stretch', marginTop: 22 }}>
          <View style={[st.track, { backgroundColor: 'rgba(255,255,255,.3)' }]}><View style={[st.fill, { width: `${Math.min(100, (pl.pos / dur) * 100)}%`, backgroundColor: '#fff' }]} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={[T.strong(true), { fontSize: 13 }]}>{fmtDur(pl.pos)}</Text><Text style={[T.strong(true), { fontSize: 13 }]}>-{fmtDur(Math.max(0, dur - pl.pos))}</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 6 }}>
            <Press hit={8}><Shuffle size={20} color="rgba(255,255,255,.8)" /></Press>
            <Press onPress={pl.prev} hit={8}><SkipBack size={30} color="#fff" fill="#fff" /></Press>
            <Press onPress={pl.toggle}><View style={st.playBig}>{pl.playing ? <Pause size={30} color={C.ink} fill={C.ink} /> : <Play size={30} color={C.ink} fill={C.ink} />}</View></Press>
            <Press onPress={pl.next} hit={8}><SkipForward size={30} color="#fff" fill="#fff" /></Press>
            <Press hit={8}><Repeat size={20} color="rgba(255,255,255,.8)" /></Press>
          </View>
        </GlassCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', marginTop: 18 }}><Volume2 size={16} color="#fff" /><View style={[st.track, { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,.3)' }]}><View style={[st.fill, { width: '65%', backgroundColor: '#fff' }]} /></View></View>
      </View>
    </Screen>
  );
}
/* 22b — Aperçu du widget écran verrouillé / centre de contrôle (pochette, titre, progression, commandes). En production : expo-audio + métadonnées Now Playing (voir README). */
function LockWidgetPreview({ onClose }: { onClose: () => void }) {
  const pl = usePlayer(); const { t } = useTranslation(); const s = pl.song;
  if (!s) return null;
  const dur = pl.dur || s.duration || 1;
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'center', padding: 24 }}>
      <Press onPress={onClose} style={StyleSheet.absoluteFill} scale={1}><View /></Press>
      <Text style={{ color: '#fff', fontFamily: F.title, fontSize: 56, textAlign: 'center' }}>{new Date().toTimeString().slice(0, 5)}</Text>
      <View style={{ borderRadius: 26, overflow: 'hidden', marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' }}>
        <LinearGradient colors={['rgba(255,255,255,.28)', 'rgba(255,255,255,.14)']} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Cover s={s} size={56} /><View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: F.bodyX, fontSize: 16 }}>{s.title}</Text><Text style={{ color: 'rgba(255,255,255,.8)', fontFamily: F.body }}>{[s.artist, 'Fylio'].filter(Boolean).join(' — ')}</Text></View></View>
          <View style={[st.track, { height: 5, marginTop: 12, backgroundColor: 'rgba(255,255,255,.3)' }]}><View style={[st.fill, { width: `${Math.min(100, (pl.pos / dur) * 100)}%`, backgroundColor: '#fff' }]} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#fff', fontSize: 12, fontFamily: F.bodyB }}>{fmtDur(pl.pos)}</Text><Text style={{ color: '#fff', fontSize: 12, fontFamily: F.bodyB }}>-{fmtDur(Math.max(0, dur - pl.pos))}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 36, marginTop: 10 }}>
            <Press onPress={pl.prev}><SkipBack size={28} color="#fff" fill="#fff" /></Press>
            <Press onPress={pl.toggle}>{pl.playing ? <Pause size={34} color="#fff" fill="#fff" /> : <Play size={34} color="#fff" fill="#fff" />}</Press>
            <Press onPress={pl.next}><SkipForward size={28} color="#fff" fill="#fff" /></Press>
          </View>
        </LinearGradient>
      </View>
      <Text style={{ color: 'rgba(255,255,255,.75)', fontFamily: F.body, fontSize: 12, textAlign: 'center', marginTop: 16 }}>{t('music.lockHint')}</Text>
    </View>
  );
}

/* 23 — Navigateur Internet : barre d'adresse vitrée, WebView réelle, retour/avant/recharger, onglets, favoris */
export function BrowserScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const [url, setUrl] = useState(route.params?.url ?? 'https://www.google.com'); const [input, setInput] = useState(url); const [prog, setProg] = useState(0);
  const web = useRef<WebView>(null); const [canBack, setCanBack] = useState(false); const [canFwd, setCanFwd] = useState(false);
  const go = () => { let u = input.trim(); if (!/^https?:\/\//.test(u)) u = u.includes('.') && !u.includes(' ') ? 'https://' + u : 'https://www.google.com/search?q=' + encodeURIComponent(u); setUrl(u); };
  return (
    <Screen bg={4}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 6 }}>
        <IconButton icon={ChevronLeft} onPress={() => nav.goBack()} />
        <GlassCard padding={0} radius={R.pill} style={{ flex: 1, height: 42 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}><Lock size={14} color={C.green} /><TextInput value={input} onChangeText={setInput} onSubmitEditing={go} onFocus={() => setInput('')} onBlur={() => !input && setInput(url)} autoCapitalize="none" keyboardType="url" returnKeyType="go" placeholder={t('browser.placeholder')} placeholderTextColor={C.mute} style={{ flex: 1, fontFamily: F.body, fontSize: 13, color: C.ink, paddingVertical: 0 }} /><Press onPress={() => web.current?.reload()} hit={6}><RotateCw size={15} color={C.mute} /></Press></View>
        </GlassCard>
        <IconButton icon={Plus} onPress={() => { setUrl('https://www.google.com'); setInput(''); }} />
      </View>
      {prog > 0 && prog < 1 && <View style={{ height: 3, marginHorizontal: 10, marginTop: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.4)' }}><View style={{ width: `${prog * 100}%`, height: '100%', backgroundColor: C.accent }} /></View>}
      <View style={{ flex: 1, margin: 10, marginBottom: 86, borderRadius: R.card, overflow: 'hidden', backgroundColor: '#fff' }}>
        <WebView ref={web} source={{ uri: url }} style={{ flex: 1 }} onLoadProgress={(e) => setProg(e.nativeEvent.progress)} onNavigationStateChange={(st) => { setCanBack(st.canGoBack); setCanFwd(st.canGoForward); if (st.url) setInput(st.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40)); }} />
      </View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 24 }}>
        <GlassCard padding={8} radius={R.nav}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
            <Press onPress={() => canBack && web.current?.goBack()} hit={8}><ChevronLeft size={24} color={canBack ? C.ink : C.mute} /></Press>
            <Press onPress={() => canFwd && web.current?.goForward()} hit={8}><ChevronRight size={24} color={canFwd ? C.ink : C.mute} /></Press>
            <Press hit={8}><Bookmark size={22} color={C.ink} /></Press>
            <Press hit={8}><Download size={22} color={C.ink} /></Press>
            <Press hit={8}><View style={st.tabsBadge}><Text style={{ fontFamily: F.bodyX, fontSize: 12, color: C.ink }}>1</Text></View></Press>
          </View>
        </GlassCard>
      </View>
    </Screen>
  );
}
export { Globe, Dimensions };
const st = StyleSheet.create({
  folderIco: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chk: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.mute },
  vidBadge: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,.45)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  viewerTop: { position: 'absolute', top: 48, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewerBar: { position: 'absolute', bottom: 34, left: 24, right: 24, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.35)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.glow },
  playBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  tabsBadge: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
});