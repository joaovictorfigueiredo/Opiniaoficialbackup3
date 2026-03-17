import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Toaster } from 'react-hot-toast'; // 1. Importa o motor dos alertas

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 2. Adiciona o Toaster aqui para os alertas aparecerem no topo */}
    <Toaster position="top-center" reverseOrder={false} />
    <App />
  </StrictMode>,
)
