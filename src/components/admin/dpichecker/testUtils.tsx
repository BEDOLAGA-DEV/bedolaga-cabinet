import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';
import { ToastProvider } from '@/components/Toast';
import { PlatformProvider } from '@/platform/PlatformProvider';

export { i18nMock, resolveRu } from './testI18n';

export function renderWithProviders(node: ReactNode, path = '/admin/dpichecker') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <PlatformProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    </PlatformProvider>,
  );
}

export const noop = vi.fn();
