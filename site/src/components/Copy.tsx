import { useEffect, useRef, useState } from 'react'
import { t } from '../i18n/en'

type State = 'idle' | 'copied' | 'failed'

function useCopy(): [State, (text: string) => void] {
  const [state, setState] = useState<State>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = (text: string) => {
    // The clipboard API needs a secure context and a permission the reader can refuse, so
    // both the missing-API and the rejected cases have to say so — a button that silently
    // does nothing is worse than one that admits it failed.
    const write = navigator.clipboard?.writeText(text)
    if (write) write.then(() => setState('copied'), () => setState('failed'))
    else setState('failed')

    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }
  return [state, copy]
}

const label = (state: State, idle: string) =>
  state === 'copied' ? t.common.copied : state === 'failed' ? t.common.copyFailed : idle

/** A command with a copy button — the thing a reader came to the catalog for. */
export function CommandBlock({ command, cta = t.common.copy }: { command: string; cta?: string }) {
  const [state, copy] = useCopy()
  return (
    <div className="command">
      <code>{command}</code>
      <button type="button" className="button" onClick={() => copy(command)} data-state={state}>
        {label(state, cta)}
      </button>
    </div>
  )
}

export function CopyButton({ text, cta = t.common.copy }: { text: string; cta?: string }) {
  const [state, copy] = useCopy()
  return (
    <button type="button" className="button" onClick={() => copy(text)} data-state={state}>
      {label(state, cta)}
    </button>
  )
}
