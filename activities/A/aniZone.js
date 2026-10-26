registerParser({
  id: "kanashiidev_anizone.to_XC9hbmltZS",
  domain: "anizone.to",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "AniZone",
  version: "1.0.1",
  description: "AniZone is fast streaming source to watch anime. Get your favorite anime series, tv show and movies freely With English Dub and sub.",
  lastUpdated: "1792976695861",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/anime.+/],
  fn: async function () {
    let title = getText("h1.text-xl[ignore='[x-text=displayAnimeTitle]']").replace("- ", "");
    let artist = getText("[x-text=displayAnimeTitle]");
    let image = "https://www.google.com/s2/favicons?domain=anizone.to&sz=128";
    let source = "AniZone";
  },
});
