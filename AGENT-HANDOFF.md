# AGENT-HANDOFF — fylio-open-code

## État actuel
- Projet créé : copie de `fylio_app.zip` (52 écrans, DA complète, i18n 9 langues, moteur **simulé**).
- Repo GitHub : `mpoukiarmel21-beep/fylio-open-code` (public), branche `main`, 1 commit initial.
- Plan validé par l'utilisateur en 4 phases : **A** repo+CI → **B** vrais fichiers & lecteurs → **C** moteur réseau réel → **D** IPA finale.
- Choix validés : relais clé à distance sur **Supabase (gratuit)** ; musique via **expo-audio** d'abord (track-player@4.1.2 en option ultérieure).
- Libs retenues après recherche : `react-native-pdf` (1,8k★, MIT) + `pdf-lib` (8,6k★, MIT) pour les PDF ; `react-native-zeroconf` (250★, MIT) pour mDNS `_fylio._tcp` ; `react-native-tcp-socket` (395★, MIT) pour le serveur/client TCP port 47811. Vidéo = `expo-video` (déjà présent, PiP).

## En cours
- Aucun agent en cours de session à l'instant de cette écriture (écrit par OpenCode — phase A en cours d'initialisation).

## Prochaine étape
- Phase A restante : CI GitHub Actions (`ios-ipa.yml`) → IPA non signée en artefact ; puis Phase B (remplacer `DEMO_FILES/DEMO_DOCS/DEMO_SONGS` par `expo-media-library` / `expo-document-picker` via un store `useFiles()`, brancher les écrans Vidéo/PDF/Musique sur les vrais lecteurs).

## Blocages / risques
- Aucun Mac local : tout le build iOS passe par GitHub Actions `macos-latest` → IPA non signée → Sideloadly (Apple ID gratuit, resign 7 jours).
- `react-native-track-player` V5 = licence commerciale ; utiliser impérativement **@4.1.2 (Apache-2.0)** si adoption un jour.
- Compatibilité des libs natives (pdf, tcp-socket, zeroconf) avec Expo SDK 57 / RN 0.86 : prévoir `npx expo prebuild` ; vérifier `npx tsc --noEmit` après chaque ajout.

## Journal
- **2026-10-06 — OpenCode** : analyse du zip de référence (`fylio_app.zip`), recherche GitHub des libs (comptes/licences), plan A→D rédigé et validé, projet copié dans `D:\FYLIO open code`, git init + commit initial, repo public `fylio-open-code` créé et pushé.
