// Types + fetchers for server.py. Every call resolves to a Res, never throws.

export type Res<T> = { ok: true; data: T } | { ok: false; error: string }

export async function getJSON<T>(url: string, timeoutMs = 15000): Promise<Res<T>> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { cache: 'no-store', signal: ctl.signal })
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` }
    return { ok: true, data: (await r.json()) as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(t)
  }
}

export async function postJSON<T>(url: string, body: unknown): Promise<{ status: number; data: T | null }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    let data: T | null = null
    try { data = (await r.json()) as T } catch { /* empty body */ }
    return { status: r.status, data }
  } catch {
    return { status: 0, data: null }
  }
}

/* ------------------------------------------------------------------ config */

export interface SectionCfg {
  key: string; title: string; eyebrow?: string; subtitle?: string
  nodes: string[]; switch?: boolean; units: string[]; models_title?: string
}
export interface EcoLevel { value: string; label: string; default?: boolean }
export interface UiConfig {
  version: string; title: string; subtitle?: string; location?: string; timezone: string | null
  refresh_ms: number; read_only: boolean
  sections: SectionCfg[]
  nodes: { key: string; name: string; profile: 'unified' | 'discrete' | 'apple' | 'windows'; badge?: string; temp_warn?: number; temp_hot?: number }[]
  switch: { name: string; badge: string; temp_warn: number; temp_hot: number } | null
  models: { key: string; unit: string; node?: string }[]
  comfy: { enabled: boolean; title: string }
  tokens: { enabled: boolean; order: string[] }
  eco: { enabled: boolean; writes: boolean; levels: EcoLevel[]; nodes: { key: string; name: string }[]; info_url: string }
  stations: { enabled: boolean }
  keylights: { enabled: boolean; writes: boolean }
  training: { enabled: boolean; label: string }
  storage: { enabled: boolean }
  darkbloom: { enabled: boolean }
  settings: { enabled: boolean }
  chat: { enabled: boolean; name: string; suggestions: string[] }
}

/* ------------------------------------------------------------------ metrics */

export interface UnifiedNode {
  key: string; name: string; profile: 'unified'; node_id?: string; rank?: number; reachable: boolean
  temp: number | null; power: number | null; util: number | null; sm_clock: number | null
  mem_total_gib: number | null; mem_used_gib: number | null; mem_pct: number | null; model_gib: number | null
  model?: string | null; pair?: string | null; ts: number; err: string | null
  kind?: string; chip?: string | null; cpu_pct?: number | null; load_avg?: number[] | null
  thermal?: string | null; uptime_s?: number | null
  swap_used_mb?: number | null; swap_total_mb?: number | null
  disks?: { label?: string; used_pct?: number; free_gib?: number }[]
}
export interface Gpu {
  index: number; name: string; temp: number | null; power: number | null; power_limit: number | null; util: number | null
  mem_used_mb: number | null; mem_total_mb: number | null; mem_pct?: number; fan: number | null; gr_clock: number | null; mem_clock: number | null
}
export interface DiscreteNode {
  key: string; name: string; profile: 'discrete'; kind?: string; host_label?: string; reachable: boolean; ts: number; err: string | null
  gpus: Gpu[]; cpu_temp: number | null; cpu_temps: number[]; mem_total_mb: number | null; mem_used_mb: number | null; mem_pct: number | null
  models: { name: string; label: string; port?: number; gpus?: string; up: boolean }[]
}
export interface AgentNode {
  key: string; name: string; profile: 'agent'; kind?: string; host_label?: string
  reachable: boolean; ts: number; err: string | null; age_s?: number | null
  hostname?: string | null; uptime_s?: number | null; load_avg?: number[] | null; cpu_pct?: number | null
  mem_total_mb?: number | null; mem_used_mb?: number | null; mem_pct?: number | null
  disk_total_gb?: number | null; disk_used_gb?: number | null; disk_pct?: number | null; jobs?: number | null
}
export type FleetNode = UnifiedNode | DiscreteNode | AgentNode
export interface SwitchPort { name: string; running: boolean; rx_bps: number; tx_bps: number; rate: string | null }
export interface SwitchState {
  reachable: boolean; ts: number; err: string | null
  health?: Record<string, string>; resource?: Record<string, string>; ports?: SwitchPort[]; total_bps?: number
}
export interface ModelState {
  key: string; label: string; unit: string; port?: number; gpus?: string; node?: string
  reachable: boolean; engine?: string | null; model?: string | null
  decode_tps?: number | null; prefill_tps?: number | null; ttft_ms?: number | null; kv_pct?: number | null
  running?: number | null; waiting?: number | null; ts: number; err: string | null
  loaded?: string[]; context?: number | null
}
export interface TrainingState {
  enabled?: boolean; reachable: boolean; running: boolean; ts: number; err: string | null
  label?: string; phase?: string | null; job_id?: string | null; message?: string | null
  step?: number | null; total_steps?: number | null; pct?: number | null
  epoch?: number | null; loss?: number | null; learning_rate?: number | null
  history?: { ts: number; step: number; loss: number }[]
}
export interface StorageState {
  ts?: number; watch_ts?: number
  volumes?: { label: string; path: string; total_gb: number | null; used_gb: number | null; free_gb: number | null; pct: number | null; err?: string | null }[]
  watch?: { path: string; size_gb: number | null }[]
}
export interface DarkbloomState {
  enabled?: boolean; ts: number; reachable: boolean; err: string | null
  installed?: boolean | null; running?: boolean | null; version?: string | null; lifecycle?: string | null
  earning?: boolean | null; verification_pending?: boolean | null
  balance_usd?: number | null; withdrawable_usd?: number | null; total_usd?: number | null
  requests_served?: number | null; tokens_generated?: number | null; last_credit_at?: number | null; model?: string | null
}
export interface BoardEvent { ts: number; kind: string; text: string }
export interface Metrics {
  ts: number; version: string; read_only: boolean
  nodes: FleetNode[]; switch: SwitchState; history: Record<string, number[]>; models: ModelState[]
  training?: TrainingState
  storage?: StorageState
  darkbloom?: DarkbloomState
  events?: BoardEvent[]
  agg: { gpu_count: number; total_power: number; hottest_unit: string | null; hottest_temp: number | null; all_ok: boolean; down: string[] }
  thresholds: { temp_warn: number; temp_hot: number; stale_after_s: number }
}
export interface ComfyLane {
  key: string; lane: string; name: string; host: string; url: string; reachable: boolean; ts: number
  vram_total: number | null; vram_free: number | null; vram_used: number | null; version: string | null
  running: number; pending: number; busy: boolean; peak_used?: number | null; peak_busy?: number | null
  mem_source?: string; unified?: boolean; comfy_used?: number | null
}
export interface TokenRow {
  name?: string; reachable?: boolean; total_tokens?: number; total_prompt?: number; total_gen?: number; today_tokens?: number
}
export type Tokens = Record<string, TokenRow | unknown>
export interface Station { emoji: string; name: string; desc: string; port?: number; url: string; up: boolean }
export interface Light { name?: string; ip?: string; on?: number; brightness?: number; temperature?: number; [k: string]: unknown }
export interface ChatStatus {
  enabled: boolean; configured: boolean; reachable: boolean; name: string
  model?: string; active_model?: string | null; fallback?: boolean; endpoints?: number
}
export interface SettingsData {
  chat: { name?: string; model?: string; base_url?: string; temperature?: number }
  lmstudio: { reachable: boolean; models: { id: string; state?: string; type?: string; max_context_length?: number | null }[] }
}

export const getConfig = () => getJSON<UiConfig>('/api/config')
export const getMetrics = () => getJSON<Metrics>('/api/metrics')
export const getComfy = () => getJSON<{ lanes: ComfyLane[] }>('/api/comfy')
export const getTokens = () => getJSON<Tokens>('/api/tokens')
export const getStations = () => getJSON<{ stations: Station[] }>('/api/stations')
export const getLights = () => getJSON<{ lights: Light[]; down?: boolean; disabled?: boolean }>('/api/lights')
export const getEcoStatus = () => getJSON<{ status: Record<string, string>; disabled?: boolean }>('/api/eco-status', 40000)
export const getChatStatus = (force = false) => getJSON<ChatStatus>(`/api/chat/status${force ? '?force=1' : ''}`)
export const getSettings = () => getJSON<SettingsData>('/api/settings')
export const postBrainModel = (model: string) => postJSON<{ ok: boolean; model?: string; persisted?: boolean; error?: string }>('/api/settings/chat', { model })
