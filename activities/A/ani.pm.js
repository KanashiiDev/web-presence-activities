registerParser({
  id: "kanashiidev_ani.pm_XC9hbmltZV",
  domain: "ani.pm",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "ani.pm",
  version: "1.0.1",
  description: "ani.pm is a place to find and watch anime.",
  lastUpdated: "1792021584663",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/ani|anime\/.+/, /\watch-together\/.+/],
  fn: async function () {
    let title = getText(".ytw-title");
    let artist = getText(".ytw-ab__name-link");
    let image = getImage(".ytw-ab-art__poster");
    let source = "ani.pm";
  },
});
