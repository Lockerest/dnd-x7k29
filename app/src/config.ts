// App-wide settings. The database URL is the same Firebase Realtime Database
// the live (legacy) page uses, so both apps read the same tables.
export const DB_URL = 'https://stamina-based-project-trial-default-rtdb.firebaseio.com'

// Shown in the corner so you can tell which version you have loaded.
export const APP_VERSION = '1.14.0'

// The old single-file page, kept as a backup next to the app.
export const LEGACY_URL = 'classic/'

// The saved session uses the old page's names, so everyone stays joined after
// the cutover (and the backup page remembers the same table).
export const STORAGE_PREFIX = ''
