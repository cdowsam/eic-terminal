import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './FinancialTerminal.jsx'
import PasswordGate from './PasswordGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PasswordGate>
      <App />
    </PasswordGate>
  </StrictMode>,
)
