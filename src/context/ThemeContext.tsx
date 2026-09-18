import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
  isDark: boolean;
  isNight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('night');
    else setTheme('light');
  };

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove('dark', 'night');
    body.classList.remove('dark', 'night');

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else if (theme === 'night') {
      root.classList.add('dark', 'night');
      body.classList.add('dark', 'night');
      root.setAttribute('data-theme', 'night');
      root.style.colorScheme = 'dark';
    } else {
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }

    // Set mobile browser theme-color
    let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    if (theme === 'night') {
      metaThemeColor.content = '#000000';
    } else if (theme === 'dark') {
      metaThemeColor.content = '#0f172a';
    } else {
      metaThemeColor.content = '#ffffff';
    }
  }, [theme]);

  const isDark = theme === 'dark' || theme === 'night';
  const isNight = theme === 'night';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, isDark, isNight }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
