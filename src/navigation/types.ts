import type { NavigatorScreenParams } from '@react-navigation/native';
import type { Device, FileItem, HistoryItem } from '../data/mock';
import type { QrPayload } from '../net/engine';

export type TabParams = { Home: undefined; Files: undefined; Gallery: undefined; Music: undefined };
export type RootParams = {
  Splash: undefined; Lang: { fromSettings?: boolean } | undefined; Who: { fromSettings?: boolean } | undefined; Perms: undefined;
  Tabs: NavigatorScreenParams<TabParams> | undefined;
  Cable: undefined;                                   // feuille « Câble connecté » (chargeur)
  SendSelect: { category?: 'recent' | 'docs' | 'photos' | 'videos' | 'music' } | undefined;
  Nearby: { files: FileItem[]; mode: 'send' | 'receive' };
  QrShare: { files?: FileItem[] };                    // afficher un vrai QR (expéditeur)
  QrScan: { files?: FileItem[] };                     // scanner le QR (récepteur)
  RemoteSend: { files: FileItem[] };
  RemoteRecv: undefined;
  DeviceSheet: { device: Device; files: FileItem[] }; // feuille « PC Bureau » avant envoi
  Incoming: { from: Device; files: FileItem[] };
  Transfer: { peer: Device; files: FileItem[]; dir: 'sent' | 'received' };
  TransferDone: { peer: Device; files: FileItem[]; seconds: number; dir: 'sent' | 'received' };
  TransferFailed: { peer: Device; files: FileItem[]; sentCount: number };
  History: undefined; Devices: undefined;
  Folder: { kind: 'images' | 'videos' | 'docs' | 'music' | 'downloads' | 'received'; title: string };
  Viewer: { items: FileItem[]; index: number };
  Video: { item: FileItem };
  Pdf: { item: FileItem };
  Player: undefined;
  Browser: { url?: string } | undefined;
  Notifications: undefined; Settings: undefined;
  Connected: { payload: QrPayload; files?: FileItem[] };
};
export type { HistoryItem };