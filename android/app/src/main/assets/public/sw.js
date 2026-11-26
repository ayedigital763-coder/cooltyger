/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "9686776f66516bab9063e32063e827e0"
  }, {
    "url": "pwa-512x512.png",
    "revision": "cf00d536aa7b7986931132c1ee74137d"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c72c754db129a763806d869e1ec0b928"
  }, {
    "url": "index.html",
    "revision": "73bedd1d873c24db44119b796fc6f6ef"
  }, {
    "url": "icon.svg",
    "revision": "459a3fc2d7fc06a27f61c74d380a36f0"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "9aa4535901ce2a38f1013acfbd9b061c"
  }, {
    "url": "src/assets/images/hero_studio_console_1795714238524.jpg",
    "revision": "dd04beb42c7cc70d40151c4ddbc9de4d"
  }, {
    "url": "src/assets/images/cover_urban_soul_1795714239508.jpg",
    "revision": "235b9f00d58cbf9475edac4b367194a8"
  }, {
    "url": "src/assets/images/cover_afro_groove_1795714238674.jpg",
    "revision": "712d17b42257e3a341e36adcfc818a56"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/index-C5uC6lqj.js",
    "revision": null
  }, {
    "url": "assets/index-36anKnwZ.css",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "9aa4535901ce2a38f1013acfbd9b061c"
  }, {
    "url": "icon.svg",
    "revision": "459a3fc2d7fc06a27f61c74d380a36f0"
  }, {
    "url": "pwa-192x192.png",
    "revision": "c72c754db129a763806d869e1ec0b928"
  }, {
    "url": "pwa-512x512.png",
    "revision": "cf00d536aa7b7986931132c1ee74137d"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "9686776f66516bab9063e32063e827e0"
  }, {
    "url": "manifest.webmanifest",
    "revision": "6da4075b795d3cb79c776064377965c8"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
