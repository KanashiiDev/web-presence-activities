registerParser({
  id: "kanashiidev_netflix.com_XC93YXRjaF",
  domain: "netflix.com",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Netflix",
  version: "1.0.1",
  description: "Streaming service for watching movies, TV shows, documentaries, and original content online.",
  mode: "watch",
  category: "platform",
  tags: [],
  urlPatterns: [/\/watch\/.+/],
  fn: async function () {
    //@world main
    function getNetflixData() {
      const videoId = window.location.href.match(/watch\/(\d+)/)?.[1];
      if (!videoId) return null;

      const api = window.netflix?.appContext?.state?.playerApp?.getAPI();
      if (!api) return null;

      const rawMeta = api.getVideoMetadataByVideoId(Number(videoId)) || api.getActiveVideoMetadata();
      if (!rawMeta) return null;

      const video = rawMeta._metadataObject?.video || rawMeta._video?._video || rawMeta;
      const seasons = video.seasons || [];

      let foundEpisode = null;
      let parentSeason = null;

      for (const season of seasons) {
        if (!season.episodes) continue;
        const ep = season.episodes.find((e) => Number(e.id) === Number(videoId) || Number(e.episodeId) === Number(videoId));
        if (ep) {
          foundEpisode = ep;
          parentSeason = season;
          break;
        }
      }

      if (!foundEpisode && video.currentEpisode) {
        foundEpisode = video.currentEpisode;
      }

      const episodeNumber = foundEpisode?.seq || foundEpisode?.episodeNum || null;
      const seasonNumber = parentSeason?.seq || parentSeason?.seasonNum || foundEpisode?.seasonNum || null;

      const formatCode = (sNum, eNum, mode = "full") => {
        if (!eNum) return null;

        const ePad = String(eNum).padStart(2, "0");
        const sPad = sNum ? String(sNum).padStart(2, "0") : "01";

        switch (mode) {
          case "netflix":
            return sNum ? `S${sNum} E${eNum}` : `E${eNum}`;
          case "epOnly":
            return `E${eNum}`;
          case "full":
          default:
            return `S${sPad}E${ePad}`;
        }
      };

      let isPlaying = false,
        isPaused = true,
        currentTime = 0,
        duration = 0;
      const sessionId = api.getOpenPlaybackSessions?.()[0];
      const player = sessionId ? api.getVideoPlayerBySessionId?.(sessionId) : null;

      if (player && typeof player.isPlaying === "function") {
        isPlaying = player.isPlaying();
        isPaused = player.isPaused();
        currentTime = Math.round((player.getCurrentTime() || 0) / 1000);
        duration = Math.round((player.getDuration() || 0) / 1000);
      } else {
        const videoElement = document.querySelector("video");
        if (videoElement) {
          isPlaying = !videoElement.paused && !videoElement.ended && videoElement.readyState > 2;
          isPaused = videoElement.paused;
          currentTime = Math.round(videoElement.currentTime || 0);
          duration = Math.round(videoElement.duration || 0);
        }
      }

      const extractUrlsByFormat = (imageArray = []) => {
        if (!Array.isArray(imageArray) || imageArray.length === 0) return null;
        let pngUrl = null,
          jpgUrl = null,
          webpUrl = null;

        for (const item of imageArray) {
          const url = item?.url;
          if (!url) continue;
          if (!pngUrl && /\.png(\?|$)/i.test(url)) pngUrl = url;
          if (!jpgUrl && /\.(jpg|jpeg)(\?|$)/i.test(url)) jpgUrl = url;
          if (!webpUrl && /\.webp(\?|$)/i.test(url)) webpUrl = url;
        }

        return { png: pngUrl, jpeg: jpgUrl, webp: webpUrl || imageArray[0]?.url || null };
      };

      return {
        showType: video.type || null,
        showTitle: video.title || video.showTitle || null,
        showImage: extractUrlsByFormat([...(video.storyArt || []), ...(video.boxart || [])]),
        episodeDetails: {
          title: foundEpisode?.title || null,
          seasonNumber: seasonNumber,
          episodeNumber: episodeNumber,
          episodeCode: formatCode(seasonNumber, episodeNumber, "epOnly"),
          seasonCode: formatCode(seasonNumber, episodeNumber),
          images: extractUrlsByFormat([...(foundEpisode?.stills || []), ...(foundEpisode?.thumbs || [])]),
        },
        playbackState: {
          isPlaying,
          isPaused,
          currentTimeSeconds: currentTime,
          durationSeconds: duration,
        },
      };
    }

    const netflixData = getNetflixData();
    const url = new URL(location.href);
    url.search = "";

    const netflixLogo = "https://www.google.com/s2/favicons?domain=netflix.com&sz=128";
    const typeIsMovie = Boolean(netflixData?.showType === "movie");

    let titleWithEp = netflixData?.episodeDetails?.episodeCode ? `${netflixData?.episodeDetails?.episodeCode}: ${netflixData?.episodeDetails?.title}` : null;
    let title = titleWithEp || netflixData?.episodeDetails?.title || netflixData?.showTitle || "";
    let artist = netflixData?.showTitle || "Netflix";
    if (title === artist) artist = typeIsMovie ? "Netflix Movie" : "";

    let image = netflixData?.episodeDetails?.images?.jpeg || netflixLogo;
    let source = "Netflix";
    let songUrl = url.href || "";
    let timePassed = netflixData?.playbackState?.currentTimeSeconds || null;
    let duration = netflixData?.playbackState?.durationSeconds || null;
    let isPlaying = netflixData?.playbackState?.isPlaying || false;
  },
});
