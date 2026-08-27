import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ACCENTS,
  AccentColors,
  AccentName,
  THEMES,
  ThemeColors,
  ThemeName,
} from './tokens';

const STORAGE_KEY = 'rangeday.appearance.v1';

export interface Theme extends ThemeColors, AccentColors {
  name: ThemeName;
  accentName: AccentName;
}

interface ThemeContextValue {
  theme: Theme;
  setThemeName: (name: ThemeName) => void;
  setAccentName: (name: AccentName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('dark');
  const [accentName, setAccentNameState] = useState<AccentName>('blue');

  // Hydrate persisted choice on launch; defaults render immediately.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as {
          theme?: ThemeName;
          accent?: AccentName;
        };
        if (saved.theme && THEMES[saved.theme]) setThemeNameState(saved.theme);
        if (saved.accent && ACCENTS[saved.accent])
          setAccentNameState(saved.accent);
      })
      .catch(() => {
        /* corrupt or missing prefs — keep defaults */
      });
  }, []);

  const persist = useCallback((theme: ThemeName, accent: AccentName) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ theme, accent })).catch(
      () => {},
    );
  }, []);

  const setThemeName = useCallback(
    (name: ThemeName) => {
      setThemeNameState(name);
      persist(name, accentName);
    },
    [accentName, persist],
  );

  const setAccentName = useCallback(
    (name: AccentName) => {
      setAccentNameState(name);
      persist(themeName, name);
    },
    [themeName, persist],
  );

  const theme = useMemo<Theme>(
    () => ({
      ...THEMES[themeName],
      ...ACCENTS[accentName],
      name: themeName,
      accentName,
    }),
    [themeName, accentName],
  );

  const value = useMemo(
    () => ({ theme, setThemeName, setAccentName }),
    [theme, setThemeName, setAccentName],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
