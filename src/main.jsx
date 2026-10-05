import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './lib/queryClient';

// reset.css se importa desde shadcn.css dentro de @layer base, para que no pise las utilidades
import './styles/design-system.css';
import './styles/components.css';
import './styles/snap-scroll.css';
import './styles/animations.css';
import './styles/admin.css';
import './styles/inventory.css';
import './styles/variant-picker.css';
import './styles/widgets.css';
import './styles/shadcn.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
