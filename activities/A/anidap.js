registerParser({
  id: "kanashiidev_anidap.lol_XHdhdGNoLy",
  domain: "anidap.lol",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Anidap",
  version: "1.0.1",
  description: "The ultimate anime streaming experience. Watch your favorite anime shows anytime, anywhere.",
  lastUpdated: "1792802605783",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\watch.*/],
  fn: async function () {
    let title = getText(".text-base.font-semibold");
    let artist = getText("#player-section h1");
    let image = getImage("[type='button'] img");
    let source = "Anidap";
  },
});
