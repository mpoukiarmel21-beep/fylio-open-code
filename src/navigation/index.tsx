/** Navigation : RootStack (onboarding + écrans modaux) → Tabs (Accueil / Fichiers / Musique / Galerie) avec la GlassNav personnalisée. */
import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { RootParams, TabParams } from './types';
import { GlassNav, Tab } from '../ui/GlassNav';
import { TourRefsProvider, useTourRefs } from './TourRefs';
import { useApp } from '../store/AppStore';
import { SplashScreen, LangScreen, WhoScreen, PermsScreen } from '../screens/onboarding';
import { HomeScreen } from '../screens/Home';
import { FilesScreen, FolderScreen, GalleryScreen, ViewerScreen, VideoScreen, PdfScreen, MusicScreen, PlayerScreen, BrowserScreen, PlayerProvider } from '../screens/media';
import { SendSelectScreen, NearbyScreen, QrShareScreen, QrScanScreen, ConnectedScreen, RemoteSendScreen, RemoteRecvScreen, DeviceSheetScreen, CableScreen, IncomingScreen } from '../screens/send';
import { TransferScreen, TransferDoneScreen, TransferFailedScreen } from '../screens/transfer';
import { HistoryScreen, DevicesScreen, NotificationsScreen, SettingsScreen } from '../screens/misc';

const Stack = createNativeStackNavigator<RootParams>();
const Tabs = createBottomTabNavigator<TabParams>();

function TabBar({ state, navigation }: BottomTabBarProps) {
  const app = useApp(); const refs = useTourRefs();
  const active = state.routes[state.index].name as Tab;
  return <GlassNav active={active} onTab={(t) => navigation.navigate(t)} cable={app.cable} onCharger={() => navigation.getParent()?.navigate('Cable')} chargerRef={refs.charger} tabRefs={refs.tabs} />;
}
function TabsNav() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Files" component={FilesScreen} />
      <Tabs.Screen name="Music" component={MusicScreen} />
      <Tabs.Screen name="Gallery" component={GalleryScreen} />
    </Tabs.Navigator>
  );
}
const sheet = { presentation: 'transparentModal' as const, animation: 'fade' as const, contentStyle: { backgroundColor: 'transparent' } };
export function AppNavigator() {
  return (
    <NavigationContainer theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, background: '#dfeeff' } }}>
      <TourRefsProvider><PlayerProvider>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="Splash" component={SplashScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Lang" component={LangScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Who" component={WhoScreen} />
          <Stack.Screen name="Perms" component={PermsScreen} />
          <Stack.Screen name="Tabs" component={TabsNav} options={{ animation: 'fade' }} />
          <Stack.Screen name="SendSelect" component={SendSelectScreen} />
          <Stack.Screen name="Nearby" component={NearbyScreen} />
          <Stack.Screen name="QrShare" component={QrShareScreen} />
          <Stack.Screen name="QrScan" component={QrScanScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Connected" component={ConnectedScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="RemoteSend" component={RemoteSendScreen} />
          <Stack.Screen name="RemoteRecv" component={RemoteRecvScreen} />
          <Stack.Screen name="Transfer" component={TransferScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="TransferDone" component={TransferDoneScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="TransferFailed" component={TransferFailedScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Devices" component={DevicesScreen} />
          <Stack.Screen name="Folder" component={FolderScreen} />
          <Stack.Screen name="Viewer" component={ViewerScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Video" component={VideoScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Pdf" component={PdfScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Browser" component={BrowserScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="DeviceSheet" component={DeviceSheetScreen} options={sheet} />
          <Stack.Screen name="Cable" component={CableScreen} options={sheet} />
          <Stack.Screen name="Incoming" component={IncomingScreen} options={sheet} />
        </Stack.Navigator>
      </PlayerProvider></TourRefsProvider>
    </NavigationContainer>
  );
}
export { View };