registerParser({
  id: "kanashiidev_music.youtube.com_Lio",
  domain: "music.youtube.com",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "YouTube Music",
  version: "1.0.2",
  description: "Music streaming service with official tracks, remixes, and video integration.",
  category: "platform",
  tags: [],
  urlPatterns: [/.*/],
  fn: function () {
    //@world main
    // Initialize persistent caches on window to prevent re-declaration errors and data loss across loop ticks
    if (!window._ytMusicVideoCache) window._ytMusicVideoCache = new Map();
    if (!window._ytMusicVideoCacheLoading) window._ytMusicVideoCacheLoading = new Set();
    if (!window._ytMusicVideoCacheFailed) window._ytMusicVideoCacheFailed = new Set();

    /**
     * Fallback function to fetch track details via YouTube Innertube API.
     * Registered globally to persist across interval executions.
     */
    if (!window._fetchVideoDataApi) {
      window._fetchVideoDataApi = async function (id) {
        if (!id || window._ytMusicVideoCache.has(id) || window._ytMusicVideoCacheLoading.has(id) || window._ytMusicVideoCacheFailed.has(id)) return;

        const config = window.yt?.config_;
        const apiKey = config?.INNERTUBE_API_KEY;
        const clientName = config?.INNERTUBE_CLIENT_NAME || "WEB_REMIX";
        const clientVersion = config?.INNERTUBE_CLIENT_VERSION || "2.20261015.01.00";

        if (!apiKey) return;

        window._ytMusicVideoCacheLoading.add(id);
        try {
          const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoId: id,
              context: {
                client: { clientName, clientVersion },
              },
            }),
          });

          if (!res.ok) {
            window._ytMusicVideoCacheFailed.add(id);
            return;
          }

          const json = await res.json();
          if (json && json.videoDetails) {
            window._ytMusicVideoCache.set(id, json);
          } else {
            window._ytMusicVideoCacheFailed.add(id);
          }
        } catch (err) {
          window._ytMusicVideoCacheFailed.add(id);
        } finally {
          window._ytMusicVideoCacheLoading.delete(id);
        }
      };
    }

    const url = window.location.href;

    /**
     * Extracts the current track/video ID safely from URL search params or pathnames.
     */
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

    /**
     * Helper to safely extract text content from DOM elements.
     */
    function getText(selector) {
      const el = document.querySelector(selector);
      return el ? el.textContent.trim() : null;
    }

    /**
     * Deep traversal method for YouTube/YouTube Music internal player objects.
     */
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
        return (v.videoId === currentUrlVideoId || v.externalVideoId === currentUrlVideoId) && (isNonEmptyString(v.title) || isNonEmptyString(v.name));
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

    // 1. Retrieve data via deep internal player traversal
    let internalData = getVideoData();
    const songLink = document.querySelector("#movie_player .ytp-title a")?.href;
    const vid = getCurrentVideoId() || (songLink && new URL(songLink).searchParams.get("v"));

    // 2. Fallback execution using window-persisted cache and fetch mechanism
    if (!internalData && vid) {
      if (window._ytMusicVideoCache.has(vid)) {
        const cached = window._ytMusicVideoCache.get(vid);
        if (cached?.videoDetails) {
          internalData = {
            videoId: cached.videoDetails.videoId || vid,
            title: cached.videoDetails.title || null,
            author: cached.videoDetails.author || null,
            isLivePlayback: Boolean(cached.videoDetails.isLiveContent),
            lengthSeconds: cached.videoDetails.lengthSeconds || null,
          };
        }
      } else {
        window._fetchVideoDataApi(vid);
      }
    }

    // 3. Extract final variables
    const domTitle = getText(".ytmusic-player-bar yt-formatted-string:first-child") || getText("ytmusic-track-info .ytmusicTrackInfoTitle");
    const title = internalData?.title || internalData?.name || domTitle;

    let artist = "";
    const artistSelector = document.querySelector("ytmusic-player-bar yt-formatted-string.byline") || document.querySelector("ytmusic-track-info .ytmusicTrackInfoBylineItem span");
    if (artistSelector) {
      const artistNames = [];
      let foundAnchor = false;
      let spanModeFirstCaptured = false;
      for (const node of Array.from(artistSelector.childNodes)) {
        if (node.textContent?.includes("•")) break;

        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.tagName === "A") {
          foundAnchor = true;
          const text = node.textContent?.trim();
          if (text) artistNames.push(text);
        } else if (!foundAnchor && node.tagName === "SPAN" && !spanModeFirstCaptured) {
          const text = node.textContent?.trim();
          if (text) {
            artistNames.push(text.split(/\s+/)[0]);
            spanModeFirstCaptured = true;
          }
        }
      }
      artist = artistNames.join(" & ");
    }

    if (!artist && (internalData?.author || internalData?.artist)) {
      const rawAuthor = internalData.author || internalData.artist;
      artist = typeof rawAuthor === "string" ? rawAuthor.replace(" - Topic", "") : rawAuthor;
    }

    const video = document.querySelector("video");
    let timePassed = getText("#left-controls .time-info") || getText(".ytMusicMiniPlayerTimeInfo") || "";
    let duration = getText("#left-controls .time-info") || getText(".ytMusicMiniPlayerTimeInfo") || "";
    let isWatching = 0;
    if (video) {
      isWatching = !video.paused;
      if (!timePassed) timePassed = video.currentTime;
      if (!duration) duration = video.duration;
    }

    const image = vid ? `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` : null;
    const source = "YouTube Music";
    const songUrl = songLink || url;

    const pathNodes = document.querySelectorAll(".ytmusic-player-bar #button > yt-icon > span > div > svg > path");
    const newPathNodes = document.querySelector(".ytmusicPlayerControlsMainControls .ytSpecButtonShapeNextTonal path");
    const playPath = newPathNodes ? newPathNodes.getAttribute("d") : pathNodes?.[2]?.getAttribute("d") || null;
    const isPlaying = isWatching || (typeof playPath === "string" && playPath.startsWith("M6.5"));
  },
});
