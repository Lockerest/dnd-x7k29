// App-wide settings. The database URL is the same Firebase Realtime Database
// the live (legacy) page uses, so both apps read the same tables.
export const DB_URL = 'https://stamina-based-project-trial-default-rtdb.firebaseio.com'

// Shown in the corner so you can tell which version you have loaded.
export const APP_VERSION = '0.5.0'

// Where the live, single-file app is published (one folder up from /next/).
export const LEGACY_URL = '../'

// Until the cutover the new app keeps its saved session under its own name, so
// joining a table at /next/ never changes what the live page remembers.
export const STORAGE_PREFIX = 'next.'
