import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'

// Direct path imports that Vite parses seamlessly
import './styles/theme.css'
import '../default_shadcn_theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)