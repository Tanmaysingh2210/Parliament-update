import { StrictMode } from 'react'
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from "./context/AuthContext.jsx";

import './App.css'
import App from './App.jsx'

import { CardModalProvider } from './context/CardModalContext'
import CardModal from './Component/CardModal'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CardModalProvider>
          <App />
        </CardModalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
