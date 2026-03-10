import apiClient from './client';

// === Types ===

export interface AdminRole {
  id: number;
  name: string;
  description: string | null;
  level: number;
  permissions: string[];
  color: string | null;
  icon: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

export interface CreateRolePayload {
  name: string;
  description?: string | null;
  level: number;
  permissions: string[];
  color?: string | null;
  icon?: string | null;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  level?: number;
  permissions?: string[];
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export interface UserRoleAssignment {
  id: number;
  user_id: number;
  role_id: number;
  role_name: string;
  assigned_by: number | null;
  assigned_at: string;
  expires_at: string | null;
  user_email: string | null;
  user_first_name: string | null;
  user_telegram_id: number | null;
}

export interface AdminWithRoles {
  user_id: number;
  telegram_id: number | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role_names: string[];
}

export interface AssignRolePayload {
  user_id: number;
  role_id: number;
  expires_at?: string | null;
}

export interface AccessPolicy {
  id: number;
  name: string;
  description: string | null;
  resource: string;
  actions: string[];
  effect: 'allow' | 'deny';
  conditions: Record<string, unknown>;
  priority: number;
  role_id: number | null;
  role_name: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
}

export interface CreatePolicyPayload {
  name: string;
  description?: string | null;
  resource: string;
  actions: string[];
  effect: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
  priority?: number;
  role_id?: number | null;
}

export interface UpdatePolicyPayload {
  name?: string;
  description?: string | null;
  resource?: string;
  actions?: string[];
  effect?: 'allow' | 'deny';
  conditions?: Record<string, unknown>;
  priority?: number;
  role_id?: number | null;
  is_active?: boolean;
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  request_method: string | null;
  request_path: string | null;
  created_at: string;
  user_first_name: string | null;
  user_email: string | null;
}

export interface AuditLogFilters {
  user_id?: number;
  action?: string;
  resource_type?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  offset?: number;
  limit?: number;
}

export interface AuditLogResponse {
  items: AuditLogEntry[];
  total: number;
  offset: number;
  limit: number;
}

export interface PermissionSection {
  section: string;
  actions: string[];
}

// === API ===

const BASE = '/cabinet/admin/rbac';

export const rbacApi = {
  // --- Roles ---

  getRoles: async (): Promise<AdminRole[]> => {
    const response = await apiClient.get<AdminRole[]>(`${BASE}/roles`);
    return response.data;
  },

  createRole: async (payload: CreateRolePayload): Promise<AdminRole> => {
    const response = await apiClient.post<AdminRole>(`${BASE}/roles`, payload);
    return response.data;
  },

  updateRole: async (roleId: number, payload: UpdateRolePayload): Promise<AdminRole> => {
    const response = await apiClient.put<AdminRole>(`${BASE}/roles/${roleId}`, payload);
    return response.data;
  },

  deleteRole: async (roleId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/roles/${roleId}`);
  },

  // --- Permission Registry ---

  getPermissionRegistry: async (): Promise<PermissionSection[]> => {
    const response = await apiClient.get<PermissionSection[]>(`${BASE}/permissions`);
    return response.data;
  },

  // --- RBAC Users ---

  getRbacUsers: async (): Promise<AdminWithRoles[]> => {
    const response = await apiClient.get<AdminWithRoles[]>(`${BASE}/users`);
    return response.data;
  },

  // --- Role Users ---

  getRoleUsers: async (roleId: number): Promise<UserRoleAssignment[]> => {
    const response = await apiClient.get<UserRoleAssignment[]>(`${BASE}/roles/${roleId}/users`);
    return response.data;
  },

  assignRole: async (payload: AssignRolePayload): Promise<UserRoleAssignment> => {
    const response = await apiClient.post<UserRoleAssignment>(`${BASE}/assignments`, payload);
    return response.data;
  },

  revokeRole: async (assignmentId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/assignments/${assignmentId}`);
  },

  // --- Access Policies ---

  getPolicies: async (): Promise<AccessPolicy[]> => {
    const response = await apiClient.get<AccessPolicy[]>(`${BASE}/policies`);
    return response.data;
  },

  createPolicy: async (payload: CreatePolicyPayload): Promise<AccessPolicy> => {
    const response = await apiClient.post<AccessPolicy>(`${BASE}/policies`, payload);
    return response.data;
  },

  updatePolicy: async (policyId: number, payload: UpdatePolicyPayload): Promise<AccessPolicy> => {
    const response = await apiClient.put<AccessPolicy>(`${BASE}/policies/${policyId}`, payload);
    return response.data;
  },

  deletePolicy: async (policyId: number): Promise<void> => {
    await apiClient.delete(`${BASE}/policies/${policyId}`);
  },

  // --- Audit Log ---

  getAuditLog: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const response = await apiClient.get<AuditLogResponse>(`${BASE}/audit-log`, {
      params: filters,
    });
    return response.data;
  },

  exportAuditLog: async (filters?: AuditLogFilters): Promise<Blob> => {
    const response = await apiClient.get(`${BASE}/audit-log/export`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
