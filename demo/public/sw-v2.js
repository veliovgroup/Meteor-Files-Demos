/*
 * @locus public
 */

;(function (self) {
  'use strict';
  /*
   * @constant
   * @name CACHE_NAME
   * @type {string}
   * @summary UNIQUE CACHE KEY, `v*` SHOULD GET INCREMETED WITH ANY CHANGES TO THIS FILE
   */
  const CACHE_NAME = 'cacheKey-v1';
  /*
   * @constant
   * @name PAGES
   * @type {string[]}
   * @summary UNIQUE CACHE KEY, `v*` SHOULD GET INCREMETED WITH ANY CHANGES TO THIS FILE
   */
  const PAGES = ['/']; // ARRAY OF ROUTES AND/OR STATIC FILES (IMAGES, FONTS, SOUNDS) TO "PRE-CACHE" BY SERVICE WORKER MIDDLEWARE

  // STORE self.location.origin IN SHORT VARIABLE
  const origin = self.location.origin;

  /*
   * REGULAR EXPRESSIONS
   * - `html` - Used to check if request is for HTML content
   * - `method` - Used to check if this is GET request
   * - `static` - Static *cacheble* files extensions
   * - `staticVendors` - Domain names which serves static content
   * - `sockjs` - Path to sockjs endpoint
   */
  const RE = {
    html: /text\/html/i,
    method: /GET/i,
    static: /\.(?:html|png|jpe?g|ico|css|js|gif|webm|webp|eot|svg|ttf|webmanifest|woff|woff2)(?:\?[a-zA-Z0-9-._~:\/#\[\]@!$&\'()*+,;=]*)?$/i,
    staticVendors: /(?:fonts\.googleapis\.com|gstatic\.com|assets\.hcaptcha\.com)/i,
    sockjs: /\/sockjs\//
  };

  /*
   * @function
   * @name exceptionHandler
   * @param {(Object|string)} error - Request error
   * @summary Return "Service Unavailable" page with "force-reload" link
   * @returns {void 0}
   */
  const exceptionHandler = (error) => {
    // console.error('[ServiceWorker] [exceptionHandler] Network Error:', error);
    return new Response('<html><body><head><title>Service Unavailable</title></head><h1>Service Unavailable</h1><p>You are offline, or service is temporarily unavailable. Please, try to <a href="#" onClick="window.location.href=window.location.href">reload the page</a>.</p><p>If you still see this page, that may mean you need to purge browser cache. One of the options is using DevTools. Please, follow the next path:<ol><li>To open DevTools: (right-click) -> "inspect element"</li><li>Click on the "Application" tab</li><li>Click on [clear site data] button</li></ol></p><p>Options to clear browser cache may vary from browser to browser. Still, it should be relatively easy to locate the "clear cache" option in the browser\'s settings.</p><p>We are very sorry for the inconvenience that may have caused you.</p></body></html>', {
      status: 200,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/html'
      })
    });
  };

  /*
   * @function
   * @name cacheOrException
   * @param {Request} req - Request object
   * @param {(Object|string)} error - Request error
   * @summary Handle request exception returning cached request if available or "Service Unavailable" response
   * @returns {Promise}
   */
  const cacheOrException = (req, error) => {
    if (RE.html.test(req.headers.get('accept'))) {
      return caches.match('/').then((cached) => {
        return cached || exceptionHandler(error);
      });
    }
    return exceptionHandler(error);
  };

  /*
   * @function
   * @name requestCheck
   * @param {Request} req - Request object
   * @summary Check that this is *cacheble* GET request, not to SockJS endpoint, and without Range header
   * @returns {boolean}
   */
  const requestCheck = (req) => {
    return RE.method.test(req.method) && !RE.sockjs.test(req.url) && !req.headers.get('Range');
  };

  /*
   * @function
   * @name originStaticCheck
   * @param {Request} req - Request object
   * @summary Check that request is sent to origin or to static file
   * @returns {boolean}
   */
  const originStaticCheck = (req) => {
    return req.url === origin || req.url === `${origin}/` || (req.url.startsWith(origin) && RE.static.test(req.url));
  };

  /*
   * @function
   * @name vendorStaticCheck
   * @param {Request} req - Request object
   * @summary Check that request is sent to origin or to static file
   * @returns {boolean}
   */
  const vendorStaticCheck = (req) => {
    return RE.staticVendors.test(req.url) && RE.static.test(req.url);
  };

  /*
   * SET `install` EVENT LISTENER
   * PRE-CACHE ALL URIs DEFINED IN THE `PAGES` CONSTANT
   */
  self.addEventListener('install', async (event) => {
    const cache = await event.waitUntil(caches.open(CACHE_NAME));
    if (cache) {
      await cache.addAll(PAGES);
    }
    await self.skipWaiting();
  });

  /*
   * SET `fetch` EVENT LISTENER
   * MAIN CACHE LOGIC IS LOCATED HERE
   *
   * STRATEGY IMPLEMENTED HERE:
   * 1. CHECK IF REQUEST IS *CACHEBLE*
   * 2. CHECK FOR CACHED REQUEST
   * 2.1. IF REQUEST IS IN THE CACHE: RETURN CACHED REQUEST AND RE-VALIDATE RESOURCE IN PARALLEL TO UPDATING CACHE
   * 2.2. IF REQUEST ISN'T FOUND IN THE CACHE: REQUEST RESOURCE AND CACHE FOR FUTURE USE
   * 2.3. IF REQUEST IS FAILED RETURN "SERVICE UNAVAILABLE" RESPONSE
   */
  self.addEventListener('fetch', (event) => {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
      return;
    }

    if (requestCheck(event.request) && (originStaticCheck(event.request) || vendorStaticCheck(event.request))) {
      const req = event.request.clone();
      event.respondWith(caches.match(req).then((cached) => {
        const fresh = fetch(req).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const resp = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, resp);
            });
          }
          return response || cached || cacheOrException(req, `can't reach a server: ${req.url}`);
        }).catch((error) => {
          return cacheOrException(req, error);
        });
        return cached || fresh;
      }));
    }
  });

  /*
   * SET `activate` EVENT LISTENER
   * CHECK THAT WE ARE ON RIGHT CACHE AND SERVICE WORKER VERSION
   * COMPARING `CACHE_NAME` CONSTANT WITH AVAILABLE CACHES BY NAME
   * REMOVE OUTDATED CACHES
   */
  self.addEventListener('activate', async (event) => {
    await event.waitUntil(caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.filter((cacheName) => {
        return CACHE_NAME !== cacheName;
      }).map((cacheName) => {
        return caches.delete(cacheName).catch(() => {});
      }));
    }));

    await self.clients.claim();
  });
})(this);
