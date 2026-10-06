# AGENT-HANDOFF — fylio-open-code

## État actuel
- **Retours 2 (5 correctifs, commit `d66e308`, CI verte run 37521651792, artefact 11441595780)** — suite aux 5 nouveaux défauts signalés après `4cacd35` :
  1. **Barre du bas** : onglets inactifs passés de `C.mute #7A8FB8` (trop pâle, quasi invisibles sur pilule blanche, surtout si « Réduire la transparence » iOS) à `DIM #425488` ; contenu des onglets ancré en bas (`justifyContent:'flex-end'` + `paddingBottom:14`) ; pilule descendue encore 8 px (`ins.bottom −20`, min 4).
  2. **Audio au verrouillage** : `shouldPlayInBackground` passe `false → true` dans `PlayerProvider` → le son continue quand l'app passe au fond/écran verrouillé ; `setActiveForLockScreen` reçu en plus `{showSeekBackward:true, showSeekForward:true}` → widget écran verrouillé avec titre/artiste + contrôles.
  3. **Musiques/audios vides** : si aucun audio réel détecté (iOS PhotoKit `.audio` ≈ vide sur la plupart des iPhones), fallback = `DEMO_SONGS` + 3 URL SoundHelix vérifiées 200 → onglet Musique et dossier « Fichiers▸Musique » non vides et jouables ; `isDirect` reconnaît désormais `http(s)://` (pas de préfixe `ph://` sur les URLs distantes).
  4. **Accueil** : mascotte déplacée à **gauche** des CTA ; boutons Envoyer/Recevoir en cartes **horizontales compactes** (icône 30 px à gauche du couple titre/sous-titre, `minHeight:118` supprimé).
  5. **app.json** : vérifié — les chaînes de permission sont correctes (le mojibake venait seulement de la console PowerShell, aucune correction nécessaire).
- **Vérifs** : `npx tsc --noEmit` OK ; `npx expo export --platform android` OK ; **CI run 37521651792 succès** (macos-26) → artefact `fylio-ipa-unsigned` id **11441595780**.
- Relais Supabase : mock, bloqué (URL + anon key utilisateur).

## En cours
- **OpenCode** — retours 2 (5 correctifs barre du bas / audio verrouillage / musiques / accueil) : **terminé** (commit `d66e308`, CI verte 37521651792, artefact 11441595780). En attente du test device par l'utilisateur.

## Prochaine étape
- **Présenter l'IPA (artefact 11441595780) à l'utilisateur** : vérifier (1) onglets de la barre du bas bien visibles et positionnés plus bas, (2) musiques listées et jouables (démo si aucun fichier réel), (3) **son qui continue à l'écran verrouillé + widget lecture (titre, artiste, lecture/pause, ±10 s)**, (4) mascotte à gauche + boutons Envoyer/Recevoir horizontaux avec icône à côté du texte, (5) toujours la vidéo et le navigateur.
- Si le widget de verrouillage n'apparaît toujours pas → demander si « Réduire la transparence » est actif et vérifier que la musique jouait bien AVANT le verrouillage.
- **Relais Supabase** (clé 8 car., distance) : en attente URL + anon key de l'utilisateur.

## Blocages / risques
- Aucun Mac local : build iOS 100 % GitHub Actions → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- **Runner `macos-26`** (Xcode 26.6 / Swift 6.3) requis : macOS 15 + Xcode 26.2/26.3 échoue sur `expo-modules-jsi` (`SWIFT_RETURNS_RETAINED`, expo/expo#50067) ; Xcode 16.4 échoue sur `swift-tools-version: 6.2`. **Ne pas repasser en `macos-15`.**
- Vidéo de secours et scan média nécessitent Internet/permission ; sans permission média, Galerie reste vide (PermsScreen la demande à l'onboarding).
- Dépendances natives lourdes restaurées (react-native-pdf, tcp-socket, zeroconf) → temps de build CI plus longs.

## Journal
- **2026-10-06 (soir 3) — OpenCode** : **Retours 2 : 5 correctifs (commit `d66e308`, CI verte 37521651792, artefact 11441595780)** — (1) GlassNav : onglets inactifs `#425488` au lieu de `C.mute` (contraste sur pilule blanche, même avec « Réduire la transparence »), contenu ancré en bas (`flex-end` + pb 14), pilule −8 px (`ins.bottom −20`) ; (2) `PlayerProvider` : `shouldPlayInBackground:true` → son continue au verrouillage, `setActiveForLockScreen` + `{showSeekBackward:true, showSeekForward:true}` → widget verrouillage ; (3) `library.tsx` : fallback `DEMO_SONGS` + 3 URLs SoundHelix vérifiées 200 (onglet Musique + dossier Musique non vides), `isDirect` gère `http(s)://` (évite le préfixe `ph://` sur les URLs distantes) ; (4) `Home.tsx` : mascotte à gauche, CTA horizontaux compacts (icône 30 px à côté du texte, `minHeight:118` supprimé) ; (5) app.json vérifié OK (mojibake = console uniquement). tsc + export android OK ; CI verte sur macos-26.
- **2026-10-06 (soir 2) — OpenCode** : **Retour à `ea69276` + fiabilisation vidéo (arbre restauré, tsc + export OK)** — après le retour utilisateur sur l'état maquette (`e01cacf`) : logo bleu « fylio » restauré (PNG `logo_f.png`), photos réelles restaurées (`library.tsx` + LibraryProvider), GlassNav refondée restaurée **et baissée de 12 px**, navigateur plein écran restauré (réponse à « pourquoi l'ancien navigateur ? » : le copier-coller intégal de la maquette l'avait remis), Home restauré. **Vidéo : cause racine = URL de test Google en 403** ; VideoScreen réécrit : chaîne bornée réel→variantes→3 secours vérifiés, auto-avance sur erreur, sync état au montage, timeout 12 s. npm install (retour des deps B/C), tsc OK, export android OK (5.7 MB).
- **2026-10-06 (soir) — OpenCode** : **Retour à la maquette originale (commit `e01cacf`, CI verte run 37494684130)** — copier-coller intégral de `fylio_app.zip` demandé par l'utilisateur (31 fichiers, −1785 lignes) + premier lecteur expo-video (SAMPLE_URL Google, ensuite révélée 403). **Régression constatée par l'utilisateur le soir même** → entrée ci-dessus.
- **2026-10-06 (après-midi 2) — OpenCode** : **Correctifs retours utilisateur (commit `ea69276`, CI verte run 37470388145, 10m53s)** — visionneuse photos plein écran ; vidéo (URI candidates + percent-encodé + fallback getInfo) ; musique (scan récursif sandbox + permission auto) ; navigateur (rewrappage `Press` dans `View` : cartes onglets, Nouvel onglet, recherche start page).
- **2026-10-06 (après-midi) — OpenCode** : **CI verte refonte design** — run 37462585467 succès 11m20s (macos-26) sur `f1cdd98`.
- **2026-10-06 (matin) — OpenCode** : **Phase C livrée** — `1c2ac19`, CI verte run 37453434632 (12m54s) : `LanEngine` réel (TCP 47811 + mDNS `_fylio._tcp`, trames binaires), natives compilées, Transfer/Incoming branchés, permission `ACCESS_LOCAL_NETWORK`.
- **2026-10-05 — OpenCode** : **Phase B livrée** — `library.tsx` (Query légères + sandbox + `resolveMediaUri` + gate iCloud), lecteurs réels (expo-video/expo-audio/react-native-pdf), i18n `lib` dans les 9 locales.
- **2026-10-05 — OpenCode** : **Phase A livrée** — repo créé, CI iOS (prebuild + xcodebuild), première IPA non signée.
