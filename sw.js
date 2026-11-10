const CACHE = "fullbody-edwin-v42";
// Fotogramas de técnica (~1,7 MB): se precargan para que el modal funcione offline.
const FRAMES = ["./assets/ejercicios/ab-wheel/frame-1.svg", "./assets/ejercicios/ab-wheel/frame-2.svg", "./assets/ejercicios/ab-wheel/frame-3.svg", "./assets/ejercicios/arnold-press/frame-1.svg", "./assets/ejercicios/arnold-press/frame-2.svg", "./assets/ejercicios/arnold-press/frame-3.svg", "./assets/ejercicios/bulgarian-split-squat/frame-1.svg", "./assets/ejercicios/bulgarian-split-squat/frame-2.svg", "./assets/ejercicios/bulgarian-split-squat/frame-3.svg", "./assets/ejercicios/cable-crunch/frame-1.svg", "./assets/ejercicios/cable-crunch/frame-2.svg", "./assets/ejercicios/cable-crunch/frame-3.svg", "./assets/ejercicios/cable-lateral-raise/frame-1.svg", "./assets/ejercicios/cable-lateral-raise/frame-2.svg", "./assets/ejercicios/cable-lateral-raise/frame-3.svg", "./assets/ejercicios/chest-supported-row/frame-1.svg", "./assets/ejercicios/chest-supported-row/frame-2.svg", "./assets/ejercicios/chest-supported-row/frame-3.svg", "./assets/ejercicios/close-grip-lat-pulldown/frame-1.svg", "./assets/ejercicios/close-grip-lat-pulldown/frame-2.svg", "./assets/ejercicios/close-grip-lat-pulldown/frame-3.svg", "./assets/ejercicios/dumbbell-bench-press/frame-1.svg", "./assets/ejercicios/dumbbell-bench-press/frame-2.svg", "./assets/ejercicios/dumbbell-bench-press/frame-3.svg", "./assets/ejercicios/dumbbell-romanian-deadlift/frame-1.svg", "./assets/ejercicios/dumbbell-romanian-deadlift/frame-2.svg", "./assets/ejercicios/dumbbell-romanian-deadlift/frame-3.svg", "./assets/ejercicios/face-pull/frame-1.svg", "./assets/ejercicios/face-pull/frame-2.svg", "./assets/ejercicios/face-pull/frame-3.svg", "./assets/ejercicios/hack-squat/frame-1.svg", "./assets/ejercicios/hack-squat/frame-2.svg", "./assets/ejercicios/hack-squat/frame-3.svg", "./assets/ejercicios/hanging-leg-raise/frame-1.svg", "./assets/ejercicios/hanging-leg-raise/frame-2.svg", "./assets/ejercicios/hanging-leg-raise/frame-3.svg", "./assets/ejercicios/hip-thrust/frame-1.svg", "./assets/ejercicios/hip-thrust/frame-2.svg", "./assets/ejercicios/hip-thrust/frame-3.svg", "./assets/ejercicios/incline-bench-press/frame-1.svg", "./assets/ejercicios/incline-bench-press/frame-2.svg", "./assets/ejercicios/incline-bench-press/frame-3.svg", "./assets/ejercicios/incline-dumbbell-curl/frame-1.svg", "./assets/ejercicios/incline-dumbbell-curl/frame-2.svg", "./assets/ejercicios/incline-dumbbell-curl/frame-3.svg", "./assets/ejercicios/leg-press/frame-1.svg", "./assets/ejercicios/leg-press/frame-2.svg", "./assets/ejercicios/leg-press/frame-3.svg", "./assets/ejercicios/overhead-press/frame-1.svg", "./assets/ejercicios/overhead-press/frame-2.svg", "./assets/ejercicios/overhead-press/frame-3.svg", "./assets/ejercicios/overhead-tricep-extension/frame-1.svg", "./assets/ejercicios/overhead-tricep-extension/frame-2.svg", "./assets/ejercicios/overhead-tricep-extension/frame-3.svg", "./assets/ejercicios/rope-hammer-curl/frame-1.svg", "./assets/ejercicios/rope-hammer-curl/frame-2.svg", "./assets/ejercicios/rope-hammer-curl/frame-3.svg", "./assets/ejercicios/seated-leg-curl/frame-1.svg", "./assets/ejercicios/seated-leg-curl/frame-2.svg", "./assets/ejercicios/seated-leg-curl/frame-3.svg", "./assets/ejercicios/seated-row/frame-1.svg", "./assets/ejercicios/seated-row/frame-2.svg", "./assets/ejercicios/seated-row/frame-3.svg", "./assets/ejercicios/skull-crusher/frame-1.svg", "./assets/ejercicios/skull-crusher/frame-2.svg", "./assets/ejercicios/skull-crusher/frame-3.svg"];
const ASSETS = ["./", "./index.html", "./manifest.json", "./assets/body/body-male.json", ...FRAMES];
// Se guardan al verlos: GIFs de Gym visual y fotogramas de la biblioteca (no se precargan todos).
const RUNTIME_CACHE = (url) =>
  url.startsWith("https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/videos/") ||
  url.startsWith("https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/images/") ||
  url.includes("/assets/ejercicios/") ||
  url.includes("/assets/exercises/");
// Datos de la biblioteca: red primero (para ver ejercicios nuevos), con caché de respaldo.
const isLibraryData = (url) => url.includes("/data/exercises/");

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || e.request.url.includes("/api/")) return;

  const isPage = e.request.mode === "navigate" || e.request.url.endsWith("index.html") || e.request.url.endsWith("/full-body-edwin/");

  if (isLibraryData(e.request.url)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok && RUNTIME_CACHE(e.request.url)) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ("focus" in c) return c.focus(); }
      if (clients.openWindow) return clients.openWindow("./");
    })
  );
});
