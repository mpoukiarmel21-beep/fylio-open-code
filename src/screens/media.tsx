/** 16 Fichiers, 17 Dossier, 18 Galerie, 19 Visionneuse façon Photos, 20 Vidéo, 21 Musique (+ widget lock-screen), 22 Lecteur plein écran, PDF, 23 Navigateur. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, FlatList, Dimensions, TextInput, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Folder, Image as ImgIco, Video, Music, FileText, Download, Inbox, Play, Pause, SkipBack, SkipForward, Heart, Share2, Trash2, Info, X, ChevronLeft, ChevronRight, Globe, Lock, RotateCw, Plus, Bookmark, Volume2, Repeat, Shuffle, Send } from 'lucide-react-native';
import { Screen, Header, HeaderBack, GlassCard, GlassButton, GhostButton, Press, Search, Chip, T, SectionTitle, FadeIn, W, H, Row, IconButton } from '../ui';
import { NAV_H } from '../ui/GlassNav';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { DEMO_FILES, DEMO_DOCS, DEMO_SONGS, FileItem, Song, fmtSize, fmtDur } from '../data/mock';
import { FileThumb } from './send';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;
const useHeaderProps = () => {
  const nav = useNavigation<Nav>(); const app = useApp();
  return { name: app.firstName || 'Chris', avatar: app.avatar >= 0 ? IMG.avatars[app.avatar] : IMG.avatars[0], hasNotif: app.notifs.some((n) => !n.read), onEdit: () => nav.navigate('Who', { fromSettings: true }), onBrowser: () => nav.navigate('Browser'), onNotifs: () => nav.navigate('Notifications'), onSettings: () => nav.navigate('Settings') };
};

/* 16 — Fichiers : recherche, 6 dossiers (2 colonnes), personnage dossiers */
export function FilesScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps();
  const [q, setQ] = useState('');
  const folders = [
    { k: 'images', i: ImgIco, c: '#5BB8FF', n: DEMO_FILES.filter((f) => f.kind === 'photo').length }, { k: 'videos', i: Video, c: '#8E8CFF', n: DEMO_FILES.filter((f) => f.kind === 'video').length },
    { k: 'docs', i: FileText, c: '#FFB357', n: DEMO_DOCS.length }, { k: 'music', i: Music, c: '#FF7AA2', n: DEMO_SONGS.length },
    { k: 'downloads', i: Download, c: '#38D39F', n: 3 }, { k: 'received', i: Inbox, c: '#2E90FA', n: 5 },
  ] as const;
  return (
    <Screen bg={4}>
      <Header {...hp} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: S.padTight + 4, paddingBottom: NAV_H + 40 }}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1()}>{t('files.title')}</Text><Text style={T.lead()}>{t('files.subtitle')}</Text></View>
          <Image source={IMG.filesMascot} style={{ width: 110, height: 110 }} resizeMode="contain" />
        </FadeIn>
        <Search placeholder={t('files.search')} value={q} onChange={setQ} style={{ marginTop: 6 }} />
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
  const { kind, title } = route.params as { kind: string; title: string };
  const items: FileItem[] = useMemo(() => kind === 'images' ? DEMO_FILES.filter((f) => f.kind === 'photo') : kind === 'videos' ? DEMO_FILES.filter((f) => f.kind === 'video') : kind === 'docs' ? DEMO_DOCS : kind === 'music' ? DEMO_SONGS.map((s) => ({ id: s.id, name: s.title + '.mp3', kind: 'music' as const, size: 4e6, date: Date.now(), duration: s.duration })) : DEMO_FILES.slice(0, 5), [kind]);
  const [sel, setSel] = useState<Set<string>>(new Set()); const [mode, setMode] = useState(false);
  const open = (f: FileItem, i: number) => {
    if (mode) { setSel((s) => { const n = new Set(s); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; }); return; }
    if (f.kind === 'photo') nav.navigate('Viewer', { items: items.filter((x) => x.kind === 'photo'), index: items.filter((x) => x.kind === 'photo').indexOf(f) });
    else if (f.kind === 'video') nav.navigate('Video', { item: f }); else if (f.kind === 'pdf') nav.navigate('Pdf', { item: f }); else if (f.kind === 'music') nav.navigate('Player'); else nav.navigate('Pdf', { item: f });
  };
  return (
    <Screen bg={4}>
      <HeaderBack title={title} sub={t('files.items', { count: items.length })} onBack={() => nav.goBack()} right={<Press onPress={() => { setMode(!mode); setSel(new Set()); }}><Text style={{ fontFamily: F.bodyB, color: C.accent, fontSize: 13 }}>{mode ? t('common.cancel') : t('files.select')}</Text></Press>} />
      <ScrollView contentContainerStyle={{ padding: 10, paddingBottom: 110 }}>
        <GlassCard padding={4}>{items.map((f, i) => <Row key={f.id} title={f.name} sub={`${fmtSize(f.size)}${f.duration ? ' • ' + fmtDur(f.duration) : ''}`} left={<FileThumb f={f} />} onPress={() => open(f, i)} right={mode ? <View style={[st.chk, sel.has(f.id) && { backgroundColor: C.accent, borderColor: C.accent }]} /> : undefined} />)}</GlassCard>
      </ScrollView>
      {mode && sel.size > 0 && <View style={{ position: 'absolute', left: 14, right: 14, bottom: 24 }}><GlassButton label={`${t('common.send')} (${sel.size})`} icon={Send} onPress={() => nav.navigate('Nearby', { files: items.filter((f) => sel.has(f.id)), mode: 'send' })} /></View>}
    </Screen>
  );
}

/* 18 — Galerie : chips Tout/Photos/Vidéos, grille 3 colonnes groupée par date, personnage à droite */
export function GalleryScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps();
  const [filter, setFilter] = useState<'all' | 'photos' | 'videos'>('all'); const [q, setQ] = useState('');
  const items = DEMO_FILES.filter((f) => filter === 'all' || (filter === 'photos' ? f.kind === 'photo' : f.kind === 'video'));
  const cell = (W - 16 - 6 * 2) / 3;
  const groups = [{ k: 'today', list: items.slice(0, 6) }, { k: 'week', list: items.slice(6) }];
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
        {groups.map((g) => g.list.length > 0 && (
          <View key={g.k} style={{ marginBottom: 10 }}>
            <Text style={[T.cardT(), { marginBottom: 6, marginLeft: 2 }]}>{t(`gallery.${g.k}`)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {g.list.map((f, i) => (
                <Press key={f.id} scale={0.95} onPress={() => f.kind === 'video' ? nav.navigate('Video', { item: f }) : nav.navigate('Viewer', { items: items.filter((x) => x.kind === 'photo'), index: items.filter((x) => x.kind === 'photo').indexOf(f) })}>
                  <View style={{ width: cell, height: cell, borderRadius: 12, overflow: 'hidden' }}>
                    <LinearGradient colors={[`hsl(${200 + (i * 17) % 50}, 85%, 70%)`, `hsl(${215 + (i * 11) % 40}, 80%, 50%)`]} style={StyleSheet.absoluteFill} />
                    {f.kind === 'video' && <View style={st.vidBadge}><Play size={10} color="#fff" fill="#fff" /><Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyB }}>0:{f.duration}</Text></View>}
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
        renderItem={({ item, index: k }) => <Press onPress={() => setUi(!ui)} scale={1}><View style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}><LinearGradient colors={[`hsl(${200 + (k * 17) % 50}, 85%, 70%)`, `hsl(${215 + (k * 11) % 40}, 80%, 45%)`]} style={{ width: W, height: W * 1.25, borderRadius: 4 }} /></View></Press>} />
      <Animated.View style={[st.viewerTop, { opacity: op }]} pointerEvents={ui ? 'auto' : 'none'}>
        <IconButton icon={ChevronLeft} deep onPress={() => nav.goBack()} />
        <View style={{ flex: 1, alignItems: 'center' }}><Text style={{ color: '#fff', fontFamily: F.bodyB }}>{items[i]?.name}</Text><Text style={{ color: 'rgba(255,255,255,.7)', fontFamily: F.body, fontSize: 12 }}>{i + 1} / {items.length} • {fmtSize(items[i]?.size ?? 0)}</Text></View>
        <View style={{ width: 40 }} />
      </Animated.View>
      <Animated.View style={[st.viewerBar, { opacity: op }]} pointerEvents={ui ? 'auto' : 'none'}>
        {[{ i: Share2, a: () => {} }, { i: Heart, a: () => setFav(!fav), on: fav }, { i: Info, a: () => {} }, { i: Trash2, a: () => nav.goBack() }].map((b, k) => <Press key={k} onPress={b.a} hit={8}><b.i size={24} color={b.on ? '#FF5A8A' : '#fff'} fill={b.on ? '#FF5A8A' : 'none'} /></Press>)}
      </Animated.View>
    </View>
  );
}
/* 20 - Lecteur video : expo-video reel (autoplay, progression reelle, seek, etats loading/erreur), commandes vitrees */
const SAMPLE_VIDEO = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
export function VideoScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { item } = route.params as { item: FileItem };
  const player = useVideoPlayer(SAMPLE_VIDEO, (p) => { p.loop = false; p.timeUpdateEventInterval = 0.5; });
  const [pos, setPos] = useState(0); const [dur, setDur] = useState(item.duration ?? 0);
  const [playing, setPlaying] = useState(false); const [loading, setLoading] = useState(true); const [err, setErr] = useState(false);
  const [trackW, setTrackW] = useState(1);
  useEffect(() => {
    const subs: any[] = [];
    try {
      subs.push(player.addListener('timeUpdate', (e: any) => { setPos(e.currentTime ?? 0); setDur(player.duration || dur); }));
      subs.push(player.addListener('statusChange', (e: any) => {
        const stt: string = e?.status ?? player.status;
        setLoading(stt === 'loading'); setErr(stt === 'error'); setPlaying(player.playing);
        if (stt === 'readyToPlay') { try { player.play(); } catch { /* lecture auto refusee */ } }
      }));
      subs.push(player.addListener('playToEnd', () => { setPlaying(false); setPos(0); }));
    } catch { /* listeners indisponibles : etats pilotes par les controles */ }
    return () => subs.forEach((s) => { try { s?.remove?.(); } catch { /* deja relache */ } });
  }, []);
  const seekTo = (v: number) => { const d = dur || player.duration || 0; const nv = Math.max(0, Math.min(d || 1e9, v)); try { player.currentTime = nv; } catch { /* seek non disponible */ } setPos(nv); };
  const toggle = () => { try { if (player.playing) player.pause(); else player.play(); } catch { /* lecture non disponible */ } };
  const total = dur || player.duration || item.duration || 1;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {!err && <VideoView player={player} style={{ width: W, height: W * 0.56 }} contentFit="contain" nativeControls={false} allowsPictureInPicture />}
        {err && (
          <View style={{ alignItems: 'center', gap: 10, paddingHorizontal: 30 }}>
            <Video size={42} color="rgba(255,255,255,.55)" />
            <Text style={{ color: 'rgba(255,255,255,.85)', fontFamily: F.bodyB, fontSize: 13, textAlign: 'center' }}>{t('video.err')}</Text>
            <Text style={{ color: 'rgba(255,255,255,.55)', fontFamily: F.body, fontSize: 12, textAlign: 'center' }} numberOfLines={2}>{item.name}</Text>
          </View>
        )}
        {loading && !err && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#fff" /></View>}
      </View>
      <View style={st.viewerTop}><IconButton icon={ChevronLeft} deep onPress={() => nav.goBack()} /><Text style={{ flex: 1, textAlign: 'center', color: '#fff', fontFamily: F.bodyB }} numberOfLines={1}>{item.name}</Text><View style={{ width: 40 }} /></View>
      <View style={{ position: 'absolute', left: 14, right: 14, bottom: 40 }}>
        <GlassCard deep padding={14}>
          <Pressable onPress={(e) => seekTo((e.nativeEvent.locationX / Math.max(1, trackW)) * total)} style={{ paddingVertical: 6 }}>
            <View onLayout={(e) => setTrackW(e.nativeEvent.layout.width)} style={st.track}><View style={[st.fill, { width: `${Math.min(100, (pos / total) * 100)}%` }]} /></View>
          </Pressable>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}><Text style={T.body(true)}>{fmtDur(pos)}</Text><Text style={T.body(true)}>{fmtDur(total)}</Text></View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 26, marginTop: 8 }}>
            <Press onPress={() => seekTo(pos - 10)}><SkipBack size={26} color="#fff" /></Press>
            <Press onPress={toggle}><View style={st.playBig}>{playing ? <Pause size={26} color={C.ink} fill={C.ink} /> : <Play size={26} color={C.ink} fill={C.ink} />}</View></Press>
            <Press onPress={() => seekTo(pos + 10)}><SkipForward size={26} color="#fff" /></Press>
          </View>
        </GlassCard>
      </View>
    </View>
  );
}/* PDF — WebView (Google Docs viewer pour une URL ; pour un fichier local : expo-file-system + pdf.js) */
export function PdfScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { item } = route.params as { item: FileItem };
  return (
    <Screen bg={4}>
      <HeaderBack title={item.name} sub={t('pdf.title')} onBack={() => nav.goBack()} compact />
      <View style={{ flex: 1, margin: 10, borderRadius: R.card, overflow: 'hidden', backgroundColor: '#fff' }}>
        <WebView source={{ uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

/* 21 — Musique (fond foncé) : recherche, bloc Musique récente, bloc Toutes les musiques, mini-lecteur ; 22 — Lecteur plein écran ; 22b — aperçu widget lock-screen */
export const PlayerCtx = React.createContext<{ song: Song | null; playing: boolean; pos: number; play: (s: Song) => void; toggle: () => void; next: () => void; prev: () => void } | null>(null);
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [song, setSong] = useState<Song | null>(null); const [playing, setPlaying] = useState(false); const [pos, setPos] = useState(0);
  useEffect(() => { if (!playing || !song) return; const iv = setInterval(() => setPos((p) => p + 1 >= song.duration ? (next(), 0) : p + 1), 1000); return () => clearInterval(iv); }, [playing, song]);
  const idx = song ? DEMO_SONGS.findIndex((s) => s.id === song.id) : -1;
  const play = (s: Song) => { setSong(s); setPos(0); setPlaying(true); };
  const next = () => play(DEMO_SONGS[(idx + 1) % DEMO_SONGS.length]); const prev = () => play(DEMO_SONGS[(idx - 1 + DEMO_SONGS.length) % DEMO_SONGS.length]);
  return <PlayerCtx.Provider value={{ song, playing, pos, play, toggle: () => setPlaying(!playing), next, prev }}>{children}</PlayerCtx.Provider>;
}
export const usePlayer = () => { const v = React.useContext(PlayerCtx); if (!v) throw new Error('PlayerProvider'); return v; };
const Cover = ({ s, size = 44 }: { s: Song; size?: number }) => <LinearGradient colors={[`hsl(${(s.id.charCodeAt(1) * 47) % 360}, 75%, 65%)`, `hsl(${(s.id.charCodeAt(1) * 47 + 40) % 360}, 80%, 45%)`]} style={{ width: size, height: size, borderRadius: size * 0.25, alignItems: 'center', justifyContent: 'center' }}><Music size={size * 0.45} color="rgba(255,255,255,.9)" /></LinearGradient>;

export function MusicScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const hp = useHeaderProps(); const pl = usePlayer();
  const [q, setQ] = useState(''); const [widget, setWidget] = useState(false);
  const list = DEMO_SONGS.filter((s) => s.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen bg={1}>
      <Header {...hp} deep />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: NAV_H + 110 }}>
        <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <View style={{ flex: 1 }}><Text style={T.h1(true)}>{t('music.title')}</Text><Text style={T.lead(true)}>{DEMO_SONGS.length} titres</Text></View>
          <Image source={IMG.musicMascot} style={{ width: 115, height: 120 }} resizeMode="contain" />
        </FadeIn>
        <Search deep placeholder={t('music.search')} value={q} onChange={setQ} style={{ marginTop: 4 }} />
        <GlassCard deep padding={10} style={{ marginTop: 12 }}>
          <SectionTitle deep title={t('music.recent')} action={t('music.lockDemo')} onAction={() => setWidget(true)} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>{DEMO_SONGS.slice(0, 4).map((s) => <Press key={s.id} onPress={() => pl.play(s)} style={{ width: 96 }}><Cover s={s} size={96} /><Text style={[T.strong(true), { fontSize: 12, marginTop: 4 }]} numberOfLines={1}>{s.title}</Text><Text style={[T.body(true), { fontSize: 11 }]} numberOfLines={1}>{s.artist}</Text></Press>)}</ScrollView>
        </GlassCard>
        <GlassCard deep padding={6} style={{ marginTop: 10 }}>
          <View style={{ paddingHorizontal: 6, paddingTop: 4 }}><SectionTitle deep title={t('music.all')} /></View>
          {list.map((s) => <Row key={s.id} deep tight title={s.title} sub={`${s.artist} • ${fmtDur(s.duration)}`} left={<Cover s={s} />} onPress={() => pl.play(s)} right={pl.song?.id === s.id ? <Bars /> : s.fav ? <Heart size={16} color="#FF7AA2" fill="#FF7AA2" /> : <View style={{ width: 16 }} />} />)}
        </GlassCard>
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
          <View style={[st.track, { height: 3, marginTop: 8, backgroundColor: 'rgba(255,255,255,.25)' }]}><View style={[st.fill, { width: `${(pl.pos / pl.song.duration) * 100}%`, backgroundColor: '#fff' }]} /></View>
        </GlassCard>
      </Press>
    </View>
  );
}
/* 22 — Lecteur plein écran : pochette, titre, barre de progression + minutes lisibles, commandes SOUS la barre */
export function PlayerScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const pl = usePlayer();
  useEffect(() => { if (!pl.song) pl.play(DEMO_SONGS[0]); }, []);
  const s = pl.song ?? DEMO_SONGS[0];
  return (
    <Screen bg={1}>
      <HeaderBack deep title={t('music.nowPlaying')} onBack={() => nav.goBack()} />
      <View style={{ flex: 1, alignItems: 'center', padding: S.pad }}>
        <FadeIn><View style={{ shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 12 }}><Cover s={s} size={W * 0.7} /></View></FadeIn>
        <Text style={[T.h1(true), { fontSize: 24, marginTop: 24 }]}>{s.title}</Text><Text style={T.lead(true)}>{s.artist}</Text>
        <GlassCard deep padding={14} style={{ alignSelf: 'stretch', marginTop: 22 }}>
          <View style={[st.track, { backgroundColor: 'rgba(255,255,255,.3)' }]}><View style={[st.fill, { width: `${(pl.pos / s.duration) * 100}%`, backgroundColor: '#fff' }]} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={[T.strong(true), { fontSize: 13 }]}>{fmtDur(pl.pos)}</Text><Text style={[T.strong(true), { fontSize: 13 }]}>-{fmtDur(s.duration - pl.pos)}</Text></View>
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
  const pl = usePlayer(); const { t } = useTranslation(); const s = pl.song ?? DEMO_SONGS[0];
  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.7)', justifyContent: 'center', padding: 24 }}>
      <Press onPress={onClose} style={StyleSheet.absoluteFill} scale={1}><View /></Press>
      <Text style={{ color: '#fff', fontFamily: F.title, fontSize: 56, textAlign: 'center' }}>{new Date().toTimeString().slice(0, 5)}</Text>
      <View style={{ borderRadius: 26, overflow: 'hidden', marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' }}>
        <LinearGradient colors={['rgba(255,255,255,.28)', 'rgba(255,255,255,.14)']} style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Cover s={s} size={56} /><View style={{ flex: 1 }}><Text style={{ color: '#fff', fontFamily: F.bodyX, fontSize: 16 }}>{s.title}</Text><Text style={{ color: 'rgba(255,255,255,.8)', fontFamily: F.body }}>{s.artist} — Fylio</Text></View></View>
          <View style={[st.track, { height: 5, marginTop: 12, backgroundColor: 'rgba(255,255,255,.3)' }]}><View style={[st.fill, { width: `${(pl.pos / s.duration) * 100}%`, backgroundColor: '#fff' }]} /></View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#fff', fontSize: 12, fontFamily: F.bodyB }}>{fmtDur(pl.pos)}</Text><Text style={{ color: '#fff', fontSize: 12, fontFamily: F.bodyB }}>-{fmtDur(s.duration - pl.pos)}</Text></View>
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