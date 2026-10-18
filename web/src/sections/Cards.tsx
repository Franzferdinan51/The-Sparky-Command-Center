import type { AgentNode, DarkbloomState, DiscreteNode, Gpu, ModelState, StorageState, SwitchState, TrainingState, UnifiedNode } from '../lib/api'
import { fmtBps, fmtTps, fx, isNum, tempTone, tempWord } from '../lib/format'
import { Bar, Big, Chip, Fresh, KV, Led, Panel, Pill, Sparkline } from '../components/Panel'

// One card per unit, the same fields v1 showed, in the JARVIS instrument style.

const TempExtra = ({ t, warn, hot }: { t: number | null; warn: number; hot: number }) => {
  const tone = tempTone(t, warn, hot)
  return <Pill tone={tone}>{tempWord(tone)}</Pill>
}

export function UnifiedCard({ s, hist, warn, hot, stale }: { s: UnifiedNode; hist?: number[]; warn: number; hot: number; stale: number }) {
  const reach = s.reachable
  return (
    <Panel id={`card-node-${s.key}`} dim={!reach} tone={!reach ? 'bad' : undefined}
      title={<><Led on={reach} /> <span>{s.name}</span></>}
      chips={<>{s.pair && <Chip tone="violet" title={s.pair}>{s.pair}</Chip>}{s.chip && <Chip tone="core">{s.chip}</Chip>}{s.node_id && <Chip>{s.node_id}</Chip>}</>}>
      {reach ? (s.kind === 'apple' ? (
        <>
          <div className="bigrow">
            <Big label="GPU util" value={fx(s.util)} unit="%" extra={<Pill tone={isNum(s.util) && s.util > 85 ? 'warn' : 'good'}>{isNum(s.util) && s.util > 85 ? 'BUSY' : 'OK'}</Pill>} />
            <Big label="CPU" value={fx(s.cpu_pct, 1)} unit="%" />
            <Big label="Thermal" value={s.thermal || '-'} small />
          </div>
          <KV k="Unified mem">{fx(s.mem_used_gib, 1)} / {fx(s.mem_total_gib, 1)} GiB</KV>
          <Bar pct={s.mem_pct} />
          <KV k="GPU mem in use">{isNum(s.model_gib) ? `${s.model_gib.toFixed(1)} GiB` : '-'}</KV>
          <KV k="Swap">{isNum(s.swap_used_mb) ? `${s.swap_used_mb.toFixed(0)} / ${fx(s.swap_total_mb, 0)} MB` : '-'}</KV>
          {(s.load_avg && s.load_avg.length > 0) && <KV k="Load avg">{s.load_avg.map(v => v.toFixed(2)).join(' · ')}</KV>}
          {(s.disks || []).map(d => <KV key={d.label} k={`Disk · ${d.label || ''}`}>{isNum(d.used_pct) ? `${d.used_pct.toFixed(0)}% used` : '-'}{isNum(d.free_gib) ? ` · ${d.free_gib.toFixed(0)} GiB free` : ''}</KV>)}
          <Sparkline values={hist} />
        </>
      ) : (
        <>
          <div className="bigrow">
            <Big label="Temp" value={fx(s.temp)} unit="°C" extra={<TempExtra t={s.temp} warn={warn} hot={hot} />} />
            <Big label="Power" value={fx(s.power)} unit="W" />
            <Big label="SM clock" value={fx(s.sm_clock)} unit="MHz" small />
          </div>
          <KV k="GPU util">{fx(s.util)} %</KV>
          <Bar pct={s.util} />
          <KV k="Unified mem">{fx(s.mem_used_gib, 1)} / {fx(s.mem_total_gib, 1)} GiB</KV>
          <Bar pct={s.mem_pct} />
          <KV k="Model resident">{isNum(s.model_gib) ? `${s.model_gib.toFixed(1)} GiB` : '-'}</KV>
          <KV k="Serving" accent>{s.model || '-'}</KV>
          <Sparkline values={hist} />
        </>
      )) : <p className="card__err">Unreachable: {s.err || 'no response'}</p>}
      <Fresh ts={s.ts} err={reach ? null : s.err} staleAfter={stale} />
    </Panel>
  )
}

export function GpuCard({ g, hist, warn, hot }: { g: Gpu; hist?: number[]; warn: number; hot: number }) {
  const pl = g.power_limit || 350
  const capPct = isNum(g.power) ? (g.power / pl) * 100 : null
  const capTone = !isNum(g.power) ? 'muted' : g.power > pl * 0.85 ? 'bad' : g.power > pl * 0.55 ? 'warn' : 'good'
  return (
    <Panel title={<><Led on /> <span>GPU {g.index}</span></>} chips={<Chip>{g.name}</Chip>}>
      <div className="bigrow bigrow--2">
        <Big label="Temp" value={fx(g.temp)} unit="°C" extra={<TempExtra t={g.temp} warn={warn} hot={hot} />} />
        <Big label="Power" value={fx(g.power)} unit="W" extra={<Pill tone={capTone}>{isNum(capPct) ? `${capPct.toFixed(0)}% cap` : '-'}</Pill>} />
      </div>
      <KV k="Utilization">{fx(g.util)} %</KV>
      <Bar pct={g.util} />
      <KV k="VRAM">{isNum(g.mem_used_mb) ? (g.mem_used_mb / 1024).toFixed(1) : '-'} / {isNum(g.mem_total_mb) ? (g.mem_total_mb / 1024).toFixed(1) : '-'} GiB</KV>
      <Bar pct={g.mem_pct} />
      <KV k="Fan">{isNum(g.fan) ? `${g.fan.toFixed(0)} %` : '-'}</KV>
      <KV k="Graphics clock">{isNum(g.gr_clock) ? `${g.gr_clock.toFixed(0)} MHz` : '-'}</KV>
      <Sparkline values={hist} />
    </Panel>
  )
}

export function HostCard({ box, stale }: { box: DiscreteNode; stale: number }) {
  const reach = box.reachable
  return (
    <Panel id={`card-node-${box.key}`} className="card--wide" dim={!reach} tone={!reach ? 'bad' : undefined}
      title={<><Led on={reach} /> <span>{box.name}</span></>} chips={<Chip tone="violet">{box.host_label || 'GPU HOST'}</Chip>}>
      {reach ? (
        <div className="hostgrid">
          <div>
            <Big label="CPU Tctl" value={fx(box.cpu_temp)} unit="°C" extra={<TempExtra t={box.cpu_temp} warn={75} hot={90} />} />
            {(box.cpu_temps || []).slice(1).map((t, i) => <KV key={i} k={`k10temp #${i + 2}`}>{t.toFixed(1)} °C</KV>)}
            <KV k="System RAM">{isNum(box.mem_used_mb) ? (box.mem_used_mb / 1024).toFixed(1) : '-'} / {isNum(box.mem_total_mb) ? (box.mem_total_mb / 1024).toFixed(1) : '-'} GiB</KV>
            <Bar pct={box.mem_pct} />
          </div>
          <div>
            <p className="sublabel">Running containers</p>
            {(box.models || []).length ? box.models.map(m => (
              <KV key={m.name} k={m.label}><Pill tone="good">UP</Pill> {m.port ? `:${m.port}` : ''} {m.gpus ? `· ${m.gpus}` : ''}</KV>
            )) : <KV k="-">none</KV>}
          </div>
        </div>
      ) : <p className="card__err">Unreachable: {box.err || 'no response'}</p>}
      <Fresh ts={box.ts} err={reach ? null : box.err} staleAfter={stale} />
    </Panel>
  )
}

export function SwitchCard({ sw, name, badge, warn, hot, stale }: { sw: SwitchState; name: string; badge: string; warn: number; hot: number; stale: number }) {
  const reach = sw.reachable
  const h = sw.health || {}
  const r = sw.resource || {}
  const swT = h['switch-temperature'] != null ? parseFloat(h['switch-temperature']) : null
  const cpuT = h['cpu-temperature'] != null ? parseFloat(h['cpu-temperature']) : null
  const fans = ['fan1-speed', 'fan2-speed', 'fan3-speed', 'fan4-speed'].filter(f => h[f] != null)
  return (
    <Panel id="card-switch" className="card--wide" dim={!reach} tone={!reach ? 'bad' : 'violet'}
      title={<><Led on={reach} /> <span>{name}</span></>} chips={<><Chip tone="violet">{badge}</Chip>{reach && <Chip tone="core">{fmtBps(sw.total_bps)}</Chip>}</>}>
      {reach ? (
        <div className="switchgrid">
          <div>
            <div className="bigrow bigrow--2">
              <Big label="Switch temp" value={fx(swT)} unit="°C" extra={<TempExtra t={swT} warn={warn} hot={hot} />} />
              <Big label="CPU temp" value={fx(cpuT)} unit="°C" extra={<TempExtra t={cpuT} warn={60} hot={75} />} />
            </div>
            <KV k={<>Fans <span className={h['fan-state'] === 'ok' ? 'good' : 'amber'}>{h['fan-state'] || '-'}</span></>}>
              {h['psu1-state'] === 'ok' && h['psu2-state'] === 'ok' ? '2 PSU ok' : 'PSU?'}
            </KV>
            {fans.length > 0 && <div className="fans">{fans.map((f, i) => <div key={f} className="fan"><span>FAN{i + 1}</span><b className="tnum">{h[f]}</b></div>)}</div>}
            <KV k="PSU1">{h['psu1-power'] || '-'} W · {h['psu1-temperature'] || '-'} °C</KV>
            <KV k="PSU2">{h['psu2-power'] || '-'} W · {h['psu2-temperature'] || '-'} °C</KV>
            <KV k="Uptime">{r['uptime'] || '-'}</KV>
            <KV k="RouterOS">{r['version'] ? r['version'].split(' ')[0] : '-'} · cpu {r['cpu-load'] || '-'}</KV>
          </div>
          <div>
            <p className="sublabel">Fabric ports · live throughput</p>
            <div className="ports">
              {(sw.ports || []).map(p => (
                <div key={p.name} className={`port ${p.running ? '' : 'is-down'}`}>
                  <div className="port__n mono"><span>{p.name}</span><Pill tone={p.running ? 'good' : 'muted'}>{p.running ? 'link-ok' : 'down'}</Pill></div>
                  <div className="port__v tnum">{fmtBps((p.rx_bps || 0) + (p.tx_bps || 0))}</div>
                  <div className="port__m mono">{p.rate || '...'} · ↓{fmtBps(p.rx_bps)} ↑{fmtBps(p.tx_bps)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : <p className="card__err">Switch unreachable: {sw.err || 'no response'}</p>}
      <Fresh ts={sw.ts} err={reach ? null : sw.err} staleAfter={stale} />
    </Panel>
  )
}

function LiveRow({ m }: { m: ModelState }) {
  const n = m.running || 0
  const d = m.decode_tps
  if (!n || !isNum(d)) return null
  if (d <= 0) {
    const pf = m.prefill_tps || 0
    return <div className="liverow"><span className="liverow__dot" />{n} live · {pf > 0 ? `prefilling ${fmtTps(pf)} tok/s` : 'starting up'}<em>no decode yet</em></div>
  }
  return n > 1
    ? <div className="liverow"><span className="liverow__dot" />{n} live · ~{fmtTps(d / n)} tok/s each<em>{fmtTps(d)} combined</em></div>
    : <div className="liverow"><span className="liverow__dot" />1 live · {fmtTps(d)} tok/s<em>decode</em></div>
}

export function ModelCard({ m, stale }: { m: ModelState; stale: number }) {
  const reach = m.reachable
  const busy = (m.running || 0) > 0
  const ttft = isNum(m.ttft_ms) ? (m.ttft_ms >= 1000 ? <>{(m.ttft_ms / 1000).toFixed(2)}<em>s</em></> : <>{m.ttft_ms.toFixed(0)}<em>ms</em></>) : '-'
  return (
    <Panel id={`card-model-${m.key}`} dim={!reach} tone={!reach ? 'bad' : busy ? 'violet' : undefined} className="card--model"
      title={<><Led on={reach} /> <span>{m.label}</span></>}
      chips={<>{<Chip tone="violet">{m.engine || 'inference'}</Chip>}{m.port && <Chip>:{m.port}</Chip>}{reach && (busy ? <Chip tone="violet">BUSY</Chip> : <Chip tone="muted">idle</Chip>)}</>}>
      {reach ? (
        <>
          <KV k="Model" accent><span className="mono">{m.model || '-'}</span></KV>
          {m.engine === 'LM Studio' ? (
            <>
              {(m.loaded || []).length > 1 && <KV k="Also loaded">{(m.loaded || []).slice(1).join(', ')}</KV>}
              {isNum(m.context) && <KV k="Context">{m.context.toLocaleString()} tokens</KV>}
              <KV k="Telemetry">native API · no /metrics stream</KV>
              {m.gpus && <KV k="On">{m.gpus}</KV>}
            </>
          ) : (
            <>
              <div className={`perf ${busy ? '' : 'is-idle'}`}>
                <div><span>Decode</span><b className="tnum">{fmtTps(m.decode_tps)}<em>tok/s</em></b></div>
                <div><span>Prefill</span><b className="tnum violet">{fmtTps(m.prefill_tps)}<em>tok/s</em></b></div>
                <div><span>TTFT avg</span><b className="tnum">{ttft}</b></div>
              </div>
              <KV k="KV-cache">{isNum(m.kv_pct) ? `${m.kv_pct.toFixed(1)} %` : '-'}</KV>
              <Bar pct={m.kv_pct} />
              <KV k="Requests">{m.running ?? '-'} running · {m.waiting ?? '-'} waiting</KV>
              <LiveRow m={m} />
              {m.gpus && <KV k="On">{m.gpus}</KV>}
            </>
          )}
        </>
      ) : <p className="card__err">{m.label} offline: {m.err || 'no /metrics'}</p>}
      <Fresh ts={m.ts} err={reach ? null : m.err} staleAfter={stale} />
    </Panel>
  )
}

export function AgentCard({ a, stale }: { a: AgentNode; stale: number }) {
  const reach = a.reachable
  const up = isNum(a.uptime_s) ? `${Math.floor(a.uptime_s / 86400)}d ${Math.floor((a.uptime_s % 86400) / 3600)}h ${Math.floor((a.uptime_s % 3600) / 60)}m` : '-'
  return (
    <Panel id={`card-node-${a.key}`} dim={!reach} tone={!reach ? 'bad' : undefined}
      title={<><Led on={reach} /> <span>{a.name}</span></>}
      chips={<>{a.host_label && <Chip tone="core">{a.host_label}</Chip>}{a.hostname && <Chip>{a.hostname}</Chip>}</>}>
      {reach ? (
        <>
          <div className="bigrow">
            <Big label="CPU" value={fx(a.cpu_pct, 1)} unit="%" />
            <Big label="RAM" value={isNum(a.mem_used_mb) ? (a.mem_used_mb / 1024).toFixed(1) : '-'} unit={isNum(a.mem_total_mb) ? `/ ${(a.mem_total_mb / 1024).toFixed(0)} GiB` : ''} small />
            <Big label="Jobs on" value={fx(a.jobs, 0)} small />
          </div>
          <KV k="Memory">{fx(a.mem_pct, 1)} % used</KV>
          <Bar pct={a.mem_pct} />
          <KV k="Disk">{isNum(a.disk_used_gb) && isNum(a.disk_total_gb) ? `${a.disk_used_gb.toFixed(0)} / ${a.disk_total_gb.toFixed(0)} GB` : '-'}</KV>
          <Bar pct={a.disk_pct} />
          {(a.load_avg && a.load_avg.length > 0) && <KV k="Load avg">{a.load_avg.map(v => v.toFixed(2)).join(' · ')}</KV>}
          <KV k="Uptime">{up}</KV>
          <KV k="Heartbeat">{isNum(a.age_s) ? `${a.age_s.toFixed(0)}s ago` : '-'}</KV>
        </>
      ) : <p className="card__err">Not reporting: {a.err || 'no stats'}</p>}
      <Fresh ts={a.ts} err={reach ? null : a.err} staleAfter={stale} />
    </Panel>
  )
}

export function StorageCard({ s }: { s: StorageState }) {
  const vols = s.volumes || []
  const worst = vols.reduce((a, v) => (isNum(v.pct) && v.pct > (a ?? -1) ? v.pct : a), null as number | null)
  return (
    <Panel id="card-storage"
      title={<><Led on={vols.length > 0} /> <span>Storage</span></>}
      chips={<>{isNum(worst) && <Chip tone={worst >= 90 ? 'bad' : worst >= 75 ? 'amber' : 'good'}>{worst.toFixed(0)}% fullest</Chip>}</>}>
      {vols.map(v => (
        <div key={v.path}>
          <KV k={v.label}>{v.err ? v.err : isNum(v.pct) ? `${v.pct.toFixed(1)} % used · ${isNum(v.free_gb) ? v.free_gb.toFixed(0) : '-'} GB free` : '-'}</KV>
          <Bar pct={v.pct} />
        </div>
      ))}
      {(s.watch && s.watch.length > 0) && (
        <>
          <KV k="Biggest folders">{s.watch.length} tracked</KV>
          {s.watch.slice(0, 5).map(w => (
            <KV key={w.path} k={<span className="mono" style={{ fontSize: 11 }}>{w.path.replace(/^\/Users\/duckets/, '~')}</span>}>
              {isNum(w.size_gb) ? `${w.size_gb.toFixed(1)} GB` : '—'}
            </KV>
          ))}
        </>
      )}
      <Fresh ts={s.ts} err={null} staleAfter={120} />
    </Panel>
  )
}

export function DarkbloomCard({ d }: { d: DarkbloomState }) {
  const reach = d.reachable
  const running = reach && d.running === true
  const lastCredit = isNum(d.last_credit_at) ? new Date(d.last_credit_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'
  return (
    <Panel id="card-darkbloom" dim={reach && !running}
      title={<><Led on={running} /> <span>Darkbloom</span></>}
      chips={<>{d.version && <Chip>v{d.version}</Chip>}<Chip tone={!reach ? 'bad' : running ? 'good' : 'bad'}>{!reach ? 'BRIDGE DOWN' : running ? (d.earning ? 'EARNING' : 'ONLINE') : 'PROVIDER DOWN'}</Chip></>}>
      {reach ? (
        <>
          <div className="bigrow">
            <Big label="Balance" value={isNum(d.balance_usd) ? `$${d.balance_usd.toFixed(2)}` : '-'} />
            <Big label="Requests" value={isNum(d.requests_served) ? d.requests_served.toLocaleString() : '-'} small />
          </div>
          <KV k="Withdrawable">{isNum(d.withdrawable_usd) ? `$${d.withdrawable_usd.toFixed(4)}` : '-'}</KV>
          <KV k="All-time earned">{isNum(d.total_usd) ? `$${d.total_usd.toFixed(4)}` : '-'}</KV>
          <KV k="Tokens served">{isNum(d.tokens_generated) ? d.tokens_generated.toLocaleString() : '-'}</KV>
          {d.lifecycle && <KV k="Lifecycle">{d.lifecycle}{d.verification_pending ? ' · verification pending' : ''}</KV>}
          {d.model && <KV k="Warm model"><span className="mono" style={{ fontSize: 11 }}>{d.model}</span></KV>}
          <KV k="Last credit">{lastCredit}</KV>
        </>
      ) : <p className="card__err">Not reporting: {d.err || 'no data'}</p>}
      <Fresh ts={d.ts} err={reach ? null : d.err} staleAfter={180} />
    </Panel>
  )
}

export function TrainingCard({ t, stale }: { t: TrainingState; stale: number }) {
  const reach = t.reachable
  const running = reach && t.running
  return (
    <Panel id="card-training" className="card--wide" dim={!reach} tone={!reach ? 'bad' : running ? 'amber' : undefined}
      title={<><Led on={reach} /> <span>{t.label || 'Training'}</span></>}
      chips={<>{t.phase && <Chip tone={running ? 'amber' : 'muted'}>{t.phase}</Chip>}{t.job_id && <Chip>{t.job_id.replace('job_', '').slice(0, 13)}</Chip>}</>}>
      {reach ? (running ? (
        <>
          <div className="bigrow">
            <Big label="Step" value={fx(t.step, 0)} unit={t.total_steps ? `/ ${t.total_steps.toLocaleString()}` : ''} />
            <Big label="Loss" value={isNum(t.loss) ? t.loss.toFixed(3) : '-'} />
            <Big label="Epoch" value={isNum(t.epoch) ? t.epoch.toFixed(2) : '-'} small />
          </div>
          <KV k="Progress">{isNum(t.pct) ? `${t.pct.toFixed(1)} %` : '-'}</KV>
          <Bar pct={t.pct} />
          <KV k="Learning rate">{isNum(t.learning_rate) ? t.learning_rate.toExponential(2) : '-'}</KV>
          {t.message && <KV k="Now"><span className="mono">{t.message}</span></KV>}
          {(t.history && t.history.length > 1) && (() => {
            const pts = t.history!
            const step = Math.ceil(pts.length / 200)
            const sample = pts.filter((_, i) => i % step === 0)
            const losses = sample.map(p => p.loss)
            const lo = Math.min(...losses), hi = Math.max(...losses)
            const span = hi - lo || 1
            const d = sample.map((p, i) => `${((i / Math.max(1, sample.length - 1)) * 100).toFixed(1)},${(26 - ((p.loss - lo) / span) * 24).toFixed(1)}`).join(' ')
            return (
              <>
                <KV k="Loss curve"><span className="mono">{pts[0].loss.toFixed(3)} → {pts[pts.length - 1].loss.toFixed(3)} · min {lo.toFixed(3)} · {pts.length} pts</span></KV>
                <svg viewBox="0 0 100 28" preserveAspectRatio="none" style={{ width: '100%', height: 56, display: 'block', color: 'var(--amber)' }} aria-label="training loss curve">
                  <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                </svg>
              </>
            )
          })()}
        </>
      ) : <p className="card__err">Not training right now{t.phase ? ` — phase: ${t.phase}` : ''}.</p>
      ) : <p className="card__err">Unsloth Studio unreachable: {t.err || 'no response'}</p>}
      <Fresh ts={t.ts} err={reach ? null : t.err} staleAfter={stale} />
    </Panel>
  )
}
