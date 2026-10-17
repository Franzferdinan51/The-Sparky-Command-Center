import { useCallback, useEffect, useState } from 'react'
import { getChatStatus, getSettings, postBrainModel, type SettingsData } from '../lib/api'
import { Chip, KV, Led, Panel } from '../components/Panel'

// Settings: the chat's brain model. The picker is fed by LM Studio's own
// library (loaded models first); when LM Studio is offline it falls back to a
// free-text field so a brain can still be staged for next time.

export function Settings() {
  const [data, setData] = useState<SettingsData | null>(null)
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<string | null>(null)
  const [chatUp, setChatUp] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([getSettings(), getChatStatus(true)])
    if (s.ok) {
      setData(s.data)
      setModel(prev => prev || s.data.chat.model || '')
    }
    if (c.ok) setChatUp(c.data.reachable)
  }, [])
  useEffect(() => { void load() }, [load])

  const save = async () => {
    const m = model.trim()
    if (!m || busy) return
    setBusy(true); setOut(null)
    const r = await postBrainModel(m)
    setBusy(false)
    if (r.data?.ok) {
      setOut(`Brain set to ${r.data.model}${r.data.persisted ? ' · saved to config.json — survives restarts' : ''}`)
      void load()
    } else {
      setOut(`Not saved: ${r.data?.error || `HTTP ${r.status}`}`)
    }
  }

  const cur = data?.chat.model || ''
  const lib = data?.lmstudio
  const dirty = model.trim() !== '' && model.trim() !== cur

  return (
    <div className="cards cards--1">
      <Panel className="card--wide" id="card-settings"
        title={<><Led on={chatUp === true} /> <span>Brain · chat model</span></>}
        chips={<>{cur && <Chip tone="violet">{cur}</Chip>}{lib && <Chip tone={lib.reachable ? 'good' : 'bad'}>{lib.reachable ? 'LM Studio up' : 'LM Studio offline'}</Chip>}</>}>
        <KV k="Assistant">{data?.chat.name || 'Juno'}</KV>
        <KV k="Endpoint"><span className="mono">{data?.chat.base_url || '-'}</span></KV>
        <KV k="Current brain" accent><span className="mono">{cur || '-'}</span></KV>
        <div className="eco" style={{ marginTop: 12 }}>
          <label className="field"><span className="mono">Brain model</span>
            {lib?.reachable && lib.models.length > 0 ? (
              <select value={model} onChange={e => setModel(e.target.value)}>
                {cur && !lib.models.some(m => m.id === cur) && <option value={cur}>{cur} (current · not in library)</option>}
                {lib.models.map(m => (
                  <option key={m.id} value={m.id}>{m.id}{m.state === 'loaded' ? ' · loaded' : ''}</option>
                ))}
              </select>
            ) : (
              <input value={model} onChange={e => setModel(e.target.value)} placeholder="model id, e.g. ornith-1.5-35b-a3b"
                style={{ width: '100%', background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--line-2)', borderRadius: 6, padding: '10px 12px', font: '13px var(--f-body)' }} />
            )}
          </label>
          <div className="eco__btns">
            <button type="button" className="btn btn--sm btn--primary" onClick={save} disabled={!dirty || busy}>
              {busy ? 'Saving...' : 'Set brain'}
            </button>
            <button type="button" className="btn btn--sm" onClick={() => void load()} disabled={busy}>Refresh</button>
          </div>
        </div>
        {lib && !lib.reachable && <p className="card__err" style={{ marginTop: 10 }}>LM Studio is not answering, so the library list is unavailable — you can still type a model id and stage it.</p>}
        {out && <pre className="eco__out mono">{out}</pre>}
        <p className="mono" style={{ marginTop: 10, fontSize: 11, color: 'var(--ink-3)', letterSpacing: '.04em' }}>
          Switching the brain only changes which model answers in the chat — nothing loads until you send a message. Don't swap mid-training unless you mean to load it.
        </p>
      </Panel>
    </div>
  )
}
