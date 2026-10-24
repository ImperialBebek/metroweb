import type { ReactNode } from 'react'
import { PhIcon } from '../icons/PhIcon.tsx'

export interface NavigationBarProps {
  onBack: () => void
  // A key without a handler is drawn but aria-disabled.
  onStart?: () => void
  onSearch?: () => void
}

function NavigationKey({ label, onPress, children }: { label: string; onPress?: () => void; children: ReactNode }) {
  // A disabled key still looks like the phone's: aria-disabled, not the disabled attribute.
  return (
    <button type="button" className="nav-button" aria-label={label} aria-disabled={onPress ? undefined : true} onClick={onPress}>
      {children}
    </button>
  )
}

// The WP8.1-style software navigation bar: Back, Start and Search.
export function NavigationBar({ onBack, onStart, onSearch }: NavigationBarProps) {
  return (
    <nav className="nav-bar" aria-label="Navigation bar">
      <NavigationKey label="Back" onPress={onBack}>
        <PhIcon name="arrow-left" size={30} />
      </NavigationKey>
      <NavigationKey label="Start" onPress={onStart}>
        <PhIcon name="windows-logo" size={30} />
      </NavigationKey>
      <NavigationKey label="Search" onPress={onSearch}>
        <PhIcon name="magnifying-glass" size={30} />
      </NavigationKey>
    </nav>
  )
}
