/** Historique (6b) et Appareils (6) avec états vides + popup « Veux-tu envoyer un fichier ? », Notifications, Paramètres. */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, Animated, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Bell, Check, X, Download, Globe, User, Smartphone, ShieldCheck, RotateCcw, Info, Trash2, Usb, Database, Inbox, Languages, Send } from 'lucide-react-native';
import { Screen, HeaderBack, GlassCard, GlassButton, GhostButton, Press, T, FadeIn, Row, W } from '../ui';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { useApp } from '../store/AppStore';
import { DEMO_FILES } from '../data/mock';
import { engine } from '../net/engine';
import { LANGS } from '../i18n';
import { DeviceCard, HistoryRow, ago } from './Home';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;

/* État vide : illustration de l'Accueil centrée + popup animée « Veux-tu envoyer un fichier ? » */
function EmptyPage({ title, sub }: { title: string; sub: string }) {
  const nav = useNavigation<Nav>(); const { t } = useTranslation();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(v, { toValue: 1, delay: 500, useNativeDriver: true, speed: 10, bounciness: 10 }).start(); }, []);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.pad }}>
      <Image source={IMG.mascotMain} style={{ width: W * 0.7, height: W * 0.6 }} resizeMode="contain" />
      <Text style={[T.h1(), { fontSize: 20, textAlign: 'center', marginTop: 6 }]}>{title}</Text><Text style={[T.lead(), { textAlign: 'center' }]}>{sub}</Text>
      <Animated.View style={{ alignSelf: 'stretch', marginTop: 24, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
        <GlassCard padding={14}><Text style={[T.cardT(), { textAlign: 'center', marginBottom: 10 }]}>{t('history.popo')}</Text><GlassButton label={t('common.send')} icon={Send} onPress={() => nav.navigate('SendSelect')} /></GlassCard>
      </Animated.View>
    </View>
  );
}
export function HistoryScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const app = useApp();
  return (
    <Screen bg={4}>
      <HeaderBack title={t('history.title')} onBack={() => nav.goBack()} right={app.history.length ? <Press onPress={() => app.clearHistory()} hit={6}><Trash2 size={18} color={C.mute} /></Press> : undefined} />
      {app.history.length === 0 ? <EmptyPage title={t('history.empty')} sub={t('history.emptySub')} /> : (
        <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: 40 }}><GlassCard padding={8}>{app.history.map((h) => <HistoryRow key={h.id} h={h} />)}</GlassCard>
          <GhostButton label={t('home.clear')} icon={Trash2} style={{ marginTop: 12 }} onPress={() => app.clearHistory()} /></ScrollView>)}
    </Screen>
  );
}
export function DevicesScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const app = useApp();
  return (
    <Screen bg={4}>
      <HeaderBack title={t('history.devicesTitle')} onBack={() => nav.goBack()} />
      {app.devices.length === 0 ? <EmptyPage title={t('history.devicesEmpty')} sub={t('history.devicesEmptySub')} /> : (
        <ScrollView contentContainerStyle={{ padding: 8, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{app.devices.map((d) => <DeviceCard key={d.id} d={d} onPress={() => nav.navigate('DeviceSheet', { device: d, files: [] })} />)}</ScrollView>)}
    </Screen>
  );
}
/* Notifications : demandes (Accepter / Refuser), terminés, interrompus ; marquées lues à l'ouverture */
export function NotificationsScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const app = useApp();
  useEffect(() => () => app.markNotifsRead(), []);
  return (
    <Screen bg={4}>
      <HeaderBack title={t('notifs.title')} onBack={() => nav.goBack()} />
      {app.notifs.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.pad }}><View style={st.bigIco}><Bell size={36} color={C.accent} /></View><Text style={[T.h1(), { fontSize: 20, marginTop: 14 }]}>{t('notifs.empty')}</Text><Text style={[T.lead(), { textAlign: 'center' }]}>{t('notifs.emptySub')}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 8, gap: 8 }}>
          {app.notifs.map((n, i) => (
            <FadeIn key={n.id} delay={i * 50}>
              <GlassCard padding={12} style={!n.read ? { borderColor: 'rgba(0,225,255,.7)' } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[st.nIco, { backgroundColor: n.type === 'done' ? 'rgba(29,186,107,.15)' : n.type === 'failed' ? 'rgba(245,158,11,.15)' : 'rgba(8,124,255,.12)' }]}>{n.type === 'done' ? <Check size={18} color={C.green} /> : n.type === 'failed' ? <X size={18} color={C.orange} /> : <Download size={18} color={C.accent} />}</View>
                  <View style={{ flex: 1 }}><Text style={T.strong()}>{t(`notifs.${n.type}`)} • {n.title}</Text><Text style={T.body()}>{n.sub} • {ago(n.at, t)}</Text></View>
                </View>
                {n.type === 'request' && <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}><View style={{ flex: 1 }}><GhostButton small label={t('common.refuse')} /></View><View style={{ flex: 1 }}><GlassButton small label={t('common.accept')} onPress={() => nav.navigate('Transfer', { peer: engine.demoDevices[2], files: DEMO_FILES.slice(0, 3), dir: 'received' })} /></View></View>}
              </GlassCard>
            </FadeIn>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}
/* Paramètres : profil (prénom / personnage / langue), sécurité, revoir visite & guides, outils de démo, à propos */
export function SettingsScreen() {
  const nav = useNavigation<Nav>(); const { t } = useTranslation(); const app = useApp();
  const avatar = app.avatar >= 0 ? IMG.avatars[app.avatar] : IMG.avatars[0];
  const lang = LANGS.find((l) => l.code === app.lang);
  const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => <FadeIn style={{ marginTop: 12 }}><Text style={[T.cardT(), { marginLeft: 10, marginBottom: 6 }]}>{title}</Text><GlassCard padding={4}>{children}</GlassCard></FadeIn>;
  const Ico = ({ i: I, c = C.accent }: { i: any; c?: string }) => <View style={[st.nIco, { backgroundColor: c + '22' }]}><I size={18} color={c} /></View>;
  return (
    <Screen bg={4}>
      <HeaderBack title={t('settings.title')} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: 40 }}>
        <GlassCard padding={14}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Image source={avatar} style={{ width: 64, height: 64 }} resizeMode="contain" /><View style={{ flex: 1 }}><Text style={[T.h1(), { fontSize: 20 }]}>{app.firstName || 'Chris'}</Text><Text style={T.body()}>{lang?.flag} {lang?.name}</Text></View></View></GlassCard>
        <Sec title={t('settings.profile')}>
          <Row title={t('settings.name')} sub={app.firstName} left={<Ico i={User} />} onPress={() => nav.navigate('Who', { fromSettings: true })} />
          <Row title={t('settings.character')} left={<Ico i={Smartphone} />} onPress={() => nav.navigate('Who', { fromSettings: true })} />
          <Row title={t('settings.language')} sub={`${lang?.flag} ${lang?.name}`} left={<Ico i={Languages} />} onPress={() => nav.navigate('Lang', { fromSettings: true })} />
        </Sec>
        <Sec title={t('settings.security')}>
          <Row title={t('settings.trusted')} sub={`${app.devices.length}`} left={<Ico i={ShieldCheck} c={C.green} />} onPress={() => nav.navigate('Devices')} />
          <Row title={t('settings.autoAccept')} left={<Ico i={Inbox} c={C.green} />} right={<Switch value={false} trackColor={{ true: C.green }} />} />
        </Sec>
        <Sec title="Aide">
          <Row title={t('settings.replay')} left={<Ico i={RotateCcw} />} onPress={() => { app.set({ tourDone: false }); nav.navigate('Tabs', { screen: 'Home' }); }} />
          <Row title={t('settings.replayGuides')} left={<Ico i={RotateCcw} />} onPress={() => { app.set({ guideSendDone: false, guideRecvDone: false }); nav.goBack(); }} />
        </Sec>
        <Sec title="Démo (à retirer en production)">
          <Row title={t('settings.simulateCable')} left={<Ico i={Usb} c={C.green} />} right={<Switch value={app.cable} onValueChange={(v) => { app.set({ cable: v }); engine.setCable(v); }} trackColor={{ true: C.green }} thumbColor="#fff" />} />
          <Row title={t('settings.demoData')} left={<Ico i={Database} />} onPress={() => { app.loadDemo(); nav.goBack(); }} />
          <Row title={t('notifs.request')} left={<Ico i={Download} />} onPress={() => { nav.navigate('Incoming', { from: engine.demoDevices[2], files: DEMO_FILES.slice(0, 4) }); }} />
          <Row title={t('settings.reset')} left={<Ico i={Trash2} c={C.red} />} onPress={() => Alert.alert(t('settings.reset'), '', [{ text: t('common.cancel') }, { text: 'OK', style: 'destructive', onPress: () => { app.reset(); nav.reset({ index: 0, routes: [{ name: 'Splash' }] }); } }])} />
        </Sec>
        <Sec title={t('settings.about')}>
          <Row title={t('settings.version')} sub="Fylio 1.0.0 (Expo SDK 57)" left={<Ico i={Info} />} right={<View />} />
          <Row title={t('common.browser')} sub="fylio.app" left={<Ico i={Globe} />} onPress={() => nav.navigate('Browser', { url: 'https://example.com' })} />
        </Sec>
      </ScrollView>
    </Screen>
  );
}
const st = StyleSheet.create({
  bigIco: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,.75)', alignItems: 'center', justifyContent: 'center' },
  nIco: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});