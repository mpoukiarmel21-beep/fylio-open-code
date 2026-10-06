# AGENT-HANDOFF — fylio-open-code

## État actuel
- **RETOUR À LA MAQUETTE ORIGINALE (copie conforme) + lecteur vidéo réel** — commit `e01cacf` (2026-10-06), CI verte run **37494684130**. L'utilisateur a demandé de reprendre le dossier design (`D:\Nouveau dossier (3)\fylio_app.zip` = maquette source) et de faire un **copier-coller intégral** : `src/` (27 fichiers), `assets/`, `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `README.md` restaurés à l'identique de la référence. Le projet est revenu à l'état démo (données `DEMO_FILES`/`DEMO_SONGS`, moteur mock, PDF via WebView w3.org). **Le travail des phases B/C (bibliothèque réelle, LanEngine, lecteurs réels) reste dans l'historique git** (commits `1c2ac19`, `f1cdd98`, `ea69276`) — réutilisable si l'utilisateur veut rebrancher la fonctionnalité.
- **Lecteur vidéo retravaillé (expo-video réel)** dans `src/screens/media.tsx` `VideoScreen` : `useVideoPlayer(SAMPLE_VIDEO)` (Big Buck Bunny public), `VideoView` `contentFit="contain"` `nativeControls={false}` + `allowsPictureInPicture`, listeners `timeUpdate`/`statusChange`/`playToEnd`, autoplay sur `readyToPlay`, barre de progression **cliquable** (Pressable + `locationX`), seek ±10s, état `loading` (ActivityIndicator) et `err` (message + nom du fichier), clé i18n `video.err` ajoutée dans les **9 locales**.
- **Phase C : code + CI en vert** — run 37453434632 (2026-10-06, macos-26, 12m54s) sur le commit `1c2ac19` : natives `react-native-tcp-socket` + `react-native-zeroconf` compilées sans erreur, nouvel artefact `fylio-ipa-unsigned` disponible.
- Projet créé : copie de `fylio_app.zip` (52 écrans, DA complète, i18n 9 langues, moteur **simulé**).
- Repo GitHub : `mpoukiarmel21-beep/fylio-open-code` (public), branche `main`.
- Plan validé par l'utilisateur en 4 phases : **A** repo+CI → **B** vrais fichiers & lecteurs → **C** moteur réseau réel → **D** IPA finale.
- Choix validés : relais clé à distance sur **Supabase (gratuit)** ; musique via **expo-audio** (track-player@4.1.2 en option ultérieure).

## En cours
- **OpenCode — restauration maquette + lecteur vidéo terminées** : commit `e01cacf` poussé, CI verte (run 37494684130). En attente de **validation device** par l'utilisateur (design conforme à la maquette + lecture vidéo réelle).

## Prochaine étape
- **Présenter le résultat à l'utilisateur** + nouvelle IPA (run 37494684130) ; il doit vérifier sur device que (1) toutes les pages correspondent à la maquette, (2) le lecteur vidéo joue réellement (Big Buck Bunny), (3) les contrôles (play/pause, seek, progression cliquable) fonctionnent.
- **Relais Supabase** (clé 8 car., distance) : en attente URL + anon key de l'utilisateur.
- Si l'utilisateur veut rebrancher la fonctionnalité réelle (phases B/C) : `git show 1c2ac19:src/data/library.tsx`, `git show 1c2ac19:src/net/engine.ts` etc.

## Blocages / risques
- Aucun Mac local : tout le build iOS passe par GitHub Actions → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- **CI en vert** (run 37494684130) : runner `macos-26` (Xcode 26.6 / Swift 6.3) — macOS 15 + Xcode 26.2/26.3 échoue sur `expo-modules-jsi` (`SWIFT_RETURNS_RETAINED` sur constructeurs = erreur Swift 6.2.x, voir expo/expo#50067) et Xcode 16.4 échoue sur `swift-tools-version: 6.2`. **Ne pas repasser en `macos-15`.**
- La lecture vidéo en démo utilise un **URL public** (Big Buck Bunny) — nécessite une connexion Internet sur l'appareil.
- Assets restaurés aux PNG originaux (sans le padding +6,5 % ajouté dans la refonte) — si les mascottes apparaissent trop tassées, reprendre les versions padding du commit `f1cdd98`.

## Journal
- **2026-10-06 (soir) — OpenCode** : **Retour à la maquette originale + lecteur vidéo réel (commit `e01cacf`, CI verte run 37494684130)** — l'utilisateur a fourni `D:\Nouveau dossier (3)\fylio_app.zip` (maquette source) et demandé un copier-coller intégral après avoir constaté que le design ne correspondait pas. Restauration de `src/` (27 fichiers), `assets/`, `App.tsx`, `app.json`, `package.json`, `package-lock.json`, `README.md` à l'identique (31 fichiers modifiés, -1785 lignes). Puis **retravail du lecteur vidéo** (la version maquette était un faux aperçu gradient) : `expo-video` réel via `useVideoPlayer`/`VideoView`, autoplay, progression cliquable, seek ±10s, états loading/erreur, clé `video.err` dans les 9 locales. Vérifs : `tsc` OK, export android OK (3205 modules, 5.3 MB). Le travail des phases B/C reste récupérable dans l'historique git.
- **2026-10-06 (après-midi 2) — OpenCode** : **Correctifs retours utilisateur (commit `ea69276`, CI verte run 37470388145, 10m53s)** — (1) visionneuse photos plein écran type Apple Photos (padding 104/116 supprimé) ; (2) lecteur vidéo « impossible de lire » : chaîne d'URI candidates (résolu → brut → percent-encodé car noms français avec espaces/accents cassent AVPlayer) + fallback `Asset.getInfo().uri` dans `resolveMediaUri` ; (3) page Musique « importer un fichier » : scan **récursif** du sandbox (profondeur 5, tous les sous-dossiers) pour détecter l'audio automatiquement + permission média **auto-demandée** à l'ouverture si indéterminée ; (4) bouton « Nouvel onglet » des onglets navigateur mal dimensionné : cause = `Press` applique son `style` à la vue INTERNE (le `flex:1` n'atteint pas le `Pressable`) → cartes/boutons/recherche rewrappés dans des `View` de layout.
- **2026-10-06 (après-midi) — OpenCode** : **CI verte refonte design** — run 37462585467 succès en 11m20s (macos-26) sur le commit `f1cdd98` ; artefact `fylio-ipa-unsigned` régénéré pour test device.
- **2026-10-06 (matin) — OpenCode** : **Phase C livrée** — commit `1c2ac19`, CI verte run 37453434632 (12m54s) : `LanEngine` réel (TCP 47811 + mDNS `_fylio._tcp`, flux d'octets bruts cadrés par manifeste, reçus dans `Received/`), `react-native-tcp-socket` + `react-native-zeroconf` compilés sans erreur, `transfer.tsx`/`send.tsx` branchés (`engine.receive`, `acceptIncoming`/`refuseIncoming`, `lib.refresh()`), permission `ACCESS_LOCAL_NETWORK`.
- **2026-10-05 — OpenCode** : **Phase B livrée** — `library.tsx` (Query légères + sandbox + `resolveMediaUri` + gate iCloud), `PhImage` (asset brut → resolve → placeholder), `expo-video`/`expo-audio`/`react-native-pdf` réels, i18n bloc `lib` dans les 9 locales.
- **2026-10-05 — OpenCode** : **Phase A livrée** — repo créé, CI iOS (prebuild + xcodebuild), première IPA non signée.
