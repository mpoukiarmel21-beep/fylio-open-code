import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Device, HistoryItem, Notif, DEMO_DEVICES, DEMO_HISTORY } from '../data/mock';

/** État global persistant (AsyncStorage) : profil, onboarding, appareils, historique, notifications, câble. */
export type AppState = {
  ready: boolean;
  lang: string;
  avatar: number;            // 0-5 = personnages, -1 = photo perso
  photoUri?: string;
  firstName: string;
  onboarded: boolean;        // écrans 2-4 faits
  tourDone: boolean;         // visite guidée Accueil (11 étapes)
  guideSendDone: boolean;    // guide 1re fois Envoyer à distance
  guideRecvDone: boolean;    // guide 1re fois Recevoir à distance
  devices: Device[];
  history: HistoryItem[];
  notifs: Notif[];
  cable: boolean;            // câble détecté (bouton vert) — simulé via Paramètres
};
type Actions = {
  set: (p: Partial<AppState>) => void;
  addHistory: (h: HistoryItem) => void;
  addDevice: (d: Device) => void;
  clearHistory: () => void;
  markNotifsRead: () => void;
  loadDemo: () => void;
  reset: () => void;
};
const DEFAULT: AppState = {
  ready: false, lang: 'fr', avatar: 0, firstName: '', onboarded: false, tourDone: false,
  guideSendDone: false, guideRecvDone: false, devices: [], history: [], notifs: [], cable: false,
};
const Ctx = createContext<(AppState & Actions) | null>(null);
const KEY = 'fylio.state.v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<AppState>(DEFAULT);
  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      setS({ ...DEFAULT, ...(raw ? JSON.parse(raw) : {}), ready: true });
    }).catch(() => setS({ ...DEFAULT, ready: true }));
  }, []);
  useEffect(() => { if (s.ready) AsyncStorage.setItem(KEY, JSON.stringify({ ...s, ready: undefined })); }, [s]);

  const api = useMemo<AppState & Actions>(() => ({
    ...s,
    set: (p) => setS((x) => ({ ...x, ...p })),
    addHistory: (h) => setS((x) => ({ ...x, history: [h, ...x.history] })),
    addDevice: (d) => setS((x) => ({ ...x, devices: [d, ...x.devices.filter((o) => o.id !== d.id)].slice(0, 8) })),
    clearHistory: () => setS((x) => ({ ...x, history: [], devices: [] })),
    markNotifsRead: () => setS((x) => ({ ...x, notifs: x.notifs.map((n) => ({ ...n, read: true })) })),
    loadDemo: () => setS((x) => ({ ...x, devices: DEMO_DEVICES, history: DEMO_HISTORY, notifs: [{ id: 'n1', type: 'done', title: 'Photos famille', sub: '2,4 Go', read: false, at: Date.now() }] })),
    reset: () => setS({ ...DEFAULT, ready: true }),
  }), [s]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppProvider');
  return v;
};