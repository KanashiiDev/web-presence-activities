registerParser({
  id: "kanashiidev_senshi.to_XC93YXRjaC",
  domain: "senshi.to",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Senshi",
  version: "1.0.0",
  description: "",
  lastUpdated: "1791830913408",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch.+/],
  fn: async function () {
    let title = getText(".tracking-tight");
    let artist = getText(".leading-tight");
    let image = getImage("div.shadow-lg > div");
    let source = "Senshi";
  },
});