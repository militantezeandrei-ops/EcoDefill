import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ecodefill.app',
  appName: 'EcoDefill',
  webDir: 'public',
  server: {
    url: 'https://eco-defill.vercel.app', // Production Vercel URL
    cleartext: true
  }
};

export default config;
