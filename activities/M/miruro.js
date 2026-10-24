registerParser({
  id: "kanashiidev_miruro.to_XC93YXRjaF",
  domain: ["miruro.cx", "miruro.pw", "miruro.ws", "miruro.to", "miruro.tv", "miruro.bz"],
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Miruro",
  version: "1.0.3",
  description: "Free anime streaming site with HD quality subbed and dubbed options.",
  lastUpdated: "1792802384571",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch\/.*/],
  fn: async function () {
    const title = getText("._titleContainer_") || getText(".watch-now-row .leading-snug") || getText(".watch-now-row h1");
    const artist = getText("._infoLink_ span") || getText(".watch-anime-title") || getText(".watch-description .leading-snug");
    const image = getImage("._coverImg_") || getImage(".watch-description img") || getImage("a.rounded-md .object-cover");
    const source = "Miruro";
  },
});
