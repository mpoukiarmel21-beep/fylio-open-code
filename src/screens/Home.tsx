/** Écran 5 — Accueil (+ états vides 5/6, visite guidée 11 étapes 5a→5k, popup Historique). */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Send, Download, Smartphone, Clock, Zap, Wifi, Usb } from 'lucide-react-native';
import { Screen, Header, GlassCard, Press, T, SectionTitle, FadeIn, W, useHeaderCollapse } from '../ui';
import { Tour, TourStep } from '../ui/Tour';
import { NAV_H } from '../ui/GlassNav';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { fmtSize, fmtDur, Device, HistoryItem } from '../data/mock';
import type { RootParams } from '../navigation/types';
import { useTourRefs } from '../navigation/TourRefs';

type Nav = NativeStackNavigationProp<RootParams>;
export const ago = (ms: number, t: any) => { const m = Math.max(1, Math.round((Date.now() - ms) / 60000)); return t('home.ago', { time: m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} j` }); };

export function DeviceCard({ d, onPress, compact }: { d: Device; onPress?: () => void; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Press onPress={onPress} style={{ width: compact ? 112 : 128 }}>
      <GlassCard padding={10} style={{ alignItems: 'center' }}>
        <Image source={IMG.dev[d.kind]} style={{ width: compact ? 44 : 54, height: compact ? 44 : 54 }} resizeMode="contain" />
        <Text style={[T.strong(), { fontSize: 13, marginTop: 4 }]} numberOfLines={1}>{d.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.online ? C.green : C.mute }} />
          <Text style={{ fontFamily: F.body, fontSize: 11, color: C.mute }}>{d.online ? (d.link === 'cable' ? t('common.cable') : d.link === 'hotspot' ? t('common.hotspot') : t('common.wifi')) : t('common.offline')}</Text>
        </View>
      </GlassCard>
    </Press>
  );
}
export function HistoryRow({ h, onPress }: { h: HistoryItem; onPress?: () => void }) {
  const { t } = useTranslation();
  const Ico = h.dir === 'sent' ? Send : Download;
  return (
    <Press onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
      <View style={[st.hIco, { backgroundColor: h.dir === 'sent' ? 'rgba(8,124,255,.12)' : 'rgba(29,186,107,.14)' }]}><Ico size={16} color={h.dir === 'sent' ? C.accent : C.green} /></View>
      <View style={{ flex: 1 }}><Text style={T.strong()} numberOfLines={1}>{h.name}</Text><Text style={T.body()} numberOfLines={1}>{h.dir === 'sent' ? t('history.sent', { name: h.peer }) : t('history.received', { name: h.peer })} • {fmtSize(h.size)}</Text></View>
      <Text style={{ fontFamily: F.body, fontSize: 11, color: C.mute }}>{ago(h.at, t)}</Text>
    </Press>
  );
}

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const app = useApp();
  const refs = useTourRefs();
  const r = { send: useRef<View>(null), recv: useRef<View>(null), devices: useRef<View>(null), history: useRef<View>(null), browser: useRef<View>(null), notifs: useRef<View>(null), settings: useRef<View>(null) };
  const [tour, setTour] = useState(false);
  useEffect(() => { if (!app.tourDone) { const x = setTimeout(() => setTour(true), 700); return () => clearTimeout(x); } }, [app.tourDone]);
  const avatar = app.avatar >= 0 ? IMG.avatars[app.avatar] : IMG.avatars[0];
  const hasNotif = app.notifs.some((n) => !n.read);
  const steps: TourStep[] = [
    { ref: r.send, title: t('tour.send.0'), text: t('tour.send.1'), radius: 24 }, { ref: r.recv, title: t('tour.receive.0'), text: t('tour.receive.1'), radius: 24 },
    { ref: r.devices, title: t('tour.devices.0'), text: t('tour.devices.1') }, { ref: r.history, title: t('tour.history.0'), text: t('tour.history.1') },
    { ref: refs.tabs.Files, title: t('tour.files.0'), text: t('tour.files.1'), radius: 28 }, { ref: refs.tabs.Gallery, title: t('tour.gallery.0'), text: t('tour.gallery.1'), radius: 28 },
    { ref: refs.tabs.Music, title: t('tour.music.0'), text: t('tour.music.1'), radius: 28 }, { ref: refs.charger, title: t('tour.charger.0'), text: t('tour.charger.1'), radius: 40 },
    { ref: r.browser, title: t('tour.browser.0'), text: t('tour.browser.1'), radius: 24 }, { ref: r.notifs, title: t('tour.notifs.0'), text: t('tour.notifs.1'), radius: 24 },
    { ref: r.settings, title: t('tour.settings.0'), text: t('tour.settings.1'), radius: 24, last: t('common.letsGo') },
  ];
  const empty = app.devices.length === 0 && app.history.length === 0;
  const ins = useSafeAreaInsets();
  const hs = useHeaderCollapse();
  return (
    <Screen bg={4}>
      <ScrollView contentContainerStyle={{ paddingTop: 66, paddingBottom: NAV_H + 40 }} showsVerticalScrollIndicator={false} onScroll={hs.onScroll} scrollEventThrottle={16}>
        <Animated.View style={hs.hero}>
          <FadeIn style={{ paddingHorizontal: S.pad, marginTop: 10 }}>
            <Text style={T.h1()}>{t('home.hello', { name: app.firstName || 'Chris' })}</Text>
            <Text style={T.lead()}>{t('home.ready')}</Text>
          </FadeIn>
        </Animated.View>
        <FadeIn delay={120} style={{ flexDirection: 'row', gap: 12, paddingHorizontal: S.pad, marginTop: 8, alignItems: 'flex-end' }}>
          <Image source={IMG.mascotMain} style={{ width: W * 0.36, height: W * 0.5, flexShrink: 0, marginBottom: 6 }} resizeMode="contain" />
          <View style={{ flex: 1, gap: 10 }}>
            <View ref={r.send} collapsable={false}>
              <Press onPress={() => nav.navigate('SendSelect')} style={{ borderRadius: R.cardLg }}>
                <View style={[st.cta, st.ctaBlue]}>
                  <Image source={IMG.ico.send} style={st.ctaIco} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={[st.ctaT, { color: '#fff' }]}>{t('common.send')}</Text><Text style={[st.ctaS, { color: 'rgba(255,255,255,.85)' }]}>{t('home.sendSub')}</Text>
                  </View>
                </View>
              </Press>
            </View>
            <View ref={r.recv} collapsable={false}>
              <Press onPress={() => nav.navigate('Nearby', { files: [], mode: 'receive' })} style={{ borderRadius: R.cardLg }}>
                <GlassCard padding={12} radius={R.cardLg}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Image source={IMG.ico.receive} style={st.ctaIco} resizeMode="contain" />
                    <View style={{ flex: 1 }}>
                      <Text style={st.ctaT}>{t('common.receive')}</Text><Text style={st.ctaS}>{t('home.receiveSub')}</Text>
                    </View>
                  </View>
                </GlassCard>
              </Press>
            </View>
          </View>
        </FadeIn>

        <FadeIn delay={180} style={{ paddingHorizontal: S.padTight, marginTop: 14 }}>
          <View ref={r.devices} collapsable={false}>
            <GlassCard padding={12}>
              <SectionTitle icon={Smartphone} title={t('home.devices')} action={app.devices.length ? t('common.seeAll') : undefined} onAction={() => nav.navigate('Devices')} />
              {app.devices.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Image source={IMG.emptyDevices} style={{ width: 90, height: 70 }} resizeMode="contain" />
                  <Text style={T.strong()}>{t('home.noDevices')}</Text><Text style={T.body()}>{t('home.noDevicesSub')}</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {app.devices.map((d) => <DeviceCard key={d.id} d={d} compact onPress={() => nav.navigate('DeviceSheet', { device: d, files: [] })} />)}
                </ScrollView>
              )}
            </GlassCard>
          </View>
        </FadeIn>

        <FadeIn delay={240} style={{ paddingHorizontal: S.padTight, marginTop: 10 }}>
          <View ref={r.history} collapsable={false}>
            <GlassCard padding={12}>
              <SectionTitle icon={Clock} title={t('home.history')} action={app.history.length ? t('common.seeAll') : undefined} onAction={() => nav.navigate('History')} />
              {app.history.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 6 }}>
                  <Image source={IMG.emptyHistory} style={{ width: 90, height: 70 }} resizeMode="contain" />
                  <Text style={T.strong()}>{t('home.noHistory')}</Text><Text style={T.body()}>{t('home.noHistorySub')}</Text>
                </View>
              ) : app.history.slice(0, 3).map((h) => <HistoryRow key={h.id} h={h} onPress={() => nav.navigate('History')} />)}
            </GlassCard>
          </View>
        </FadeIn>

        {empty && (
          <FadeIn delay={300} style={{ paddingHorizontal: S.padTight, marginTop: 10 }}>
            <GlassCard padding={12}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[st.hIco, { backgroundColor: 'rgba(245,158,11,.15)' }]}><Zap size={16} color={C.orange} /></View>
                <View style={{ flex: 1 }}><Text style={T.strong()}>{t('home.tip')}</Text><Text style={T.body()}>{t('home.tipSub')}</Text></View>
                <Wifi size={16} color={C.mute} /><Usb size={16} color={C.mute} />
              </View>
            </GlassCard>
          </FadeIn>
        )}
      </ScrollView>
      <Animated.View style={[st.hdr, { top: -ins.top, paddingTop: ins.top, backgroundColor: hs.bar.backgroundColor }]} pointerEvents="box-none">
        <Header name={app.firstName || 'Chris'} avatar={avatar} hasNotif={hasNotif} refs={{ browser: r.browser, notifs: r.notifs, settings: r.settings }}
          onEdit={() => nav.navigate('Who', { fromSettings: true })} onBrowser={() => nav.navigate('Browser')} onNotifs={() => nav.navigate('Notifications')} onSettings={() => nav.navigate('Settings')} />
      </Animated.View>
      <Tour visible={tour} steps={steps} onDone={() => { setTour(false); app.set({ tourDone: true }); }} />
    </Screen>
  );
}
export { fmtDur };
const st = StyleSheet.create({
  hdr: { position: 'absolute', left: 0, right: 0, zIndex: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(8,124,255,.16)' },
  cta: { borderRadius: R.cardLg, padding: 10, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ctaBlue: { backgroundColor: '#1680FF', borderColor: C.glassBlueBorder, shadowColor: C.glow, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  ctaIco: { width: 26, height: 26, flexShrink: 0 },
  ctaT: { fontFamily: F.title, fontSize: 15, color: C.ink },
  ctaS: { fontFamily: F.body, fontSize: 11, color: C.mute },
  hIco: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});