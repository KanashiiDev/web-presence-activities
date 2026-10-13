registerParser({
  id: "kanashiidev_app.volta-music.com_Lio",
  domain: "app.volta-music.com",
  authors: "KanashiiDev",
  authorsLinks: "https://github.com/KanashiiDev",
  title: "Volta",
  version: "1.0.0",
  description: "Volta brings your tracks, SoundCloud streaming and word-synced lyrics into one player. Ad-free, without limits, everywhere, all the time.",
  lastUpdated: "1791894598876",
  mode: "listen",
  watchAutoDetect: "disable",
  category: "platform",
  urlPatterns: [/.*/],
  fn: async function () {
    //@world main
    let title = "";
    let artist = "";
    let image = "";
    let source = "Volta";

    let timePassed = 0;
    let duration = 0;
    let playbackRate = 1;

    const session = navigator.mediaSession;
    const metadata = session?.metadata;

    if (metadata) {
    title = metadata.title ?? "";
    artist = metadata.artist ?? "";

    const artwork = metadata.artwork;

    if (artwork?.length) {
    image =
    artwork.find(item => item.sizes === "512x512")?.src ??
    artwork.find(item => item.sizes === "256x256")?.src ??
    artwork[0]?.src ??
    "";
    }
    }

    if (session && !session.__voltaPositionHooked) {
    const original = session.setPositionState;

    if (typeof original === "function") {
    const state = {
    position: 0,
    duration: 0,
    playbackRate: 1,
    updatedAt: Date.now()
    };

    session.setPositionState = function (details) {
    if (details) {
    if (Number.isFinite(details.position)) {
    state.position = details.position;
    state.updatedAt = Date.now();
    }

    if (
    Number.isFinite(details.duration) &&
    details.duration > 0
    ) {
    state.duration = details.duration;
    }

    if (
    Number.isFinite(details.playbackRate) &&
    details.playbackRate > 0
    ) {
    state.playbackRate = details.playbackRate;
    }
    }

    return Reflect.apply(original, this, [details]);
    };

    Object.defineProperty(session, "__voltaPositionHooked", {
    value: true,
    configurable: true
    });

    Object.defineProperty(session, "__voltaPositionState", {
    value: state,
    configurable: true
    });
    }
    }

    const positionState = session?.__voltaPositionState;

    if (positionState) {
    const elapsed =
    session.playbackState === "playing" ?
    (Date.now() - positionState.updatedAt) / 1000 :
    0;

    timePassed = Math.min(
    positionState.position + elapsed * positionState.playbackRate,
    positionState.duration || Infinity
    );

    duration = positionState.duration;
    playbackRate = positionState.playbackRate;
    }
  },
});