import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';

export function useTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('supermarket_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ThemeMode;
      }
      return 'dark'; // Default
    } catch {
      return 'dark';
    }
  });

  const getEffectiveTheme = useCallback((mode: ThemeMode): 'dark' | 'light' => {
    if (mode === 'system') {
      if (
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
      return 'light';
    }
    return mode;
  }, []);

  const [isDark, setIsDark] = useState<boolean>(() => getEffectiveTheme(themeMode) === 'dark');

  const applyTheme = useCallback((dark: boolean) => {
    const root = document.documentElement;
    const body = document.body;
    if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      if (body) {
        body.classList.add('dark');
        body.setAttribute('data-theme', 'dark');
      }
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      if (body) {
        body.classList.remove('dark');
        body.setAttribute('data-theme', 'light');
      }
    }
  }, []);

  useEffect(() => {
    const effective = getEffectiveTheme(themeMode);
    const dark = effective === 'dark';
    setIsDark(dark);
    applyTheme(dark);

    try {
      localStorage.setItem('supermarket_theme', themeMode);
    } catch {
      // ignore
    }

    if (themeMode === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const sysDark = e.matches;
        setIsDark(sysDark);
        applyTheme(sysDark);
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode, getEffectiveTheme, applyTheme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const current = getEffectiveTheme(prev);
      return current === 'dark' ? 'light' : 'dark';
    });
  }, [getEffectiveTheme]);

  return {
    theme: themeMode,
    themeMode,
    setTheme: setThemeMode,
    setThemeMode,
    toggleTheme,
    isDark,
  };
}
