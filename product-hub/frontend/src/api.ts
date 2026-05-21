const BASE = ((import.meta as any).env?.VITE_API_URL || '') + '/api';

function getToken() {
  return localStorage.getItem('ph_token');
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    localStorage.removeItem('ph_token');
    localStorage.removeItem('ph_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  return data as T;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'in-progress' | 'shipped' | 'paused';
  stage: 'idea' | 'validation' | 'mvp' | 'growth' | 'stable';
  mrr: number;
  active_users: number;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  tags: string[];
  source: 'manual' | 'claude-code';
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface ActivityEntry extends Note {
  product_name: string;
}

export interface ReleaseTask {
  id: string;
  content: string;
  completed_at: string | null;
  created_at: string;
}

export type ReleaseType = 'ios' | 'android' | 'web';

export interface Release {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  description: string | null;
  released_at: string;
  created_at: string;
  type: ReleaseType;
  build_number: string | null;
  tasks: ReleaseTask[];
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type: string;
  content: string;
  created_at: string;
}

export interface DigestProduct {
  id: string;
  name: string;
  sessionCount: number;
  built: string[];
  decisions: string[];
  releases: { name: string; type: string; build_number: string | null }[];
}

export interface DigestData {
  period: { from: string; to: string };
  totalSessions: number;
  activeProducts: DigestProduct[];
  stagnant: { id: string; name: string; daysSince: number | null }[];
  releases: { name: string; type: string; build_number: string | null; product_name: string }[];
}

export interface Digest {
  id: string;
  period_from: string;
  period_to: string;
  narrative: string;
  sent_at: string | null;
  created_at: string;
  data?: DigestData;
}

export interface DashboardSummary {
  totalProducts: number;
  totalUsers: number;
  totalMrr: number;
  statusBreakdown: Record<string, number>;
}

export const api = {
  // Products
  getProducts: () => request<Product[]>('/products'),
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  createProduct: (data: Partial<Product>) =>
    request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: (productId: string) => request<Note[]>(`/products/${productId}/notes`),
  createNote: (productId: string, content: string, tags?: string[]) =>
    request<Note>(`/products/${productId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, tags }),
    }),
  completeNote: (id: string, completed: boolean) =>
    request<Note>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ completed }) }),
  deleteNote: (id: string) =>
    request<{ message: string }>(`/notes/${id}`, { method: 'DELETE' }),

  // Context doc
  getContext: (productId: string) =>
    request<{ id: string; name: string; context_doc: string }>(`/products/${productId}/context`),
  updateContext: (productId: string, context_doc: string) =>
    request<{ id: string; name: string; context_doc: string }>(`/products/${productId}/context`, {
      method: 'PUT',
      body: JSON.stringify({ context_doc }),
    }),

  // Activity feed
  getActivity: (limit = 50) => request<ActivityEntry[]>(`/activity?limit=${limit}`),

  // Releases
  getReleases: (productId: string) => request<Release[]>(`/products/${productId}/releases`),
  createRelease: (productId: string, data: { name: string; description?: string; noteIds: string[]; released_at?: string; type?: string; build_number?: string }) =>
    request<Release>(`/products/${productId}/releases`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRelease: (id: string) =>
    request<{ message: string }>(`/releases/${id}`, { method: 'DELETE' }),

  // Insights
  getInsights: () => request<Insight[]>('/insights'),
  generateInsights: () => request<Insight>('/insights/generate', { method: 'POST' }),
  deleteInsight: (id: string) =>
    request<{ message: string }>(`/insights/${id}`, { method: 'DELETE' }),

  // Digest
  getDigests: () => request<Digest[]>('/digest'),
  getDigest: (id: string) => request<Digest>(`/digest/${id}`),
  generateDigest: () => request<Digest>('/digest/generate', { method: 'POST' }),
  sendDigest: (id: string) => request<{ message: string }>(`/digest/${id}/send`, { method: 'POST' }),

  // Dashboard
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),

  // Export
  exportCsv: () => {
    const token = getToken();
    window.open(`${BASE}/export/csv?token=${token}`, '_blank');
  },
};
