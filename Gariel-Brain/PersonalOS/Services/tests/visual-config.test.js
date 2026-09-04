const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const vault = path.resolve(__dirname, "../../..");
const cssPath = path.join(vault, ".obsidian/snippets/personal-os.css");
const heroPath = path.join(vault, "PersonalOS/Assets/home-hero.png");
const appearancePath = path.join(vault, ".obsidian/appearance.json");
const homeViewPath = path.join(vault, "PersonalOS/Views/home.js");
const allowedPrefixes = [
  ".personal-os.markdown-preview-view",
  ".personal-os.markdown-source-view",
  ".personal-os .personal-os-dashboard"
];

function rules(source, context = "normal") {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const found = [];
  let cursor = 0;
  while (cursor < css.length) {
    while (/\s/.test(css[cursor] || "")) cursor += 1;
    if (cursor >= css.length) break;

    const open = css.indexOf("{", cursor);
    if (open === -1) throw new Error("CSS rule is missing an opening brace");
    const prelude = css.slice(cursor, open).trim();
    let depth = 1;
    let close = open + 1;
    for (; close < css.length && depth; close += 1) {
      if (css[close] === "{") depth += 1;
      if (css[close] === "}") depth -= 1;
    }
    if (depth) throw new Error(`CSS rule is missing a closing brace: ${prelude}`);

    const body = css.slice(open + 1, close - 1);
    if (/^@(-[\w]+-)?keyframes\b/i.test(prelude)) {
      found.push(...rules(body, "keyframes"));
    } else if (prelude.startsWith("@")) {
      found.push(...rules(body, context));
    } else if (context !== "keyframes" && !prelude.startsWith("@")) {
      found.push(...prelude.split(",").map(selector => selector.trim()).filter(Boolean));
    }
    cursor = close;
  }
  return found;
}

function assertScoped(source) {
  const selectors = rules(source);
  assert.ok(selectors.length > 0, "personal-os.css must contain style rules");
  for (const selector of selectors) {
    assert.ok(
      allowedPrefixes.some(prefix => selector.startsWith(prefix)),
      `unscoped selector: ${selector}`
    );
  }
}

test("selector parser handles lists, nested media rules, and keyframes", () => {
  const sample = `
    .personal-os.markdown-preview-view,
    .personal-os.markdown-source-view { color: black; }
    @media (min-width: 40rem) {
      .personal-os .personal-os-dashboard .card { display: grid; }
    }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  `;
  assert.deepEqual(rules(sample), [
    ".personal-os.markdown-preview-view",
    ".personal-os.markdown-source-view",
    ".personal-os .personal-os-dashboard .card"
  ]);
});

test("unknown block at-rules cannot hide an unscoped selector", () => {
  assert.throws(
    () => assertScoped("@scope (.shell) { body { color: red; } }"),
    /unscoped selector: body/
  );
});

test("Personal OS stylesheet is balanced and every selector stays scoped", () => {
  assert.ok(fs.existsSync(cssPath), "personal-os.css must exist");
  assertScoped(fs.readFileSync(cssPath, "utf8"));
});

test("stylesheet exposes only the approved Personal OS design tokens", () => {
  assert.ok(fs.existsSync(cssPath), "personal-os.css must exist");
  const tokens = [...fs.readFileSync(cssPath, "utf8").matchAll(/--([a-z0-9-]+)\s*:/gi)]
    .map(match => `--${match[1]}`);
  assert.deepEqual([...new Set(tokens)].sort(), [
    "--pos-cream",
    "--pos-gold",
    "--pos-ink",
    "--pos-line",
    "--pos-muted",
    "--pos-paper",
    "--pos-sage"
  ]);
});

test("approved local Hero is a 1774 by 887 PNG", () => {
  assert.ok(fs.existsSync(heroPath), "home-hero.png must exist");
  const png = fs.readFileSync(heroPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1774);
  assert.equal(png.readUInt32BE(20), 887);
  assert.equal(
    crypto.createHash("sha256").update(png).digest("hex"),
    "ec917e3cd242462ce1e925a92f97f861e1b45ef388fc08a951816c79965cae79"
  );
});

test("stylesheet and home view keep the approved Hero integrated", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const homeView = fs.readFileSync(homeViewPath, "utf8");
  assert.match(css, /url\(["']\.\.\/\.\.\/PersonalOS\/Assets\/home-hero\.png["']\)/);
  assert.match(homeView, /createDiv\(\{\s*cls:\s*["']pos-hero["']\s*\}\)/);
});

test("Obsidian enables Personal OS without dropping existing snippets", () => {
  const appearance = JSON.parse(fs.readFileSync(appearancePath, "utf8"));
  assert.deepEqual(appearance, {
    cssTheme: "OnePage",
    accentColor: "#6eb0e2",
    interfaceFontFamily: "Monaco",
    textFontFamily: "Geneva",
    baseFontSize: 16,
    baseFontSizeAction: true,
    translucency: true,
    enabledCssSnippets: ["photo-gallery", "reading-home", "personal-os"],
    theme: "obsidian"
  });
});
