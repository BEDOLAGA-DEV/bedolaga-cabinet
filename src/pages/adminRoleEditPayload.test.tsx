// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import type { AdminRole } from '@/api/rbac';

const { api } = vi.hoisted(() => ({
  api: {
    getRoles: vi.fn(),
    getPermissionRegistry: vi.fn(),
    updateRole: vi.fn(),
    createRole: vi.fn(),
  },
}));
vi.mock('@/api/rbac', () => ({ rbacApi: api }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/admin', () => ({ AdminBackButton: () => null }));

import AdminRoleEdit from './AdminRoleEdit';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([true, false])(
  'saves permissions with the correct system-role payload (system=%s)',
  async (isSystem) => {
    const role: AdminRole = {
      id: 9,
      name: 'Operator',
      description: null,
      level: 50,
      permissions: ['users:read'],
      color: '#6366f1',
      icon: null,
      is_system: isSystem,
      is_active: true,
      created_at: '2026-10-20T00:00:00Z',
      updated_at: '2026-10-20T00:00:00Z',
    };
    api.getRoles.mockResolvedValue([role]);
    api.getPermissionRegistry.mockResolvedValue([
      { section: 'users', label: 'Users', actions: [{ action: 'read', label: 'Read' }] },
    ]);
    api.updateRole.mockResolvedValue(role);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/admin/roles/9/edit']}>
          <Routes>
            <Route path="/admin/roles/:id/edit" element={<AdminRoleEdit />} />
            <Route path="/admin/roles" element={<div>roles list</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await screen.findByDisplayValue('Operator');
    const level = screen.getByLabelText('admin.roles.form.levelValue') as HTMLInputElement;
    expect(level.disabled).toBe(isSystem);
    expect((screen.getByRole('slider') as HTMLInputElement).disabled).toBe(isSystem);
    fireEvent.click(screen.getByRole('button', { name: 'admin.roles.form.save' }));
    await waitFor(() => expect(api.updateRole).toHaveBeenCalledOnce());
    const [id, payload] = api.updateRole.mock.calls[0];
    expect(id).toBe(9);
    expect(payload.permissions).toEqual(['users:read']);
    if (isSystem) {
      expect(payload).not.toHaveProperty('level');
      expect(payload).not.toHaveProperty('is_active');
    } else {
      expect(payload.level).toBe(50);
    }
    await screen.findByText('roles list');
    client.clear();
  },
);
