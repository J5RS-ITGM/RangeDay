import {
  BarlowCondensed_500Medium,
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { ToastProvider } from '@/components/Toast';
import { registerPWA } from '@/lib/pwa';
import { StoreProvider } from '@/store/MockStore';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Screens reachable without a session */
const PUBLIC_ROUTES = new Set(['login', 'forgot-password', 'reset-password', 'request-account']);

/**
 * The lock. When auth is configured, no session means no app: anything
 * outside the public routes redirects to /login. (Rendering gate only —
 * data access is enforced by RLS on the server regardless.)
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const inPublic = PUBLIC_ROUTES.has(segments[0] ?? '');

  useEffect(() => {
    if (!configured || loading) return;
    if (!session && !inPublic) router.replace('/login');
    if (session && segments[0] === 'login') router.replace('/');
  }, [configured, loading, session, inPublic, segments, router]);

  if (configured && loading) return null; // splash is still up
  if (configured && !session && !inPublic) return null; // redirecting
  return <>{children}</>;
}

/**
 * Desktop frame: the design is a phone-width column (520px, per the
 * mockup). On wide web viewports, center that column instead of
 * stretching every screen across the monitor.
 */
function AppFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const framed = Platform.OS === 'web' && width > 520;
  if (!framed) return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: theme.bg }}>
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 520,
          borderLeftWidth: StyleSheet.hairlineWidth,
          borderRightWidth: StyleSheet.hairlineWidth,
          borderColor: theme.line,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function ThemedStack() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme.name === 'light' ? 'dark' : 'light'} />
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="forgot-password" />
        <Stack.Screen name="request-account" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="score" />
          <Stack.Screen name="session-edit" />
          <Stack.Screen name="session-run" />
          <Stack.Screen name="scoped" />
          <Stack.Screen name="compare" />
        </Stack>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_500Medium,
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    ShareTechMono_400Regular,
  });

  useEffect(() => {
    registerPWA();
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <ToastProvider>
                <AppFrame>
                  <ThemedStack />
                </AppFrame>
              </ToastProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
