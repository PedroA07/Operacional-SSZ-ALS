import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.als.operacional',
  appName: 'ALS',
  webDir: 'dist',

  // Para produção com deploy em URL fixa (descomente e substitua a URL):
  // server: {
  //   url: 'https://seu-dominio.vercel.app',
  //   cleartext: false,
  // },

  plugins: {
    Camera: {
      presentationStyle: 'fullscreen',
    },
    Geolocation: {
      // Permissões declaradas em AndroidManifest.xml
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0f172a',
      showSpinner: false,
    },
  },

  android: {
    minWebViewVersion: 60,
    // Permite mixed content (HTTP + HTTPS) durante desenvolvimento
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
