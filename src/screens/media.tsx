/** 16 Fichiers, 17 Dossier, 18 Galerie, 19 Visionneuse façon Photos, 20 Vidéo, 21 Musique (+ widget lock-screen), 22 Lecteur plein écran, PDF, 23 Navigateur. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, FlatList, Dimensions, TextInput, Modal, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import Pdf from 'react-native-pdf';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Folder, Image as ImgIco, Video, Music, FileText, Download, Inbox, Play, Pause, SkipBack, SkipForward, Heart, Share2, Trash2, Info, X, ChevronLeft, ChevronRight, Globe, Lock, RotateCw, Plus, Bookmark, Volume2, VolumeX, Repeat, Shuffle, Send, ShieldCheck, FolderPlus } from 'lucide-react-native';
import { Screen, Header, HeaderBack, GlassCard, GlassButton, GhostButton, Press, Search, Chip, T, SectionTitle, FadeIn, W, H, Row, IconButton, useScrollHide } from '../ui';
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
  const hs = useScrollHide();
  const doImport = async () => { setImporting(true); try { await lib.importDocs(); } finally { setImporting(false); } };
  return (
    <Screen bg={4}>
      <Animated.View style={hs.wrap}><Header {...hp} /></Animated.View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.padTight + 4, paddingBottom: NAV_H + 40 }} onScroll={hs.onScroll} scrollEventThrottle={16}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1()}>{t('files.title')}</Text><Text style={T.lead()}>{t('files.subtitle')}</Text></View>
          <Image source={IMG.filesMascot} style={{ width: 130, height: 130, flexShrink: 0, marginBottom: 2, marginRight: 4 }} resizeMode="contain" />
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
  const hs = useScrollHide();
  const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
  const groups = [
    { k: 'today', list: items.filter((f) => f.date >= startOfToday.getTime()) },
    { k: 'week', list: items.filter((f) => f.date < startOfToday.getTime() && f.date >= now - 7 * dayMs) },
    { k: 'older', list: items.filter((f) => f.date < now - 7 * dayMs) },
  ];
  return (
    <Screen bg={4}>
      <Animated.View style={hs.wrap}><Header {...hp} /></Animated.View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: NAV_H + 40 }} onScroll={hs.onScroll} scrollEventThrottle={16}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1()}>{t('gallery.title')}</Text><Text style={T.lead()}>{items.length} {t('gallery.photos').toLowerCase()} & {t('gallery.videos').toLowerCase()}</Text></View>
          <Image source={IMG.galleryMascot} style={{ width: 150, height: 146, flexShrink: 0, marginBottom: 2, marginRight: 4 }} resizeMode="contain" />
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
        renderItem={({ item }) => <Press onPress={() => setUi(!ui)} scale={1}><View style={{ width: W, height: H, paddingTop: 104, paddingBottom: 116, backgroundColor: '#000' }}><PhImage uri={item.uri} direct style={{ width: '100%', height: '100%' } as any} contentFit="contain" /></View></Press>} />
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
/* 20 — Lecteur vidéo : expo-video réel (autoplay après chargement, barre cliquable, mute, états loading/erreur) */
export function VideoScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { item } = route.params as { item: FileItem };
  const player = useVideoPlayer(null, (p) => { p.loop = false; p.timeUpdateEventInterval = 0.5; });
  const [state, setState] = useState({ pos: 0, dur: item.duration ?? 0, playing: false, loading: true, err: false });
  const [muted, setMuted] = useState(false);
  const [trackW, setTrackW] = useState(1);
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, err: false }));
    resolveMediaUri(item.uri)
      .then((u) => { if (!alive) return; if (!u) throw new Error('uri'); return player.replaceAsync(u).then(() => { if (alive) player.play(); }); })
      .catch(() => { if (alive) setState((s) => ({ ...s, err: true, loading: false })); });
    return () => { alive = false; };
  }, [item.uri]);
  useEffect(() => {
    const subs: any[] = [];
    try {
      subs.push(player.addListener('timeUpdate', (e: any) => {
        setState((s) => ({ ...s, pos: e.currentTime ?? 0, dur: player.duration || s.dur, playing: player.playing }));
      }));
      subs.push(player.addListener('statusChange', (e: any) => {
        const stt: string = e?.status ?? player.status;
        setState((s) => ({ ...s, err: stt === 'error', loading: stt === 'loading', dur: player.duration || s.dur, playing: player.playing }));
      }));
      subs.push(player.addListener('playToEnd', () => setState((s) => ({ ...s, pos: 0, playing: false }))));
    } catch { /* listeners indisponibles : l'état reste piloté par la lecture directe */ }
    return () => subs.forEach((x) => { try { x?.remove?.(); } catch { /* déjà relâché */ } });
  }, []);
  const seekTo = (v: number) => { const d = stateRef.current.dur || player.duration || 0; const nv = Math.max(0, Math.min(d || 1e9, v)); player.currentTime = nv; setState((s) => ({ ...s, pos: nv })); };
  const seek = (delta: number) => seekTo(stateRef.current.pos + delta);
  const toggle = () => { if (state.playing) player.pause(); else player.play(); };
  const toggleMute = () => { const m = !muted; try { player.muted = m; } catch { /* iOS: réglage non dispo */ } setMuted(m); };
  const dur = state.dur || item.duration || 1;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1 }}>
        {!state.err && <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} allowsPictureInPicture />}
        {state.err && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 30 }}>
            <Video size={42} color="rgba(255,255,255,.55)" />
            <Text style={{ color: 'rgba(255,255,255,.85)', fontFamily: F.bodyB, fontSize: 13, textAlign: 'center' }}>{t('lib.mediaErr')}</Text>
            <Text style={{ color: 'rgba(255,255,255,.55)', fontFamily: F.body, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>{item.name}</Text>
          </View>
        )}
        {state.loading && !state.err && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
      <View style={st.viewerTop}><IconButton icon={ChevronLeft} deep onPress={() => nav.goBack()} /><Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontFamily: F.bodyB }} numberOfLines={1}>{item.name}</Text><View style={{ width: 40 }} /></View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 40 }}>
        <GlassCard deep padding={14}>
          <Pressable onPress={(e) => seekTo((e.nativeEvent.locationX / Math.max(1, trackW)) * dur)} style={{ paddingVertical: 6 }}>
            <View onLayout={(e) => setTrackW(e.nativeEvent.layout.width)} style={st.track}>
              <View style={[st.fill, { width: `${Math.min(100, (state.pos / dur) * 100)}%` }]} />
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}><Text style={T.body(true)}>{fmtDur(state.pos)}</Text><Text style={T.body(true)}>{fmtDur(dur)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginTop: 8 }}>
            <Press onPress={toggleMute} hit={8}>{muted ? <VolumeX size={20} color={muted ? '#FF7AA2' : 'rgba(255,255,255,.8)'} /> : <Volume2 size={20} color="rgba(255,255,255,.85)" />}</Press>
            <Press onPress={() => seek(-10)}><SkipBack size={26} color="#fff" /></Press>
            <Press onPress={toggle}><View style={st.playBig}>{state.playing ? <Pause size={26} color={C.ink} fill={C.ink} /> : <Play size={26} color={C.ink} fill={C.ink} />}</View></Press>
            <Press onPress={() => seek(10)}><SkipForward size={26} color="#fff" /></Press>
            <View style={{ width: 20 }} />
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
  const hs = useScrollHide();
  useEffect(() => { lib.ensure(); }, []);
  const list = lib.songs.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  const recent = list.slice(0, 4);
  const songSub = (s: Song) => [s.artist, s.duration > 0 ? fmtDur(s.duration) : ''].filter(Boolean).join(' • ');
  return (
    <Screen bg={1}>
      <Animated.View style={hs.wrap}><Header {...hp} deep /></Animated.View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: NAV_H + 110 }} onScroll={hs.onScroll} scrollEventThrottle={16}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1(true)}>{t('music.title')}</Text><Text style={T.lead(true)}>{t('music.count', { count: lib.songs.length })}</Text></View>
          <Image source={IMG.musicMascot} style={{ width: 146, height: 150, flexShrink: 0, marginBottom: 2, marginRight: 4 }} resizeMode="contain" />
        </FadeIn>
        <Search deep placeholder={t('music.search')} value={q} onChange={setQ} style={{ marginTop: 4 }} />
        {!lib.songs.length && (
          <GlassCard deep style={{ marginTop: 12 }}>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text style={[T.body(true), { textAlign: 'center' }]}>{lib.perm === 'granted' ? t('lib.empty') : t('lib.grantSub')}</Text>
              <View style={{ marginTop: 12, alignSelf: 'stretch' }}>
                <GhostButton deep small label={lib.perm === 'granted' ? t('lib.import') : t('lib.grantBtn')} icon={lib.perm === 'granted' ? Plus : undefined} onPress={() => { if (lib.perm === 'granted') { lib.importDocs(); } else { lib.ask(); } }} />
              </View>
            </View>
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

/* 23 — Navigateur plein écran façon Chrome : barre d'adresse complète en haut, page Web sur TOUTE la surface,
   barre du bas (retour / avant / nouvel onglet / compteur d'onglets) + gestionnaire d'onglets réels */
type BTab = { id: number; url: string; live: string; title: string };
const QUICK: [string, string][] = [['Google', 'https://www.google.com'], ['YouTube', 'https://m.youtube.com'], ['Wikipédia', 'https://m.wikipedia.org'], ['X', 'https://x.com']];
const shortUrl = (u: string) => (u ? u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : '');
export function BrowserScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const ins = useSafeAreaInsets();
  const start = route.params?.url ?? '';
  const [tabs, setTabs] = useState<BTab[]>([{ id: 1, url: start, live: start, title: t('browser.newTab') }]);
  const [activeId, setActiveId] = useState(1);
  const idRef = useRef(1);
  const active = tabs.find((x) => x.id === activeId) ?? tabs[0];
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [prog, setProg] = useState(0);
  const [canBack, setCanBack] = useState(false);
  const [canFwd, setCanFwd] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const web = useRef<WebView>(null);
  const inputRef = useRef<TextInput>(null);
  const upd = (id: number, patch: Partial<BTab>) => setTabs((ts) => ts.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  useEffect(() => { setEditing(false); setProg(0); setCanBack(false); setCanFwd(false); }, [activeId]);
  const norm = (raw: string): string => {
    const u = raw.trim();
    if (!u) return '';
    if (/^https?:\/\//.test(u)) return u;
    if (u.includes('.') && !u.includes(' ')) return 'https://' + u;
    return 'https://www.google.com/search?q=' + encodeURIComponent(u);
  };
  const go = () => {
    const u = norm(input);
    Keyboard.dismiss(); setEditing(false);
    if (!u) return;
    if (u === active.url) { try { web.current?.reload(); } catch { /* non chargé */ } return; }
    setProg(0.05); upd(activeId, { url: u, live: u });
  };
  const newTab = () => { idRef.current += 1; const id = idRef.current; setTabs((ts) => [...ts, { id, url: '', live: '', title: t('browser.newTab') }]); setActiveId(id); setShowTabs(false); };
  const closeTab = (id: number) => {
    const n = tabs.filter((x) => x.id !== id);
    if (!n.length) { nav.goBack(); return; }
    setTabs(n);
    if (id === activeId) setActiveId(n[n.length - 1].id);
  };
  const addr = editing ? input : shortUrl(active.live || active.url);
  return (
    <View style={{ flex: 1, backgroundColor: '#EAF2FE' }}>
      {/* barre supérieure — retour + barre d'adresse pleine largeur */}
      <View style={{ paddingTop: ins.top + 6, paddingHorizontal: 10, paddingBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton icon={ChevronLeft} onPress={() => nav.goBack()} />
          <View style={[st.browAddr, { flex: 1 }]}>
            <Lock size={14} color={active.url ? C.green : C.mute} />
            <TextInput
              ref={inputRef} value={addr} onChangeText={setInput}
              onFocus={() => { setEditing(true); setInput(''); }}
              onEndEditing={() => setEditing(false)}
              onSubmitEditing={go}
              placeholder={t('browser.placeholder')} placeholderTextColor={C.mute}
              autoCapitalize="none" autoCorrect={false} keyboardType="web-search" returnKeyType="go"
              selectTextOnFocus
              style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.ink, paddingVertical: 0 }} />
            {editing
              ? <Press hit={8} onPress={() => { setInput(''); inputRef.current?.focus(); }}><X size={16} color={C.mute} /></Press>
              : <Press hit={8} onPress={() => { if (active.url) { try { web.current?.reload(); } catch { /* ignore */ } } }}><RotateCw size={16} color={C.mute} /></Press>}
          </View>
        </View>
        {prog > 0 && prog < 1 && <View style={st.browProg}><View style={{ width: `${Math.min(100, prog * 100)}%`, height: '100%', backgroundColor: C.accent }} /></View>}
      </View>

      {/* page — occupe toute la surface restante */}
      <View style={{ flex: 1 }}>
        {active.url ? (
          <WebView
            key={activeId} ref={web} source={{ uri: active.url }}
            style={{ flex: 1, backgroundColor: 'transparent' }}
            originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback
            setSupportMultipleWindows={false}
            onLoadStart={() => setProg(0.05)}
            onLoadProgress={(e) => setProg(e.nativeEvent.progress)}
            onLoadEnd={(e) => { setProg(1); const u = e.nativeEvent?.url; if (u && u !== 'about:blank') upd(activeId, { live: u }); }}
            onNavigationStateChange={(st2) => {
              setCanBack(st2.canGoBack); setCanFwd(st2.canGoForward);
              if (st2.title) upd(activeId, { title: st2.title });
              if (!editing) { setInput(''); upd(activeId, { live: st2.url || active.live }); }
            }}
          />
        ) : (
          <View style={st.browHome}>
            <Image source={IMG.logoF} style={{ width: 96, height: 96, borderRadius: 24 }} />
            <Text style={{ fontFamily: F.title, fontSize: 22, color: C.ink }}>{t('browser.title')}</Text>
            <Press onPress={() => inputRef.current?.focus()} style={{ alignSelf: 'stretch' }}>
              <View style={st.browSearch}>
                <Globe size={16} color={C.mute} />
                <Text style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: C.mute }} numberOfLines={1}>{t('browser.placeholder')}</Text>
              </View>
            </Press>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
              {QUICK.map(([n, u]) => (
                <Press key={n} onPress={() => { setProg(0.05); upd(activeId, { url: u, live: u }); }}>
                  <View style={st.browLink}><Globe size={14} color={C.accent} /><Text style={{ fontFamily: F.bodyB, fontSize: 13, color: C.ink }}>{n}</Text></View>
                </Press>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* barre inférieure — chrome style Chrome */}
      <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: Math.max(ins.bottom, 10) }}>
        <View style={st.browBar}>
          <Press hit={8} onPress={() => { if (canBack) try { web.current?.goBack(); } catch { /* ignore */ } }}><ChevronLeft size={24} color={canBack ? C.ink : C.mute} /></Press>
          <Press hit={8} onPress={() => { if (canFwd) try { web.current?.goForward(); } catch { /* ignore */ } }}><ChevronRight size={24} color={canFwd ? C.ink : C.mute} /></Press>
          <Press hit={8} onPress={newTab}><Plus size={24} color={C.ink} /></Press>
          <Press hit={8} onPress={() => setShowTabs(true)} style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2.4, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: F.bodyX, fontSize: 12, color: C.ink }}>{tabs.length}</Text>
          </Press>
        </View>
      </View>

      {/* gestionnaire d'onglets réels */}
      <Modal visible={showTabs} animationType="fade" onRequestClose={() => setShowTabs(false)}>
        <View style={{ flex: 1, backgroundColor: '#0B2A6B' }}>
          <View style={{ paddingTop: ins.top + 10, paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontFamily: F.title, fontSize: 22 }}>{t('browser.tabs')}</Text>
            <Press hit={8} onPress={() => setShowTabs(false)}><X size={24} color="#fff" /></Press>
          </View>
          <FlatList data={tabs} numColumns={2} keyExtractor={(x) => String(x.id)} columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
            renderItem={({ item }) => (
              <Press style={{ flex: 1 }} onPress={() => { setActiveId(item.id); setShowTabs(false); }}>
                <View style={{ height: 176, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', borderWidth: item.id === activeId ? 2 : 1, borderColor: item.id === activeId ? C.accent : 'rgba(255,255,255,.25)' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(11,42,107,.1)' }}>
                    <Lock size={11} color={item.url ? C.green : C.mute} />
                    <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.body, fontSize: 11, color: C.mute }}>{shortUrl(item.live || item.url) || t('browser.newTab')}</Text>
                    <Press hit={6} onPress={() => closeTab(item.id)}><X size={14} color={C.mute} /></Press>
                  </View>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 }}>
                    <Image source={IMG.logoF} style={{ width: 34, height: 34, borderRadius: 9 }} />
                    <Text numberOfLines={2} style={{ fontFamily: F.bodyB, fontSize: 12, color: C.ink, textAlign: 'center' }}>{item.title || t('browser.newTab')}</Text>
                  </View>
                </View>
              </Press>
            )} />
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(ins.bottom, 14), flexDirection: 'row', gap: 10 }}>
            <Press onPress={newTab} style={{ flex: 1 }}>
              <View style={{ height: 48, borderRadius: 24, backgroundColor: C.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Plus size={18} color="#fff" /><Text style={{ fontFamily: F.bodyB, fontSize: 14, color: '#fff' }}>{t('browser.newTab')}</Text>
              </View>
            </Press>
            <Press onPress={() => { setTabs((ts) => ts.filter((x) => x.id === activeId)); setShowTabs(false); }}>
              <View style={{ height: 48, paddingHorizontal: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: F.bodyB, fontSize: 14, color: '#fff' }}>{t('common.close')}</Text>
              </View>
            </Press>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export { Globe, Dimensions };
const st = StyleSheet.create({
  folderIco: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chk: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.mute },
  vidBadge: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,.45)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  viewerTop: { position: 'absolute', top: 48, left: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingHorizontal: 4, borderRadius: 24, backgroundColor: 'rgba(0,0,0,.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  viewerBar: { position: 'absolute', bottom: 34, left: 24, right: 24, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.35)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: C.glow },
  playBig: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  browAddr: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(11,42,107,.14)', paddingHorizontal: 14, gap: 8 },
  browProg: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(11,42,107,.12)', marginTop: 6 },
  browHome: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 26, gap: 16 },
  browSearch: { height: 46, borderRadius: 23, backgroundColor: '#F1F6FF', borderWidth: 1, borderColor: 'rgba(11,42,107,.14)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  browLink: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#F1F6FF', borderWidth: 1, borderColor: 'rgba(11,42,107,.1)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  browBar: { height: 56, borderRadius: R.nav, backgroundColor: 'rgba(255,255,255,.75)', borderWidth: 1, borderColor: 'rgba(11,42,107,.14)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
});