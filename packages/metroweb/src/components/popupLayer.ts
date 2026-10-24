import { createContext, useContext } from 'react'

export const PopupLayerContext = createContext<HTMLDivElement | null>(null)

// The layer above the page stack where full-screen popups (pickers) render.
export const usePopupLayer = () => useContext(PopupLayerContext)

export const PopupCloseContext = createContext<() => void>(() => {})

// Inside a FullScreenPopup: swivels the popup out, then calls its onClosed.
export const usePopupClose = () => useContext(PopupCloseContext)
