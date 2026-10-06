/**
 * Barre du bas — reprise du glass-nav-kit : un seul bloc vitré à 4 onglets
 * (Accueil / Fichiers / Galerie / Musique) avec l'indicateur « liquide » qui glisse
 * sous l'onglet actif, + le Chargeur dans son propre cercle à droite.
 * Le chargeur passe au vert avec un halo pulsant quand un câble est détecté.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Folder, Image as ImgIco, Music, Plug } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { C, F, R } from '../theme';
import { Press } from './index';

export const NAV_H = 64;
export type Tab = 'Home' | 'Files' | 'Gallery' | 'Music';
const TABS: { key: Tab; icon: any; label: string }[] = [
  { key: 'Home', icon: Home, label: 'common.home' }, { key: 'Files', icon: Folder, label: 'common.files' },
  { key: 'Gallery', icon: ImgIco, label: 'common.gallery' }, { key: 'Music', icon: Music, label: 'common.music' },
];

export function GlassNav({ active, onTab, cable, onCharger, chargerRef, tabRefs }: { active: Tab; onTab: (t: Tab) => void; cable: boolean; onCharger: () => void; chargerRef?: any; tabRefs?: Record<Tab, any> }) {
  const { t } = useTranslation();
  const ins = useSafeAreaInsets();
  const idx = TABS.findIndex((x) => x.key === active);
  const ind = useRef(new Animated.Value(idx)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [navW, setNavW] = React.useState(0);
  useEffect(() => { Animated.spring(ind, { toValue: idx, useNativeDriver: true, speed: 18, bounciness: 7 }).start(); }, [idx, ind]);
  useEffect(() => {
    if (!cable) { pulse.setValue(0); return; }
    const l = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])); l.start(); return () => l.stop();
  }, [cable, pulse]);
  const slot = navW > 0 ? (navW - 10) / 4 : 0;
  return (
    <View style={[st.wrap, { paddingBottom: Math.max(ins.bottom, 10) }]} pointerEvents="box-none">
      <View style={st.nav} onLayout={(e) => setNavW(e.nativeEvent.layout.width)}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,255,255,.62)', 'rgba(255,255,255,.34)']} style={StyleSheet.absoluteFill} />
        {slot > 0 && (
          <Animated.View style={[st.ind, { width: slot, transform: [{ translateX: Animated.add(Animated.multiply(ind, slot), new Animated.Value(5)) }] }]}>
            <LinearGradient colors={['rgba(25,207,255,.55)', 'rgba(8,125,247,.35)']} style={[StyleSheet.absoluteFill, { borderRadius: R.nav - 6 }]} />
          </Animated.View>
        )}
        {TABS.map((tb) => {
          const on = tb.key === active; const Ico = tb.icon;
          return (
            <View key={tb.key} ref={tabRefs?.[tb.key]} collapsable={false} style={{ flex: 1 }}>
              <Press onPress={() => onTab(tb.key)} style={st.tab}>
                <Ico size={22} color={on ? C.accent : C.mute} strokeWidth={on ? 2.5 : 2} />
                <Text style={{ fontFamily: on ? F.bodyX : F.bodyB, fontSize: 10, color: on ? C.accent : C.mute }}>{t(tb.label)}</Text>
              </Press>
            </View>
          );
        })}
      </View>
      <View ref={chargerRef} collapsable={false}>
        <Press onPress={onCharger} style={st.charger}>
          {cable && <Animated.View style={[st.halo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] }]} />}
          <View style={[st.chargerIn, cable && { borderColor: 'rgba(84,255,189,.9)' }]}>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <LinearGradient colors={cable ? ['rgba(84,255,189,.85)', 'rgba(24,217,154,.75)'] : ['rgba(255,255,255,.62)', 'rgba(255,255,255,.34)']} style={StyleSheet.absoluteFill} />
            <Plug size={24} color={cable ? '#fff' : C.ink} strokeWidth={2.3} />
          </View>
        </Press>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nav: { flex: 1, height: NAV_H, borderRadius: R.nav, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,.75)', shadowColor: '#166AB1', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ind: { position: 'absolute', top: 6, bottom: 6, borderRadius: R.nav - 6, overflow: 'hidden' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: NAV_H },
  charger: { width: NAV_H, height: NAV_H, alignItems: 'center', justifyContent: 'center' },
  chargerIn: { width: NAV_H, height: NAV_H, borderRadius: NAV_H / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.75)' },
  halo: { position: 'absolute', width: NAV_H + 14, height: NAV_H + 14, borderRadius: (NAV_H + 14) / 2, backgroundColor: '#54ffbd' },
});