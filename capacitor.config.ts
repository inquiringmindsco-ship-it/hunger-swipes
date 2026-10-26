import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard'

const config: CapacitorConfig = {
  appId: 'com.inquiringminds.hungerswipes',
  appName: 'Hunger Swipes',
  webDir: 'dist',
  server: {
    // Allow localhost live reload during native development only if CAP_SERVER_URL is set.
    url: process.env.CAP_SERVER_URL,
    cleartext: process.env.CAP_SERVER_URL ? true : undefined,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0A0A0A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0A0A0A',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: KeyboardResize.Native,
      style: KeyboardStyle.Dark,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
