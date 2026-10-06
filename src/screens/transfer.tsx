/** 15 — Transfert en cours (personnage qui avance avec la progression), 15b — Tout a été envoyé (coche + ondes + confettis), 15c — Transfert interrompu. */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Check, X, Zap, Home, RotateCcw, Send } from 'lucide-react-native';
import { Screen, HeaderBack, GlassCard, GlassButton, GhostButton, T, W, Row, FadeIn } from '../ui';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { FileItem, Device, fmtSize, fmtDur } from '../data/mock';
import { useLibrary } from '../data/library';
import { engine, Progress } from '../net/engine';
import { FileThumb, Pop } from './send';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;

export function TransferScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const app = useApp();
  const lib = useLibrary();
  const { peer, files, dir } = route.params as { peer: Device; files: FileItem[]; dir: 'sent' | 'received' };
  const [p, setP] = useState<Progress>({ sentBytes: 0, totalBytes: files.reduce((a, f) => a + f.size, 0), fileIndex: 0, speedBps: 0, etaSec: 0 });
  const start = useRef(Date.now());
  const bar = useRef(new Animated.Value(0)).current;
  const handle = useRef<{ cancel: () => void } | null>(null);
  const finished = useRef(false);
  const lastP = useRef<Progress>({ sentBytes: 0, totalBytes: files.reduce((a, f) => a + f.size, 0), fileIndex: 0, speedBps: 0, etaSec: 0 });
  useEffect(() => {
    const onProg = (pr: Progress) => {
      lastP.current = pr;
      setP(pr);
      Animated.timing(bar, { toValue: pr.sentBytes / Math.max(pr.totalBytes, 1), duration: 140, easing: Easing.linear, useNativeDriver: false }).start();
    };
    const onDone = (ok: boolean) => {
      if (finished.current) return; finished.current = true;
      const seconds = Math.round((Date.now() - start.current) / 1000);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (dir === 'received') void lib.refresh();
        files.forEach((f) => app.addHistory({ id: 'h' + Date.now() + f.id, name: f.name, kind: f.kind, size: f.size, at: Date.now(), dir, peer: peer.name, status: 'done' }));
        nav.replace('TransferDone', { peer, files, seconds, dir });
      } else nav.replace('TransferFailed', { peer, files, sentCount: lastP.current.fileIndex });
    };
    handle.current = dir === 'received' ? engine.receive(files, onProg, onDone) : engine.send(peer, files, onProg, onDone);
    return () => { if (!finished.current) { finished.current = true; handle.current?.cancel(); } };
  }, []);
  const ratio = p.sentBytes / Math.max(p.totalBytes, 1);
  const frame = IMG.anim[Math.min(IMG.anim.length - 1, Math.floor(ratio * IMG.anim.length))];
  const heroX = bar.interpolate({ inputRange: [0, 1], outputRange: [0, W - S.pad * 2 - 90] });
  return (
    <Screen bg={4}>
      <HeaderBack title={t('transfer.title')} sub={dir === 'sent' ? t('transfer.to', { name: peer.name }) : t('transfer.from', { name: peer.name })} onBack={() => { finished.current = true; handle.current?.cancel(); nav.replace('TransferFailed', { peer, files, sentCount: lastP.current.fileIndex }); }} />
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 30 }}>
        <View style={{ height: W * 0.62, justifyContent: 'flex-end' }}>
          <Animated.View style={{ position: 'absolute', bottom: 0, transform: [{ translateX: heroX }] }}>
            <Image source={frame} style={{ width: 90, height: W * 0.58 }} resizeMode="contain" />
          </Animated.View>
          <Image source={IMG.dev[peer.kind]} style={{ width: 56, height: 56, position: 'absolute', right: 0, bottom: 6, opacity: 0.9 }} resizeMode="contain" />
        </View>
        <View style={st.track}>
          <Animated.View style={[st.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]}>
            <LinearGradient colors={[...C.glassBlue]} locations={[...C.glassBlueLoc]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Shimmer />
          </Animated.View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text style={[T.strong(), { fontSize: 22, fontFamily: F.title }]}>{Math.round(ratio * 100)} %</Text>
          <Text style={T.body()}>{fmtSize(p.sentBytes)} / {fmtSize(p.totalBytes)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Stat label={t('transfer.speed')} v={`${(p.speedBps / 1e6).toFixed(0)} Mo/s`} />
          <Stat label={t('transfer.left')} v={fmtDur(p.etaSec)} />
          <Stat label={t('transfer.sent')} v={`${Math.min(p.fileIndex + (ratio >= 1 ? 1 : 0), files.length)}/${files.length}`} />
        </View>
        <GlassCard padding={6} style={{ marginTop: 12 }}>
          {files.slice(0, 6).map((f, i) => {
            const done = i < p.fileIndex || ratio >= 1; const cur = i === p.fileIndex && !done;
            return <Row key={f.id} tight title={f.name} sub={fmtSize(f.size)} left={<FileThumb f={f} size={34} />}
              right={done ? <Text style={{ fontFamily: F.bodyX, fontSize: 12, color: C.green }}>{t('common.done')}</Text> : cur ? <Text style={{ fontFamily: F.bodyB, fontSize: 12, color: C.accent }}>{Math.round(((p.sentBytes - files.slice(0, i).reduce((a, x) => a + x.size, 0)) / f.size) * 100)} %</Text> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(10,58,138,.15)' }} />} />;
          })}
          {files.length > 6 && <Text style={[T.body(), { textAlign: 'center', paddingVertical: 4 }]}>+{files.length - 6} {t('common.filesCount', { count: '' }).trim()}</Text>}
        </GlassCard>
        <GhostButton label={t('common.cancel')} icon={X} style={{ marginTop: 14 }} onPress={() => { finished.current = true; handle.current?.cancel(); nav.replace('TransferFailed', { peer, files, sentCount: lastP.current.fileIndex }); }} />
      </ScrollView>
    </Screen>
  );
}
const Stat = ({ label, v }: { label: string; v: string }) => <GlassCard padding={8} style={{ flex: 1, alignItems: 'center' }}><Text style={{ fontFamily: F.title, fontSize: 14, color: C.ink }}>{v}</Text><Text style={{ fontFamily: F.body, fontSize: 10, color: C.mute }}>{label}</Text></GlassCard>;
function Shimmer() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, []);
  return <Animated.View style={{ position: 'absolute', top: 0, bottom: 0, width: 60, opacity: 0.55, transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-60, W] }) }] }}><LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,.9)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} /></Animated.View>;
}

/* 15b — Succès : coche verte qui « pop », 3 ondes, confettis qui tombent, résumé taille / durée / vitesse */
export function TransferDoneScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { peer, files, seconds, dir } = route.params as { peer: Device; files: FileItem[]; seconds: number; dir: 'sent' | 'received' };
  const total = files.reduce((a, f) => a + f.size, 0);
  return (
    <Screen bg={4}>
      <Confetti />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.pad }}>
        <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map((i) => <Wave key={i} delay={i * 500} />)}
          <Pop><View style={st.bigCheck}><Check size={52} color="#fff" strokeWidth={3} /></View></Pop>
        </View>
        <FadeIn delay={200}><Text style={[T.h1(), { textAlign: 'center', marginTop: 14 }]}>{t('transfer.doneTitle')}</Text><Text style={[T.lead(), { textAlign: 'center' }]}>{t('transfer.doneSub', { count: files.length, name: peer.name })}</Text></FadeIn>
        <FadeIn delay={320} style={{ flexDirection: 'row', gap: 8, marginTop: 20, alignSelf: 'stretch' }}>
          <Stat label={t('transfer.size')} v={fmtSize(total)} /><Stat label={t('transfer.duration')} v={fmtDur(seconds)} /><Stat label={t('transfer.speed')} v={`${Math.max(1, Math.round(total / Math.max(seconds, 1) / 1e6))} Mo/s`} />
        </FadeIn>
        <FadeIn delay={440} style={{ alignSelf: 'stretch', marginTop: 20, gap: 10 }}>
          <GlassButton label={dir === 'sent' ? t('transfer.sendMore') : t('common.send')} icon={Send} onPress={() => nav.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'SendSelect' }] })} />
          <GhostButton label={t('common.home')} icon={Home} onPress={() => nav.reset({ index: 0, routes: [{ name: 'Tabs' }] })} />
        </FadeIn>
      </View>
    </Screen>
  );
}
function Wave({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { const l = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, delay, easing: Easing.out(Easing.quad), useNativeDriver: true })); l.start(); return () => l.stop(); }, []);
  return <Animated.View style={{ position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: C.green, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.8] }) }] }} />;
}
function Confetti() {
  const pieces = useRef(Array.from({ length: 26 }, (_, i) => ({ x: Math.random() * W, c: ['#00E1FF', '#1DBA6B', '#FFD166', '#FF7AA2', '#087CFF'][i % 5], r: Math.random() * 360, v: new Animated.Value(0), d: Math.random() * 600 }))).current;
  useEffect(() => { pieces.forEach((p) => Animated.timing(p.v, { toValue: 1, duration: 2600 + Math.random() * 800, delay: p.d, easing: Easing.in(Easing.quad), useNativeDriver: true }).start()); }, []);
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">{pieces.map((p, i) => <Animated.View key={i} style={{ position: 'absolute', left: p.x, top: -20, width: 8, height: 12, borderRadius: 2, backgroundColor: p.c, opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }), transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, 700] }) }, { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: [`${p.r}deg`, `${p.r + 540}deg`] }) }] }} />)}</View>;
}

/* 15c — Interruption : croix orange, fichiers restants, Réessayer / Abandonner */
export function TransferFailedScreen() {
  const nav = useNavigation<Nav>(); const route = useRoute<any>(); const { t } = useTranslation();
  const { peer, files, sentCount } = route.params as { peer: Device; files: FileItem[]; sentCount: number };
  return (
    <Screen bg={4}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.pad }}>
        <Pop><View style={[st.bigCheck, { backgroundColor: C.orange, shadowColor: C.orange }]}><X size={52} color="#fff" strokeWidth={3} /></View></Pop>
        <FadeIn delay={150}><Text style={[T.h1(), { textAlign: 'center', marginTop: 14 }]}>{t('transfer.failTitle')}</Text><Text style={[T.lead(), { textAlign: 'center' }]}>{t('transfer.failSub')}</Text></FadeIn>
        <FadeIn delay={260} style={{ alignSelf: 'stretch', marginTop: 18 }}>
          <GlassCard padding={10}><Text style={[T.cardT(), { marginBottom: 4 }]}>{t('transfer.remaining')} : {files.length - sentCount}</Text>{files.slice(sentCount, sentCount + 3).map((f) => <Row key={f.id} tight title={f.name} sub={fmtSize(f.size)} left={<FileThumb f={f} size={32} />} right={<View />} />)}</GlassCard>
        </FadeIn>
        <FadeIn delay={360} style={{ alignSelf: 'stretch', marginTop: 18, gap: 10 }}>
          <GlassButton label={t('common.retry')} icon={RotateCcw} onPress={() => nav.replace('Transfer', { peer, files: files.slice(sentCount), dir: 'sent' })} />
          <GhostButton label={t('common.abort')} icon={Home} onPress={() => nav.reset({ index: 0, routes: [{ name: 'Tabs' }] })} />
        </FadeIn>
      </View>
    </Screen>
  );
}
export { Zap };
const st = StyleSheet.create({
  track: { height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,.6)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.9)' },
  fill: { height: '100%', borderRadius: 7, overflow: 'hidden' },
  bigCheck: { width: 104, height: 104, borderRadius: 52, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', shadowColor: C.green, shadowOpacity: 0.5, shadowRadius: 24, elevation: 10 },
});