registerParser({
  id: "rwr97_bingebang.sx_bW92aWUvcG",
  domain: ["bingebang.sx", "bingebang.st", "bingebang.club", "bingebang.to", "bingebang.pw"],
  authors: ["rwr97"],
  authorsLinks: ["https://steamcommunity.com/id/rwr97/"],
  title: "BingeBang",
  version: "1.6.1",
  description: "Movie and TV playback detection",
  lastUpdated: "1794782700000",
  mode: "watch",
  watchAutoDetect: "enable",
  homepage: "https://bingebang.club/",
  category: ["video", "aggregator"],
  tags: ["bingebang", "movies", "series", "video", "streaming"],
  urlPatterns: [/movie\/play\/.*/, /tv\/play\/.*/],
  fn: async function () {

    /*
     * BINGEBANG — WEB PRESENCE FOR DISCORD
     * Version 1.6.1
     *
     * Activity: Watching BingeBang
     * Details: Movie / Series title
     * State: S01 · E01 (TV only)
     *
     * Artwork priority:
     * 1. Official TMDB title logo
     * 2. TMDB title backdrop
     *
     * Square artwork: 512x512.
     */

    // ====================================
    // 1. TITLE EXTRACTION
    // ====================================

    function getMeta(...names) {
        for (const name of names) {
            const el = document.querySelector(
                `meta[property="${name}"], meta[name="${name}"]`
            );

            if (el?.content?.trim()) return el.content.trim();
        }

        return "";
    }

    function cleanTitle(value) {
        if (!value) return "";

        return value
            .replace(/\\s*[·|•]\\s*(?:Player|BingeBang)\\b.*$/i, "")
            .replace(/\\s*[-–—]\\s*(?:Player|BingeBang)\\b.*$/i, "")
            .replace(
                /\\s*[·|•-]?\\s*(?:S\\d{1,2}\\s*E\\d{1,3}|\\d{1,2}x\\d{1,3})\\s*$/i,
                ""
            )
            .replace(/\\s+Season\\s+\\d+\\s+Episode\\s+\\d+.*$/i, "")
            .replace(/[\\s·|•–—]+$/g, "")
            .replace(/\\s+/g, " ")
            .trim();
    }

    const path = location.pathname;
    const isSeries = /^\\/tv\\/play\\//i.test(path);

    const slugMatch = path.match(
        /^\\/(?:movie|tv)\\/play\\/([^/]+)/i
    );

    const slug = slugMatch?.[1] || "";

    const fallbackTitle = slug
        .replace(/-[a-z0-9]{5,}$/i, "")
        .replace(/-/g, " ")
        .replace(/\\b\\w/g, c => c.toUpperCase());

    const rawTitle =
        document.querySelector("h1")?.textContent ||
        getMeta("og:title", "twitter:title") ||
        document.title ||
        fallbackTitle;

    let title = cleanTitle(rawTitle);

    // ====================================
    // 2. SEASON / EPISODE
    // ====================================

    const episodeMatch = path.match(
        /^\\/tv\\/play\\/[^/]+\\/(\\d{1,2})\\/(\\d{1,3})\\/?$/i
    );

    let episodeInfo = "";

    if (isSeries && episodeMatch) {
        const season = String(Number(episodeMatch[1])).padStart(2, "0");
        const episode = String(Number(episodeMatch[2])).padStart(2, "0");
        episodeInfo = `S${season} · E${episode}`;
    }

    // ====================================
    // 3. TMDB IMAGE COLLECTION
    // ====================================

    function collectTMDBImages() {
        const images = new Map();

        function add(raw, context = "") {
            if (!raw) return;

            const matches = String(raw).match(
                /(?:https?:)?\\/\\/image\\.tmdb\\.org\\/t\\/p\\/(?:w500|w1280|w1920)\\/[^\\s"'<>),;]+/gi
            ) || [];

            for (let match of matches) {
                try {
                    if (match.startsWith("//")) match = "https:" + match;

                    const url = new URL(match);
                    if (url.hostname !== "image.tmdb.org") continue;

                    const parsed = url.pathname.match(
                        /\\/t\\/p\\/(w500|w1280|w1920)\\/([^/]+)$/i
                    );

                    if (!parsed) continue;

                    const size = parsed[1].toLowerCase();
                    const filename = parsed[2];
                    const isPNG = /\\.png$/i.test(filename);

                    let type = null;

                    if (size === "w500" && isPNG) {
                        type = "logo";
                    } else if (
                        ["w1280", "w1920"].includes(size) &&
                        !isPNG
                    ) {
                        type = "backdrop";
                    }

                    if (!type) continue;

                    // Match title against distinct descriptive fields,
                    // not the entire concatenated context string.
                    const normalizedTitle = title.toLowerCase();
                    const fields = String(context)
                        .toLowerCase()
                        .split(/[|,;]+/)
                        .map(value => value.trim());

                    const titleMatch = fields.some(field =>
                        field === normalizedTitle ||
                        field.includes(normalizedTitle)
                    );

                    const previous = images.get(url.href);

                    images.set(url.href, {
                        url: url.href,
                        size,
                        type,
                        titleMatch: titleMatch || previous?.titleMatch || false
                    });
                } catch (_) {}
            }
        }

        // Network resources.
        const resources = performance.getEntriesByType("resource");

        for (const resource of resources) {
            add(resource.name);
        }

        // Actual page images. Keep metadata fields separated by delimiters.
        document.querySelectorAll("img, source").forEach(el => {
            const context = [
                el.alt,
                el.title,
                typeof el.className === "string" ? el.className : "",
                el.id,
                el.parentElement?.getAttribute("aria-label"),
                typeof el.parentElement?.className === "string"
                    ? el.parentElement.className
                    : ""
            ].filter(Boolean).join(" | ");

            add(el.currentSrc, context);
            add(el.src, context);
            add(el.srcset, context);
            add(el.getAttribute("srcset"), context);
        });

        // Inline CSS images.
        document.querySelectorAll("[style]").forEach(el => {
            add(el.getAttribute("style"), el.className);
        });

        return [...images.values()];
    }

    // ====================================
    // 4. SELECT OFFICIAL TITLE ARTWORK
    // ====================================

    const tmdbImages = collectTMDBImages();

    const logos = tmdbImages
        .filter(img => img.type === "logo")
        .sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch));

    const backdrops = tmdbImages.filter(
        img => img.type === "backdrop"
    );

    let selectedArtwork =
        logos.find(img => img.titleMatch) ||
        logos[0] ||
        backdrops.find(img => img.size === "w1280") ||
        backdrops.find(img => img.size === "w1920") ||
        null;

    // Known official Dexter: Resurrection logo fallback.
    if (
        !selectedArtwork &&
        /dexter\\s*:\\s*resurrection/i.test(title)
    ) {
        selectedArtwork = {
            url: "https://image.tmdb.org/t/p/w500/8vN1JzNMVIVuyhEyGkKwr0NhMPh.png",
            type: "logo"
        };
    }

    // ====================================
    // 5. SQUARE ARTWORK FOR DISCORD
    // ====================================

    function makeSquareArtwork(url, mode) {
        const params = new URLSearchParams();

        params.set("url", url);
        params.set("w", "512");
        params.set("h", "512");
        params.set("fit", mode);

        if (mode === "contain") {
            params.set("cbg", "18151f");
            params.set("output", "png");
        } else {
            params.set("a", "attention");
            params.set("output", "jpg");
        }

        return "https://wsrv.nl/?" + params.toString();
    }

    let image = null;

    if (selectedArtwork) {
        image = makeSquareArtwork(
            selectedArtwork.url,
            selectedArtwork.type === "logo" ? "contain" : "cover"
        );
    }

    // ====================================
    // 6. DISCORD ACTIVITY
    // ====================================

    let source = "BingeBang";

    let artist = isSeries
        ? (episodeInfo || "-1")
        : "-1";

    let link = location.href;

    // ====================================
    // 7. PLAYBACK
    // ====================================

    // Auto Detect Video Status: ENABLED
    let timePassed = null;
    let duration = null;

    // ====================================
    // 8. DISCORD BUTTON
    // ====================================

    let buttons = [
        {
            text: "Watch on BingeBang",
            link: link
        }
    ];

  },
});
