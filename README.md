# Fylio — application React Native (Expo SDK 57)

Interface complète de Fylio (transfert de fichiers iPhone / Android / PC + hub média), reprise à l'identique des maquettes v12 (52 écrans).
**Tout est cliquable de A à Z** : chaque bouton mène à l'écran prévu, les transferts se déroulent (moteur simulé), les QR codes sont réels, l'app est traduite en 9 langues.

> **Pour l'agent qui branche le moteur réseau** : tu n'as qu'un seul fichier à implémenter — `src/net/engine.ts` (interface `FylioEngine`). Les écrans ne connaissent que cette interface. Voir § 6.

---

## 1. Démarrer

```bash
npm install
npx expo start            # QR → Expo Go (iOS/Android) — caméra & QR fonctionnent dans Expo Go
npx expo run:android      # build natif (recommandé pour mDNS / câble / widget audio)
npx expo run:ios
```

Vérifié : `npx tsc --noEmit` (0 erreur) et `npx expo export --platform android` (bundle OK).

Requis : Node ≥ 20. Le projet est **Expo managed** (config dans `app.json`, plugins déjà déclarés : caméra, médiathèque, audio, vidéo, localisation, polices, splash). Si des modules natifs purs sont ajoutés (mDNS, USB), faire `npx expo prebuild` — rien d'autre ne change.

---

## 2. Arborescence — rôle de chaque élément

```
App.tsx                      Point d'entrée : charge les polices, i18n, le store persistant, la navigation, écoute le câble
app.json                     Config Expo : nom, scheme `fylio://`, permissions iOS/Android, plugins
assets/images/
  logo/                      fylio_logo.png (wordmark + avion papier), logo_f.png (icône app / centre du QR), logo_wordmark.png
  backgrounds/               nebula1..4.jpg — fonds « Blue Nebula » (1 foncé, 2/3 bleu clair rubans, 4 nuages clairs)
  characters/                avatar_1..6 (personnages « Qui es-tu ? »), mascot_main (Accueil / états vides),
                             files_mascot, gallery_mascot_right/left, music_mascot, qr_mascot, transfer_hero
  transfer/                  anim_1..11 — 11 poses du personnage qui avance avec la progression du transfert
  icons/                     dev_pc / dev_android / dev_iphone (cartes appareils), ico_send / ico_receive (gros CTA),
                             ico_bell, ico_folder, ico_settings, ico_planet_bulb, ico_tablet, ico_play, ico_pause
  illustrations/             empty_devices, empty_history (états vides), music_playlist, music_search, music_widget_a/b
src/
  theme/index.ts             DA : couleurs (verre bleu du kit #00E1FF→#009BFF→#0065F4→#0B52DE, verre blanc, texte #0A3A8A,
                             vert #1DBA6B), rayons, polices (Outfit 700/800 titres, Manrope 500/700/800 corps), espacements
  assets.ts                  Objet `IMG` : tous les `require()` d'images, un seul endroit
  i18n/index.ts              i18next + 9 langues (fr en es pt ar zh hi ru bn), détection auto, RTL pour l'arabe
  i18n/locales/*.ts          Toutes les chaînes de l'UI (même structure de clés dans les 9 fichiers)
  store/AppStore.tsx         État global persistant (AsyncStorage) : prénom, personnage, langue, onboarding fait,
                             visite guidée faite, guides « à distance » faits, appareils récents, historique, notifs, câble
  data/mock.ts               Types (Device, FileItem, HistoryItem, Notif, Song) + données de démo + formatteurs
  net/engine.ts              ★ CONTRAT MOTEUR : interface FylioEngine + MockEngine (simulation) + encodage QR
  ui/index.tsx               Composants de base : Screen (fond Nebula animé), GlassCard, GlassButton (bleu kit),
                             GhostButton, IconButton, Header, HeaderBack, Search, Chip, Row, SectionTitle, FadeIn, Press
  ui/GlassNav.tsx            Barre du bas (glass-nav-kit) : 4 onglets + indicateur liquide + Chargeur (vert pulsant si câble)
  ui/Tour.tsx                Moteur de visite guidée « spotlight » : assombrit l'écran, éclaire un élément mesuré au pixel,
                             bulle vitrée + points d'étape + Passer / Suivant
  navigation/types.ts        Liste typée de toutes les routes et de leurs paramètres
  navigation/index.tsx       RootStack + Tabs ; animations de transition par écran ; feuilles modales
  navigation/TourRefs.tsx    Refs partagées pour que la visite puisse éclairer les onglets du bas et le Chargeur
  screens/onboarding.tsx     1 Splash, 2 Langue, 3 Qui es-tu ?, 4 Autorisations
  screens/Home.tsx           5 Accueil (+ états vides) et visite guidée 11 étapes
  screens/send.tsx           8 Sélection, 9/9b À proximité, 10 QR, 11 Scanner, Connecté, 12 Envoyer à distance (+ guide),
                             13 Recevoir à distance (+ guide), 14 Feuille appareil, 7 Feuille câble, Demande entrante
  screens/transfer.tsx       15 Transfert en cours, 15b Tout a été envoyé, 15c Transfert interrompu
  screens/media.tsx          16 Fichiers, 17 Dossier, 18 Galerie, 19 Visionneuse, 20 Vidéo, PDF, 21 Musique,
                             22 Lecteur, 22b widget écran verrouillé (aperçu), 23 Navigateur
  screens/misc.tsx           6 Appareils, 6b Historique (états vides + pop-up), Notifications, Paramètres
```

---

## 3. Parcours utilisateur (ce que fait chaque bouton)

### Première ouverture
1. **Splash** (fond foncé) → logo apparaît (ressort), avion papier traverse, 3 points → va à **Langue** (ou à l'Accueil si déjà configuré).
2. **Langue** : 9 cartes ; toucher une langue traduit **immédiatement** toute l'app (coche verte). *Continuer* → Qui es-tu ?
3. **Qui es-tu ?** : 6 personnages (+ « Ma photo »), champ prénom. *Entrer dans Fylio* → Autorisations.
4. **Autorisations** : le personnage choisi + 4 cartes (réseau, caméra, photos, musique). Les interrupteurs caméra et photos déclenchent les **vraies** demandes système. *C'est parti* → Accueil (onboarding mémorisé).
5. **Accueil (états vides)** : après 0,7 s la **visite guidée** démarre : Envoyer → Recevoir → Appareils récents → Historique → Fichiers → Galerie → Musique → **Chargeur** → Navigateur → Notifications → Paramètres. Chaque étape éclaire un seul élément, bulle avec titre + phrase, *Passer* / *Suivant*, dernière = *C'est parti*. Relançable dans Paramètres.

### Accueil (écran 5)
| Élément | Action |
|---|---|
| Avatar / prénom + crayon | ouvre « Qui es-tu ? » pour modifier |
| Icône globe | **Navigateur** Internet intégré |
| Cloche (point rouge seulement s'il y a une notification non lue) | **Notifications** |
| Engrenage | **Paramètres** |
| Bouton bleu **Envoyer** | écran 8 **Sélection de fichiers** |
| Bouton blanc **Recevoir** | écran 9 **À proximité** en mode réception |
| Carte appareil récent | feuille 14 (envoi vers cet appareil) ; *Voir tout* → Appareils |
| Ligne d'historique / *Voir tout* | Historique |
| Barre du bas | Accueil / Fichiers / Galerie / Musique ; **Chargeur** → feuille 7 « Câble » |

### Envoyer
8. **Sélection** : recherche, chips *Récent / Documents / Photos / Vidéos / Musique*, grille 3 colonnes (photos/vidéos) ou liste ; pied compact « N fichiers • taille » + bouton **Envoyer** (désactivé tant que rien n'est choisi) → écran 9.
9. **À proximité** : radar animé + personnage, « Recherche en cours… » puis **9b** : appareils détectés (jamais hors ligne) apparaissent un par un. Toucher un appareil → feuille **14** (résumé + *Envoyer*). Boutons : **Scanner un QR code** (→ écran 10 côté expéditeur), **Envoyer à distance (clé)** (→ 12).
10. **QR** : **vrai QR code** (`react-native-qrcode-svg`) contenant `fylio://connect?v=1&ip=<IP réelle du téléphone>&port=47811&token=…&name=…&ssid=…` — l'IP vient de `expo-network`. Logo F au centre, compte à rebours 10 min, réseau à rejoindre. *Scanner un QR code* → 11.
11. **Scanner** : **vraie caméra** (`expo-camera`), coins lumineux + ligne de scan animée ; décodage d'un QR `fylio://` → écran **Connecté** (coche) → *Envoyer/Recevoir* → Transfert. Saisie manuelle de l'IP possible.
12. **Envoyer à distance** : clé 8 caractères (cases animées), compte à rebours, **Copier** (presse-papiers) / **Partager** (feuille de partage système) alignés, carte Sécurité, « En attente du destinataire… ». À la 1re utilisation, **guide 3 étapes** : ① Ta clé unique → ② Partage la clé → ③ Et ensuite ? → *Compris*. Quand le destinataire se connecte → Transfert.
13. **Recevoir à distance** : 8 cases (clavier), bouton **Trouver l'appareil** (actif à 8 caractères) → recherche → Transfert. Guide 3 étapes la 1re fois : ① Demande la clé → ② Entre la clé ici → ③ Trouver l'appareil.
14. **Feuille appareil** (« PC Bureau ») : centrée à 14 px des bords, liste des fichiers, *Annuler* / *Envoyer*.
7. **Feuille Câble** : état du câble, appareil USB, *Diagnostic* / *Envoyer* (actif si câble).
15. **Transfert en cours** : le personnage **avance** (11 poses) avec la barre ; barre bleue vitrée avec reflet qui court ; % + taille ; 3 stats (vitesse, restant, envoyés) ; liste des fichiers avec « Terminé » **en vert** ; *Annuler* → 15c.
15b. **Tout a été envoyé** : coche verte qui pop + 3 ondes + confettis + vibration ; résumé taille / durée / vitesse ; *Envoyer d'autres* / *Accueil*. L'historique et les appareils récents sont mis à jour.
15c. **Transfert interrompu** : croix orange, fichiers restants, *Réessayer* (reprend les restants) / *Abandonner*.
**Demande entrante** (« X veut t'envoyer ») : feuille avec aperçus, *Refuser* / *Accepter* → Transfert en réception. Déclenchée par `engine.onIncoming` (simulable dans Paramètres).

### Hub média
16. **Fichiers** : recherche, 6 dossiers (Images, Vidéos, Documents, Musique, Téléchargements, Reçus) → 17 **Dossier** : liste ; toucher = ouvre (photo → visionneuse, vidéo → lecteur, PDF/doc → lecteur PDF, musique → lecteur) ; *Sélectionner* → bouton *Envoyer (N)* → écran 9.
18. **Galerie** : chips Tout / Photos / Vidéos, grille groupée Aujourd'hui / Cette semaine ; photo → 19 **Visionneuse façon Photos** (pager, fond noir, barre Partager / Favori / Infos / Supprimer, tap pour masquer) ; vidéo → 20 **Lecteur vidéo** (commandes vitrées, ±10 s). Branche `expo-video` (`useVideoPlayer` + `VideoView`) avec l'URI réelle quand les médias viennent de `expo-media-library`.
21. **Musique** (fond foncé) : recherche, bloc **Musique récente** (pochettes), bloc **Toutes les musiques**, égaliseur animé sur le titre en cours, **mini-lecteur** au-dessus de la barre → 22 **Lecteur** plein écran (minutes lisibles, commandes **sous** la barre). *Widget écran verrouillé (aperçu)* → 22b simulation du widget lock-screen / centre de contrôle.
23. **Navigateur** : barre d'adresse vitrée (cadenas, recharger), WebView réelle (recherche Google si ce n'est pas une URL), barre de progression, barre du bas (précédent / suivant / favoris / téléchargements / onglets).

### Divers
- **Historique** / **Appareils** vides → illustration de l'Accueil centrée + pop-up animée « Veux-tu envoyer un fichier ? » → Envoyer.
- **Notifications** : demandes (Accepter / Refuser), terminés, interrompus ; marquées lues à la fermeture.
- **Paramètres** : prénom / personnage / langue (retour aux écrans 3 et 2), appareils de confiance, acceptation auto, **Revoir la visite guidée**, **Revoir les guides « à distance »**, section **Démo** (simuler le câble → le Chargeur devient vert pulsant ; charger des données de démo ; simuler une demande entrante ; réinitialiser) — *à retirer en production*.

---

## 4. Direction artistique (comment on l'a implémentée)

- **Fonds** : vrais JPG Nebula via `<Screen bg={1|2|3|4}>` avec dérive lente (scale 1.02→1.06, 8 s). 1 = Splash & Musique ; 2/3 = Langue, Qui es-tu, Autorisations, À proximité, QR, clés ; 4 = Accueil et le reste. Sur 1-3 (`deep`) les textes sont blancs et le verre est translucide sombre.
- **Verre** : `GlassCard` = `expo-blur` + dégradés du kit (`glass-white`), `GlassButton` = dégradé `glass-blue` 4 couleurs + point lumineux + reflet + halo cyan (valeurs exactes dans `theme/index.ts`). Ne jamais mettre de fond opaque derrière : le verre a besoin du Nebula.
- **Barre du bas** : `GlassNav` = bloc unique vitré, indicateur liquide (ressort) sous l'onglet actif, Chargeur dans son cercle **sans point intérieur**, halo vert pulsant si câble.
- **Polices** : Outfit 700/800 (titres), Manrope 500/700/800 (corps) via `@expo-google-fonts`.

## 5. Animations (toutes natives, 60 fps, `useNativeDriver`)

| Où | Animation |
|---|---|
| Tous les boutons / cartes | `Press` : scale 0,97 au toucher + haptique léger |
| Tous les écrans | `FadeIn` en cascade (fade + translation 14 px, délais 40-60 ms) |
| Transitions | slide depuis la droite ; fade pour Splash/Langue/Transfert ; depuis le bas pour Scanner, Lecteur, Navigateur ; feuilles modales qui montent avec ressort sur fond assombri |
| Splash | logo ressort, avion papier qui traverse, points qui respirent |
| Visite / guides | voile assombri + trou arrondi, bulle fade-in, points d'étape |
| À proximité | 3 ondes radar ; appareils qui apparaissent en cascade |
| Scanner | ligne de scan cyan qui balaie |
| Clé à distance | 8 cases qui tombent en place ; spinner d'attente |
| Transfert | personnage qui avance (poses 1→11), reflet qui court sur la barre |
| Succès | coche pop (ressort), 3 ondes vertes, 26 confettis, vibration succès |
| Interruption | croix pop |
| Nav | indicateur liquide ressort ; halo vert pulsant du Chargeur |
| Musique | égaliseur 3 barres sur le titre joué |
| Fonds | dérive Nebula 8 s |

## 6. ★ Brancher le moteur réseau (`src/net/engine.ts`)

Implémente `FylioEngine` et remplace `export const engine = new MockEngine()` :

```ts
interface FylioEngine {
  localInfo(): Promise<QrPayload>;                       // IP réelle + port 47811 + token → contenu du QR
  discover(cb: (devices: Device[]) => void): () => void; // mDNS `_fylio._tcp` / hotspot / USB ; cb à chaque changement ; retourne stop()
  connect(target: QrPayload | Device): Promise<Device>;  // handshake avec le token
  send(peer, files, onProgress, onDone): TransferHandle; // progression {sentBytes,totalBytes,fileIndex,speedBps,etaSec}
  onIncoming(cb: (req) => void): () => void;             // req.accept() / req.refuse() → l'UI ouvre la feuille « X veut t'envoyer »
  createRemoteKey(): Promise<{ key; expiresAt }>;        // clé 8 car. (alphabet sans O/0/I/1) valable 10 min, serveur relais
  waitRemotePeer(key, cb): () => void;                   // appelé quand le destinataire a entré la clé
  resolveRemoteKey(key): Promise<Device | null>;         // côté récepteur
  onCable(cb: (connected: boolean) => void): () => void; // détection USB → bouton Chargeur vert
}
```

- **QR** : `encodeQr()` / `decodeQr()` fixent le format `fylio://connect?v=1&ip&port&token&name&ssid`. Le scheme `fylio` est déclaré dans `app.json` (deep link possible).
- **Fichiers réels** : remplacer `DEMO_FILES` / `DEMO_DOCS` / `DEMO_SONGS` (`data/mock.ts`) par `expo-media-library` (`getAssetsAsync`) et `expo-document-picker` ; le type `FileItem` (`id, name, kind, size, date, thumb?, duration?`) est déjà celui attendu par tous les écrans.
- **Widget écran verrouillé** : utiliser `expo-audio` (`useAudioPlayer`, `setAudioModeAsync({ staysActiveInBackground: true })`) et pousser les métadonnées Now Playing (`UIBackgroundModes: audio` déjà dans `app.json`). L'écran 22b est une **simulation visuelle** du résultat.
- **Permissions** déjà déclarées : caméra, médias, réseau local (`NSLocalNetworkUsageDescription`, `NSBonjourServices`), multicast Android, `NEARBY_WIFI_DEVICES`.

## 7. i18n

`useTranslation()` partout : `t('home.hello', { name })`. Ajouter une chaîne = ajouter la clé dans **les 9 fichiers** `src/i18n/locales/`. L'arabe passe l'app en RTL (`I18nManager.forceRTL`, effectif au redémarrage sur natif). La langue est mémorisée dans le store.

## 8. Données & état

`useApp()` expose l'état et les actions (`set`, `addHistory`, `addDevice`, `clearHistory`, `markNotifsRead`, `loadDemo`, `reset`). Tout est persisté dans AsyncStorage sous la clé `fylio.state.v1`. Les drapeaux `tourDone`, `guideSendDone`, `guideRecvDone` contrôlent l'affichage unique de la visite et des guides.