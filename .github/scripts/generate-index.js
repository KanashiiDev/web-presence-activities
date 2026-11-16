#!/usr/bin/env node
// generate-index.js

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const zlib = require("zlib");
const crypto = require("crypto");

const ACTIVITIES_DIR = path.resolve(__dirname, "../../activities");
const GZ_FILE = path.resolve(__dirname, "../../index.json.gz");
const HASH_FILE = path.resolve(__dirname, "../../hash.json");
const REPO_ROOT = path.resolve(__dirname, "../../");

const IS_GH_ACTIONS = !!process.env.GITHUB_ACTIONS;

//
// GitHub Actions annotations (shows errors inline in the PR "Files changed" tab)
//
function escapeAnnotation(s) {
  return String(s).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function annotate(level, file, message, line) {
  if (!IS_GH_ACTIONS) return;
  const loc = `file=${file}${line ? `,line=${line}` : ""}`;
  console.log(`::${level} ${loc}::${escapeAnnotation(message)}`);
}

//
// Sandbox helpers
//

// A mock that accepts any property access / call / construction.
// Prevents top-level code like document.querySelector(...) from crashing the sandbox.
function createMock() {
  const handler = {
    get(_, key) {
      if (key === Symbol.toPrimitive) return () => "";
      if (key === Symbol.iterator) return () => [][Symbol.iterator]();
      if (key === "then") return undefined; // not a thenable
      return createMock();
    },
    set: () => true,
    apply: () => createMock(),
    construct: () => createMock(),
  };
  return new Proxy(function () {}, handler);
}

// Cross-realm safe RegExp check (`instanceof RegExp` fails for objects created inside vm contexts)
const isRegExp = (v) => Object.prototype.toString.call(v) === "[object RegExp]";

// Extracts line number + offending source line from a vm error
function extractErrorLocation(err, source, filename) {
  let line = null;
  const stack = String(err && err.stack ? err.stack : "");

  // SyntaxError: "<filename>:<line>\n<source line>\n   ^^^\n\nSyntaxError: ..."
  let m = stack.match(new RegExp(`${escapeRegex(filename)}:(\\d+)`));
  if (m) line = Number(m[1]);

  const snippet = line ? (source.split(/\r?\n/)[line - 1] || "").trim() : "";
  return { line, snippet };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Detects code whose backslashes were doubled by some tool (\\s instead of \s, \\/ instead of \/).
// Only looks at the fn body. Requires NO single-escaped sequences at all, because working code that
// uses regex literals almost always contains some. Warn-only heuristic.
function detectDoubleEscaped(source) {
  const i = source.search(/\bfn\s*:/);
  const body = i === -1 ? source : source.slice(i);
  const doubles = (body.match(/\\\\[sdwbSDWB\/]/g) || []).length;
  const singles = (body.match(/(?<!\\)\\[sdwbSDWB\/]/g) || []).length;
  const lines = body.split(/\r?\n/).filter((l) => /\\\\[sdwbSDWB\/]/.test(l)).length;
  return { doubles, singles, lines, warn: doubles >= 5 && singles === 0 };
}

const DOUBLE_ESCAPE_HINT = (lines) =>
  `Backslashes look doubled (e.g. \\\\s or \\\\/ instead of \\s or \\/) on ~${lines} line(s). ` + `Inside regex literals use a single backslash. Replace every "\\\\" with "\\" in the fn body.`;

// Friendly hints for common mistakes
function getHint(err, snippet = "", source = "") {
  const msg = String((err && err.message) || "");

  const de = source ? detectDoubleEscaped(source) : null;
  if (de && de.warn) return DOUBLE_ESCAPE_HINT(de.lines);

  if (/Invalid regular expression flags/i.test(msg)) {
    if (/\\\\/.test(snippet)) return DOUBLE_ESCAPE_HINT(1);
    return "A regex literal probably contains an unescaped '/'. " + 'Write /\\/movie\\/play\\/.*/ or use a string: "/movie/play/.*/".';
  }
  if (/Unexpected token 'export'|Unexpected token 'import'|Cannot use import statement/i.test(msg)) {
    return "ES module syntax (import/export) is not allowed in activity files.";
  }
  if (err && err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
    return "Top-level code runs too long (infinite loop?). Only registerParser({...}) should run at top level.";
  }
  if (/is not defined/i.test(msg)) {
    return "Top-level code uses an undefined variable. Move such code inside the `fn` function.";
  }
  if (/Unexpected end of input|Unexpected token|Invalid or unexpected token|missing \)/i.test(msg)) {
    return "Syntax error: check for missing/extra brackets, commas or quotes. Try: node --check <file>";
  }
  return "";
}

//
// Parser extraction
// Returns: { meta }  on success
//          { error: { kind, message, line?, snippet?, hint? } }  on failure
//
function parseRegisterParserFormat(source, filename) {
  if (!source.includes("registerParser")) {
    return {
      error: {
        kind: "no-registerParser",
        message: "File does not contain 'registerParser'. Expected registerParser({ ... }).",
      },
    };
  }

  let capturedConfig = null;
  let callCount = 0;

  const mockRegisterParser = (config) => {
    callCount++;
    capturedConfig = config;
  };

  const windowBase = { registerParser: mockRegisterParser };
  const sandbox = {
    registerParser: mockRegisterParser,
    window: new Proxy(windowBase, {
      get: (t, k) => (k in t ? t[k] : createMock()),
      set: (t, k, v) => ((t[k] = v), true),
    }),
    document: createMock(),
    navigator: createMock(),
    location: { href: "http://localhost", pathname: "/", hostname: "localhost", search: "", hash: "" },
    performance: createMock(),
    console: { log() {}, error() {}, warn() {}, info() {}, debug() {} },
    setTimeout: () => 0,
    setInterval: () => 0,
    clearTimeout() {},
    clearInterval() {},
    Image: function () {},
    Audio: function () {},
  };

  let runError = null;
  let script = null;

  // Step 1: compile (SyntaxError is caught here)
  try {
    script = new vm.Script(source, { filename });
  } catch (err) {
    const { line, snippet } = extractErrorLocation(err, source, filename);
    return {
      error: {
        kind: "syntax-error",
        message: `Syntax error: ${err.message} (JS reports only the first syntax error; more may follow after fixing it)`,
        line,
        snippet,
        hint: getHint(err, snippet, source),
      },
    };
  }

  // Step 2: run (runtime errors)
  try {
    script.runInContext(vm.createContext(sandbox), { timeout: 1000 });
  } catch (err) {
    runError = err;
  }

  if (!capturedConfig) {
    if (runError) {
      const { line, snippet } = extractErrorLocation(runError, source, filename);
      return {
        error: {
          kind: "runtime-error",
          message: `Error while running file before registerParser was called: ${runError.message}`,
          line,
          snippet,
          hint: getHint(runError, snippet, source),
        },
      };
    }
    return {
      error: {
        kind: "not-called",
        message: "registerParser was never called at top level (is it inside setTimeout / an event / an async block?).",
      },
    };
  }

  if (typeof capturedConfig !== "object" || Array.isArray(capturedConfig)) {
    return { error: { kind: "bad-config", message: "registerParser must be called with a plain object." } };
  }

  const extraWarnings = [];
  if (callCount > 1) extraWarnings.push(`registerParser was called ${callCount} times; only the last call is used.`);
  if (runError) extraWarnings.push(`Top-level code threw after registerParser: ${runError.message}`);

  //  Normalization
  const rawDomain = capturedConfig.domain;
  const domain = Array.isArray(rawDomain) ? rawDomain.map((d) => String(d).trim()).filter(Boolean) : rawDomain ? [String(rawDomain).trim()] : [];

  const urlPatternErrors = [];
  const rawUrls = Array.isArray(capturedConfig.urlPatterns) ? capturedConfig.urlPatterns : capturedConfig.urlPatterns ? [capturedConfig.urlPatterns] : [];

  const urlPatterns = rawUrls.map((p) => {
    let s;
    if (isRegExp(p)) {
      s = `/${p.source}/`;
    } else {
      s = String(p).trim();
      if (!/^\/.+\/$/.test(s)) s = /^\//.test(s) ? s + "/" : `/${s}/`;
    }
    // Make sure the pattern actually compiles
    try {
      new RegExp(s.slice(1, -1));
    } catch (e) {
      urlPatternErrors.push(`Invalid urlPattern ${s}: ${e.message}`);
    }
    return s;
  });

  const cleanArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
    return [String(val).trim()];
  };

  let iframeSelectors = null;
  const rawIframe = capturedConfig.iframeSelectors;
  if (rawIframe !== undefined && rawIframe !== null) {
    if (typeof rawIframe === "object" && !Array.isArray(rawIframe)) {
      if (rawIframe.fields && typeof rawIframe.fields === "object") {
        iframeSelectors = rawIframe;
      } else {
        extraWarnings.push('iframeSelectors missing required "fields" key - skipped');
      }
    } else {
      extraWarnings.push("iframeSelectors must be a plain object - skipped");
    }
  }

  return {
    meta: {
      _hasVersion: !!capturedConfig.version,
      _urlPatternErrors: urlPatternErrors,
      _warnings: extraWarnings,
      id: capturedConfig.id || null,
      name: capturedConfig.title || null,
      version: capturedConfig.version || "1.0.0",
      description: capturedConfig.description || "",
      domain,
      urlPatterns: urlPatterns.length ? urlPatterns : ["/.*/"],
      authors: cleanArray(capturedConfig.authors),
      authorsLinks: cleanArray(capturedConfig.authorsLinks),
      homepage: capturedConfig.homepage || "",
      mode: capturedConfig.mode || "listen",
      watchAutoDetect: capturedConfig.watchAutoDetect || "disable",
      category: cleanArray(capturedConfig.category),
      tags: cleanArray(capturedConfig.tags),
      iframeSelectors,
    },
  };
}

function toRelativePath(absPath) {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

function loadExistingIndex() {
  try {
    if (fs.existsSync(GZ_FILE)) {
      const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(GZ_FILE)).toString("utf8"));
      if (Array.isArray(data)) return Object.fromEntries(data.map((e) => [e.id, e]));
    }
  } catch {}
  return {};
}

// Only .js files are activities (the workflow only triggers on activities/**/*.js)
function collectScriptFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) {
    console.warn("activities/ not found:", dir);
    return results;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...collectScriptFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) results.push(full);
  }
  return results;
}

function generateParserKey(domain, urlPatterns, authors = []) {
  let rawDomain = "";

  if (Array.isArray(domain)) {
    rawDomain = domain[0] || "";
  } else if (typeof domain === "string") {
    rawDomain = domain.split(",")[0] || "";
  }

  if (!rawDomain) {
    console.log("[generateParserKey] empty domain", { domain, urlPatterns });
    rawDomain = "unknown";
  }

  let patternsArray = [];

  if (Array.isArray(urlPatterns)) {
    patternsArray = urlPatterns;
  } else if (typeof urlPatterns === "string") {
    patternsArray = urlPatterns.split(",");
  }

  if (!patternsArray.length) patternsArray = [".*"];

  const patternStrings = patternsArray
    .map(function (p) {
      if (!p) return ".*";

      let strPattern = "";
      if (isRegExp(p)) {
        strPattern = p.source;
      } else {
        strPattern = p.toString().trim() || ".*";
      }

      return strPattern.replace(/^\/|\/$/g, "") || ".*";
    })
    .sort();

  const hash = btoa(patternStrings.join("|"))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 10);

  const author = Array.isArray(authors) ? authors[0] : authors;

  const safeAuthor = author
    ? String(author)
        .toLowerCase()
        .replace(/[^a-z0-9_\-]/g, "")
    : "";

  const safeDomain = String(rawDomain)
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]/g, "");

  return safeAuthor ? safeAuthor + "_" + safeDomain + "_" + hash : safeDomain + "_" + hash;
}

function writeOutputs(entries) {
  const minifiedJson = JSON.stringify(entries);
  const gzipped = zlib.gzipSync(Buffer.from(minifiedJson, "utf8"), { level: zlib.constants.Z_BEST_COMPRESSION });
  fs.writeFileSync(GZ_FILE, gzipped);

  const contentHash = crypto.createHash("sha256").update(minifiedJson).digest("hex");
  const hashObj = {
    sha256: contentHash,
    size: minifiedJson.length,
    gzSize: gzipped.length,
    count: entries.length,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashObj, null, 2) + "\n", "utf8");
}

function formatError(e) {
  let out = `${e.file}${e.line ? `:${e.line}` : ""}: ${e.error}`;
  if (e.snippet) out += `\n       > ${e.snippet}`;
  if (e.hint) out += `\n       💡 ${e.hint}`;
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isStrict = args.includes("--strict");
  // --strict  → PR validation mode: any error blocks the whole build
  // (default) → Generate mode: skip broken parsers, publish the rest

  const existingMap = loadExistingIndex();
  const scriptFiles = collectScriptFiles(ACTIVITIES_DIR);
  const entries = [];
  const errors = [];
  const warnings = [];
  const seenIds = new Map(); // id -> file (duplicate detection)

  if (!scriptFiles.length) {
    console.log("activities/ empty.");
    if (!isDryRun) writeOutputs([]);
    return;
  }

  for (const file of scriptFiles) {
    const relPath = toRelativePath(file);
    const fmt = "[registerParser]";

    let source;
    try {
      source = fs.readFileSync(file, "utf8");
    } catch (err) {
      errors.push({ file: relPath, error: "Could not be read: " + err.message });
      continue;
    }

    const result = parseRegisterParserFormat(source, relPath);

    if (result.error) {
      const e = result.error;
      errors.push({ file: relPath, error: e.message, line: e.line, snippet: e.snippet, hint: e.hint });
      console.warn(` ✗ ${relPath}${e.line ? `:${e.line}` : ""}\n     → ${e.message}${e.hint ? `\n     💡 ${e.hint}` : ""}`);
      annotate("error", relPath, e.message + (e.hint ? ` | ${e.hint}` : ""), e.line);
      continue;
    }

    const meta = result.meta;

    for (const w of meta._warnings) warnings.push({ file: relPath, warn: w });

    const de = detectDoubleEscaped(source);
    if (de.warn) warnings.push({ file: relPath, warn: DOUBLE_ESCAPE_HINT(de.lines) });

    // Mandatory field checks
    // strictOnly: true  → error only in --strict mode (PR), warning in generate mode
    // warnOnly: true    → never an error, always just a warning in both modes
    const REQUIRED_FIELDS = [
      { label: "title", check: (m) => !!m.name },
      { label: "domain", check: (m) => Array.isArray(m.domain) && m.domain.length > 0 },
      { label: "authors", check: (m) => Array.isArray(m.authors) && m.authors.length > 0 },
      {
        label: "urlPatterns (valid regex)",
        check: (m) => m._urlPatternErrors.length === 0,
        detail: (m) => m._urlPatternErrors.join("; "),
      },
      {
        label: "version",
        check: (m) => !!m._hasVersion,
        warnOnly: true,
        warn: "No version found, 1.0.0 assumed. Add explicit 'version' field.",
      },
      {
        label: "category",
        check: (m) => Array.isArray(m.category) && m.category.length > 0,
        strictOnly: true,
        warn: "'category' missing - parser will be published without a category.",
      },
    ];

    const fieldErrors = [];

    for (const rule of REQUIRED_FIELDS) {
      if (rule.check(meta)) continue;

      if (rule.warnOnly) {
        warnings.push({ file: relPath, warn: rule.warn || `${rule.label} missing` });
      } else if (rule.strictOnly) {
        if (isStrict) fieldErrors.push(rule.label);
        else warnings.push({ file: relPath, warn: rule.warn || `${rule.label} missing` });
      } else {
        fieldErrors.push(rule.detail ? `${rule.label}: ${rule.detail(meta)}` : rule.label);
      }
    }

    if (fieldErrors.length) {
      const msg = `Missing/invalid fields: ${fieldErrors.join(", ")}`;
      errors.push({ file: relPath, error: msg });
      console.warn(` ✗ ${relPath}\n     → ${msg}`);
      annotate("error", relPath, msg);
      continue;
    }

    let id = meta.id;
    if (!id) {
      id = generateParserKey(meta.domain, meta.urlPatterns, meta.authors);
      if (!isDryRun) {
        const patched = source.replace(/registerParser\s*\(\s*\{/, `registerParser({\n  id: "${id}",`);
        fs.writeFileSync(file, patched, "utf8");
        console.log(` ~ ID injected: ${relPath} → "${id}"`);
      } else {
        warnings.push({ file: relPath, warn: `No 'id' field; "${id}" will be injected on merge.` });
      }
    }

    // Duplicate ID check
    if (seenIds.has(id)) {
      const msg = `Duplicate id "${id}" (also used in ${seenIds.get(id)})`;
      errors.push({ file: relPath, error: msg });
      console.warn(` ✗ ${relPath}\n     → ${msg}`);
      annotate("error", relPath, msg);
      continue;
    }
    seenIds.set(id, relPath);

    const existing = existingMap[id];

    if (!existing) console.log(` + New:       ${fmt} ${relPath}  v${meta.version}`);
    else if (existing.version !== meta.version) console.log(` ^ Updated:   ${fmt} ${relPath}  ${existing.version} -> v${meta.version}`);
    else console.log(` = Unchanged: ${fmt} ${relPath}  v${meta.version}`);

    // iframeSelectors only included when present
    const entry = {
      id,
      title: meta.name,
      version: meta.version,
      description: meta.description,
      domain: meta.domain.length === 1 ? meta.domain[0] : meta.domain,
      urlPatterns: meta.urlPatterns,
      authors: meta.authors,
      authorsLinks: meta.authorsLinks,
      homepage: meta.homepage,
      mode: meta.mode,
      watchAutoDetect: meta.watchAutoDetect,
      category: meta.category,
      tags: meta.tags,
      file: relPath,
    };

    if (meta.iframeSelectors) entry.iframeSelectors = meta.iframeSelectors;

    entries.push(entry);
  }

  entries.sort((a, b) => a.title.localeCompare(b.title));

  const minifiedJson = JSON.stringify(entries);
  const gzipped = zlib.gzipSync(Buffer.from(minifiedJson, "utf8"), { level: zlib.constants.Z_BEST_COMPRESSION });
  const contentHash = crypto.createHash("sha256").update(minifiedJson).digest("hex");

  // Dry run must NOT touch the output files
  if (!isDryRun) writeOutputs(entries);

  console.log("\n-------------------------------------------");
  console.log(isStrict ? "MODE strict  (--strict)" : "MODE generate (lenient)");
  if (isDryRun) console.log("DRY RUN - no files written");

  console.log("OK   " + entries.length + " script -> index.json.gz");
  console.log("GZ   " + gzipped.length + " bytes (ratio: " + ((1 - gzipped.length / minifiedJson.length) * 100).toFixed(1) + "% smaller)");
  console.log("HASH " + contentHash.slice(0, 16) + "...");

  if (warnings.length) {
    console.log("WARN " + warnings.length + " warning(s):");
    warnings.forEach((w) => {
      console.log("   !", w.file + ":", w.warn);
      annotate("warning", w.file, w.warn);
    });
  }

  if (errors.length) {
    console.log((isStrict ? "ERR  " : "SKIP ") + errors.length + (isStrict ? " error(s) - build blocked:" : " parser(s) skipped:"));
    errors.forEach((e) => console.log("   *", formatError(e)));

    if (isStrict) {
      console.log("-------------------------------------------");
      process.exit(1);
    } else {
      // Generate mode: only fatal if ALL parsers failed
      if (entries.length === 0) {
        console.log("ERR  No valid parsers found - index.json.gz not updated.");
        console.log("-------------------------------------------");
        process.exit(1);
      }
      console.log(`     (${entries.length} valid parser(s) published normally)`);
    }
  }

  console.log("-------------------------------------------");
}

main();
