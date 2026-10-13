registerParser({
  id: "kanashiidev_music.youtube.com_Lio",
  domain: "music.youtube.com",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "YouTube Music",
  version: "1.0.1",
  description: "Music streaming service with official tracks, remixes, and video integration.",
  category: "platform",
  tags: [],
  urlPatterns: [/.*/],
  fn: function () {
    const songLink = document.querySelector("#movie_player .ytp-title a")?.href;
    const title = getText(".ytmusic-player-bar yt-formatted-string:first-child") || getText("ytmusic-track-info .ytmusicTrackInfoTitle");

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

    const video = document.querySelector("video");
    let timePassed = getText("#left-controls .time-info") || getText(".ytMusicMiniPlayerTimeInfo") || "";
    let duration = getText("#left-controls .time-info") || getText(".ytMusicMiniPlayerTimeInfo") || "";
    let isWatching = 0;
    if (video) {
      isWatching = !video.paused;
      if (!timePassed) timePassed = video.currentTime;
      if (!duration) duration = video.duration;
    }

    const vid = songLink && new URL(songLink).searchParams.get("v");
    const image = vid ? `https://i.ytimg.com/vi/${vid}/mqdefault.jpg` : null;
    const source = "YouTube Music";
    const songUrl = songLink || window.location.href;

    const pathNodes = document.querySelectorAll(".ytmusic-player-bar #button > yt-icon > span > div > svg > path");
    const newPathNodes = document.querySelector(".ytmusicPlayerControlsMainControls .ytSpecButtonShapeNextTonal path");
    const playPath = newPathNodes ? newPathNodes.getAttribute("d") : pathNodes?.[2]?.getAttribute("d") || null;
    const isPlaying = isWatching || (typeof playPath === "string" && playPath.startsWith("M6.5"));
  },
});
