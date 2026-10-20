// Retire the old root-scoped workspace worker after the app moves to /app/.
// Android release 0.2.12: refresh the retirement worker; the workbench scope stays separate.
// User records and pairing codes in localStorage are never touched.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('shixu-web-')).map(key=>caches.delete(key)))).then(()=>self.registration.unregister())));
