import { useMemo, type CSSProperties } from 'react';
import type { WidgetConfig } from '../types';

export function useThemeStyles(config?: WidgetConfig) {
  return useMemo(() => {
    if (!config?.theme) return undefined;
    const theme = config.theme;
    const styles: Record<string, string> = {};
    if (theme.primaryColor) styles['--mc-primary'] = theme.primaryColor;
    if (theme.backgroundColor) styles['--mc-background'] = theme.backgroundColor;
    if (theme.textColor) styles['--mc-text'] = theme.textColor;
    if (theme.borderRadius !== undefined) styles['--mc-radius'] = `${theme.borderRadius}px`;
    return styles as CSSProperties;
  }, [config?.theme]);
}
