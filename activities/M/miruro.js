registerParser({
  id: "kanashiidev_miruro.to_XC93YXRjaF",
  domain: ["miruro.to", "miruro.tv", "miruro.online", "miruro.bz"],
  authors: "kanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Miruro",
  version: "1.0.2",
  description: "Free anime streaming site with HD quality subbed and dubbed options.",
  lastUpdated: "1791977189870",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch\/.*/],
  fn: async function () {
    const title = getText("._titleContainer_").replace(/^\d+\.\s*/, "");
    const artist = getText("._infoLink_ span");
    const image = getImage("._coverImg_");
    const source = "Miruro";
  },
});
