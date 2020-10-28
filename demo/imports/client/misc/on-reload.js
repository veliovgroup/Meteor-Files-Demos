import { Reload } from 'meteor/reload';
import { webPush } from '/imports/client/misc/web-push.js';

/*
 * @function
 * @name onReload
 * @summary REFRESH, INVALIDATE, UNREGISTER, AND PURGE ALL POSSIBLE CACHES. THEN RELOAD THE PAGE
 * @returns {void 0}
 */
const onReload = async () => {
  try {
    window.applicationCache.swapCache();
  } catch (error) {
    // We good here...
  }

  try {
    window.applicationCache.update();
  } catch (error) {
    // We good here...
  }

  try {
    const keys = await window.caches.keys();

    for (let name of keys) {
      await window.caches.delete(name);
    }
  } catch (error) {
    console.error('[window.caches.delete] [ERROR:]', error);
  }

  try {
    // UNREGISTER ALL ServiceWorkerRegistration(s)
    const swRegistrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of swRegistrations) {
      await registration.unregister();
    }
  } catch (error) {
    console.warn('[registration.unregister] [ERROR:]', error);
  }

  if (webPush.isEnabled) {
    webPush.disable();
  }

  // GIVE IT A LITTLE TIME AND RELOAD THE PAGE
  setTimeout(() => {
    if (window.location.hash || window.location.href.endsWith('#')) {
      window.location.reload();
    } else {
      window.location.replace(window.location.href);
    }
  }, 256);
};


try {
  // CALL `onReload()` FUNCTION TO CLEAR THE CACHE AND
  // UNLOAD/UNREGISTER SERVICE WORKER(S) BEFORE RELOADING THE PAGE
  Reload._onMigrate(function (func, opts) {
    if (!opts.immediateMigration) {
      if (confirm('New version of the web app is available, would you like to update? WARNING: Web page will be reloaded!')) {
        onReload();
      }
      return [false];
    }
    return [true];
  });
} catch (e) {
  // We're good here...
}

export { onReload };
