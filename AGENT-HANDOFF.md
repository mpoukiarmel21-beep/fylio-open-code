# AGENT-HANDOFF — fylio-open-code

## État actuel
- **Phase C : code + CI en vert** — run 37453434632 (2026-10-06, macos-26, 12m54s) sur le commit `1c2ac19` : natives `react-native-tcp-socket` + `react-native-zeroconf` compilées sans erreur, nouvel artefact `fylio-ipa-unsigned` disponible.
- Projet créé : copie de `fylio_app.zip` (52 écrans, DA complète, i18n 9 langues, moteur **simulé**).
- Repo GitHub : `mpoukiarmel21-beep/fylio-open-code` (public), branche `main`.
- Plan validé par l'utilisateur en 4 phases : **A** repo+CI → **B** vrais fichiers & lecteurs → **C** moteur réseau réel → **D** IPA finale.
- Choix validés : relais clé à distance sur **Supabase (gratuit)** ; musique via **expo-audio** (track-player@4.1.2 en option ultérieure).
- Libs installées : `react-native-pdf` + `react-native-blob-util` (peer) + `pdf-lib` + `expo-file-system` ; libs Phase C prévues : `react-native-zeroconf`, `react-native-tcp-socket`.
- **Phase B : code complet, `npx tsc --noEmit` OK, exports Android + iOS OK** :
  - `src/data/library.tsx` créé : `LibraryProvider` — requêtes `Query` légères (240 img / 120 vid / 200 audio, tri CREATION_TIME desc), scan sandbox `Paths.document/{Docs,Downloads,Received}` (kind par ext), `importDocs()` (expo-document-picker → `File.copy` overwrite), `resolveMediaUri` (préfixe `ph://` iOS), `thumbUri` (cache Map + gate iOS `getIsInCloud()` → jamais de téléchargement massif), `ensure/ask/refresh/itemsFor/counts`.
  - `App.tsx` : `<LibraryProvider>` monté autour de `<AppProvider>`.
  - `src/data/mock.ts` : `FileItem +uri/w/h`, `Song +uri/name`, helper `fmtFileSub` (taille sinon `W×H` + durée).
  - `src/screens/send.tsx` : `PhImage` (asset brut d'abord → `onError` → resolve direct/grille → placeholder), `FileThumb` réel (photo/vidéo), `SendSelectScreen` branché sur lib (grille PhImage, footer count + taille conditionnelle `size>0`).
  - `src/screens/media.tsx` : FilesScreen (carte permission `lib.grant`/`grantBtn`, bouton import, comptes réels, `lib.empty`), FolderScreen (`itemsFor`, tap music → `pl.play` + Player), GalleryScreen (groupes today/week/older + recherche, PhImage), ViewerScreen (PhImage direct contain, sub `fmtFileSub`), VideoScreen (**expo-video réel** : `replaceAsync` après `resolveMediaUri`, polling 500 ms `currentTime/duration/playing`, err → `lib.mediaErr`), PdfScreen (**react-native-pdf** réel, onError → `lib.pdfErr`), PlayerProvider (**expo-audio réel** : `useAudioPlayer(null,{updateInterval:500})`, `setAudioModeAsync({playsInSilentMode,doNotMix})`, `replace` + `setActiveForLockScreen`, ctx + `dur`, `didJustFinish` → next), Music/Player/Mini/LockWidget branchés (`music.count`, artiste conditionnel, divisions protégées `pl.dur || duration || 1`).
  - i18n : bloc `lib` (grant/grantSub/grantBtn/import/imported/empty/older/loading/pdfErr/mediaErr) + `music.count` ajoutés dans les **9 locales** (ancre unique `};` vérifiée par fichier).
- **Phase C — code complet, `npx tsc --noEmit` OK, `expo export --platform android` OK (5.7 MB)** (2026-10-06, OpenCode) :
  - `buffer` ajoutée au package.json ; **`src/net/engine.ts` réécrit intégralement** : contrat `FylioEngine` étendu (`receive`, `acceptIncoming(): boolean`, `refuseIncoming`), `MockEngine` (démos conservées + `simulate()` partagé), **`LanEngine` réel** — serveur TCP `FYLIO_PORT=47811` (lazy, `start()` depuis `localInfo/discover/onIncoming`), mDNS `_fylio._tcp` (publish + scan + `checkLocalNetworkAccess`, self-filter txt.id), protocole v1 : lignes JSON `hello/ack` + `send(manifeste)` → `accept {ok}` puis **flux d'octets bruts** cadré par le manifeste (backpressure : lecture `FileHandle.readBytes` synchrone par data event, émission `write()` par chunk avec cb + timeout 30 s), fichiers reçus dans `Received/` (nom unique, échec → suppression du partiel), `isReal(peer)` → réel sinon repli `simulate()` (démos intactes).
  - `transfer.tsx` : `dir==='received'` → `engine.receive(files,…)`, ref `lastP` (fix `p` stale sur échec), `lib.refresh()` après reçu réussi, cancel ne casse plus si terminé.
  - `send.tsx` : IncomingScreen accept/refuse/onClose → `engine.acceptIncoming()/refuseIncoming()` (fallback goBack si échec), QrScan `go()` try/catch (busy relâché), ConnectedScreen `payload.kind ?? 'android'`.
  - `app.json` : permission Android `ACCESS_LOCAL_NETWORK` ajoutée.
  - Relais clé 8 car. (distance) = toujours mock, en attente URL + anon key Supabase fournis par l'utilisateur.
- Flows Nearby/Transfer/Incoming encore en démo (`DEMO_FILES`) — **Phase C**.

## En cours
- **OpenCode — Phase C (LAN) depuis le 2026-10-06 (reprise)** : **terminé** (code + tsc + export android + push `1c2ac19` + CI verte 37453434632). Reste : validation device + relais Supabase (bloqué sur clés utilisateur).

## Prochaine étape
- **Tester Phase C sur appareil** : télécharger le nouvel artefact `fylio-ipa-unsigned` de la run https://github.com/mpoukiarmel21-beep/fylio-open-code/actions/runs/37453434632 → Sideloadly sur iPhone ; valider découverte mDNS + envoi/réception réels entre 2 bornes.
- **Phase D (partiellement faite)** : artefact `fylio-ipa-unsigned` (44 Mo, expire 2026-11-05) disponible sur la run https://github.com/mpoukiarmel21-beep/fylio-open-code/actions/runs/37441877557 → le télécharger et l'installer via Sideloadly (Apple ID, resign 7 j) pour valider Phase B sur iPhone.
- **Relais Supabase** (clé 8 car., distance) : en attente URL + anon key de l'utilisateur.

## Blocages / risques
- Aucun Mac local : tout le build iOS passe par GitHub Actions → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- **CI en vert** (run 37441877557, 2026-10-06) : runner `macos-26` (Xcode 26.6 / Swift 6.3) — macOS 15 + Xcode 26.2/26.3 échoue sur `expo-modules-jsi` (`SWIFT_RETURNS_RETAINED` sur constructeurs = erreur Swift 6.2.x, voir expo/expo#50067) et Xcode 16.4 échoue sur `swift-tools-version: 6.2`. **Ne pas repasser en `macos-15`.**
- `ph://` + expo-image sur IDs photo complets (`ph://UUID/L0/001`) incertain → mitigé par `PhImage` fallback file:// ; gate iCloud évite le téléchargement massif.
- **Audio iOS media-library : `Asset.getUri()` throw** (UriExtractor audio non supporté) → chansons média iOS non jouables, catch silencieux ; fallback = mp3 importés (file://).
- Tailles médias indisponibles (size=0 → UI affiche `W×H` + durée via `fmtFileSub`).
- `react-native-track-player` V5 = licence commerciale ; utiliser impérativement **@4.1.2 (Apache-2.0)** si adoption un jour.

## Journal
- **2026-10-06 (fin de session) — OpenCode** : **Phase C poussée + CI verte** — commit `1c2ac19` (moteur LAN + écrans + ACCESS_LOCAL_NETWORK + dep buffer) → run 37453434632 succès en 12m54s : natives tcp-socket/zeroconf compilées, artefact IPA régénéré.
- **2026-10-06 (fin de session) — OpenCode** : **Phase C code terminée** — `src/net/engine.ts` réécrit (LanEngine : serveur TCP 47811 + mDNS `_fylio._tcp` + protocole JSON→flux binaire + vrais fichiers via `FileHandle`, repli `simulate()` pour les démos), contrat `FylioEngine` étendu, `transfer.tsx`/`send.tsx` câblés (receive réel, accept/refuse entrant, try/catch connexion, `lastP` fix), `ACCESS_LOCAL_NETWORK` ajoutée. Vérifs : `npx tsc --noEmit` OK, `expo export --platform android` OK (5.7 MB, 3305 modules).
- **2026-10-06 (fin de session) — OpenCode** : **CI en vert** — run 37441877557 (macos-26 / Xcode 26.6 / Swift 6.3) → artefact `fylio-ipa-unsigned` (44 Mo, expire 2026-11-05). Fixes successifs : (1) Xcode 26.3 sur macos-15 → erreur `SWIFT_RETURNS_RETAINED` sur les constructeurs de `RuntimeScheduler.h` (bug upstream expo-modules-jsi 57.1.x, Swift 6.2.x, expo/expo#50067) ; (2) bascule `runs-on: macos-26` (Swift 6.3.3 = warning au lieu d'erreur) → build complet (prebuild, pod install, archive, .ipa).
- **2026-10-06 (soir) — OpenCode** : **Phase B terminée** — `library.tsx` (indexation réelle + import sandbox), `LibraryProvider` monté dans App, `mock.ts` enrichi (`fmtFileSub`), `send.tsx` (PhImage/FileThumb/SendSelect réels), `media.tsx` entièrement rebranché (Fichiers/Dossier/Galerie/Visionneuse/Vidéo expo-video/PDF react-native-pdf/Musique expo-audio avec lock-screen), i18n `lib`+`music.count` ×9 locales. Vérifs : `npx tsc --noEmit` OK, `expo export --platform android` OK (5.6 MB), `expo export --platform ios` OK. Commit/push de la session.
- **2026-10-06 — OpenCode** : analyse du zip de référence (`fylio_app.zip`), recherche GitHub des libs (comptes/licences), plan A→D rédigé et validé, projet copié dans `D:\FYLIO open code`, git init + commit initial, repo public `fylio-open-code` créé et pushé ; CI `ios-ipa.yml` ajoutée (2 runs lancés).
