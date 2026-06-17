import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ── Auth ─────────────────────────────────────────────────────────────

export function setToken(token: string) {
  localStorage.setItem('token', token);
  const h = `Bearer ${token}`;
  api.defaults.headers.Authorization = h;
  axios.defaults.headers.Authorization = h;
}

export function clearToken() {
  localStorage.removeItem('token');
  delete api.defaults.headers.Authorization;
  delete axios.defaults.headers.Authorization;
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

// Restore token on load
const saved = getToken();
if (saved) {
  const h = `Bearer ${saved}`;
  api.defaults.headers.Authorization = h;
  axios.defaults.headers.Authorization = h;
}

// ── Types ────────────────────────────────────────────────────────────

export interface User {
  id: string; email: string; display_name: string;
  role: string; quota_concurrency: number; quota_max_resolution: number;
  quota_max_samples: number; is_active: boolean;
  created_at: string; updated_at: string;
}

export interface Task {
  id: string; user_id: string; model_id: string; name?: string; prompt: string;
  scene_id: string | null; scene_name: string | null;
  status: string; intent_json: any; storage_path: string | null;
  result_url: string | null; result_urls?: string[];
  error_message: string | null;
  progress: number; progress_message: string;
  stage_name?: string; stage_progress?: number; eta_seconds?: number;
  retry_count?: number;
  created_at: string; updated_at: string;
}

export interface Scene {
  id: string; name: string; description: string;
}

export interface ApiKey {
  id: string; key_prefix: string; label: string;
  full_key?: string; last_used_at: string | null;
  is_active: boolean; created_at: string;
}

export interface Plan {
  id: string; name: string; slug: string; description: string;
  price_monthly_cents: number; price_yearly_cents: number;
  stripe_monthly_price_id: string | null; stripe_yearly_price_id: string | null;
  features: Record<string, number>; is_public: boolean; sort_order: number;
}

export interface Subscription {
  id: string; organization_id: string; plan_id: string;
  plan?: Plan; stripe_subscription_id: string | null;
  status: string; billing_interval: string;
  current_period_start: string | null; current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string; updated_at: string;
}

export interface Webhook {
  id: string; user_id: string; url: string;
  events: string[]; is_active: boolean;
  created_at: string; updated_at: string;
}

// ── Auth API ─────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  setToken(data.access_token);
  return data as { access_token: string; user: User };
}

export async function register(email: string, password: string, display_name?: string) {
  const { data } = await api.post('/auth/register', { email, password, display_name });
  setToken(data.access_token);
  return data as { access_token: string; user: User };
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data as User;
}

// ── Scenes API ───────────────────────────────────────────────────────

export async function listScenes() {
  const { data } = await api.get('/scenes');
  return data.scenes as Scene[];
}

// ── Upload API ───────────────────────────────────────────────────────

export async function uploadModel(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/upload', form);
  return data as { model_id: string; file_name: string; file_size: number; file_type: string; storage_path: string; upload_time: string };
}

// ── Task API ─────────────────────────────────────────────────────────

export async function createTask(model_id: string, scene_id?: string, prompt?: string, camera_styles?: string[], name?: string, output_format?: string) {
  const body: any = { model_id, scene_id, prompt, name, output_format };
  if (camera_styles && camera_styles.length > 0) {
    body.camera_styles = camera_styles;
  }
  const { data } = await api.post('/tasks', body);
  return data as Task;
}

export async function listTasks(limit = 50, offset = 0) {
  const { data } = await api.get('/tasks', { params: { limit, offset } });
  return data as { tasks: Task[]; total: number };
}

export async function getTask(task_id: string) {
  const { data } = await api.get(`/tasks/${task_id}`);
  return data as Task;
}

export async function dispatchTask(task_id: string) {
  const { data } = await api.post(`/tasks/${task_id}/dispatch`);
  return data as Task;
}

export async function cancelTask(task_id: string) {
  const { data } = await api.post(`/tasks/${task_id}/cancel`);
  return data as Task;
}

export async function cloneTask(task_id: string) {
  const { data } = await api.post(`/tasks/${task_id}/clone`);
  return data as Task;
}

export async function getTaskResult(task_id: string) {
  const { data } = await api.get(`/tasks/${task_id}/result`);
  return data as { task_id: string; result_url: string | null; intent: any };
}

// ── API Keys ─────────────────────────────────────────────────────────

export async function listApiKeys() {
  const { data } = await api.get('/auth/api-keys');
  return data.keys as ApiKey[];
}

export async function createApiKey(label = '') {
  const { data } = await api.post('/auth/api-keys', { label });
  return data as ApiKey;
}

export async function revokeApiKey(key_id: string) {
  await api.delete(`/auth/api-keys/${key_id}`);
}

// ── Billing API ──────────────────────────────────────────────────────

export async function listPlans() {
  const { data } = await api.get('/billing/plans');
  return data as Plan[];
}

export async function getSubscription() {
  const { data } = await api.get('/billing/subscription');
  return data as Subscription;
}

export async function createCheckoutSession(price_id: string, success_url?: string, cancel_url?: string) {
  const { data } = await api.post('/billing/create-checkout-session', { price_id, success_url, cancel_url });
  return data as { url: string };
}

export async function createPortalSession() {
  const { data } = await api.post('/billing/create-portal-session');
  return data as { url: string };
}

export async function cancelSubscription() {
  const { data } = await api.post('/billing/subscription/cancel');
  return data as { ok: boolean; message: string };
}

export async function reactivateSubscription() {
  const { data } = await api.post('/billing/subscription/reactivate');
  return data as { ok: boolean; message: string };
}

// ── Webhook API ──────────────────────────────────────────────────────

export async function listWebhooks() {
  const { data } = await api.get('/webhooks');
  return data as Webhook[];
}

export async function createWebhook(url: string, events: string[], secret?: string) {
  const { data } = await api.post('/webhooks', { url, events, secret });
  return data as Webhook;
}

export async function updateWebhook(id: string, body: Partial<{ url: string; events: string[]; is_active: boolean }>) {
  const { data } = await api.patch(`/webhooks/${id}`, body);
  return data as Webhook;
}

export async function deleteWebhook(id: string) {
  await api.delete(`/webhooks/${id}`);
}

// ── Admin API ─────────────────────────────────────────────────────────

export interface AdminStatus {
  queue_backend: string; database: string;
  tasks_pending: number; tasks_ready: number; tasks_queued: number;
  tasks_running: number; tasks_completed: number; tasks_failed: number; tasks_cancelled: number;
  workers_idle: number; workers_busy: number; workers_offline: number; workers_total: number;
  queue_pending: number; queue_dead: number;
}

export interface AuditLogEntry {
  id: string; user_id: string | null; action: string;
  resource_type: string | null; resource_id: string | null;
  details: string | null; ip_address: string | null; created_at: string;
}

export async function getAdminStatus() {
  const { data } = await api.get('/admin/status');
  return data as AdminStatus;
}

export async function listUsers(limit = 100, offset = 0) {
  const { data } = await api.get('/admin/users', { params: { limit, offset } });
  return data as { users: User[] };
}

export async function updateUser(userId: string, body: { display_name?: string; role?: string; is_active?: boolean }) {
  const { data } = await api.patch(`/admin/users/${userId}`, body);
  return data as { ok: boolean };
}

export async function updateUserQuota(userId: string, body: { quota_concurrency?: number; quota_max_resolution?: number; quota_max_samples?: number }) {
  const { data } = await api.patch(`/admin/users/${userId}/quota`, body);
  return data as { ok: boolean };
}

export async function listAdminPlans() {
  const { data } = await api.get('/admin/plans');
  return data as { plans: Plan[] };
}

export async function createAdminPlan(plan: any) {
  const { data } = await api.post('/admin/plans', plan);
  return data;
}

export async function updateAdminPlan(planId: string, body: any) {
  const { data } = await api.patch(`/admin/plans/${planId}`, body);
  return data;
}

export async function getAuditLog(limit = 100, offset = 0) {
  const { data } = await api.get('/admin/audit-log', { params: { limit, offset } });
  return data as { logs: AuditLogEntry[] };
}

export async function getDeadLetter() {
  const { data } = await api.get('/admin/dead-letter');
  return data as { dead_letter_count: number };
}

export async function replayDeadLetter() {
  const { data } = await api.post('/admin/dead-letter/replay');
  return data as { replayed: number };
}

// ── Organization / Team API ───────────────────────────────────────────

export interface OrgMember {
  id: string; organization_id: string; user_id: string; role: string; created_at: string;
}

export interface Organization {
  id: string; name: string; slug: string; owner_id: string;
  stripe_customer_id: string | null; created_at: string; updated_at: string;
}

export async function getMyOrganization() {
  const { data } = await api.get('/orgs/my');
  return data as Organization;
}

export async function getOrgMembers() {
  const { data } = await api.get('/orgs/members');
  return data as { members: OrgMember[]; users: User[] };
}

export async function inviteMember(email: string, role = 'member') {
  const { data } = await api.post('/orgs/invite', { email, role });
  return data as { ok: boolean; message: string };
}

export async function removeMember(memberId: string) {
  const { data } = await api.delete(`/orgs/members/${memberId}`);
  return data as { ok: boolean };
}

export async function updateOrg(orgId: string, body: { name?: string }) {
  const { data } = await api.patch(`/orgs/${orgId}`, body);
  return data as Organization;
}

// ── Gallery / Assets API ─────────────────────────────────────────────

export interface GalleryAsset {
  id: string; task_id: string | null; title: string;
  file_url: string; thumbnail_url: string | null;
  file_size: number | null; created_at: string;
}

export async function listAssets(limit = 50, offset = 0) {
  const { data } = await api.get('/assets', { params: { limit, offset } });
  return data as { assets: GalleryAsset[]; total: number };
}

export async function deleteAsset(assetId: string) {
  await api.delete(`/assets/${assetId}`);
}

// ── Scenes API (user-managed) ────────────────────────────────────────

export interface SceneDetail {
  id: string; name: string; description: string; category: string;
  params: Record<string, any>; is_system: boolean; is_public: boolean;
  thumbnail_url: string | null; created_at: string; updated_at: string;
}

export async function listUserScenes() {
  const { data } = await api.get('/scenes/manage');
  return data as { scenes: SceneDetail[] };
}

export async function createScene(scene: { name: string; description?: string; category?: string; params: Record<string, any> }) {
  const { data } = await api.post('/scenes/manage', scene);
  return data as SceneDetail;
}

export async function updateScene(sceneId: string, body: Partial<SceneDetail>) {
  const { data } = await api.patch(`/scenes/manage/${sceneId}`, body);
  return data as SceneDetail;
}

export async function deleteScene(sceneId: string) {
  await api.delete(`/scenes/manage/${sceneId}`);
}

// ── Password Reset ─────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data as { ok: boolean; message: string };
}

export async function resetPassword(token: string, new_password: string) {
  const { data } = await api.post('/auth/reset-password', { token, new_password });
  return data as { ok: boolean; message: string };
}

// ── User Profile API ────────────────────────────────────────────────

export async function updateProfile(body: { display_name?: string }) {
  const { data } = await api.patch('/auth/profile', body);
  return data as User;
}

export async function changePassword(old_password: string, new_password: string) {
  const { data } = await api.post('/auth/change-password', { old_password, new_password });
  return data as { ok: boolean; message: string };
}

// ── Workers API ──────────────────────────────────────────────────────

export interface WorkerInfo {
  id: string; label: string; hostname: string; gpu_device: string;
  status: string; last_heartbeat: string; current_task_id: string | null;
  concurrency: number; created_at: string;
}

export async function listWorkers() {
  const { data } = await api.get('/workers');
  return data as { workers: WorkerInfo[]; available_capacity: number };
}

export async function getWorkerCapacity() {
  const { data } = await api.get('/workers/capacity');
  return data as { available_capacity: number };
}

// ── WebSocket ────────────────────────────────────────────────────────

export function connectTaskWS(task_id: string, onEvent: (ev: any) => void): () => void {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.host;
  const ws = new WebSocket(`${protocol}//${host}/api/ws/${task_id}`);

  ws.onmessage = (msg) => {
    try { onEvent(JSON.parse(msg.data)); }
    catch { /* ignore */ }
  };
  ws.onclose = () => setTimeout(() => {
    // auto-reconnect
    connectTaskWS(task_id, onEvent);
  }, 3000);

  return () => ws.close();
}
