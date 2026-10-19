import type { Ref } from 'react'
import type { StackHandle } from '../navigation'

// What every app receives from the shell. Apps render a PageStack with
// `enter`, `onExit` and `handle` so Back, Start and the launch turnstile work.
export interface AppProps {
  onExit: () => void
  handle: Ref<StackHandle>
}
