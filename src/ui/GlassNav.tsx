/**
 * Barre du bas — spec maquette : une seule pill vitrée à 4 onglets
 * `Accueil | Fichiers | Musique | Galerie` (ordre maquette), capsule bleue 10 %
 * + indicateur 20x3 qui glisse sous l'onglet actif, + bouton câble rond 56x56
 * détaché de 12 px à droite avec un mini câble dessiné (2 connecteurs + arc).
 * Le câble passe au vert + halo pulsant quand un câble est détecté.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Folder, Image as ImgIco, Music } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { C, F, R } from '../theme';
import { Press } from './index';

export const NAV_H = 72;
export type Tab = 'Home' | 'Files' | 'Music' | 'Gallery';
const TABS: { key: Tab; icon: any; label: string }[] = [
  { key: 'Home', icon: Home, label: 'common.home' },
  { key: 'Files', icon: Folder, label: 'common.files' },
  { key: 'Music', icon: Music, label: 'common.music' },
  { key: 'Gallery', icon: ImgIco, label: 'common.gallery' },
];

/** Mini câble dessiné (2 connecteurs + arc) — trait fin 1.8 px, pas une icône générique. */
export function CableIco({ size = 26, color = C.ink, sw = 1.8 }: { size?: number; color?: string; sw?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="1.9" y="8.7" width="5.4" height="6.6" rx="1.7" stroke={color} strokeWidth={sw} />
      <Path d="M4.1 10.6v2.8" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Rect x="16.7" y="8.7" width="5.4" height="6.6" rx="1.7" stroke={color} strokeWidth={sw} />
      <Path d="M19.9 10.6v2.8" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M7.3 12c2.5 4.4 6.9 4.4 9.4 0" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
}

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
  const slot = navW > 0 ? navW / 4 : 0;
  const capW = Math.max(0, slot - 10);
  return (
    <View style={[st.wrap, { paddingBottom: Math.max(ins.bottom - 12, 6) }]} pointerEvents="box-none">
      <View style={st.nav} onLayout={(e) => setNavW(e.nativeEvent.layout.width)}>
        <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(255,255,255,.62)', 'rgba(255,255,255,.34)']} style={StyleSheet.absoluteFill} />
        {slot > 0 && (
          <Animated.View style={[st.ind, { width: capW, transform: [{ translateX: Animated.add(Animated.multiply(ind, slot), new Animated.Value(5)) }] }]}>
            <LinearGradient colors={['rgba(8,124,255,.16)', 'rgba(46,144,250,.09)']} style={StyleSheet.absoluteFill} />
            <View style={st.bar} />
          </Animated.View>
        )}
        {TABS.map((tb) => {
          const on = tb.key === active; const Ico = tb.icon;
          return (
            <View key={tb.key} ref={tabRefs?.[tb.key]} collapsable={false} style={{ flex: 1 }}>
              <Press onPress={() => onTab(tb.key)} style={st.tab}>
                <Ico size={24} color={on ? C.accent : C.mute} strokeWidth={on ? 2.6 : 2.2} />
                <Text style={{ fontFamily: on ? F.bodyX : F.bodyB, fontSize: 10, color: on ? C.accent : C.mute }}>{t(tb.label)}</Text>
              </Press>
            </View>
          );
        })}
      </View>
      <View ref={chargerRef} collapsable={false} style={{ width: 56, height: NAV_H, alignItems: 'center', justifyContent: 'center' }}>
        <Press onPress={onCharger} style={st.charger}>
          {cable && <Animated.View style={[st.halo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.22] }) }] }]} />}
          <View style={[st.chargerIn, cable && { borderColor: 'rgba(29,186,107,.65)', backgroundColor: 'rgba(29,186,107,.14)' }]}>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            {!cable && <LinearGradient colors={['rgba(255,255,255,.62)', 'rgba(255,255,255,.34)']} style={StyleSheet.absoluteFill} />}
            <CableIco size={26} color={cable ? C.green : C.ink} sw={1.9} />
            {cable && <View style={st.dot} />}
          </View>
        </Press>
      </View>
    </View>
  );
}
const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  nav: { flex: 1, height: NAV_H, borderRadius: R.nav, overflow: 'hidden', flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,.75)', shadowColor: '#166AB1', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  ind: { position: 'absolute', top: 6, bottom: 6, borderRadius: 26, overflow: 'hidden' },
  bar: { position: 'absolute', bottom: 5, alignSelf: 'center', width: 20, height: 3, borderRadius: 2, backgroundColor: C.accent },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: NAV_H, paddingHorizontal: 4 },
  charger: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  chargerIn: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.75)' },
  halo: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: '#54ffbd' },
  dot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
});
