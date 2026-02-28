import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@/env';
import { App } from './App';
import { reportWebVitals } from './lib/report-web-vitals';
import './globals.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root not found');
}
createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);

reportWebVitals();
