# AGENT-HANDOFF — fylio-open-code

## État actuel
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
- Flows Nearby/Transfer/Incoming encore en démo (`DEMO_FILES`) — **Phase C**.

## En cours
- Aucun agent en cours (OpenCode — fin de la session Phase B, commit/push en cours au moment de l'écriture).

## Prochaine étape
- Phase C : moteur réseau réel — `react-native-zeroconf` (mDNS `_fylio._tcp`) + `react-native-tcp-socket` (port 47811) dans `src/net/engine.ts` derrière le contrat `FylioEngine` existant, relais clé distant Supabase, puis brancher Nearby/Transfer/Incoming sur les vrais fichiers de `useLibrary()` ; ensuite Phase D (vérifier les runs CI IPA → artefact `fylio-ipa-unsigned` → Sideloadly).

## Blocages / risques
- Aucun Mac local : tout le build iOS passe par GitHub Actions → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- **Vérifier les 2 runs CI IPA lancés** (`ios-ipa.yml`) : compatibilité natives `react-native-pdf`/`react-native-blob-util` avec Expo 57 via prebuild.
- `ph://` + expo-image sur IDs photo complets (`ph://UUID/L0/001`) incertain → mitigé par `PhImage` fallback file:// ; gate iCloud évite le téléchargement massif.
- **Audio iOS media-library : `Asset.getUri()` throw** (UriExtractor audio non supporté) → chansons média iOS non jouables, catch silencieux ; fallback = mp3 importés (file://).
- Tailles médias indisponibles (size=0 → UI affiche `W×H` + durée via `fmtFileSub`).
- `react-native-track-player` V5 = licence commerciale ; utiliser impérativement **@4.1.2 (Apache-2.0)** si adoption un jour.

## Journal
- **2026-10-06 (soir) — OpenCode** : **Phase B terminée** — `library.tsx` (indexation réelle + import sandbox), `LibraryProvider` monté dans App, `mock.ts` enrichi (`fmtFileSub`), `send.tsx` (PhImage/FileThumb/SendSelect réels), `media.tsx` entièrement rebranché (Fichiers/Dossier/Galerie/Visionneuse/Vidéo expo-video/PDF react-native-pdf/Musique expo-audio avec lock-screen), i18n `lib`+`music.count` ×9 locales. Vérifs : `npx tsc --noEmit` OK, `expo export --platform android` OK (5.6 MB), `expo export --platform ios` OK. Commit/push de la session.
- **2026-10-06 — OpenCode** : analyse du zip de référence (`fylio_app.zip`), recherche GitHub des libs (comptes/licences), plan A→D rédigé et validé, projet copié dans `D:\FYLIO open code`, git init + commit initial, repo public `fylio-open-code` créé et pushé ; CI `ios-ipa.yml` ajoutée (2 runs lancés).
