import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'metroweb/styles.css'
import './index.css'
import './motionSpeedSession'
import App from './App.tsx'
import { SettingsProvider } from './store.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
)
