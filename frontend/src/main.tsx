import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, syncStoragePersister, dehydrateOptions } from './api/queryClient'

localStorage.setItem('theme', 'light');
document.documentElement.classList.remove('dark');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: syncStoragePersister, dehydrateOptions }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
