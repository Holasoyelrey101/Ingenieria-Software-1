import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { BrowserRouter } from 'react-router-dom'

// Global error handler to surface runtime exceptions into the DOM (dev only)
window.addEventListener('error', (ev) => {
  try {
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `<pre style="white-space:pre-wrap; color: red; padding:16px;">Global error:\n${(ev && (ev.message || ev.error && ev.error.stack)) || String(ev)}</pre>`
    }
  } catch (e) {
    // ignore
  }
})
window.addEventListener('unhandledrejection', (ev) => {
  try {
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `<pre style="white-space:pre-wrap; color: red; padding:16px;">UnhandledRejection:\n${String(ev.reason)}</pre>`
    }
  } catch (e) {}
})

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
