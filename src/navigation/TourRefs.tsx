/** Refs partagées entre la barre du bas et l'Accueil pour que la visite guidée puisse éclairer les onglets et le Chargeur. */
import React, { createContext, useContext, useRef } from 'react';
import { View } from 'react-native';
import type { Tab } from '../ui/GlassNav';

type Refs = { tabs: Record<Tab, React.RefObject<View | null>>; charger: React.RefObject<View | null> };
const Ctx = createContext<Refs | null>(null);
export function TourRefsProvider({ children }: { children: React.ReactNode }) {
  const v: Refs = { tabs: { Home: useRef<View>(null), Files: useRef<View>(null), Gallery: useRef<View>(null), Music: useRef<View>(null) }, charger: useRef<View>(null) };
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}
export const useTourRefs = () => { const v = useContext(Ctx); if (!v) throw new Error('TourRefsProvider missing'); return v; };