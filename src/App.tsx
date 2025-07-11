import React from 'react';
import { initializeAdCompliance } from './lib/adCompliance';
import AppRoot from './routes';
import { ToastProvider } from './components/shared/ui/Toast';

function App() {
  // Initialize ad compliance on app start
  React.useEffect(() => {
    initializeAdCompliance();
  }, []);

  return (
    <ToastProvider>
      <AppRoot />
    </ToastProvider>
  );
}

export default App;