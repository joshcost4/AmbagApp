import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import App from './app/App'
import './index.css'
import '../default_shadcn_theme.css'

// Standard web route setup for single page apps in React Router v7
const router = createBrowserRouter([
  {
    path: '*',
    element: <App />,
  }
], {
  future: {
    v7_relativeSplatPath: true,
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)