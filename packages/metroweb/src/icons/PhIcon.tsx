import { PH, type PhName } from './phosphor.ts'

export function PhIcon({ name, size, className }: { name: PhName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 256 256" aria-hidden>
      <path fill="currentColor" d={PH[name]} />
    </svg>
  )
}
