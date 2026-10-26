registerParser({
  id: "kanashiidev_anime.nexus_XC93YXRjaF",
  domain: "anime.nexus",
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Anime Nexus",
  version: "1.0.2",
  description: "Anime Nexus is your ultimate destination for discovering, streaming, and discussing all things anime.",
  lastUpdated: "1792976196482",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch\/.*/],
  iframeSelectors: {
    fields: {
      $video: {
        type: "video",
      },
    },
  },
  fn: async function () {
    const title = getText(".videojs-player .flex.flex-col h2") || getText(".videojs-player .text-left .text-white");
    const artist = getText(".videojs-player .flex.flex-col h1") || getText(".videojs-player .text-left .text-xs");
    const image = document.querySelector("meta[property='og:image']")?.content || getImage(".active img") || "https://anime.nexus/apple-touch-icon.png";
    const video = document.querySelector("[data-media-player] video");
    const source = "Anime Nexus";
    const link = location.href;
  },
});
