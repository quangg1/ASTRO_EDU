import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.cosmolearn.app',
  appName: 'Cosmo Learn',
  webDir: 'capacitor-shell',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 1200,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  },
}

export default config
