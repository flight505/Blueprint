import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { enableReactTracking } from '@legendapp/state/config/enableReactTracking';
import App from './App';
import './index.css';

// Enable automatic React tracking for observables
// This allows using .get() directly in components without manual subscriptions
enableReactTracking({ auto: true });

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
