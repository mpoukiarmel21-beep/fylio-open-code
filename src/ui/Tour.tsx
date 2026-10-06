/**
 * Visite guidée / guides « spotlight ».
 * - Les écrans passent des refs d'éléments (useRef(View)). On mesure chaque cible
 *   (measureInWindow) : le reste de l'écran est assombri, la cible reste éclairée
 *   (trou arrondi), une bulle vitrée s'affiche au-dessus ou en dessous avec le
 *   titre, la phrase, les points d'étape, Passer / Suivant (ou libellé final).
 * - Chaque bulle disparaît (fade + slide) avant la suivante.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable, Dimensions, findNodeHandle, UIManager } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { C, F, R } from '../theme';
import { GlassButton, Press } from './index';

export type TourStep = { ref: React.RefObject<any>; title: string; text: string; radius?: number; pad?: number; last?: string };
type Rect4 = { x: number; y: number; w: number; h: number };
const { width: W, height: H } = Dimensions.get('window');

export function Tour({ steps, onDone, visible }: { steps: TourStep[]; onDone: () => void; visible: boolean }) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect4 | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const measure = (k: number) => {
    const s = steps[k]; if (!s) return;
    const node = s.ref.current;
    const done = (x: number, y: number, w: number, h: number) => { const p = s.pad ?? 6; setRect({ x: x - p, y: y - p, w: w + p * 2, h: h + p * 2 }); Animated.timing(fade, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); };
    if (node?.measureInWindow) node.measureInWindow(done);
    else { const h = findNodeHandle(node); if (h) UIManager.measureInWindow(h, done); }
  };
  useEffect(() => { if (visible) { setI(0); setTimeout(() => measure(0), 350); } }, [visible]);
  if (!visible || !steps.length) return null;
  const next = () => {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      if (i + 1 >= steps.length) { onDone(); return; }
      setI(i + 1); setTimeout(() => measure(i + 1), 60);
    });
  };
  const s = steps[i];
  const r = rect ?? { x: W / 2 - 40, y: H / 2 - 40, w: 80, h: 80 };
  const rad = s.radius ?? 18;
  const below = r.y + r.h + 180 < H - 90;
  const bubbleTop = below ? r.y + r.h + 14 : undefined;
  const bubbleBottom = below ? undefined : H - r.y + 14;
  const cx = Math.min(Math.max(r.x + r.w / 2, 40), W - 40);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <Mask id="m"><Rect width={W} height={H} fill="#fff" /><Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={rad} ry={rad} fill="#000" /></Mask>
          </Defs>
          <Rect width={W} height={H} fill={C.dim} mask="url(#m)" />
          <Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={rad} ry={rad} fill="none" stroke="rgba(170,249,255,.95)" strokeWidth={2} />
        </Svg>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} />
        <View style={[st.bubble, { top: bubbleTop, bottom: bubbleBottom }]}>
          <View style={[st.arrow, below ? { top: -7 } : { bottom: -7 }, { left: Math.min(Math.max(cx - 14 - 8, 16), W - 28 - 16 - 16) }]} />
          <Text style={st.title}>{s.title}</Text>
          <Text style={st.text}>{s.text}</Text>
          <View style={st.foot}>
            <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>{steps.map((_, k) => <View key={k} style={[st.dot, k === i && st.dotOn]} />)}</View>
            {i + 1 < steps.length && <Press onPress={onDone} hit={8}><Text style={st.skip}>{t('common.skip')}</Text></Press>}
            <GlassButton small label={i + 1 >= steps.length ? (s.last ?? t('common.letsGo')) : t('common.next')} icon={ChevronRight} onPress={next} glow={false} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
const st = StyleSheet.create({
  bubble: { position: 'absolute', left: 14, right: 14, backgroundColor: 'rgba(255,255,255,.94)', borderRadius: R.card, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,.9)', shadowColor: '#0A3A8A', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  arrow: { position: 'absolute', width: 14, height: 14, backgroundColor: 'rgba(255,255,255,.94)', transform: [{ rotate: '45deg' }] },
  title: { fontFamily: F.title, fontSize: 16, color: C.ink },
  text: { fontFamily: F.body, fontSize: 13, color: '#3B5A99', marginTop: 4, lineHeight: 18 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(10,58,138,.18)' },
  dotOn: { width: 16, backgroundColor: C.accent },
  skip: { fontFamily: F.bodyB, fontSize: 13, color: C.mute },
});