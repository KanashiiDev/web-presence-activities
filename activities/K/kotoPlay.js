registerParser({
  id: "kanashiidev_kotoplay.to_XC93YXRjaF",
  domain: "kotoplay.to",
  authors: ["KanashiiDev"],
  authorsLinks: ["https://github.com/KanashiiDev"],
  title: "KotoPlay",
  version: "1.0.0",
  description: "KotoPlay is an anime streaming site.",
  lastUpdated: "1795654768662",
  mode: "watch",
  watchAutoDetect: "enable",
  category: ["video"],
  tags: ["anime"],
  urlPatterns: [/\/watch|watch2gether\/+/],
  locales: {
    "en": {
      "description": "KotoPlay is an anime streaming site."
    }
  },
  fn: async function () {
    const w2g = document.querySelector("#at-main > div > div.at-w2g-grid > div > h2")?.textContent?.split("—");
    let title = getText('#at-watch .ep[strip="/^[\\s\\-—]+/"]') || w2g?.[1].trim();
    let artist = getText("#at-watch .at-wtitle[ignore='.ep']") || w2g?.[0].trim();
    let image = getImage("#at-desc .d-poster") || getImage("#at-main img");
    let source = "KotoPlay";
  },
});