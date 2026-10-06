/** Parcours Envoyer / Recevoir : 8 Sélection, 9/9b À proximité, 10 QR (vrai), 11 Scanner, 12 Envoyer à distance (+guide), 13 Recevoir à distance (+guide), 14 Feuille appareil, 7 Câble, Demande entrante. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, Easing, TextInput, Share, Modal, StyleProp, ImageStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image as ExImage } from 'expo-image';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Clock, FileText, Image as ImgIco, Video, Music, Folder, QrCode, Key, Download, Wifi, Usb, Copy, Share2, ShieldCheck, Search as SearchIco, Check, X, Zap, Smartphone, ChevronRight } from 'lucide-react-native';
import { Screen, HeaderBack, GlassCard, GlassButton, GhostButton, Press, Search, Chip, T, FadeIn, W, Row } from '../ui';
import { Tour, TourStep } from '../ui/Tour';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { DEMO_FILES, DEMO_DOCS, DEMO_SONGS, FileItem, Device, fmtSize, fmtDur, fmtFileSub } from '../data/mock';
import { useLibrary, resolveMediaUri, thumbUri } from '../data/library';
import { engine, encodeQr, decodeQr, QrPayload } from '../net/engine';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;
const KIND_ICO: Record<string, any> = { photo: ImgIco, video: Video, music: Music, doc: FileText, pdf: FileText, other: Folder };
const isDirectUri = (u?: string | null) => !!u && (u.startsWith('file://') || u.startsWith('content://'));

/** Vignette média : tente l'asset brut (content:// ou ph://) puis retombe sur file:// local.
 *  Si tout échoue, rend `fallback` (ou rien) pour laisser voir le fond/gradient. */
export const PhImage = ({ uri, direct, style, contentFit = 'cover', fallback }: { uri?: string | null; direct?: boolean; style?: StyleProp<ImageStyle>; contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'; fallback?: React.ReactNode }) => {
  const [src, setSrc] = useState<string | null>(uri ?? null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setSrc(uri ?? null);
    setFailed(false);
  }, [uri]);
  const onError = () => {
    if (uri && src === uri && !isDirectUri(uri)) {
      (direct ? resolveMediaUri(uri) : thumbUri(uri)).then((r) => (r && r !== src ? setSrc(r) : setFailed(true)));
    } else setFailed(true);
  };
  if (failed || !src) return <>{fallback ?? null}</>;
  return <ExImage source={{ uri: src }} style={style} contentFit={contentFit} transition={120} onError={onError} />;
};

export const FileThumb = ({ f, size = 44 }: { f: FileItem; size?: number }) => {
  const Ico = KIND_ICO[f.kind] ?? Folder;
  const bg = f.kind === 'photo' ? '#9fd0ff' : f.kind === 'video' ? '#b7a8ff' : f.kind === 'music' ? '#ffb8d2' : '#ffd9a0';
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Ico size={size * 0.45} color="#fff" />
      {(f.kind === 'photo' || f.kind === 'video') && f.uri && <PhImage uri={f.uri} style={StyleSheet.absoluteFill as any} contentFit="cover" />}
    </View>
  );
};

/* 8 — Sélection : chips de catégorie (Récent, Documents, Photos, Vidéos, Musique), grille/liste, compteur + bouton Envoyer compact */
export function SendSelectScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const lib = useLibrary();
  const [cat, setCat] = useState<string>(route.params?.category ?? 'recent');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  useEffect(() => { lib.ensure(); }, []);
  const cats = [{ k: 'recent', i: Clock }, { k: 'docs', i: FileText }, { k: 'photos', i: ImgIco }, { k: 'videos', i: Video }, { k: 'music', i: Music }];
  const items = useMemo<FileItem[]>(() => {
    const base =
      cat === 'docs' ? lib.docs
      : cat === 'photos' ? lib.images
      : cat === 'videos' ? lib.videos
      : cat === 'music' ? lib.music
      : [...lib.images.slice(0, 8), ...lib.videos.slice(0, 4), ...lib.docs.slice(0, 6)].sort((a, b) => b.date - a.date);
    return q ? base.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())) : base;
  }, [cat, q, lib.images, lib.videos, lib.docs, lib.music]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const chosen = items.filter((f) => sel.has(f.id));
  const totalSize = chosen.reduce((a, f) => a + f.size, 0);
  const showSize = chosen.length > 0 && chosen.every((f) => f.size > 0);
  const grid = cat === 'photos' || cat === 'videos' || cat === 'recent';
  const cell = (W - 16 - 8 * 2) / 3;
  return (
    <Screen bg={4}>
      <HeaderBack title={t('sendType.title')} sub={t('sendType.subtitle')} onBack={() => nav.goBack()} />
      <View style={{ paddingHorizontal: 8, marginTop: 6 }}><Search placeholder={t('select.searchPhoto')} value={q} onChange={setQ} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 8, paddingVertical: 10 }} style={{ flexGrow: 0 }}>
        {cats.map((c) => <Chip key={c.k} label={t(`sendType.${c.k}`)} active={cat === c.k} onPress={() => setCat(c.k)} />)}
      </ScrollView>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 110, flexDirection: grid ? 'row' : 'column', flexWrap: 'wrap', gap: 8 }}>
        {items.map((f, i) => {
          const on = sel.has(f.id);
          return grid ? (
            <Press key={f.id} onPress={() => toggle(f.id)} scale={0.95}>
              <View style={{ width: cell, height: cell, borderRadius: 14, overflow: 'hidden', backgroundColor: f.kind === 'video' ? '#8ea9ff' : `hsl(${205 + (i * 13) % 40}, 80%, ${62 + (i % 3) * 6}%)`, borderWidth: on ? 2.5 : 0, borderColor: C.accent }}>
                <PhImage uri={f.uri} style={StyleSheet.absoluteFill as any} contentFit="cover" />
                {f.kind === 'video' && !!f.duration && <View style={st.vidBadge}><Video size={12} color="#fff" /><Text style={{ color: '#fff', fontSize: 10, fontFamily: F.bodyB }}>{fmtDur(f.duration)}</Text></View>}
                <View style={[st.sel, on && { backgroundColor: C.accent, borderColor: C.accent }]}>{on && <Check size={12} color="#fff" strokeWidth={3} />}</View>
              </View>
            </Press>
          ) : (
            <GlassCard key={f.id} padding={0}>
              <Row title={f.name} sub={fmtFileSub(f)} left={<FileThumb f={f} />} onPress={() => toggle(f.id)} right={<View style={[st.sel, { position: 'relative' }, on && { backgroundColor: C.accent, borderColor: C.accent }]}>{on && <Check size={12} color="#fff" strokeWidth={3} />}</View>} />
            </GlassCard>
          );
        })}
        {!items.length && <Text style={[T.body(), { textAlign: 'center', alignSelf: 'stretch', paddingTop: 30 }]}>{t('lib.empty')}</Text>}
      </ScrollView>
      <View style={st.footer}>
        <GlassCard padding={10} radius={R.pill} style={{ flex: 1 }}><Text style={T.strong()} numberOfLines={1}>{chosen.length ? `${t('select.selected', { count: chosen.length })}${showSize ? ` • ${fmtSize(totalSize)}` : ''}` : t('select.none')}</Text></GlassCard>
        <GlassButton small label={t('common.send')} disabled={!chosen.length} onPress={() => nav.navigate('Nearby', { files: chosen, mode: 'send' })} />
      </View>
    </Screen>
  );
}

/* 9 / 9b — À proximité : recherche animée (ondes) puis appareils détectés ; QR / Envoyer à distance / Recevoir à distance */
export function NearbyScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { files, mode } = route.params as { files: FileItem[]; mode: 'send' | 'receive' };
  const [devs, setDevs] = useState<Device[]>([]);
  const app = useApp();
  useEffect(() => engine.discover(setDevs), []);
  useEffect(() => engine.onIncoming((req) => nav.navigate('Incoming', { from: req.from, files: req.files })), []);
  return (
    <Screen bg={2}>
      <HeaderBack deep title={t('nearby.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 30 }}>
        <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 6 }}>
          <Radar active={devs.length === 0} />
          <Image source={IMG.qrMascot} style={{ width: 120, height: 120, marginTop: -150 }} resizeMode="contain" />
        </View>
        <FadeIn style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={[T.cardT(true), { fontSize: 17 }]}>{devs.length ? t('nearby.found', { count: devs.length }) : t('nearby.searching')}</Text>
          {!devs.length && <Text style={[T.body(true), { textAlign: 'center', marginTop: 4, paddingHorizontal: 10 }]}>{t('nearby.searchingSub')}</Text>}
        </FadeIn>
        <View style={{ marginTop: 14, gap: 8 }}>
          {devs.map((d, i) => (
            <FadeIn key={d.id} delay={i * 80}>
              <GlassCard deep padding={0}>
                <Row deep title={d.name} sub={`${d.ip ?? ''} • ${d.link === 'cable' ? t('nearby.usb') : d.link === 'hotspot' ? t('common.hotspot') : t('nearby.sameNet')}`} left={<Image source={IMG.dev[d.kind]} style={{ width: 42, height: 42 }} resizeMode="contain" />}
                  right={d.link === 'cable' ? <Usb size={18} color="#fff" /> : <Wifi size={18} color="#fff" />}
                  onPress={() => { app.addDevice(d); mode === 'send' ? nav.navigate('DeviceSheet', { device: d, files }) : nav.navigate('Transfer', { peer: d, files: DEMO_FILES.slice(0, 5), dir: 'received' }); }} />
              </GlassCard>
            </FadeIn>
          ))}
        </View>
        <View style={{ marginTop: 18, gap: 10 }}>
          <GlassButton label={t('nearby.scanQr')} icon={QrCode} onPress={() => nav.navigate(mode === 'send' ? 'QrShare' : 'QrScan', { files })} />
          {mode === 'send' ? <GhostButton deep label={t('nearby.remoteSend')} icon={Key} onPress={() => nav.navigate('RemoteSend', { files })} />
            : <GhostButton deep label={t('nearby.remoteRecv')} icon={Download} onPress={() => nav.navigate('RemoteRecv')} />}
        </View>
      </ScrollView>
    </Screen>
  );
}
function Radar({ active }: { active: boolean }) {
  const rings = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    const ls = rings.map((r, i) => Animated.loop(Animated.timing(r, { toValue: 1, duration: 2400, delay: i * 800, easing: Easing.out(Easing.quad), useNativeDriver: true })));
    ls.forEach((l) => l.start()); return () => ls.forEach((l) => l.stop());
  }, []);
  return (
    <View style={{ width: 220, height: 220, alignItems: 'center', justifyContent: 'center' }}>
      {active && rings.map((r, i) => <Animated.View key={i} style={{ position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: 'rgba(255,255,255,.9)', opacity: r.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.7] }) }] }} />)}
    </View>
  );
}

/* 10 — QR réel : contient fylio://connect?ip=<IP réelle>&port=47811&token=…&name=… ; compte à rebours 10 min */
export function QrShareScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const app = useApp();
  const [info, setInfo] = useState<QrPayload | null>(null);
  const [left, setLeft] = useState(600);
  useEffect(() => { engine.localInfo().then((p) => setInfo({ ...p, name: app.firstName || 'Fylio' })); }, []);
  useEffect(() => { const iv = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000); return () => clearInterval(iv); }, []);
  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <Screen bg={2}>
      <HeaderBack deep title={t('qr.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: S.pad, alignItems: 'center' }}>
        <Text style={[T.lead(true), { textAlign: 'center', marginBottom: 14 }]}>{t('qr.subtitle')}</Text>
        <FadeIn><View style={st.qrBox}>
          {info ? <QRCode value={encodeQr(info)} size={W * 0.56} color="#0A3A8A" backgroundColor="#ffffff" logo={IMG.logoF} logoSize={44} logoBackgroundColor="#fff" logoBorderRadius={10} ecl="M" /> : <View style={{ width: W * 0.56, height: W * 0.56 }} />}
        </View></FadeIn>
        <FadeIn delay={100} style={{ width: '100%', marginTop: 14 }}>
          <GlassCard deep padding={12}>
            <Text style={T.body(true)}>{t('qr.connectTo')}</Text>
            <Text style={[T.strong(true), { fontSize: 16 }]}>{info?.ssid ?? 'Fylio-Direct'}</Text>
            <Text style={[T.body(true), { marginTop: 4 }]}>{t('qr.ipHint', { ip: info?.ip ?? '…' })} • {t('qr.secure')} 🔒</Text>
          </GlassCard>
        </FadeIn>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}><Clock size={14} color="#fff" /><Text style={T.body(true)}>{t('qr.expires', { time: mmss })}</Text></View>
        <View style={{ width: '100%', marginTop: 16, gap: 10 }}>
          <GlassButton label={t('qr.scanTitle')} icon={QrCode} onPress={() => nav.navigate('QrScan', { files: route.params?.files })} />
          <GhostButton deep label={t('transfer.title')} icon={Zap} onPress={() => nav.navigate('Transfer', { peer: engine.demoDevices[0], files: route.params?.files ?? DEMO_FILES.slice(0, 4), dir: 'sent' })} />
        </View>
      </ScrollView>
    </Screen>
  );
}

/* 11 — Scanner : vraie caméra (expo-camera), décodage fylio://, puis connexion */
export function QrScanScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const [perm, ask] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false); const [ip, setIp] = useState('');
  useEffect(() => { if (!perm?.granted) ask(); }, []);
  const go = async (p: QrPayload) => {
    if (busy) return; setBusy(true);
    const dev = await engine.connect(p);
    nav.replace('Connected', { payload: p, files: route.params?.files });
    void dev;
  };
  return (
    <Screen bg={1}>
      <HeaderBack deep title={t('qr.scanTitle')} onBack={() => nav.goBack()} />
      <View style={{ flex: 1, alignItems: 'center', padding: S.pad }}>
        <View style={st.camBox}>
          {perm?.granted ? <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={(r) => { const p = decodeQr(r.data); if (p) go(p); }} />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={T.body(true)}>{t('qr.noCam')}</Text></View>}
          {['tl', 'tr', 'bl', 'br'].map((k) => <View key={k} style={[st.corner, k.includes('t') ? { top: 0 } : { bottom: 0 }, k.includes('l') ? { left: 0 } : { right: 0 }, k.includes('t') ? { borderTopWidth: 4 } : { borderBottomWidth: 4 }, k.includes('l') ? { borderLeftWidth: 4 } : { borderRightWidth: 4 }]} />)}
          <ScanLine />
        </View>
        <Text style={[T.lead(true), { textAlign: 'center', marginTop: 14 }]}>{t('qr.aim')}</Text>
        {manual ? (
          <View style={{ width: '100%', marginTop: 14, gap: 10 }}>
            <GlassCard deep padding={0} radius={R.pill}><TextInput value={ip} onChangeText={setIp} placeholder="192.168.1.24" placeholderTextColor="rgba(255,255,255,.6)" keyboardType="numbers-and-punctuation" style={{ height: 48, paddingHorizontal: 18, color: '#fff', fontFamily: F.bodyB, fontSize: 16 }} /></GlassCard>
            <GlassButton label={t('common.continue')} icon={ChevronRight} onPress={() => go({ v: 1, ip, port: 47811, token: 'manual', name: ip })} disabled={ip.length < 7} />
          </View>
        ) : <GhostButton deep label={t('qr.manual')} style={{ marginTop: 16, alignSelf: 'stretch' }} onPress={() => setManual(true)} />}
      </View>
    </Screen>
  );
}
function ScanLine() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(y, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(y, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })])); l.start(); return () => l.stop(); }, []);
  return <Animated.View style={{ position: 'absolute', left: 12, right: 12, height: 2, backgroundColor: C.glow, shadowColor: C.glow, shadowOpacity: 1, shadowRadius: 8, transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [10, W * 0.7 - 10] }) }] }} />;
}

/* Connecté (après scan) : confirmation puis on part en transfert */
export function ConnectedScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const app = useApp();
  const { payload, files } = route.params as { payload: QrPayload; files?: FileItem[] };
  const dev: Device = { id: 'qr-' + payload.token, name: payload.name, kind: 'android', link: 'wifi', online: true, ip: payload.ip };
  useEffect(() => { app.addDevice(dev); }, []);
  return (
    <Screen bg={2}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.pad }}>
        <Pop><View style={st.bigCheck}><Check size={48} color="#fff" strokeWidth={3} /></View></Pop>
        <Text style={[T.h1(true), { marginTop: 18, textAlign: 'center' }]}>{t('qr.connected', { name: payload.name })}</Text>
        <Text style={[T.lead(true), { textAlign: 'center' }]}>{payload.ip}:{payload.port}</Text>
        <GlassButton label={files?.length ? t('common.send') : t('common.receive')} icon={files?.length ? Zap : Download} style={{ marginTop: 24, alignSelf: 'stretch' }}
          onPress={() => nav.replace('Transfer', { peer: dev, files: files?.length ? files : DEMO_FILES.slice(0, 5), dir: files?.length ? 'sent' : 'received' })} />
      </View>
    </Screen>
  );
}
export function Pop({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start(); }, []);
  return <Animated.View style={{ transform: [{ scale: v }], opacity: v }}>{children}</Animated.View>;
}

/* 12 — Envoyer à distance : clé 8 caractères, Copier / Partager alignés, sécurité, attente ; guide 3 étapes à la 1re fois */
export function RemoteSendScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const app = useApp();
  const [key, setKey] = useState(''); const [exp, setExp] = useState(0); const [copied, setCopied] = useState(false);
  const [tour, setTour] = useState(false);
  const r = { key: useRef<View>(null), btns: useRef<View>(null), wait: useRef<View>(null) };
  useEffect(() => { engine.createRemoteKey().then(({ key, expiresAt }) => { setKey(key); setExp(expiresAt); if (!app.guideSendDone) setTimeout(() => setTour(true), 500); }); }, []);
  useEffect(() => { if (!key) return; return engine.waitRemotePeer(key, (peer) => { app.addDevice(peer); nav.replace('Transfer', { peer, files: route.params.files, dir: 'sent' }); }); }, [key]);
  const [now, setNow] = useState(Date.now()); useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv); }, []);
  const left = Math.max(0, Math.floor((exp - now) / 1000)); const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  const steps: TourStep[] = [
    { ref: r.key, title: '① ' + t('remoteSend.g1.0'), text: t('remoteSend.g1.1'), radius: 20 },
    { ref: r.btns, title: '② ' + t('remoteSend.g2.0'), text: t('remoteSend.g2.1'), radius: 28 },
    { ref: r.wait, title: '③ ' + t('remoteSend.g3.0'), text: t('remoteSend.g3.1'), radius: 20, last: t('common.gotIt') },
  ];
  return (
    <Screen bg={3}>
      <HeaderBack deep title={t('remoteSend.title')} sub={t('remoteSend.subtitle')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 30 }}>
        <Image source={IMG.qrMascot} style={{ width: 110, height: 110, alignSelf: 'center' }} resizeMode="contain" />
        <View ref={r.key} collapsable={false}>
          <GlassCard deep padding={16} style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>{(key || '••••••••').split('').map((ch, i) => <KeyCell key={i} ch={ch} i={i} />)}</View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}><Clock size={14} color="#fff" /><Text style={T.body(true)}>{t('remoteSend.expires')} {mmss}</Text></View>
          </GlassCard>
        </View>
        <View ref={r.btns} collapsable={false} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}><GlassButton small label={copied ? t('common.copied') : t('common.copy')} icon={copied ? Check : Copy} onPress={async () => { await Clipboard.setStringAsync(key); setCopied(true); setTimeout(() => setCopied(false), 1500); }} /></View>
          <View style={{ flex: 1 }}><GhostButton deep small label={t('common.share')} icon={Share2} onPress={() => Share.share({ message: t('remoteSend.shareMsg', { key }) })} /></View>
        </View>
        <GlassCard deep padding={12} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}><ShieldCheck size={20} color={C.green2} /><View style={{ flex: 1 }}><Text style={T.strong(true)}>{t('remoteSend.security')}</Text><Text style={T.body(true)}>{t('remoteSend.securityText')}</Text></View></View>
        </GlassCard>
        <View ref={r.wait} collapsable={false} style={{ marginTop: 12 }}>
          <GlassCard deep padding={12}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Spinner /><Text style={T.strong(true)}>{t('remoteSend.waiting')}</Text></View></GlassCard>
        </View>
      </ScrollView>
      <Tour visible={tour} steps={steps} onDone={() => { setTour(false); app.set({ guideSendDone: true }); }} />
    </Screen>
  );
}
function KeyCell({ ch, i }: { ch: string; i: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { v.setValue(0); Animated.spring(v, { toValue: 1, delay: i * 50, useNativeDriver: true, speed: 20, bounciness: 10 }).start(); }, [ch]);
  return <Animated.View style={[st.keyCell, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }]}><Text style={{ fontFamily: F.title, fontSize: 22, color: C.ink }}>{ch}</Text></Animated.View>;
}
export function Spinner({ color = '#fff', size = 20 }: { color?: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, []);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2.5, borderColor: color, borderTopColor: 'transparent', transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }} />;
}

/* 13 — Recevoir à distance : 8 cases, bouton Trouver l'appareil ; guide 3 étapes à la 1re fois */
export function RemoteRecvScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation();
  const app = useApp();
  const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(false);
  const [tour, setTour] = useState(false);
  const inp = useRef<TextInput>(null);
  const r = { ask: useRef<View>(null), cells: useRef<View>(null), find: useRef<View>(null) };
  useEffect(() => { if (!app.guideRecvDone) setTimeout(() => setTour(true), 500); }, []);
  const find = async () => {
    setBusy(true); setErr(false);
    const dev = await engine.resolveRemoteKey(code.toUpperCase());
    setBusy(false);
    if (dev) { app.addDevice(dev); nav.replace('Transfer', { peer: dev, files: DEMO_FILES.slice(0, 6), dir: 'received' }); } else setErr(true);
  };
  const steps: TourStep[] = [
    { ref: r.ask, title: '① ' + t('remoteRecv.g1.0'), text: t('remoteRecv.g1.1'), radius: 20 },
    { ref: r.cells, title: '② ' + t('remoteRecv.g2.0'), text: t('remoteRecv.g2.1'), radius: 20 },
    { ref: r.find, title: '③ ' + t('remoteRecv.g3.0'), text: t('remoteRecv.g3.1'), radius: 28, last: t('common.gotIt') },
  ];
  return (
    <Screen bg={3}>
      <HeaderBack deep title={t('remoteRecv.title')} sub={t('remoteRecv.subtitle')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: S.pad }} keyboardShouldPersistTaps="handled">
        <View ref={r.ask} collapsable={false}>
          <GlassCard deep padding={12}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Image source={IMG.qrMascot} style={{ width: 64, height: 64 }} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={T.strong(true)}>{t('remoteRecv.g1.0')}</Text><Text style={T.body(true)}>{t('remoteRecv.hint')}</Text></View></View></GlassCard>
        </View>
        <Press onPress={() => inp.current?.focus()} style={{ marginTop: 16 }}>
          <View ref={r.cells} collapsable={false} style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {Array.from({ length: 8 }).map((_, i) => <View key={i} style={[st.keyCell, code.length === i && { borderColor: C.glow, borderWidth: 2 }, err && { borderColor: C.red }]}><Text style={{ fontFamily: F.title, fontSize: 22, color: C.ink }}>{code[i] ?? ''}</Text></View>)}
          </View>
        </Press>
        <TextInput ref={inp} value={code} onChangeText={(v) => { setErr(false); setCode(v.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()); }} autoCapitalize="characters" autoFocus style={{ position: 'absolute', opacity: 0, height: 1 }} />
        <Text style={[T.body(true), { textAlign: 'center', marginTop: 10 }]}>{err ? '✕ ' + t('transfer.failSub') : t('remoteRecv.hint')}</Text>
        <View ref={r.find} collapsable={false} style={{ marginTop: 18 }}>
          <GlassButton label={busy ? t('nearby.searching') : t('remoteRecv.find')} icon={busy ? undefined : SearchIco} disabled={code.length < 8 || busy} onPress={find} />
        </View>
        <Text style={[T.body(true), { textAlign: 'center', marginTop: 8 }]}>{t('remoteRecv.findSub')}</Text>
      </ScrollView>
      <Tour visible={tour} steps={steps} onDone={() => { setTour(false); app.set({ guideRecvDone: true }); }} />
    </Screen>
  );
}

/* 14 — Feuille appareil « PC Bureau » : résumé + Envoyer ; 7 — Feuille « Câble connecté » */
export function DeviceSheetScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { device, files } = route.params as { device: Device; files: FileItem[] };
  const list = files.length ? files : DEMO_FILES.slice(0, 3);
  return (
    <Sheet onClose={() => nav.goBack()}>
      <View style={{ alignItems: 'center' }}>
        <Image source={IMG.dev[device.kind]} style={{ width: 84, height: 84 }} resizeMode="contain" />
        <Text style={[T.h1(), { fontSize: 22 }]}>{device.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: device.online ? C.green : C.mute }} /><Text style={T.body()}>{device.online ? t('common.online') : t('common.offline')} • {device.ip ?? ''}</Text></View>
      </View>
      <View style={{ marginTop: 14, gap: 6 }}>{list.slice(0, 4).map((f) => <Row key={f.id} tight title={f.name} sub={fmtSize(f.size)} left={<FileThumb f={f} size={36} />} right={<View />} />)}{list.length > 4 && <Text style={[T.body(), { textAlign: 'center' }]}>+{list.length - 4}</Text>}</View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}><GhostButton label={t('common.cancel')} onPress={() => nav.goBack()} /></View>
        <View style={{ flex: 1 }}><GlassButton label={t('common.send')} icon={Zap} onPress={() => nav.replace('Transfer', { peer: device, files: list, dir: 'sent' })} /></View>
      </View>
    </Sheet>
  );
}
export function CableScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const app = useApp();
  return (
    <Sheet onClose={() => nav.goBack()}>
      <View style={{ alignItems: 'center' }}>
        <View style={[st.bigCheck, { backgroundColor: app.cable ? C.green : 'rgba(10,58,138,.12)', width: 76, height: 76, borderRadius: 38 }]}><Usb size={34} color={app.cable ? '#fff' : C.ink} /></View>
        <Text style={[T.h1(), { fontSize: 22, marginTop: 10 }]}>{app.cable ? t('cable.title') : t('common.cable')}</Text>
        <Text style={[T.body(), { textAlign: 'center' }]}>{app.cable ? t('cable.detected') + ' • ' + t('nearby.usb') : t('tour.charger.1')}</Text>
      </View>
      <GlassCard padding={12} style={{ marginTop: 14 }}>
        <Row tight title="PC Bureau" sub={app.cable ? t('common.online') + ' • USB-C' : t('common.offline')} left={<Image source={IMG.dev.pc} style={{ width: 40, height: 40 }} resizeMode="contain" />} right={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: app.cable ? C.green : C.mute }} />} />
      </GlassCard>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <View style={{ flex: 1 }}><GhostButton label={t('cable.diag')} icon={Smartphone} onPress={() => app.set({ cable: !app.cable })} /></View>
        <View style={{ flex: 1 }}><GlassButton label={t('common.send')} icon={Zap} disabled={!app.cable} onPress={() => nav.replace('SendSelect')} /></View>
      </View>
    </Sheet>
  );
}
/* Demande entrante : « X veut t'envoyer » — Accepter / Refuser */
export function IncomingScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { from, files } = route.params as { from: Device; files: FileItem[] };
  const size = files.reduce((a, f) => a + f.size, 0);
  return (
    <Sheet onClose={() => nav.goBack()}>
      <View style={{ alignItems: 'center' }}>
        <Image source={IMG.dev[from.kind]} style={{ width: 80, height: 80 }} resizeMode="contain" />
        <Text style={[T.h1(), { fontSize: 20, textAlign: 'center' }]}>{t('incoming.wants', { name: from.name })}</Text>
        <Text style={T.body()}>{t('incoming.meta', { count: files.length, size: fmtSize(size) })}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'center' }}>{files.slice(0, 4).map((f) => <FileThumb key={f.id} f={f} size={52} />)}</View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
        <View style={{ flex: 1 }}><GhostButton label={t('common.refuse')} icon={X} onPress={() => nav.goBack()} /></View>
        <View style={{ flex: 1 }}><GlassButton label={t('common.accept')} icon={Check} onPress={() => nav.replace('Transfer', { peer: from, files, dir: 'received' })} /></View>
      </View>
    </Sheet>
  );
}
/* Feuille modale : fond assombri + carte vitrée centrée à 14 px des bords, qui monte avec un ressort */
export function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }).start(); }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Press onPress={onClose} style={StyleSheet.absoluteFill}><Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(6,24,66,.45)', opacity: v }]} /></Press>
      <Animated.View style={{ marginHorizontal: 14, marginBottom: 24, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [300, 0] }) }] }}>
        <View style={st.sheet}>{children}</View>
      </Animated.View>
    </View>
  );
}
export { Modal };
const st = StyleSheet.create({
  vidBadge: { position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,.45)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  sel: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,.35)', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 8, right: 8, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrBox: { backgroundColor: '#fff', padding: 16, borderRadius: R.cardLg, shadowColor: '#0A3A8A', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  camBox: { width: W * 0.7, height: W * 0.7, borderRadius: R.cardLg, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,.35)', marginTop: 10 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: C.glow, borderRadius: 4 },
  bigCheck: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', shadowColor: C.green, shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
  keyCell: { width: (W - 40 - 32 - 7 * 6) / 8, height: 48, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.92)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.9)' },
  sheet: { backgroundColor: 'rgba(255,255,255,.96)', borderRadius: R.cardLg + 4, padding: 18, borderWidth: 1, borderColor: '#fff', shadowColor: '#0A3A8A', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
});