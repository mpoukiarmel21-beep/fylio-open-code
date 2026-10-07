/**
 * Composants de base de la DA « Liquid Glass » Fylio.
 * - Screen        : fond Nebula (1-4) avec dérive lente + contenu safe-area
 * - GlassCard     : carte en verre blanc (ou verre sombre sur fonds foncés)
 * - GlassButton   : bouton bleu vitré du kit (Envoyer / Continuer…) avec press animé
 * - GhostButton   : bouton blanc translucide (Recevoir / Copier…)
 * - Header        : avatar + prénom + icônes (navigateur, cloche, paramètres)
 * - HeaderBack    : flèche retour + titre centré
 * - Search / Chip : barre de recherche et puces
 * - Pressable animé (scale 0.97) + haptique léger partout
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ViewStyle, TextStyle, TextInput, Image, Dimensions, Platform, StyleProp } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Search as SearchIco, Bell, Settings as SettingsIco, Globe, Pencil, LucideIcon } from 'lucide-react-native';
import { C, F, R, S } from '../theme';
import { IMG } from '../assets';

export const { width: W, height: H } = Dimensions.get('window');
export const haptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/* ---------- Fond Nebula ---------- */
export function Background({ variant = 4 }: { variant?: 1 | 2 | 3 | 4 }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start(); return () => loop.stop();
  }, [a]);
  const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.06] });
  const tx = a.interpolate({ inputRange: [0, 1], outputRange: [-3, 3] });
  const ty = a.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] });
  const deep = variant <= 3;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.Image source={IMG.bg[variant]} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', transform: [{ scale }, { translateX: tx }, { translateY: ty }] }]} />
      {deep && <LinearGradient colors={['rgba(8,30,90,.25)', 'rgba(8,30,90,0)', 'rgba(8,30,90,.45)']} style={StyleSheet.absoluteFill} />}
    </View>
  );
}

/* ---------- Écran ---------- */
export function Screen({ children, bg = 4, pad = true, style }: { children: React.ReactNode; bg?: 1 | 2 | 3 | 4; pad?: boolean; style?: StyleProp<ViewStyle> }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#dfeeff' }}>
      <Background variant={bg} />
      <View style={[{ flex: 1, paddingTop: ins.top, paddingBottom: pad ? 0 : 0 }, style]}>{children}</View>
    </View>
  );
}
export const useDeep = (bg: number) => bg <= 3;

/* ---------- Pressable animé ---------- */
export function Press({ children, onPress, style, disabled, scale = 0.97, hit }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; scale?: number; hit?: number }) {
  const v = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(v, { toValue: x, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable disabled={disabled} hitSlop={hit} onPressIn={() => to(scale)} onPressOut={() => to(1)} onPress={() => { haptic(); onPress?.(); }}>
      <Animated.View style={[style, { transform: [{ scale: v }], opacity: disabled ? 0.55 : 1 }]}>{children}</Animated.View>
    </Pressable>
  );
}

/* ---------- Verre ---------- */
const GlassBase = ({ children, style, deep, radius = R.card, intensity = 28 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; deep?: boolean; radius?: number; intensity?: number }) => (
  <View style={[{ borderRadius: radius, overflow: 'hidden', borderWidth: 1, borderColor: deep ? C.glassDeepBorder : C.glassWhiteBorder }, deep ? sh.deepShadow : sh.whiteShadow, style]}>
    <BlurView intensity={intensity} tint={deep ? 'light' : 'light'} style={StyleSheet.absoluteFill} />
    <LinearGradient colors={deep ? [...C.glassDeep] : [...C.glassWhite]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,.55)', 'rgba(255,255,255,0)']} start={{ x: 0.2, y: 0 }} end={{ x: 0.6, y: 0.5 }} style={StyleSheet.absoluteFill} />
    {children}
  </View>
);
export function GlassCard({ children, style, deep, radius, padding = 14 }: { children?: React.ReactNode; style?: StyleProp<ViewStyle>; deep?: boolean; radius?: number; padding?: number }) {
  return <GlassBase deep={deep} radius={radius} style={style}><View style={{ padding }}>{children}</View></GlassBase>;
}

/* ---------- Bouton bleu vitré (kit) ---------- */
export function GlassButton({ label, icon: Icon, onPress, style, small, disabled, glow = true }: { label: string; icon?: LucideIcon; onPress?: () => void; style?: StyleProp<ViewStyle>; small?: boolean; disabled?: boolean; glow?: boolean }) {
  const h = small ? 42 : 54;
  return (
    <Press onPress={onPress} disabled={disabled} style={[glow && sh.blueGlow, { borderRadius: R.pill }, style]}>
      <View style={{ borderRadius: R.pill, overflow: 'hidden', borderWidth: 1, borderColor: C.glassBlueBorder }}>
        <LinearGradient colors={[...C.glassBlue]} locations={[...C.glassBlueLoc]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: h, paddingHorizontal: small ? 18 : 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <LinearGradient pointerEvents="none" colors={['rgba(122,245,255,.62)', 'rgba(122,245,255,0)']} start={{ x: 0.18, y: 0.18 }} end={{ x: 0.7, y: 0.9 }} style={StyleSheet.absoluteFill} />
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,.46)', 'rgba(255,255,255,.12)', 'rgba(255,255,255,0)']} locations={[0, 0.28, 0.54]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {Icon && <Icon size={small ? 16 : 18} color="#fff" strokeWidth={2.4} />}
          <Text style={{ color: '#fff', fontFamily: F.bodyX, fontSize: small ? 14 : 16 }} numberOfLines={1}>{label}</Text>
        </LinearGradient>
      </View>
    </Press>
  );
}
export function GhostButton({ label, icon: Icon, onPress, style, deep, small }: { label: string; icon?: LucideIcon; onPress?: () => void; style?: StyleProp<ViewStyle>; deep?: boolean; small?: boolean }) {
  return (
    <Press onPress={onPress} style={[{ borderRadius: R.pill }, style]}>
      <GlassBase deep={deep} radius={R.pill}>
        <View style={{ height: small ? 42 : 52, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {Icon && <Icon size={17} color={deep ? '#fff' : C.ink} strokeWidth={2.3} />}
          <Text style={{ color: deep ? '#fff' : C.ink, fontFamily: F.bodyB, fontSize: 15 }} numberOfLines={1}>{label}</Text>
        </View>
      </GlassBase>
    </Press>
  );
}
export function IconButton({ icon: Icon, onPress, deep, size = 40, badge, active, img }: { icon?: LucideIcon; onPress?: () => void; deep?: boolean; size?: number; badge?: boolean; active?: boolean; img?: any }) {
  return (
    <Press onPress={onPress} hit={6}>
      <GlassBase deep={deep} radius={size / 2} style={{ width: size, height: size }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {img ? <Image source={img} style={{ width: size * 0.62, height: size * 0.62 }} resizeMode="contain" /> : Icon && <Icon size={size * 0.47} color={active ? C.accent : deep ? '#fff' : C.ink} strokeWidth={2.2} />}
        </View>
      </GlassBase>
      {badge && <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 2, borderColor: '#fff' }} />}
    </Press>
  );
}

/* ---------- Header qui se masque au scroll (spec : masqué en descendant, réaffiché en remontant) ---------- */
export function useScrollHide() {
  const [hidden, setHidden] = useState(false);
  const a = useRef(new Animated.Value(0)).current;
  const last = useRef(0);
  const hiddenRef = useRef(false);
  useEffect(() => { Animated.timing(a, { toValue: hiddenRef.current ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [hidden, a]);
  const setH = (v: boolean) => { if (hiddenRef.current !== v) { hiddenRef.current = v; setHidden(v); } };
  const onScroll = (e: any) => {
    const y: number = e?.nativeEvent?.contentOffset?.y ?? 0;
    if (y <= 10) setH(false);
    else if (y > last.current + 8) setH(true);
    else if (y < last.current - 8) setH(false);
    last.current = y;
  };
  const wrap: any = {
    overflow: 'hidden' as const,
    opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    maxHeight: a.interpolate({ inputRange: [0, 1], outputRange: [140, 0] }),
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) }],
  };
  return { onScroll, wrap };
}

/* ---------- En-tête natif iOS : grand titre qui monte vers les icônes de statut et disparaît ;
 *  la BANDE d'en-tête (avatar + nom + icônes) glisse vers le haut et s'estompe au scroll de
 *  façon « native Apple » (comme si elle disparaissait), puis réapparaît en remontant en haut. ---------- */
export function useHeaderCollapse() {
  const y = useRef(new Animated.Value(0)).current;
  const onScroll = (e: any) => { const v = e?.nativeEvent?.contentOffset?.y ?? 0; y.setValue(Math.max(0, v)); };
  const bar: any = {
    opacity: y.interpolate({ inputRange: [0, 110], outputRange: [0, 1], extrapolate: 'clamp' }),
    backgroundColor: y.interpolate({ inputRange: [0, 110], outputRange: ['rgba(238,247,255,0)', 'rgba(238,247,255,.9)'], extrapolate: 'clamp' }),
  };
  const hero: any = {
    transform: [
      { translateY: y.interpolate({ inputRange: [0, 120], outputRange: [0, -50], extrapolate: 'clamp' }) },
      { scale: y.interpolate({ inputRange: [0, 120], outputRange: [1, 0.82], extrapolate: 'clamp' }) },
    ],
    opacity: y.interpolate({ inputRange: [60, 140], outputRange: [1, 0], extrapolate: 'clamp' }),
  };
  const head: any = {
    transform: [{ translateY: y.interpolate({ inputRange: [0, 130], outputRange: [0, -72], extrapolate: 'clamp' }) }],
    opacity: y.interpolate({ inputRange: [0, 120], outputRange: [1, 0], extrapolate: 'clamp' }),
  };
  return { onScroll, bar, hero, head };
}

/* ---------- Header utilisateur ---------- */
export function Header({ name, avatar, onEdit, onBrowser, onNotifs, onSettings, hasNotif, deep, refs }: { name: string; avatar: any; onEdit?: () => void; onBrowser?: () => void; onNotifs?: () => void; onSettings?: () => void; hasNotif?: boolean; deep?: boolean; refs?: { browser?: any; notifs?: any; settings?: any } }) {
  const col = deep ? '#fff' : C.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.pad, paddingTop: 6, gap: 10 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.5)' }}><Image source={avatar} style={{ width: 44, height: 44 }} resizeMode="cover" /></View>
      <View style={{ flex: 1 }}>
        <Press onPress={onEdit} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ fontFamily: F.title, fontSize: 17, color: col }}>{name}</Text><Pencil size={13} color={deep ? 'rgba(255,255,255,.8)' : C.mute} /></Press>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.green }} /><Text style={{ fontFamily: F.body, fontSize: 12, color: deep ? 'rgba(255,255,255,.85)' : C.mute }}>En ligne</Text></View>
      </View>
      <View ref={refs?.browser} collapsable={false}><IconButton icon={Globe} onPress={onBrowser} deep={deep} /></View>
      <View ref={refs?.notifs} collapsable={false}><IconButton icon={Bell} onPress={onNotifs} deep={deep} badge={hasNotif} /></View>
      <View ref={refs?.settings} collapsable={false}><IconButton icon={SettingsIco} onPress={onSettings} deep={deep} /></View>
    </View>
  );
}
export function HeaderBack({ title, sub, onBack, right, deep, compact }: { title: string; sub?: string; onBack: () => void; right?: React.ReactNode; deep?: boolean; compact?: boolean }) {
  const col = deep ? '#fff' : C.ink;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.pad, paddingTop: 6, minHeight: 56 }}>
      <IconButton icon={ChevronLeft} onPress={onBack} deep={deep} />
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
        <Text style={{ fontFamily: F.title, fontSize: compact ? 17 : 20, color: col }} numberOfLines={1}>{title}</Text>
        {sub && <Text style={{ fontFamily: F.body, fontSize: 12, color: deep ? 'rgba(255,255,255,.85)' : C.mute, textAlign: 'center' }} numberOfLines={2}>{sub}</Text>}
      </View>
      <View style={{ width: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/* ---------- Recherche / Chips ---------- */
export function Search({ placeholder, value, onChange, deep, style }: { placeholder: string; value?: string; onChange?: (v: string) => void; deep?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <GlassBase deep={deep} radius={R.pill} style={[{ height: 42 }, style]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 }}>
        <SearchIco size={17} color={deep ? '#fff' : C.mute} />
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={deep ? 'rgba(255,255,255,.7)' : C.mute} style={{ flex: 1, fontFamily: F.body, fontSize: 14, color: deep ? '#fff' : C.ink, paddingVertical: 0 }} />
      </View>
    </GlassBase>
  );
}
export function Chip({ label, active, onPress, count }: { label: string; active?: boolean; onPress?: () => void; count?: number }) {
  return (
    <Press onPress={onPress} style={{ borderRadius: R.pill }}>
      {active ? (
        <LinearGradient colors={[...C.glassBlue]} locations={[...C.glassBlueLoc]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[sh.chip, { borderColor: C.glassBlueBorder }]}>
          <Text style={{ color: '#fff', fontFamily: F.bodyB, fontSize: 13 }}>{label}{count != null ? ` ${count}` : ''}</Text>
        </LinearGradient>
      ) : (
        <View style={[sh.chip, { backgroundColor: 'rgba(255,255,255,.55)', borderColor: 'rgba(255,255,255,.8)' }]}><Text style={{ color: C.ink, fontFamily: F.bodyB, fontSize: 13 }}>{label}{count != null ? ` ${count}` : ''}</Text></View>
      )}
    </Press>
  );
}

/* ---------- Textes ---------- */
export const T = {
  h1: (deep?: boolean): TextStyle => ({ fontFamily: F.title, fontSize: 28, color: deep ? '#fff' : C.ink, letterSpacing: -0.3 }),
  lead: (deep?: boolean): TextStyle => ({ fontFamily: F.body, fontSize: 14, color: deep ? 'rgba(255,255,255,.88)' : C.mute, marginTop: 2 }),
  cardT: (deep?: boolean): TextStyle => ({ fontFamily: F.bodyX, fontSize: 14, color: deep ? '#fff' : C.ink }),
  body: (deep?: boolean): TextStyle => ({ fontFamily: F.body, fontSize: 13, color: deep ? 'rgba(255,255,255,.85)' : C.mute }),
  strong: (deep?: boolean): TextStyle => ({ fontFamily: F.bodyB, fontSize: 14, color: deep ? '#fff' : C.ink }),
};
export function Row({ title, sub, left, right, onPress, deep, tight }: { title: string; sub?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void; deep?: boolean; tight?: boolean }) {
  return (
    <Press onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: tight ? 7 : 10, paddingHorizontal: 10 }}>
      {left}
      <View style={{ flex: 1 }}><Text style={T.strong(deep)} numberOfLines={1}>{title}</Text>{sub && <Text style={T.body(deep)} numberOfLines={1}>{sub}</Text>}</View>
      {right ?? <ChevronRight size={18} color={deep ? '#fff' : C.mute} />}
    </Press>
  );
}
export function SectionTitle({ icon: Icon, title, action, onAction, deep }: { icon?: LucideIcon; title: string; action?: string; onAction?: () => void; deep?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      {Icon && <Icon size={16} color={deep ? '#fff' : C.ink} strokeWidth={2.4} />}
      <Text style={[T.cardT(deep), { flex: 1 }]}>{title}</Text>
      {action && <Press onPress={onAction}><Text style={{ fontFamily: F.bodyB, fontSize: 12, color: deep ? '#fff' : C.accent }}>{action} ›</Text></Press>}
    </View>
  );
}
/* ---------- Fade-in à l'apparition ---------- */
export function FadeIn({ children, delay = 0, style, y = 14 }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle>; y?: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>{children}</Animated.View>;
}

const sh = StyleSheet.create({
  whiteShadow: { shadowColor: '#388BD1', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  deepShadow: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  blueGlow: { shadowColor: C.glow, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: R.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
export { ChevronRight, Platform };