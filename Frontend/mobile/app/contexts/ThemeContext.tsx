
import React, { ReactNode } from 'react';
import { themeStyles } from '../constants/themes';

export type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  themeStyle: typeof themeStyles.light;
  toggleTheme: () => void;
}

const staticThemeContext: ThemeContextProps = {
  theme: 'dark',
  themeStyle: themeStyles.dark,
  toggleTheme: () => {
    // Intentionally disabled: app uses a single fixed theme.
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

export const useTheme = () => {
  return staticThemeContext;
};
