registerParser({
  id: "kanashiidev_primevideo.com_Lio",
  domain: "primevideo.com",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Amazon Prime Video",
  version: "1.0.1",
  description: "Stream popular movies, TV shows, sports, and live TV.",
  lastUpdated: "1793148796469",
  mode: "watch",
  watchAutoDetect: "disable",
  category: "video,platform",
  urlPatterns: [/.*/],
  fn: async function () {
    // @world main
    // @init-code-start
    if (!window.__primeMeta) {
      window.__primeMeta = { title: "", artist: "", image: "" };

      const URL_RE = /playerChromeResources\/v1/;

      const parse = (json) => {
        const m = json?.resources?.catalogMetadataV2;
        if (!m) return;

        const cat = m.catalog || {};
        const img = m.images || {};
        const isEpisode = cat.type === "EPISODE";

        window.__primeMeta = {
          title: cat.title || "",
          artist: isEpisode ? cat.seriesTitle || "" : "",
          image: img.coverImage || img.boxartImage || "",
        };
      };

      const origFetch = window.fetch;
      window.fetch = async function (...args) {
        const res = await origFetch.apply(this, args);
        try {
          const req = args[0];
          const url = typeof req === "string" ? req : req?.url;
          if (url && URL_RE.test(url)) {
            res
              .clone()
              .json()
              .then(parse)
              .catch(() => {});
          }
        } catch {}
        return res;
      };

      const origOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try {
          if (URL_RE.test(String(url))) {
            this.addEventListener("load", () => {
              try {
                parse(JSON.parse(this.responseText));
              } catch {}
            });
          }
        } catch {}
        return origOpen.call(this, method, url, ...rest);
      };
    }
    // @init-code-end

    let title = window.__primeMeta?.title || "";
    let artist = window.__primeMeta?.artist || "Amazon Prime Movie";
    let image = window.__primeMeta?.image || "";

    const video = document.querySelector("div[id^=dv-web-player] video[src]") || document.querySelector("#dv-web-player video") || document.querySelector("video");

    const source = "Amazon Prime Video";
    const songUrl = location.href || "https://www.primevideo.com/";

    let timePassed = 0;
    let duration = 0;
    let isPlaying = false;

    if (video) {
      isPlaying = !video.paused;
      timePassed = !isNaN(video.currentTime) ? video.currentTime : 0;
      duration = !isNaN(video.duration) ? video.duration : 0;
    }
  },
});
