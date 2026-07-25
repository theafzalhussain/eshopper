import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: '3955c403-a66a-4cfe-a13b-6fbf7f629960',
  clientToken: 'pub4e55a313802bdb08c6394e6fb377ce8d',
  site: 'us5.datadoghq.com',
  service: 'eshopper-frontend',
  env: 'production',
  version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackResources: true,
  trackUserInteractions: true,
  trackLongTasks: true,
});

console.log('🐕 Datadog RUM initialized (site: us5.datadoghq.com, session sampling: 100%)');