registerParser({
  id: "kanashiidev_anikototv.to_XC93YXRjaC",
  domain: ["anikototv.to", "anikototv.se", "anikoto.cz", "anikoto.me", "anikoto.net"],
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Anikoto",
  version: "1.0.1",
  description: "AniKoto is a anime streaming destination where fans can watch high-quality anime series and movies with English subtitles or dubbed audio.",
  lastUpdated: "1792804281489",
  mode: "watch",
  watchAutoDetect: "enable",
  category: "video",
  tags: ["anime"],
  urlPatterns: [/\/watch\/.+/, /\/watch2gether\/.+/],
  fn: async function () {
    const w2g = document.querySelector("#w2g-room");
    let w2gEp = w2g ? getText("#w2g-meta-ep") : "";
    let title = getText("#w-servers b") || (w2g && w2gEp ? "Episode " + w2gEp : "");
    let artist = getText("#w-info .title") || getText("#w2g-room div.info .name");
    let image = getImage("[itemprop='image']") || getImage(".poster img");
    let source = "Anikoto";
  },
});
