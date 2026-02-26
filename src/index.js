import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './Component/App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

import Store from "./Store/Store"

datadogRum.init({
  applicationId: '3955c403-a66a-4cfe-a13b-6fbf7f629960',
  clientToken: 'pub4e55a313802bdb08c6394e6fb377ce8d',
  site: 'us5.datadoghq.com',
  service: 'eshopper-frontend',
  env: 'production',
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  plugins: [reactPlugin({ router: false })],
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
   <Provider store={Store}>
   <App />
   </Provider>
  </React.StrictMode>
);
reportWebVitals();
