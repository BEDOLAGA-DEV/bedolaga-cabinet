import { createContext } from 'react';
import type { PlatformContext as PlatformContextType } from './types';

// Create the context with undefined default (will be provided by PlatformProvider)
export const PlatformContext = createContext<PlatformContextType | null>(null);

PlatformContext.displayName = 'PlatformContext';
