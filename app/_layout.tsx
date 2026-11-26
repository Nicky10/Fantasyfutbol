import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { IntroOverlay } from '@/src/components/IntroOverlay';
import { LeagueProvider } from '@/src/context/LeagueContext';
import { colors } from '@/src/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BebasNeue_400Regular,
    DMSans_400Regular,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const [introDone, setIntroDone] = useState(false);

  if (!loaded) return null;

  return (
    <LeagueProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="light" />
        {!introDone ? <IntroOverlay onDone={() => setIntroDone(true)} /> : null}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'fade',
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="player/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Player',
              headerBackTitle: 'Back',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="gameweek/[id]"
            options={{
              headerShown: true,
              headerTitle: 'Gameweek',
              headerBackTitle: 'Back',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
          <Stack.Screen
            name="rules"
            options={{
              headerShown: true,
              headerTitle: 'Rules',
              headerBackTitle: 'Back',
              headerTintColor: colors.text,
              headerStyle: { backgroundColor: colors.bg },
            }}
          />
        </Stack>
      </View>
    </LeagueProvider>
  );
}
