registerParser({
  id: "kanashiidev_mkissa.to_XC9hbmltZS",
  domain: "mkissa.to",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "MKissa",
  version: "1.0.0",
  description: "A discovery hub for anime and manga fans. Browse titles, tags, characters, and community.",
  lastUpdated: "1791763623063",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/anime.+/],
  fn: async function () {
    let title = getText(".episode-current-detail__ep-link");
    let artist = getText(".episode-current-detail__show-link");
    let image = getImage("a.route-link > .img");
    let source = "MKissa";
  },
});
