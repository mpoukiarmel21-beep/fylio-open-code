/** Écrans 1→4 : Splash animé, Choix de la langue, Qui es-tu ?, Autorisations. */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image, TextInput, ScrollView, Switch } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Check, Camera, Wifi, Image as ImgIco, Music, ChevronRight } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import { useCameraPermissions } from 'expo-camera';
import { Screen, GlassCard, GlassButton, Press, T, FadeIn, W } from '../ui';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';
import { LANGS, setLanguage } from '../i18n';
import { useApp } from '../store/AppStore';
import type { RootParams } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootParams>;

/* 1 — Splash : logo qui apparaît (scale + fade), avion papier qui glisse, puis route */
export function SplashScreen() {
  const nav = useNavigation<Nav>();
  const app = useApp();
  const a = useRef(new Animated.Value(0)).current;
  const plane = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(plane, { toValue: 1, duration: 1400, delay: 300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [a, plane]);
  useEffect(() => {
    if (!app.ready) return;
    const t = setTimeout(() => nav.replace(app.onboarded ? 'Tabs' : 'Lang'), 2200);
    return () => clearTimeout(t);
  }, [app.ready, app.onboarded]);
  return (
    <Screen bg={1}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
          <Image source={IMG.logo} style={{ width: W * 0.72, height: W * 0.36 }} resizeMode="contain" />
        </Animated.View>
        <Animated.View style={{ position: 'absolute', bottom: 120, opacity: plane.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: plane.interpolate({ inputRange: [0, 1], outputRange: [-W * 0.6, W * 0.6] }) }, { translateY: plane.interpolate({ inputRange: [0, 0.5, 1], outputRange: [20, -30, 10] }) }] }}>
          <Text style={{ fontSize: 28 }}>✈️</Text>
        </Animated.View>
        <View style={{ position: 'absolute', bottom: 60, flexDirection: 'row', gap: 6 }}>
          {[0, 1, 2].map((i) => <Dot key={i} delay={i * 200} />)}
        </View>
      </View>
    </Screen>
  );
}
function Dot({ delay }: { delay: number }) {
  const v = useRef(new Animated.Value(0.3)).current;
  useEffect(() => { const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 500, delay, useNativeDriver: true }), Animated.timing(v, { toValue: 0.3, duration: 500, useNativeDriver: true })])); l.start(); return () => l.stop(); }, [v, delay]);
  return <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff', opacity: v }} />;
}

/* 2 — Langue : liste des 9 langues, coche sur la sélection, toute l'UI change immédiatement */
export function LangScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const app = useApp();
  const [sel, setSel] = useState(app.lang);
  const pick = (c: string) => { setSel(c); setLanguage(c); app.set({ lang: c }); };
  return (
    <Screen bg={2}>
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 40 }}>
        <FadeIn><Image source={IMG.logo} style={{ width: 150, height: 75, alignSelf: 'center', marginBottom: 6 }} resizeMode="contain" /></FadeIn>
        <FadeIn delay={80}><Text style={[T.h1(true), { textAlign: 'center' }]}>{t('lang.title')}</Text><Text style={[T.lead(true), { textAlign: 'center', marginBottom: 16 }]}>{t('lang.subtitle')}</Text></FadeIn>
        {LANGS.map((l, i) => (
          <FadeIn key={l.code} delay={120 + i * 40}>
            <Press onPress={() => pick(l.code)} style={{ marginBottom: 8 }}>
              <GlassCard deep padding={0} radius={R.card} style={sel === l.code ? { borderColor: 'rgba(170,249,255,.95)', borderWidth: 1.5 } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{l.flag}</Text>
                  <Text style={{ flex: 1, fontFamily: F.bodyB, fontSize: 16, color: '#fff' }}>{l.name}</Text>
                  {sel === l.code && <View style={st.chk}><Check size={14} color="#fff" strokeWidth={3} /></View>}
                </View>
              </GlassCard>
            </Press>
          </FadeIn>
        ))}
        <GlassButton label={t('common.continue')} icon={ChevronRight} style={{ marginTop: 10 }} onPress={() => route.params?.fromSettings ? nav.goBack() : nav.navigate('Who')} />
      </ScrollView>
    </Screen>
  );
}

/* 3 — Qui es-tu ? : grille des 6 personnages (+ Ma photo), prénom, Entrer dans Fylio */
export function WhoScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<any>();
  const { t } = useTranslation();
  const app = useApp();
  const [av, setAv] = useState(app.avatar);
  const [name, setName] = useState(app.firstName);
  const size = (W - S.pad * 2 - 24) / 3;
  const go = () => { app.set({ avatar: av, firstName: name.trim() || 'Chris' }); route.params?.fromSettings ? nav.goBack() : nav.navigate('Perms'); };
  return (
    <Screen bg={3}>
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FadeIn><Text style={[T.h1(true), { textAlign: 'center' }]}>{t('who.title')}</Text><Text style={[T.lead(true), { textAlign: 'center', marginBottom: 16 }]}>{t('who.subtitle')}</Text></FadeIn>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {IMG.avatars.map((src, i) => (
            <FadeIn key={i} delay={80 + i * 50}>
              <Press onPress={() => setAv(i)} scale={0.94}>
                <View style={[st.avWrap, { width: size, height: size }, av === i && st.avOn]}>
                  <Image source={src} style={{ width: size - 16, height: size - 16 }} resizeMode="contain" />
                  {av === i && <View style={[st.chk, { position: 'absolute', top: 8, right: 8 }]}><Check size={14} color="#fff" strokeWidth={3} /></View>}
                </View>
              </Press>
            </FadeIn>
          ))}
        </View>
        <Press onPress={() => setAv(-1)} style={{ marginTop: 12 }}>
          <GlassCard deep padding={12} style={av === -1 ? { borderColor: 'rgba(170,249,255,.95)' } : undefined}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Camera size={18} color="#fff" /><Text style={{ color: '#fff', fontFamily: F.bodyB, fontSize: 15 }}>{t('who.myPhoto')}</Text></View>
          </GlassCard>
        </Press>
        <Text style={[T.strong(true), { marginTop: 18, marginBottom: 6 }]}>{t('who.firstName')}</Text>
        <GlassCard deep padding={0} radius={R.pill}>
          <TextInput value={name} onChangeText={setName} placeholder={t('who.placeholder')} placeholderTextColor="rgba(255,255,255,.65)" style={{ height: 50, paddingHorizontal: 18, color: '#fff', fontFamily: F.bodyB, fontSize: 16 }} />
        </GlassCard>
        <GlassButton label={t('who.enter')} icon={ChevronRight} style={{ marginTop: 18 }} onPress={go} />
      </ScrollView>
    </Screen>
  );
}

/* 4 — Autorisations : personnage choisi + 4 cartes avec interrupteurs (vraies demandes caméra / photos) */
export function PermsScreen() {
  const nav = useNavigation<Nav>();
  const { t } = useTranslation();
  const app = useApp();
  const [camPerm, askCam] = useCameraPermissions();
  const [libPerm, askLib] = MediaLibrary.usePermissions();
  const [net, setNet] = useState(true); const [mus, setMus] = useState(true);
  const avatar = app.avatar >= 0 ? IMG.avatars[app.avatar] : IMG.avatars[0];
  const items = [
    { k: 'net', icon: Wifi, on: net, set: () => setNet(!net) },
    { k: 'cam', icon: Camera, on: !!camPerm?.granted, set: () => askCam() },
    { k: 'photos', icon: ImgIco, on: !!libPerm?.granted, set: () => askLib() },
    { k: 'music', icon: Music, on: mus, set: () => setMus(!mus) },
  ];
  return (
    <Screen bg={3}>
      <ScrollView contentContainerStyle={{ padding: S.pad, paddingBottom: 40 }}>
        <FadeIn><Image source={avatar} style={{ width: 150, height: 150, alignSelf: 'center' }} resizeMode="contain" /></FadeIn>
        <FadeIn delay={60}><Text style={[T.h1(true), { textAlign: 'center' }]}>{t('perms.title', { name: app.firstName })}</Text><Text style={[T.lead(true), { textAlign: 'center', marginBottom: 14 }]}>{t('perms.subtitle')}</Text></FadeIn>
        {items.map((it, i) => (
          <FadeIn key={it.k} delay={120 + i * 60}>
            <GlassCard deep padding={12} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={st.permIco}><it.icon size={20} color="#fff" /></View>
                <View style={{ flex: 1 }}><Text style={T.strong(true)}>{t(`perms.${it.k}`)}</Text><Text style={T.body(true)}>{t(`perms.${it.k}Sub`)}</Text></View>
                <Switch value={it.on} onValueChange={it.set} trackColor={{ true: C.green, false: 'rgba(255,255,255,.35)' }} thumbColor="#fff" />
              </View>
            </GlassCard>
          </FadeIn>
        ))}
        <GlassButton label={t('common.letsGo')} icon={ChevronRight} style={{ marginTop: 10 }} onPress={() => { app.set({ onboarded: true }); nav.reset({ index: 0, routes: [{ name: 'Tabs' }] }); }} />
      </ScrollView>
    </Screen>
  );
}
const st = StyleSheet.create({
  chk: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  avWrap: { borderRadius: R.cardLg, backgroundColor: 'rgba(255,255,255,.22)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,.45)', alignItems: 'center', justifyContent: 'center' },
  avOn: { backgroundColor: 'rgba(255,255,255,.38)', borderColor: 'rgba(170,249,255,.95)' },
  permIco: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.25)', alignItems: 'center', justifyContent: 'center' },
});