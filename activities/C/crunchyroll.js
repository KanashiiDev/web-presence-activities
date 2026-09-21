registerParser({
  id: "kanashiidev_crunchyroll.com_XC93YXRjaF",
  domain: "crunchyroll.com",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Crunchyroll",
  version: "1.0.0",
  description: "World's largest on-demand streaming service dedicated to Japanese anime.",
  category: "platform",
  tags: ["anime"],
  urlPatterns: [/\/watch\/.+/],
  fn: async function () {
    let title = "";
    let artist = "";
    let image = "";
    let source = "";
    let songUrl = "";
    let timePassed = null;
    let duration = null;
    let isPlaying = false;
    const currentMedia = document.querySelector(".erc-current-media-info");
    if (!currentMedia) {
      clearActivity();
    } else {
      const logo = "https://www.google.com/s2/favicons?domain=crunchyroll.com&sz=128";
      const mediaLogoLink = currentMedia.querySelector(".current-media-parent-ref a")?.href || "";
      let imageUrl = "";
      const match = mediaLogoLink.match(/\/series\/([A-Z0-9]+)/);
      const id = match ? match[1] : null;
      if (id) imageUrl = `https://imgsrv.crunchyroll.com/cdn-cgi/image/fit=pad,format=png,quality=100,width=300,h=300,background=transparent/keyart/${id}-title_logo-en-us`;
      title = currentMedia.querySelector("h1").textContent || "";
      artist = currentMedia.querySelector(".current-media-parent-ref h4").textContent || "";
      image = imageUrl || logo || "";
      source = "Crunchyroll";
      songUrl = location.href;
      const video = document.querySelector("video");
      timePassed = video?.currentTime || null;
      duration = video?.duration || null;
      const hasPauseIcon = Boolean(document.querySelector("path[d='M4 2H10V22H4V2Z']"));
      isPlaying = Boolean(video && !video.paused) || hasPauseIcon;
    }
  },
});
