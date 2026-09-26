registerParser({
  id: "kanashiidev_listen.moe_Lio",
  domain: "listen.moe",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "LISTEN.moe",
  version: "1.0.1",
  description: "Fan-operated 24/7 streaming radio for anime, Japanese idol, vocaloid, and related tracks.",
  lastUpdated: "1790381861885",
  mode: "listen",
  watchAutoDetect: "disable",
  category: "radio",
  tags: ["anime", "japan", "community"],
  urlPatterns: [/.*/],
  fn: async function () {
    //@world main
    let title = "";
    let artist = "";
    let image = "https://listen.moe/images/logo.png";
    const source = "LISTEN.moe";
    const songUrl = "https://listen.moe/";
    let isPlaying = false;
    const FALLBACK_IMAGE = "https://listen.moe/images/logo.png";

    window.__LISTEN_MOE_DATA__ = window.__LISTEN_MOE_DATA__ || {
    title: "",
    artist: "",
    image: FALLBACK_IMAGE,
    prevTitle: "",
    prevArtist: "",
    prevImage: FALLBACK_IMAGE,
    wsConnected: false,
    lastUpdated: 0
    };

    if (!window.__LISTEN_MOE_WS_PATCHED__) {
    window.__LISTEN_MOE_WS_PATCHED__ = true;

    const OriginalWebSocket = window.WebSocket;

    window.WebSocket = function (...args) {
    const ws = new OriginalWebSocket(...args);
    const url = args[0] || "";

    const isListenMoeWS = typeof url === "string" && (url.includes("listen.moe") || url.includes("gateway"));

    if (isListenMoeWS) {
    window.__LISTEN_MOE_DATA__.wsConnected = true;

    ws.addEventListener("close", () => {
    window.__LISTEN_MOE_DATA__.wsConnected = false;
    });

    ws.addEventListener("error", () => {
    window.__LISTEN_MOE_DATA__.wsConnected = false;
    });

    ws.addEventListener("message", (event) => {
    try {
    const data = JSON.parse(event.data);

    let song = null;
    if (data.d?.song) {
    song = data.d.song;
    } else if (data.song) {
    song = data.song;
    }

    if (song) {
    const store = window.__LISTEN_MOE_DATA__;

    const nextTitle = song.title || "";
    const nextArtist = song.artists?.map((a) => a.name || a.nameRomaji).filter(Boolean).join(", ") || "";

    let rawImage = "";
    if (song.albums && song.albums.length > 0 && song.albums[0].image) {
    rawImage = `https://cdn.listen.moe/covers/${song.albums[0].image}`;
    }

    const isSongChanged = (nextTitle !== store.title || nextArtist !== store.artist);
    let finalImage = rawImage || FALLBACK_IMAGE;

    if (isSongChanged) {
    if (!rawImage || rawImage === store.image) {
    finalImage = FALLBACK_IMAGE;
    }
    }

    store.prevTitle = store.title;
    store.prevArtist = store.artist;
    store.prevImage = store.image;

    store.title = nextTitle;
    store.artist = nextArtist;
    store.image = finalImage;
    store.lastUpdated = Date.now();

    title = nextTitle;
    artist = nextArtist;
    image = finalImage;
    }
    } catch (e) {}
    });
    }

    return ws;
    };

    window.WebSocket.prototype = OriginalWebSocket.prototype;
    }

    function updateTrackData() {
    const store = window.__LISTEN_MOE_DATA__;

    const rect = document.querySelector(".glass svg rect");
    const nextIsPlaying = rect?.getAttribute("x") === "6";
    if (isPlaying !== nextIsPlaying) {
    isPlaying = nextIsPlaying;
    }

    if (store.wsConnected && store.title !== "") {
    title = store.title;
    artist = store.artist;
    image = store.image;
    return;
    }

    const primarySpan = document.querySelector(".glass span.text-text-primary");
    if (!primarySpan) return;

    const domTitleText = primarySpan.textContent?.trim() || "";
    if (domTitleText) {
    const titleExtra = primarySpan.querySelector(".inline")?.textContent?.trim() || "";
    let cleanTitle = domTitleText;
    if (titleExtra) {
    cleanTitle = cleanTitle.replace(titleExtra, "").trim();
    }

    const nextArtist = document.querySelector(".glass span.text-text-secondary > span")?.textContent?.trim() || "";
    const domImage = document.querySelector("img[alt='Album art']")?.src || FALLBACK_IMAGE;

    const isDomSongChanged = (cleanTitle !== title || nextArtist !== artist);
    let finalDomImage = domImage;

    if (isDomSongChanged && (domImage === image || !domImage)) {
    finalDomImage = FALLBACK_IMAGE;
    }

    if (title !== cleanTitle) title = cleanTitle;
    if (artist !== nextArtist) artist = nextArtist;
    if (image !== finalDomImage) image = finalDomImage;
    }
    }

    updateTrackData();
  },
});