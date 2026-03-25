import type { CapacitorConfig } from '@capacitor/cli';
import fs from 'node:fs';
import path from 'node:path';

const readCapServerUrl = (): string | undefined => {
  if (process.env.CAP_SERVER_URL?.trim()) {
    return process.env.CAP_SERVER_URL.trim();
  }

  try {
    const envPath = path.resolve(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const line = envContent
      .split(/\r?\n/)
      .find((entry) => entry.trimStart().startsWith('CAP_SERVER_URL='));

    if (!line) {
      return undefined;
    }

    const value = line.split('=').slice(1).join('=').trim();
    return value.replace(/^['\"]|['\"]$/g, '').trim() || undefined;
  } catch {
    return undefined;
  }
};

const serverUrl = readCapServerUrl();

const config: CapacitorConfig = {
  appId: 'com.ecodefill.app',
  appName: 'EcoDefill',
  webDir: 'out',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
        },
      }
    : {}),
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: '#101010',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
