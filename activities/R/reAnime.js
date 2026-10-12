registerParser({
  id: "kanashiidev_reanime.to_XC93YXRjaC",
  domain: ["reanime.to", "reanime.cz", "reanime.wtf"],
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Re:ANIME",
  version: "1.0.0",
  description: "Your ultimate destination for anime streaming, discussions, and community. Discover, watch, and connect with fellow anime enthusiasts.",
  lastUpdated: "1791763136831",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch.+/, /\/watch2gether.+/],
  fn: async function () {
    let title = getText(".mt-0\\.5") || getText("div.flex-1 > div > span");
    let artist = getText(".leading-tight") || getText(".tracking-tight > span");
    let image = getImage(".watch-sidebar-enter [loading='lazy']");
    let source = "Re:ANIME";
  },
});
