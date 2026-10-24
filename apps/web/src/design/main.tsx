import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'metroweb/styles.css'
import '../index.css'
import './design.css'
import '../motionSpeedSession'
import { DesignApp } from './DesignApp'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignApp />
  </StrictMode>,
)
