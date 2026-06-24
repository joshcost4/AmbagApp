
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router' // ◄ ADD THIS IMPORT
import App from "./app/App";
import './index.css'
import '../default_shadcn_theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> {/* ◄ WRAP APP IN BROWSERROUTER */}
      <App />
    </BrowserRouter>
  </StrictMode>,)
