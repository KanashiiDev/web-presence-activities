registerParser({
  id: "kanashiidev_gensokyoradio.net_XC9wbGF5aW",
  domain: "gensokyoradio.net",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Gensokyo Radio",
  version: "1.0.1",
  description: "Fan-run 24/7 radio station dedicated to Touhou Project fan arrangements and related music.",
  lastUpdated: "1790381238203",
  mode: "listen",
  watchAutoDetect: "disable",
  homepage: "https://gensokyoradio.net/playing/",
  category: "radio",
  tags: ["anime", "japan", "community"],
  urlPatterns: [/\/playing\/.*/],
  fn: async function () {
    const NOW = Date.now();
    const CACHE_TTL = 10000;
    let title, artist, image, timePassed, duration, isPlaying, source, songUrl;

    if (window.gensokyoCache && (NOW - window.gensokyoCache.lastFetchTime < CACHE_TTL)) {
    ({ title, artist, image, timePassed, duration, isPlaying, source, songUrl } = window.gensokyoCache.data);
    } else {
    let data = null;
    try {
    const res = await fetch("https://gensokyoradio.net/api/station/playing/");
    if (res.ok) data = await res.json();
    } catch (_) {}

    title = data?.SONGINFO?.TITLE || getText("#playerTitle");
    artist = data?.SONGINFO?.ARTIST || getText("#playerArtist");

    let domImage = getImage("#playerArt");
    image = data?.MISC?.ALBUMART ? `https://gensokyoradio.net/images/albums/500/${data.MISC.ALBUMART}` : domImage ? domImage : "";

    timePassed = data?.SONGTIMES?.PLAYED || null;
    duration = data?.SONGTIMES?.DURATION || null;
    if (!timePassed || !duration) {
    const c = getText("#playerCounter");
    if (c.includes("/"))[timePassed, duration] = c.split("/").map((s) => s.trim());
    }

    const playButton = document.getElementById("shape")?.animatedPoints;
    isPlaying = playButton ? playButton.getItem(0).x === 45 : false;
    source = "Gensokyo Radio";
    songUrl = "https://gensokyoradio.net/playing/";

    window.gensokyoCache = {
    lastFetchTime: NOW,
    data: { title, artist, image, timePassed, duration, isPlaying, source, songUrl }
    };
    }
  },
});