registerParser({
  id: "kanashiidev_animex.one_Lio",
  domain: "animex.one",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "AnimeX",
  version: "1.0.0",
  description: "Animex is a anime streaming site where you can watch anime in HD quality with both subbed and dubbed options.",
  lastUpdated: "1791924509187",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch.+/],
  fn: async function () {
    let title = getText("span.max-w-xl").split(":")[0];
    let artist = getText(".\\!line-clamp-2");
    let image = getImage("div.flex > div > .h-full.w-full.object-cover");
    let source = "AnimeX";
  },
});