/** Point d'entrée : polices, i18n, store persistant, navigation. */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import './src/i18n';
import { setLanguage } from './src/i18n';
import { Fonts } from './src/theme';
import { AppProvider, useApp } from './src/store/AppStore';
import { LibraryProvider } from './src/data/library';
import { AppNavigator } from './src/navigation';
import { engine } from './src/net/engine';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Boot() {
  const app = useApp();
  useEffect(() => { if (app.ready) { setLanguage(app.lang); SplashScreen.hideAsync().catch(() => {}); } }, [app.ready]);
  useEffect(() => engine.onCable((c) => app.set({ cable: c })), []);
  if (!app.ready) return null;
  return <AppNavigator />;
}
export default function App() {
  const [loaded] = useFonts(Fonts);
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <AppProvider><Boot /></AppProvider>
      </LibraryProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}