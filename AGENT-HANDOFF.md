# AGENT-HANDOFF — fylio-open-code

## État actuel
- **Retour à l'état `ea69276` (design corrigé + fonctionnalités réelles) + lecteur vidéo fiabilisé** — l'utilisateur a constaté après le copier-coller maquette (`e01cacf`) que 5 éléments étaient perdus/mauvais : logo bleu, photos bleues (dégradés au lieu des vraies images), icônes du bas « très mal fait », ancien navigateur, vidéo toujours morte. **Réponse à sa question « pourquoi l'ancien navigateur ? » : le copier-coller intégal de la maquette a remis l'intégralité de l'état maquette, navigateur compris.** Restauration complète de l'arbre `ea69276` (`git checkout ea69276 -- .`, 32 fichiers) : logo `logo_f.png` bleu « fylio », bibliothèque réelle (`library.tsx`, photos/vidéos/musique de l'appareil = plus d'images bleues), GlassNav refondée (capsule 10 % + indicateur 20×3 + câble dessiné SVG, onglets Accueil|Fichiers|Musique|Galerie), navigateur plein écran avec onglets réels, Home (mascotte à côté des CTA + header masqué au scroll), `lib.*` i18n, deps Phase B/C (react-native-pdf, expo-file-system, tcp-socket, zeroconf…).
- **Lecteur vidéo (`src/screens/media.tsx` VideoScreen) — cause racine trouvée & corrigée** : l'URL de test Google (`commondatastorage...BigBuckBunny.mp4`) renvoie **403 Interdit** → jamais de lecture dans l'IPA maquette. Corrections : (1) **chaîne de candidats bornée** = URI réel résolu → variantes percent-encodées → **3 URL de secours vérifiées 200** (w3schools mp4, MDN flower mp4, HLS Apple) ; (2) **auto-avance** sur `statusChange: error` (replaceAsync peut réussir puis échouer au chargement) ; (3) **sync de l'état au montage** depuis `player.status` (l'événement pouvait être manqué → spinner infini) ; (4) **timeout 12 s** → écran d'erreur qui auto-guérit si le source devient prête.
- **Icônes du bas descendues** : `GlassNav` wrap `paddingBottom: max(ins.bottom − 12, 6)` (−12 px sur iOS).
- CI précédemment verte : run **37494684130** sur `e01cacf` (état maquette) ; nouvelle CI en cours sur ce commit.
- Relais Supabase : mock, bloqué (URL + anon key utilisateur).

## En cours
- **OpenCode** — restauration `ea69276` + patch vidéo + GlassNav : tsc OK, export android OK (5.7 MB) ; commit/push/CI en cours.

## Prochaine étape
- **Présenter l'IPA à l'utilisateur** : il doit vérifier (1) logo bleu « fylio » sur l'icône/splash, (2) vraies photos dans Galerie/Visionneuse (permission média accordée), (3) **vidéo qui lit réellement** (fichier réel ou secours démo), (4) barre du bas plus basse + câble dessiné, (5) nouveau navigateur plein écran.
- **Relais Supabase** (clé 8 car., distance) : en attente URL + anon key de l'utilisateur.
- Si la position de la GlassNav reste inexacte → demander une capture à l'utilisateur pour ajuster le offset.

## Blocages / risques
- Aucun Mac local : build iOS 100 % GitHub Actions → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- **Runner `macos-26`** (Xcode 26.6 / Swift 6.3) requis : macOS 15 + Xcode 26.2/26.3 échoue sur `expo-modules-jsi` (`SWIFT_RETURNS_RETAINED`, expo/expo#50067) ; Xcode 16.4 échoue sur `swift-tools-version: 6.2`. **Ne pas repasser en `macos-15`.**
- Vidéo de secours et scan média nécessitent Internet/permission ; sans permission média, Galerie reste vide (PermsScreen la demande à l'onboarding).
- Dépendances natives lourdes restaurées (react-native-pdf, tcp-socket, zeroconf) → temps de build CI plus longs.

## Journal
- **2026-10-06 (soir 2) — OpenCode** : **Retour à `ea69276` + fiabilisation vidéo (arbre restauré, tsc + export OK)** — après le retour utilisateur sur l'état maquette (`e01cacf`) : logo bleu « fylio » restauré (PNG `logo_f.png`), photos réelles restaurées (`library.tsx` + LibraryProvider), GlassNav refondée restaurée **et baissée de 12 px**, navigateur plein écran restauré (réponse à « pourquoi l'ancien navigateur ? » : le copier-coller intégal de la maquette l'avait remis), Home restauré. **Vidéo : cause racine = URL de test Google en 403** ; VideoScreen réécrit : chaîne bornée réel→variantes→3 secours vérifiés, auto-avance sur erreur, sync état au montage, timeout 12 s. npm install (retour des deps B/C), tsc OK, export android OK (5.7 MB).
- **2026-10-06 (soir) — OpenCode** : **Retour à la maquette originale (commit `e01cacf`, CI verte run 37494684130)** — copier-coller intégral de `fylio_app.zip` demandé par l'utilisateur (31 fichiers, −1785 lignes) + premier lecteur expo-video (SAMPLE_URL Google, ensuite révélée 403). **Régression constatée par l'utilisateur le soir même** → entrée ci-dessus.
- **2026-10-06 (après-midi 2) — OpenCode** : **Correctifs retours utilisateur (commit `ea69276`, CI verte run 37470388145, 10m53s)** — visionneuse photos plein écran ; vidéo (URI candidates + percent-encodé + fallback getInfo) ; musique (scan récursif sandbox + permission auto) ; navigateur (rewrappage `Press` dans `View` : cartes onglets, Nouvel onglet, recherche start page).
- **2026-10-06 (après-midi) — OpenCode** : **CI verte refonte design** — run 37462585467 succès 11m20s (macos-26) sur `f1cdd98`.
- **2026-10-06 (matin) — OpenCode** : **Phase C livrée** — `1c2ac19`, CI verte run 37453434632 (12m54s) : `LanEngine` réel (TCP 47811 + mDNS `_fylio._tcp`, trames binaires), natives compilées, Transfer/Incoming branchés, permission `ACCESS_LOCAL_NETWORK`.
- **2026-10-05 — OpenCode** : **Phase B livrée** — `library.tsx` (Query légères + sandbox + `resolveMediaUri` + gate iCloud), lecteurs réels (expo-video/expo-audio/react-native-pdf), i18n `lib` dans les 9 locales.
- **2026-10-05 — OpenCode** : **Phase A livrée** — repo créé, CI iOS (prebuild + xcodebuild), première IPA non signée.
