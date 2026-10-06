/**
 * CONTRAT MOTEUR RÉSEAU — c'est ici que l'agent branche le vrai moteur (mDNS, hotspot, USB, relais clé).
 * L'UI ne connaît que cette interface. `MockEngine` simule tout (timers) pour que l'app soit cliquable de A à Z.
 * Remplacer `createEngine()` par la vraie implémentation sans toucher aux écrans.
 */
import * as Network from 'expo-network';
import { Device, FileItem, genKey } from '../data/mock';

export const FYLIO_PORT = 47811;            // port TCP/HTTP d'écoute du moteur sur l'appareil
export type QrPayload = { v: 1; ip: string; port: number; token: string; name: string; ssid?: string };

/** Encode / décode le QR : fylio://connect?v=1&ip=…&port=…&token=…&name=… (vrai QR généré avec react-native-qrcode-svg) */
export const encodeQr = (p: QrPayload) => `fylio://connect?${Object.entries(p).filter(([, v]) => v != null).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`;
export const decodeQr = (s: string): QrPayload | null => {
  if (!s.startsWith('fylio://connect?')) return null;
  const q = Object.fromEntries(s.slice('fylio://connect?'.length).split('&').map((kv) => { const [k, v = ''] = kv.split('='); return [k, decodeURIComponent(v)]; }));
  if (!q.ip || !q.token) return null;
  return { v: 1, ip: q.ip, port: Number(q.port) || FYLIO_PORT, token: q.token, name: q.name || 'Fylio', ssid: q.ssid };
};

export type Progress = { sentBytes: number; totalBytes: number; fileIndex: number; speedBps: number; etaSec: number };
export type TransferHandle = { cancel: () => void };
export type IncomingRequest = { from: Device; files: FileItem[]; accept: () => void; refuse: () => void };

export interface FylioEngine {
  /** Infos locales affichées dans le QR (IP réelle du téléphone via expo-network) */
  localInfo(): Promise<QrPayload>;
  /** Découverte des appareils à proximité (mDNS / hotspot / câble). Appelle `cb` à chaque mise à jour, retourne stop(). */
  discover(cb: (devices: Device[]) => void): () => void;
  /** Connexion à un appareil issu d'un QR scanné ou de la liste */
  connect(target: QrPayload | Device): Promise<Device>;
  /** Envoi de fichiers avec progression ; `onDone(ok)` à la fin */
  send(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void): TransferHandle;
  /** Écoute des demandes entrantes (écran « X veut t'envoyer ») */
  onIncoming(cb: (req: IncomingRequest) => void): () => void;
  /** Transfert à distance : clé 8 caractères valable 10 min (serveur relais) */
  createRemoteKey(): Promise<{ key: string; expiresAt: number }>;
  waitRemotePeer(key: string, cb: (peer: Device) => void): () => void;
  resolveRemoteKey(key: string): Promise<Device | null>;
  /** Câble USB détecté ? */
  onCable(cb: (connected: boolean) => void): () => void;
}

/* ------------------------------------------------------------------ */
/* MOCK : comportement réaliste à base de timers (à remplacer)        */
/* ------------------------------------------------------------------ */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export class MockEngine implements FylioEngine {
  demoDevices: Device[] = [
    { id: 'd2', name: 'PC Bureau', kind: 'pc', link: 'wifi', online: true, ip: '172.20.10.2' },
    { id: 'd1', name: 'iPhone 14', kind: 'iphone', link: 'wifi', online: true, ip: '172.20.10.3' },
    { id: 'd3', name: 'Galaxy S23', kind: 'android', link: 'hotspot', online: true, ip: '172.20.10.5' },
  ];
  cable = false;
  cableCbs = new Set<(c: boolean) => void>();
  incomingCbs = new Set<(r: IncomingRequest) => void>();
  setCable(c: boolean) { this.cable = c; this.cableCbs.forEach((f) => f(c)); }
  async localInfo(): Promise<QrPayload> {
    let ip = '192.168.1.24';
    try { ip = (await Network.getIpAddressAsync()) || ip; } catch {}
    return { v: 1, ip, port: FYLIO_PORT, token: genKey().toLowerCase(), name: 'Fylio', ssid: 'Fylio-Direct' };
  }
  discover(cb: (d: Device[]) => void) {
    cb([]);
    const t1 = setTimeout(() => cb(this.demoDevices.slice(0, 1)), 1800);
    const t2 = setTimeout(() => cb(this.demoDevices.slice(0, 2)), 3200);
    const t3 = setTimeout(() => cb(this.demoDevices), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }
  async connect(target: QrPayload | Device) {
    await sleep(900);
    if ('token' in target) return { id: 'qr-' + target.token, name: target.name, kind: 'android', link: 'wifi', online: true, ip: target.ip } as Device;
    return target;
  }
  send(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void) {
    const total = Math.max(files.reduce((a, f) => a + f.size, 0), 1);
    let sent = 0; let cancelled = false;
    const speed = peer.link === 'cable' ? 48e6 : 22e6;
    const iv = setInterval(() => {
      if (cancelled) return;
      sent = Math.min(total, sent + speed / 8 * (0.7 + Math.random() * 0.6));
      let acc = 0, idx = 0; for (; idx < files.length; idx++) { acc += files[idx].size; if (acc > sent) break; }
      onProgress({ sentBytes: sent, totalBytes: total, fileIndex: Math.min(idx, files.length - 1), speedBps: speed, etaSec: (total - sent) / speed });
      if (sent >= total) { clearInterval(iv); setTimeout(() => onDone(true), 400); }
    }, 125);
    return { cancel: () => { cancelled = true; clearInterval(iv); onDone(false); } };
  }
  onIncoming(cb: (r: IncomingRequest) => void) { this.incomingCbs.add(cb); return () => { this.incomingCbs.delete(cb); }; }
  /** Pour la démo : simule une demande entrante (bouton dans Paramètres) */
  simulateIncoming(files: FileItem[]) {
    const from = this.demoDevices[2];
    this.incomingCbs.forEach((cb) => cb({ from, files, accept: () => {}, refuse: () => {} }));
  }
  async createRemoteKey() { await sleep(400); return { key: genKey(), expiresAt: Date.now() + 10 * 60 * 1000 }; }
  waitRemotePeer(_key: string, cb: (peer: Device) => void) { const t = setTimeout(() => cb(this.demoDevices[1]), 9000); return () => clearTimeout(t); }
  async resolveRemoteKey(key: string) { await sleep(1600); return key.length === 8 ? this.demoDevices[0] : null; }
  onCable(cb: (c: boolean) => void) { this.cableCbs.add(cb); cb(this.cable); return () => { this.cableCbs.delete(cb); }; }
}
export const engine = new MockEngine();   // ← remplacer par le vrai moteur
export const createEngine = (): FylioEngine => engine;