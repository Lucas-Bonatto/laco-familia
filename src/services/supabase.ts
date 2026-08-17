import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  ?? ''
).trim();

export const isSupabaseConfigured = Boolean(
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)
  && supabasePublishableKey.length > 20
  && !/COLE_AQUI|NOT_CONFIGURED|PLACEHOLDER/i.test(supabasePublishableKey),
);

// A valid placeholder keeps the module importable while the local .env is being configured.
// No request is made until the app passes the configuration screen.
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? supabasePublishableKey : 'publishable-key-not-configured';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

if (Platform.OS !== 'web' && isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
