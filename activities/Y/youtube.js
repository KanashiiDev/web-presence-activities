registerParser({
  id: "kanashiidev_youtube.com_Lio",
  domain: "youtube.com",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "YouTube",
  version: "1.0.1",
  description: "Video-sharing platform hosting music, live streams, and other content.",
  category: ["video", "platform"],
  tags: [],
  mode: "watch",
  urlPatterns: [/\/watch.*/],
  fn: function () {
    //@world main

    const url = window.location.href;

    function getCurrentVideoId() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        let id = urlParams.get("v");

        if (!id) {
          const pathSegments = window.location.pathname.split("/");
          if (pathSegments.includes("v")) {
            id = pathSegments[pathSegments.length - 1];
          }
        }
        return id && id.trim().length > 0 ? id : null;
      } catch {
        return null;
      }
    }

    function getVideoData() {
      const currentUrlVideoId = getCurrentVideoId();
      if (!currentUrlVideoId) return null;

      if (window._lastActiveVideoId !== currentUrlVideoId) {
        window._lastActiveVideoId = currentUrlVideoId;
        window.cachedVideoDataResolver = null;
      }

      function isNonEmptyString(str) {
        return typeof str === "string" && str.trim().length > 0;
      }

      function hasValidAuthor(v) {
        if (isNonEmptyString(v.author)) return true;
        if (isNonEmptyString(v.artist)) return true;
        if (Array.isArray(v.authorRuns) && v.authorRuns.length > 0) return true;
        if (Array.isArray(v.artists) && v.artists.length > 0) return true;
        return false;
      }

      function isValidVideoData(v) {
        if (!v || typeof v !== "object") return false;
        return v.videoId === currentUrlVideoId && isNonEmptyString(v.title) && hasValidAuthor(v);
      }

      if (typeof window.cachedVideoDataResolver === "function") {
        try {
          const data = window.cachedVideoDataResolver();
          if (isValidVideoData(data)) return data;
          window.cachedVideoDataResolver = null;
        } catch {
          window.cachedVideoDataResolver = null;
        }
      }

      if (!window._yt_player || typeof window._yt_player !== "object") {
        return null;
      }

      try {
        for (const topKey of Object.keys(window._yt_player)) {
          const instance = window._yt_player[topKey]?.ytPubsubPubsubInstance;
          if (instance && typeof instance === "object") {
            for (const subKey of Object.keys(instance)) {
              const arr = instance[subKey];
              if (!Array.isArray(arr)) continue;

              for (let i = 0; i < arr.length; i++) {
                const listeners = arr[i]?.listeners;
                if (!Array.isArray(listeners)) continue;

                for (let l = 0; l < listeners.length; l++) {
                  const v = listeners[l]?.target?.app?.mediaElement?.d2?.videoData;
                  if (isValidVideoData(v)) {
                    window.cachedVideoDataResolver = () => {
                      const candidate = window._yt_player?.[topKey]?.ytPubsubPubsubInstance?.[subKey]?.[i]?.listeners?.[l]?.target?.app?.mediaElement?.d2?.videoData;
                      return isValidVideoData(candidate) ? candidate : null;
                    };
                    return v;
                  }
                }
              }
            }
          }
        }
      } catch {}

      const MAX_DEPTH = 10;
      const MAX_NODES = 5000;
      let nodesVisited = 0;
      const visited = new WeakSet();

      function findPath(obj, path = [], depth = 0) {
        if (depth > MAX_DEPTH || nodesVisited >= MAX_NODES) return null;
        if (!obj || typeof obj !== "object") return null;
        if (visited.has(obj)) return null;
        visited.add(obj);
        nodesVisited++;

        if (isValidVideoData(obj.videoData)) {
          return { data: obj.videoData, path: [...path, "videoData"] };
        }

        if (obj.mediaElement && typeof obj.mediaElement === "object") {
          for (const mKey of Object.keys(obj.mediaElement)) {
            const v = obj.mediaElement[mKey]?.videoData;
            if (isValidVideoData(v)) {
              return { data: v, path: [...path, "mediaElement", mKey, "videoData"] };
            }
          }
        }

        for (const key of Object.keys(obj)) {
          if (key === "document" || key === "window" || key.startsWith("JSC$")) continue;

          try {
            const val = obj[key];
            if (val && typeof val === "object") {
              const result = findPath(val, [...path, key], depth + 1);
              if (result) return result;
            }
          } catch {
            continue;
          }
        }
        return null;
      }

      const result = findPath(window._yt_player);
      if (result?.data) {
        const savedPath = result.path;
        window.cachedVideoDataResolver = () => {
          let current = window._yt_player;
          for (const k of savedPath) {
            if (!current) return null;
            current = current[k];
          }
          return isValidVideoData(current) ? current : null;
        };
        return result.data;
      }

      return null;
    }

    let internalData = getVideoData();
    const title = internalData?.title || getText("#title > h1 > yt-formatted-string") || getText("h1 .ytd-watch-metadata");
    const artist = internalData?.author?.replace(" - Topic", "") || getText("#upload-info #text > a") || getText("ytd-channel-name a");
    const videoId = getCurrentVideoId();
    const source = "YouTube";
    const songUrl = url;
    const image = videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null;
    let timePassed = "";
    let duration = "";
    let isWatching = 0;
    const video = document.querySelector("video");
    const isLive = Boolean(internalData?.isLivePlayback || document.querySelector("button.ytp-live-badge")?.offsetParent);
    if (video) {
      isWatching = !video.paused;
      timePassed = isLive ? "" : video.currentTime;
      duration = isLive ? "" : video.duration;
    }
    const playIconPath = document.querySelector(".ytp-left-controls > button > svg > path")?.getAttribute("d");
    const isPlaying = isWatching || Boolean(playIconPath?.startsWith("M 12"));
  },
});
