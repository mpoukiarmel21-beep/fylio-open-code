/**
 * CONTRAT MOTEUR RÉSEAU — l'UI ne connaît que `FylioEngine`.
 * - `MockEngine` : tout simule (timers) → app cliquable de A à Z, y compris démos.
 * - `LanEngine` : LAN réel — mDNS (`_fylio._tcp`) + TCP binaire port 47811 + vrais fichiers.
 *   Protocole v1 (une connexion par appareil, réutilisée) :
 *   1. lignes JSON UTF-8 terminees par `\n` : `hello` → `ack`, `send` (manifeste {name,size}[]) → `accept` {ok} ;
 *   2. si ok : flux d'octets BRUTS de longueur totale exacte = somme(size), cadre par le manifeste.
 *   Le relais cle 8 caracteres (distance) viendra dans un second temps (Supabase) — aujourd'hui mock.
 */
import { Platform } from 'react-native';
import * as Network from 'expo-network';
import * as ExpoDevice from 'expo-device';
import { Directory, File, FileMode, FileHandle, Paths } from 'expo-file-system';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';
import { Buffer } from 'buffer';
import { Device, DeviceKind, FileItem, FileKind, genKey } from '../data/mock';
import { resolveMediaUri } from '../data/library';

export const FYLIO_PORT = 47811;            // port TCP d'ecoute du moteur sur l'appareil
export const FYLIO_PROTO = 1;               // version du protocole (hello.v)
const SERVICE_TYPE = 'fylio';               // -> _fylio._tcp (declare dans NSBonjourServices)
const READ_CHUNK = 256 * 1024;              // lecture fichier
const CONNECT_TIMEOUT = 9000;               // timeout TCP + hello
const ACCEPT_TIMEOUT = 45000;               // delai de reponse a la demande entrante
const WRITE_STALL = 30000;                  // write() sans callback = pair bloque
const RECV_DIR = 'Received';                // sous-dossier de reception (扫描 par la bibliotheque)

export type QrPayload = { v: 1; ip: string; port: number; token: string; name: string; ssid?: string; kind?: DeviceKind };

/** Encode / decode le QR : fylio://connect?v=1&ip=…&port=…&token=…&name=… (vrai QR genere avec react-native-qrcode-svg) */
export const encodeQr = (p: QrPayload) => `fylio://connect?${Object.entries(p).filter(([, v]) => v != null).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')}`;
export const decodeQr = (s: string): QrPayload | null => {
  if (!s.startsWith('fylio://connect?')) return null;
  const q = Object.fromEntries(s.slice('fylio://connect?'.length).split('&').map((kv) => { const [k, v = ''] = kv.split('='); return [k, decodeURIComponent(v)]; }));
  if (!q.ip || !q.token) return null;
  return { v: 1, ip: q.ip, port: Number(q.port) || FYLIO_PORT, token: q.token, name: q.name || 'Fylio', ssid: q.ssid, kind: q.kind === 'pc' || q.kind === 'iphone' || q.kind === 'android' ? q.kind : undefined };
};

export type Progress = { sentBytes: number; totalBytes: number; fileIndex: number; speedBps: number; etaSec: number };
export type TransferHandle = { cancel: () => void };
export type IncomingRequest = { from: Device; files: FileItem[]; accept: () => void; refuse: () => void };

export interface FylioEngine {
  /** Infos locales affichees dans le QR (IP reelle du telephone via expo-network) */
  localInfo(): Promise<QrPayload>;
  /** Decouverte des appareils a proximite (mDNS / hotspot / cable). Appelle `cb` a chaque mise a jour, retourne stop(). */
  discover(cb: (devices: Device[]) => void): () => void;
  /** Connexion a un appareil issu d'un QR scanned ou de la liste */
  connect(target: QrPayload | Device): Promise<Device>;
  /** Envoi de fichiers avec progression ; `onDone(ok)` a la fin */
  send(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void): TransferHandle;
  /** Reception d'un flux accepte : progresse sur l'etat reel (ou simulation si aucune session) */
  receive(files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void): TransferHandle;
  /** Ecoute des demandes entrantes (ecran "X veut t'envoyer") */
  onIncoming(cb: (req: IncomingRequest) => void): () => void;
  /** Valide / refuse la demande entrante en attente (appele par l'ecran Incoming) ; false si deja prise/echec */
  acceptIncoming(): boolean;
  refuseIncoming(): void;
  /** Transfert a distance : cle 8 caracteres valable 10 min (serveur relais) */
  createRemoteKey(): Promise<{ key: string; expiresAt: number }>;
  waitRemotePeer(key: string, cb: (peer: Device) => void): () => void;
  resolveRemoteKey(key: string): Promise<Device | null>;
  /** Cable USB detecte ? */
  onCable(cb: (connected: boolean) => void): () => void;
}

/* ------------------------------------------------------------------ */
/* Outillage partage                                                   */
/* ------------------------------------------------------------------ */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** tcp-socket embarque sa propre copie de `buffer` : on caste (meme Uint8Array au runtime) */
const toBuf = (d: unknown): Buffer => (typeof d === 'string' ? Buffer.from(d, 'utf8') : (d as Buffer));
const asKind = (v: unknown): DeviceKind => (v === 'pc' || v === 'iphone' || v === 'android' ? v : 'android');
const sumSizes = (files: FileItem[]) => files.reduce((a, f) => a + f.size, 0);
const BAD_CHARS = '\\/:*?"<>|';
/** Nom de fichier sain : caracteres illegaux/remplacements -> `_`, 120 car. max */
const sanitizeName = (n: string) => {
  let out = '';
  for (const ch of Array.from(n)) {
    const code = ch.charCodeAt(0);
    out += code < 32 || BAD_CHARS.includes(ch) ? '_' : ch;
  }
  out = out.trim().slice(0, 120);
  return out || 'fichier';
};
const kindForName = (name: string): FileKind => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'svg'].includes(ext)) return 'photo';
  if (['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', '3gp'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'opus'].includes(ext)) return 'music';
  if (['doc', 'docx', 'pages', 'key', 'numbers', 'xls', 'xlsx', 'ppt', 'pptx', 'rtf', 'csv', 'txt', 'md'].includes(ext)) return 'doc';
  return 'other';
};
/** Dossier Received/ dans documents (cree a la volee) */
const receivedDir = () => {
  const d = new Directory(Paths.document, RECV_DIR);
  if (!d.exists) d.create({ intermediates: true });
  return d;
};
/** Nom unique dans Received/ : "photo.jpg" -> "photo (1).jpg" ... */
const uniqueFile = (rawName: string) => {
  const dir = receivedDir();
  const name = sanitizeName(rawName);
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  let cand = new File(dir, name);
  let n = 1;
  while (cand.exists) cand = new File(dir, `${stem} (${n++})${ext}`);
  return cand;
};

/* ------------------------------------------------------------------ */
/* MOCK : comportement realiste a base de timers (repli demo)          */
/* ------------------------------------------------------------------ */
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
    if ('token' in target) return { id: 'qr-' + target.token, name: target.name, kind: target.kind ?? 'android', link: 'wifi', online: true, ip: target.ip } as Device;
    return target;
  }
  /** Simulation partagee : sert de repli demo (appareil inconnu du LAN, fichier sans uri...) */
  simulate(files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void, speed: number): TransferHandle {
    const total = Math.max(sumSizes(files), 1);
    let sent = 0; let cancelled = false;
    const iv = setInterval(() => {
      if (cancelled) return;
      sent = Math.min(total, sent + speed / 8 * (0.7 + Math.random() * 0.6));
      let acc = 0, idx = 0; for (; idx < files.length; idx++) { acc += files[idx].size; if (acc > sent) break; }
      onProgress({ sentBytes: sent, totalBytes: total, fileIndex: Math.min(idx, files.length - 1), speedBps: speed, etaSec: (total - sent) / speed });
      if (sent >= total) { clearInterval(iv); setTimeout(() => onDone(true), 400); }
    }, 125);
    return { cancel: () => { cancelled = true; clearInterval(iv); onDone(false); } };
  }
  send(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void) {
    return this.simulate(files, onProgress, onDone, peer.link === 'cable' ? 48e6 : 22e6);
  }
  receive(files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void) {
    return this.simulate(files, onProgress, onDone, 20e6);
  }
  onIncoming(cb: (r: IncomingRequest) => void) { this.incomingCbs.add(cb); return () => { this.incomingCbs.delete(cb); }; }
  acceptIncoming() { return true; }
  refuseIncoming() {}
  /** Pour la demo : simule une demande entrante (bouton dans Parametres) */
  simulateIncoming(files: FileItem[]) {
    const from = this.demoDevices[2];
    this.incomingCbs.forEach((cb) => cb({ from, files, accept: () => {}, refuse: () => {} }));
  }
  async createRemoteKey() { await sleep(400); return { key: genKey(), expiresAt: Date.now() + 10 * 60 * 1000 }; }
  waitRemotePeer(_key: string, cb: (peer: Device) => void) { const t = setTimeout(() => cb(this.demoDevices[1]), 9000); return () => clearTimeout(t); }
  async resolveRemoteKey(key: string) { await sleep(1600); return key.length === 8 ? this.demoDevices[0] : null; }
  onCable(cb: (c: boolean) => void) { this.cableCbs.add(cb); cb(this.cable); return () => { this.cableCbs.delete(cb); }; }
}

/* ------------------------------------------------------------------ */
/* LAN REEL : mDNS + TCP binaire + vrais fichiers                      */
/* ------------------------------------------------------------------ */
type Line = { t?: string; ok?: boolean } & Record<string, any>;
type Waiter = { pred: (m: Line) => boolean; res: (m: Line) => void; rej: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
/** Session sortante (client) : une par appareil, reutilisee entre envois */
type Sess = { sock: TcpSocket.Socket; ip: string; port: number; buf: Buffer; queue: Line[]; waiters: Waiter[]; dead: boolean };
/** Flux entrant (serveur) : etat de reception d'une connexion */
type Conn = { sock: TcpSocket.Socket; ip: string; buf: Buffer; phase: 'line' | 'bytes'; from: Device | null; rx: Rx | null; closed: boolean };
/** Reus en cours : fichier ouvert, compteurs, vitesse */
type Rx = { from: Device; files: FileItem[]; total: number; idx: number; fileWritten: number; received: number; handle: FileHandle | null; file: File | null; done: boolean; ok: boolean; speed: number; lastAt: number; lastBytes: number };
type SendState = { cancelled: boolean; sess: Sess | null };

export class LanEngine extends MockEngine {
  private myId = genKey();
  private myName: string;
  private myKind: DeviceKind;
  private zc = new Zeroconf();
  private zcBound = false;
  private server: TcpSocket.Server | null = null;
  private started = false;
  private scanStarted = false;
  private published = false;
  private sessions = new Map<string, Sess>();
  private conns = new Set<Conn>();
  private devices = new Map<string, Device>();
  private peerPorts = new Map<string, number>();
  private discCbs = new Set<(d: Device[]) => void>();
  private inCbs = new Set<(r: IncomingRequest) => void>();
  private pending: { from: Device; files: FileItem[]; total: number; conn: Conn } | null = null;
  private reqShown = false;
  private activeRx: Rx | null = null;

  constructor() {
    super();
    this.myName = (ExpoDevice.deviceName || (Platform.OS === 'ios' ? 'iPhone' : 'Android')).slice(0, 32);
    this.myKind = Platform.OS === 'ios' ? 'iphone' : 'android';
  }

  /* ---- vie du moteur : serveur TCP + publication mDNS (demarrage a la demande) ---- */

  private start(): void {
    if (this.started) return;
    this.started = true;
    try {
      this.server = TcpSocket.createServer({ noDelay: true }, (sock) => this.onConn(sock));
      this.server.on('error', (e) => console.warn('[fylio] serveur TCP :', e.message));
      this.server.listen({ port: FYLIO_PORT, host: '0.0.0.0', reuseAddress: true }, () => this.advertise());
    } catch (e) {
      this.started = false;
      console.warn('[fylio] serveur TCP indisponible :', errText(e));
    }
  }

  private advertise(): void {
    if (this.published) return;
    this.published = true;
    this.bindZc();
    this.zc
      .publishService({ type: SERVICE_TYPE, protocol: 'tcp', name: `Fylio-${this.myId.slice(0, 4)}`, port: FYLIO_PORT, txt: { name: this.myName, kind: this.myKind, id: this.myId } })
      .then((s) => console.log('[fylio] publie :', s.name))
      .catch((e) => console.warn('[fylio] publication mDNS :', errText(e)));
  }

  private bindZc(): void {
    if (this.zcBound) return;
    this.zcBound = true;
    this.zc.on('resolved', (svc) => {
      if (svc.txt?.id === this.myId) return;                 // notre propre annonce
      const raw = svc.ipv4?.[0] || svc.addresses?.[0] || '';
      const ip = raw.replace(/^::ffff:/, '');
      if (!ip) return;
      const d: Device = { id: 'mdns:' + svc.name, name: String(svc.txt?.name || svc.name).slice(0, 40), kind: asKind(svc.txt?.kind), link: 'wifi', online: true, ip };
      this.devices.set(d.id, d);
      this.peerPorts.set(d.id, svc.port || FYLIO_PORT);
      this.emitDisc();
    });
    this.zc.on('remove', (name) => {
      const id = 'mdns:' + name;
      if (this.devices.delete(id)) { this.peerPorts.delete(id); this.emitDisc(); }
    });
    this.zc.on('error', (e) => console.warn('[fylio] mDNS :', e.code ?? '', e.message));
  }

  private emitDisc(): void {
    if (!this.discCbs.size) return;
    const list = [...this.devices.values()];
    this.discCbs.forEach((f) => f(list));
  }

  /* ---- API moteur ---- */

  discover(cb: (d: Device[]) => void): () => void {
    this.start();
    this.bindZc();
    this.discCbs.add(cb);
    cb([...this.devices.values()]);
    if (!this.scanStarted) {
      this.scanStarted = true;
      void this.zc.checkLocalNetworkAccess({ type: SERVICE_TYPE }).catch(() => {});
      try { this.zc.scan({ type: SERVICE_TYPE, protocol: 'tcp' }); } catch (e) { console.warn('[fylio] scan mDNS :', errText(e)); }
    }
    return () => { this.discCbs.delete(cb); };
  }

  async localInfo(): Promise<QrPayload> {
    this.start();
    let ip = '192.168.1.24';
    try { ip = (await Network.getIpAddressAsync()) || ip; } catch {}
    return { v: 1, ip, port: FYLIO_PORT, token: genKey().toLowerCase(), name: 'Fylio', ssid: 'Fylio-Direct', kind: this.myKind };
  }

  /** QR scanned : bravoure la connexion (hello/ack) pour prouver la portee ; la session reste ouverte pour l'envoi. */
  async connect(target: QrPayload | Device): Promise<Device> {
    if (!('token' in target)) return target;
    await this.dial(target.ip, target.port || FYLIO_PORT, { name: this.myName, kind: this.myKind });
    return { id: 'qr-' + target.token, name: target.name, kind: target.kind ?? 'android', link: 'wifi', online: true, ip: target.ip };
  }

  send(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void): TransferHandle {
    if (!this.isReal(peer)) return this.simulate(files, onProgress, onDone, peer.link === 'cable' ? 48e6 : 22e6);
    const st: SendState = { cancelled: false, sess: null };
    void this.runSend(peer, files, onProgress, onDone, st);
    return { cancel: () => { st.cancelled = true; if (st.sess) { try { st.sess.sock.destroy(); } catch {} } } };
  }

  receive(files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void): TransferHandle {
    const rx = this.activeRx && this.activeRx.files === files ? this.activeRx : null;
    if (!rx) return this.simulate(files, onProgress, onDone, 20e6);
    if (rx.done) {
      const ok = rx.ok;
      onProgress(this.snap(rx));
      const t = setTimeout(() => onDone(ok), 200);
      return { cancel: () => clearTimeout(t) };
    }
    let stopped = false;
    const iv = setInterval(() => {
      if (stopped) return;
      onProgress(this.snap(rx));
      if (rx.done) { stopped = true; clearInterval(iv); onDone(rx.ok); }
    }, 125);
    return { cancel: () => {
      if (stopped) return;
      stopped = true; clearInterval(iv);
      if (!rx.done) { this.failRx(rx); onDone(false); }
    } };
  }

  onIncoming(cb: (r: IncomingRequest) => void): () => void {
    this.start();
    this.inCbs.add(cb);
    this.flushReq();
    return () => {
      this.inCbs.delete(cb);
      if (!this.inCbs.size) this.reqShown = false;   // re-affichage a la prochaine montee d'ecran
    };
  }

  acceptIncoming(): boolean {
    const p = this.pending;
    if (!p || p.conn.closed || p.conn.rx) return false;
    const rx: Rx = { from: p.from, files: p.files, total: p.total, idx: 0, fileWritten: 0, received: 0, handle: null, file: null, done: false, ok: false, speed: 0, lastAt: Date.now(), lastBytes: 0 };
    try {
      this.openNext(rx);
    } catch (e) {
      console.warn('[fylio] reception :', errText(e));
      this.pending = null;
      this.sendLine(p.conn.sock, { t: 'accept', ok: false });
      return false;
    }
    this.pending = null;
    p.conn.rx = rx;
    p.conn.phase = 'bytes';
    this.activeRx = rx;
    this.sendLine(p.conn.sock, { t: 'accept', ok: true });
    return true;
  }

  refuseIncoming(): void {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    this.sendLine(p.conn.sock, { t: 'accept', ok: false });
  }

  /* ---- emission (client) ---- */

  /** Appareil reel = IP ET (decouvert en mDNS OU session TCP existante) ; sinon repli demo. */
  private isReal(peer: Device): boolean {
    if (!peer.ip) return false;
    if (this.sessions.has(peer.ip)) return true;
    for (const d of this.devices.values()) if (d.ip === peer.ip) return true;
    return false;
  }

  private async runSend(peer: Device, files: FileItem[], onProgress: (p: Progress) => void, onDone: (ok: boolean) => void, st: SendState): Promise<void> {
    let done = false;
    let sent = 0;
    let total = 0;
    let lastEmit = Date.now();
    let lastEmitBytes = 0;
    let speed = 0;
    const finish = (ok: boolean) => { if (done) return; done = true; st.sess = null; onDone(ok); };
    const emit = (fileIndex: number, force = false) => {
      const now = Date.now();
      if (!force && now - lastEmit < 125) return;
      const dt = (now - lastEmit) / 1000;
      if (dt > 0.05) {
        const inst = (sent - lastEmitBytes) / dt;
        speed = speed ? speed * 0.6 + inst * 0.4 : inst;
        lastEmit = now; lastEmitBytes = sent;
      }
      onProgress({ sentBytes: sent, totalBytes: total, fileIndex, speedBps: speed, etaSec: speed > 0 ? Math.max(total - sent, 0) / speed : 0 });
    };
    try {
      const port = this.peerPorts.get(peer.id) ?? FYLIO_PORT;
      const sess = await this.dial(peer.ip!, port, { name: this.myName, kind: this.myKind });
      st.sess = sess;
      if (st.cancelled) throw new Error('annule');
      // 1. resolution + taille reelle de chaque fichier (asset media -> uri, iCloud -> telechargement)
      const stat: { f: FileItem; uri: string; size: number }[] = [];
      for (const f of files) {
        if (st.cancelled) throw new Error('annule');
        const uri = await resolveMediaUri(f.uri ?? f.id);
        if (!uri) throw new Error(`fichier introuvable : ${f.name}`);
        const size = this.statSize(uri);
        if (size <= 0) throw new Error(`taille illisible : ${f.name}`);
        stat.push({ f, uri, size });
      }
      total = stat.reduce((a, s) => a + s.size, 0);
      // 2. manifeste puis attente de la decision de l'autre borne
      const waiter = this.waitCtrl(sess, (m) => m.t === 'accept', ACCEPT_TIMEOUT);
      this.sendLine(sess.sock, { t: 'send', v: FYLIO_PROTO, files: stat.map((s) => ({ name: s.f.name, size: s.size })), total });
      const ans = await waiter;
      if (st.cancelled || ans.ok === false) { finish(false); return; }
      // 3. flux binaire, octet pour octet, avec rappel d'ecriture = dos reel
      for (let i = 0; i < stat.length; i++) {
        if (st.cancelled) throw new Error('annule');
        const { uri, size, f } = stat[i];
        emit(i, true);
        const handle = new File(uri).open(FileMode.ReadOnly);
        try {
          let read = 0;
          while (read < size) {
            if (st.cancelled) throw new Error('annule');
            const chunk = handle.readBytes(Math.min(READ_CHUNK, size - read));
            if (!chunk.length) throw new Error(`lecture interrompue : ${f.name}`);
            read += chunk.length;
            sent += chunk.length;
            await this.writeChunk(sess, chunk);
            emit(i);
          }
        } finally {
          try { handle.close(); } catch {}
        }
        emit(i + 1, true);
      }
      finish(true);
    } catch (e) {
      console.warn('[fylio] envoi :', errText(e));
      finish(false);
    }
  }

  private statSize(uri: string): number {
    try {
      const h = new File(uri).open(FileMode.ReadOnly);
      try { return h.size ?? 0; } finally { try { h.close(); } catch {} }
    } catch { return 0; }
  }

  private writeChunk(sess: Sess, chunk: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (sess.dead) { reject(new Error('connexion fermee')); return; }
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('emission bloquee')); } }, WRITE_STALL);
      const done = (err?: Error) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (err) reject(err); else resolve();
      };
      try { sess.sock.write(chunk, undefined, done); } catch (e) { done(e instanceof Error ? e : new Error(errText(e))); }
    });
  }

  private dial(ip: string, port: number, me: { name: string; kind: DeviceKind }): Promise<Sess> {
    return new Promise((resolve, reject) => {
      const sock = TcpSocket.createConnection({ host: ip, port, connectTimeout: CONNECT_TIMEOUT }, () => {});
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const fail = (e: Error) => { if (settled) return; settled = true; if (timer) clearTimeout(timer); try { sock.destroy(); } catch {} reject(e); };
      timer = setTimeout(() => fail(new Error('appareil introuvable')), CONNECT_TIMEOUT + 2000);
      sock.on('error', (e) => fail(e instanceof Error ? e : new Error(String(e))));
      sock.on('close', () => fail(new Error('connexion fermee')));
      sock.on('connect', () => {
        if (settled) return;
        const sess: Sess = { sock, ip, port, buf: Buffer.alloc(0), queue: [], waiters: [], dead: false };
        const die = () => {
          if (sess.dead) return;
          sess.dead = true;
          sess.waiters.splice(0).forEach((w) => { clearTimeout(w.timer); w.rej(new Error('connexion fermee')); });
          if (this.sessions.get(ip) === sess) this.sessions.delete(ip);
        };
        sock.on('data', (d) => { if (sess.dead) return; sess.buf = Buffer.concat([sess.buf, toBuf(d)]); this.pumpCtrl(sess); });
        sock.on('error', die);
        sock.on('close', die);
        void (async () => {
          try {
            this.sendLine(sess.sock, { t: 'hello', v: FYLIO_PROTO, name: me.name, kind: me.kind, id: this.myId });
            const ack = await this.waitCtrl(sess, (m) => m.t === 'ack', 8000);
            if (ack.ok === false) throw new Error('appareil refuse');
            if (settled) return;
            settled = true;
            if (timer) clearTimeout(timer);
            this.sessions.set(ip, sess);
            resolve(sess);
          } catch (e) { fail(e instanceof Error ? e : new Error(errText(e))); }
        })();
      });
    });
  }

  /** Controle (lignes JSON) cote client : trie les messages vers les attentes/la file. */
  private pumpCtrl(sess: Sess): void {
    for (;;) {
      const nl = sess.buf.indexOf(0x0a);
      if (nl < 0) return;
      const line = sess.buf.slice(0, nl).toString('utf8');
      sess.buf = sess.buf.slice(nl + 1);
      let m: Line | null = null;
      try { m = JSON.parse(line) as Line; } catch { continue; }
      if (!m) continue;
      const i = sess.waiters.findIndex((w) => w.pred(m));
      if (i >= 0) { const w = sess.waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.res(m); } else sess.queue.push(m);
    }
  }

  private waitCtrl(sess: Sess, pred: (m: Line) => boolean, ms: number): Promise<Line> {
    const qi = sess.queue.findIndex(pred);
    if (qi >= 0) return Promise.resolve(sess.queue.splice(qi, 1)[0]);
    return new Promise((res, rej) => {
      const timer = setTimeout(() => {
        const i = sess.waiters.findIndex((w) => w.timer === timer);
        if (i >= 0) sess.waiters.splice(i, 1);
        rej(new Error('delai depasse'));
      }, ms);
      sess.waiters.push({ pred, res, rej, timer });
    });
  }

  private sendLine(sock: TcpSocket.Socket, obj: unknown): void {
    try { sock.write(JSON.stringify(obj) + '\n', 'utf8'); } catch (e) { console.warn('[fylio] envoi controle :', errText(e)); }
  }

  /* ---- reception (serveur) ---- */

  private onConn(sock: TcpSocket.Socket): void {
    let ip = '';
    try { ip = (sock.remoteAddress || '').replace(/^::ffff:/, ''); } catch {}
    const conn: Conn = { sock, ip, buf: Buffer.alloc(0), phase: 'line', from: null, rx: null, closed: false };
    this.conns.add(conn);
    sock.on('data', (d) => { if (conn.closed) return; conn.buf = Buffer.concat([conn.buf, toBuf(d)]); this.consume(conn); });
    sock.on('error', () => this.closeConn(conn));
    sock.on('close', () => this.closeConn(conn));
  }

  /** Traitement synchrone : JS mono-thread -> aucune intermediation entre data events. */
  private consume(c: Conn): void {
    try {
      for (;;) {
        if (c.closed) return;
        if (c.phase === 'line') {
          const nl = c.buf.indexOf(0x0a);
          if (nl < 0) return;
          const line = c.buf.slice(0, nl).toString('utf8');
          c.buf = c.buf.slice(nl + 1);
          let m: Line | null = null;
          try { m = JSON.parse(line) as Line; } catch { continue; }
          if (m) this.handleLine(c, m);
          continue;
        }
        const rx = c.rx;
        if (!rx) return;
        if (rx.done) { c.phase = 'line'; c.rx = null; continue; }
        if (!rx.handle) return;
        const f = rx.files[rx.idx];
        const need = f.size - rx.fileWritten;
        if (need <= 0) { this.finishRxFile(c, rx); continue; }
        if (!c.buf.length) return;
        const take = Math.min(need, c.buf.length);
        const part = c.buf.slice(0, take);
        c.buf = c.buf.slice(take);
        rx.handle.writeBytes(new Uint8Array(part.buffer, part.byteOffset, part.byteLength));
        rx.fileWritten += take;
        rx.received += take;
        this.touchSpeed(rx);
        if (rx.fileWritten >= f.size) this.finishRxFile(c, rx);
      }
    } catch (e) {
      console.warn('[fylio] reception :', errText(e));
      if (c.rx) this.failRx(c.rx);
      this.closeConn(c);
    }
  }

  private handleLine(c: Conn, m: Line): void {
    if (m.t === 'hello') {
      if (m.v !== FYLIO_PROTO || !m.name) { this.sendLine(c.sock, { t: 'ack', ok: false }); return; }
      c.from = { id: String(m.id || 'peer-' + c.ip), name: String(m.name).slice(0, 40), kind: asKind(m.kind), link: 'wifi', online: true, ip: c.ip };
      this.sendLine(c.sock, { t: 'ack', ok: true, name: this.myName, kind: this.myKind, id: this.myId });
      return;
    }
    if (m.t === 'send') {
      const raw: any[] = Array.isArray(m.files) ? m.files : [];
      const files: FileItem[] = [];
      const now = Date.now();
      for (let i = 0; i < raw.length; i++) {
        const n = sanitizeName(String(raw[i]?.name ?? ''));
        const size = Math.floor(Number(raw[i]?.size));
        if (!Number.isFinite(size) || size <= 0) { this.sendLine(c.sock, { t: 'accept', ok: false }); return; }
        files.push({ id: `rx${now}-${i}`, name: n, kind: kindForName(n), size, date: now });
      }
      if (!c.from || !files.length) { this.sendLine(c.sock, { t: 'accept', ok: false }); return; }
      if (this.pending) { this.sendLine(c.sock, { t: 'accept', ok: false }); return; } // une demande a la fois
      this.pending = { from: c.from, files, total: sumSizes(files), conn: c };
      this.reqShown = false;
      this.flushReq();
    }
  }

  private flushReq(): void {
    const p = this.pending;
    if (!p || this.reqShown || !this.inCbs.size) return;
    this.reqShown = true;
    const req: IncomingRequest = { from: p.from, files: p.files, accept: () => this.acceptIncoming(), refuse: () => this.refuseIncoming() };
    const first = this.inCbs.values().next().value;
    if (first) first(req);
  }

  private openNext(rx: Rx): void {
    const f = rx.files[rx.idx];
    const file = uniqueFile(f.name);
    const handle = file.open(FileMode.WriteOnly);
    rx.file = file;
    rx.handle = handle;
  }

  private finishRxFile(c: Conn, rx: Rx): void {
    try { rx.handle?.close(); } catch {}
    rx.handle = null;
    rx.file = null;
    rx.idx++;
    rx.fileWritten = 0;
    if (rx.idx >= rx.files.length) {
      rx.done = true;
      rx.ok = true;
      c.phase = 'line';
      c.rx = null;
    } else {
      this.openNext(rx); // peut throw -> attrape par consume()
    }
  }

  /** Echec/annulation : ferme le fichier partiel et le supprime de la bibliotheque. */
  private failRx(rx: Rx): void {
    if (rx.done) return;
    const file = rx.file;
    try { rx.handle?.close(); } catch {}
    rx.handle = null;
    rx.file = null;
    rx.done = true;
    rx.ok = false;
    if (file) { try { file.delete(); } catch {} }
  }

  private touchSpeed(rx: Rx): void {
    const now = Date.now();
    const dt = (now - rx.lastAt) / 1000;
    if (dt < 0.3) return;
    const inst = (rx.received - rx.lastBytes) / dt;
    rx.speed = rx.speed ? rx.speed * 0.6 + inst * 0.4 : inst;
    rx.lastAt = now;
    rx.lastBytes = rx.received;
  }

  private snap(rx: Rx): Progress {
    return {
      sentBytes: rx.received,
      totalBytes: rx.total,
      fileIndex: Math.min(rx.idx, Math.max(rx.files.length - 1, 0)),
      speedBps: rx.speed,
      etaSec: rx.speed > 0 ? Math.max(rx.total - rx.received, 0) / rx.speed : 0,
    };
  }

  private closeConn(c: Conn): void {
    if (c.closed) return;
    c.closed = true;
    if (c.rx) this.failRx(c.rx);
    if (this.pending?.conn === c) { this.pending = null; this.reqShown = false; }
    this.conns.delete(c);
    try { c.sock.destroy(); } catch {}
  }
}

export const engine = new LanEngine();
export const createEngine = (): FylioEngine => engine;
