import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beatmaker.ai',
  appName: 'BEATMAKER AI',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#07070D',
  },
};

export default config;
