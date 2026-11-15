import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { FireWatchProvider } from './store/FireWatchProvider.jsx'

import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FireWatchProvider>
      <App />
    </FireWatchProvider>
  </StrictMode>,
)
