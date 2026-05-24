import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";

const SECTION_CONFIG = [
  { key: "android", dir: "_posts/post_android", category: "Android" },
  { key: "kotlin", dir: "_posts/post_kotlin", category: "kotlin" },
  { key: "flutter", dir: "_posts/post_flutter", category: "Flutter" },
  { key: "gradle", dir: "_posts/post_gradle", category: "gradle" },
  { key: "algorithm", dir: "_posts/post_algorithm", category: "Algorithm" },
  { key: "skills", dir: "_posts/post_skills", category: "skill" },
  { key: "tools", dir: "_posts/post_tools", category: "tools" },
  { key: "os", dir: "_posts/post_os", category: "computer" },
  { key: "indie", dir: "_posts/post_indie", category: "indie" },
  { key: "other", dir: "_posts/post_other", category: "other" }
];

const SECTION_BY_KEY = new Map(SECTION_CONFIG.map((section) => [section.key, section]));

const HELP_TEXT = `Usage:
  node ./tools/blog-post-skill/bin/blog-post-skill.js sections
  node ./tools/blog-post-skill/bin/blog-post-skill.js create --title "Activity 启动过程" --section android --date "2026-05-24 09:30" --published false --tags "Android,源码分析"
  node ./tools/blog-post-skill/bin/blog-post-skill.js publish --file ./_posts/post_android/2026-05-24-activity.md --published true --stage --commit

Commands:
  sections  List supported section keys.
  create    Create a new Jekyll post from explicit flags.
  publish   Update an existing post's published state and metadata from explicit flags.

Common flags:
  --repo <path>
  --title <title>
  --subtitle <subtitle>
  --date <YYYY-MM-DD HH:MM[:SS]>
  --published <true|false>
  --section <${SECTION_CONFIG.map((item) => item.key).join("|")}>
  --category <text>
  --tags <a,b,c>
  --slug <slug>
  --description <text>
  --header-img <path>
  --header-mask <0-1>
  --catalog <true|false>
  --excerpt-separator <marker>
  --template <default|tutorial|note|review>
  --body <text>
  --body-file <path>
  --overwrite <true|false>
  --dry-run
  --json

Publish-only flags:
  --file <path>
  --stage
  --commit
  --commit-message <text>
  --push`;

export async function runCli(argv, options = {}) {
  const result = await executeCommand(argv, options);
  const writer = options.writer ?? ((text) => process.stdout.write(text));
  if (result.outputFormat === "json") {
    writer(`${JSON.stringify(result.payload, null, 2)}\n`);
  } else {
    writer(`${formatHumanResult(result.payload)}\n`);
  }
  return result.payload;
}

export async function executeCommand(argv, options = {}) {
  const args = parseArgs(argv);
  if (args.help || !args.command) {
    return { outputFormat: "text", payload: { ok: true, message: HELP_TEXT } };
  }

  const repoRoot = resolveRepoRoot(args.flags.repo ?? options.cwd ?? process.cwd());

  if (args.command === "sections") {
    const payload = {
      ok: true,
      sections: SECTION_CONFIG.map((section) => ({
        key: section.key,
        dir: section.dir,
        category: section.category
      }))
    };
    return { outputFormat: args.flags.json ? "json" : "text", payload };
  }

  if (args.command === "create") {
    const payload = createPost({ repoRoot, flags: args.flags });
    return { outputFormat: args.flags.json ? "json" : "text", payload };
  }

  if (args.command === "publish") {
    const payload = publishPost({ repoRoot, flags: args.flags });
    return { outputFormat: args.flags.json ? "json" : "text", payload };
  }

  throw new Error(`Unsupported command: ${args.command}`);
}

function parseArgs(argv) {
  const flags = {};
  let command = "";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (index === 0 && !token.startsWith("-")) {
      command = token;
      continue;
    }
    if (token === "--help" || token === "-h") {
      return { help: true, command, flags };
    }
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { command, flags, help: false };
}

function createPost({ repoRoot, flags }) {
  const spec = buildCreateSpec({ repoRoot, flags });
  if (!spec.title) {
    throw new Error("缺少文章标题，请显式传入 --title。");
  }

  const frontMatter = buildFrontMatter(spec);
  const body = resolveBody(flags, spec);
  const relativeFile = path.join(spec.section.dir, `${spec.fileDate}-${spec.slug}.md`);
  const absoluteFile = path.join(repoRoot, relativeFile);
  const fileContent = `---\n${frontMatter}\n---\n\n${body}`;

  if (!toBoolean(flags["dry-run"], false)) {
    fs.mkdirSync(path.dirname(absoluteFile), { recursive: true });
    if (fs.existsSync(absoluteFile) && !toBoolean(flags.overwrite, false)) {
      throw new Error(`文章已存在：${relativeFile}，如需覆盖请显式传入 --overwrite true。`);
    }
    fs.writeFileSync(absoluteFile, fileContent, "utf8");
    runGitSteps({
      repoRoot,
      relativeFile,
      title: spec.title,
      action: spec.published ? "publish" : "create",
      flags
    });
  }

  return buildResultPayload({
    repoRoot,
    action: "create",
    relativeFile,
    spec,
    dryRun: toBoolean(flags["dry-run"], false)
  });
}

function publishPost({ repoRoot, flags }) {
  const targetFile = resolveExistingPost({
    repoRoot,
    file: flags.file,
    title: flags.title
  });
  const absoluteFile = path.join(repoRoot, targetFile);
  const raw = fs.readFileSync(absoluteFile, "utf8");
  const parsed = splitFrontMatter(raw);
  if (!parsed) {
    throw new Error(`文件不是合法的 Jekyll 文章：${targetFile}`);
  }

  const spec = buildPublishSpec({
    repoRoot,
    flags,
    targetFile,
    frontMatter: parsed.frontMatter
  });
  const nextFrontMatter = updateFrontMatter(parsed.frontMatter, spec);
  const nextContent = `---\n${nextFrontMatter}\n---\n${parsed.body}`;

  if (!toBoolean(flags["dry-run"], false)) {
    fs.writeFileSync(absoluteFile, nextContent, "utf8");
    runGitSteps({
      repoRoot,
      relativeFile: targetFile,
      title: spec.title,
      action: spec.published ? "publish" : "unpublish",
      flags
    });
  }

  return buildResultPayload({
    repoRoot,
    action: "publish",
    relativeFile: targetFile,
    spec,
    dryRun: toBoolean(flags["dry-run"], false)
  });
}

function buildCreateSpec({ repoRoot, flags }) {
  const section = resolveSection(flags.section);
  const date = normalizeDate(flags.date);
  const fileDate = date.slice(0, 10);
  const title = requiredText(flags.title, "--title");
  const subtitle = optionalText(flags.subtitle);
  const tags = normalizeList(flags.tags);
  const category = optionalText(flags.category) || section.category;
  const slug = normalizeSlug(optionalText(flags.slug) || title, fileDate);

  return {
    repoRoot,
    title,
    subtitle,
    date,
    published: flags.published !== undefined ? toBoolean(flags.published, false) : false,
    section,
    category,
    tags,
    slug,
    fileDate,
    author: optionalText(flags.author) || "Dorck",
    catalog: toBoolean(flags.catalog, false),
    description: optionalText(flags.description) || buildDescription({ title, subtitle, tags, section }),
    headerImage: optionalText(flags["header-img"]),
    headerMask: optionalText(flags["header-mask"]),
    excerptSeparator: optionalText(flags["excerpt-separator"]) || "<!--more-->",
    template: optionalText(flags.template) || "default"
  };
}

function buildPublishSpec({ repoRoot, flags, targetFile, frontMatter }) {
  const currentSection = resolveSectionFromPath(targetFile);
  const currentTitle = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "title") ?? "");
  const currentSubtitle = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "subtitle") ?? "");
  const currentDate = extractFrontMatterValue(frontMatter, "date") ?? normalizeDate("");
  const currentPublished = toBoolean(extractFrontMatterValue(frontMatter, "published"), true);
  const currentCategory =
    extractFrontMatterValue(frontMatter, "categories") ??
    extractFrontMatterValue(frontMatter, "catrgories") ??
    currentSection.category;
  const currentTags = extractFrontMatterArray(frontMatter, "tags");
  const currentDescription = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "description") ?? "");
  const currentHeaderImage = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "header-img") ?? "");
  const currentHeaderMask = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "header-mask") ?? "");
  const currentCatalog = toBoolean(extractFrontMatterValue(frontMatter, "catalog"), false);
  const currentExcerptSeparator = stripWrappingQuotes(extractFrontMatterValue(frontMatter, "excerpt_separator") ?? "");

  const title = optionalText(flags.title) || currentTitle;
  const subtitle = optionalText(flags.subtitle) || currentSubtitle;
  const tags = flags.tags !== undefined ? normalizeList(flags.tags) : currentTags;
  const category = optionalText(flags.category) || currentCategory;
  const section = flags.section ? resolveSection(flags.section) : currentSection;

  return {
    repoRoot,
    title,
    subtitle,
    date: normalizeDate(optionalText(flags.date) || currentDate),
    published: flags.published !== undefined ? toBoolean(flags.published, currentPublished) : currentPublished,
    section,
    category,
    tags,
    description:
      optionalText(flags.description) ||
      currentDescription ||
      buildDescription({ title, subtitle, tags, section }),
    headerImage: flags["header-img"] !== undefined ? optionalText(flags["header-img"]) : currentHeaderImage,
    headerMask: flags["header-mask"] !== undefined ? optionalText(flags["header-mask"]) : currentHeaderMask,
    catalog: flags.catalog !== undefined ? toBoolean(flags.catalog, currentCatalog) : currentCatalog,
    excerptSeparator:
      flags["excerpt-separator"] !== undefined
        ? optionalText(flags["excerpt-separator"])
        : currentExcerptSeparator || "<!--more-->",
    template: optionalText(flags.template) || "default"
  };
}

function resolveBody(flags, spec) {
  if (flags["body-file"]) {
    return fs.readFileSync(path.resolve(spec.repoRoot, flags["body-file"]), "utf8").trimEnd();
  }
  if (flags.body) {
    return String(flags.body).trimEnd();
  }
  return buildBodyTemplate(spec);
}

function resolveSection(sectionKey) {
  const key = optionalText(sectionKey) || "other";
  const section = SECTION_BY_KEY.get(key);
  if (!section) {
    throw new Error(`未知 section: ${key}。可用值：${[...SECTION_BY_KEY.keys()].join(", ")}`);
  }
  return section;
}

function resolveSectionFromPath(relativeFile) {
  return SECTION_CONFIG.find((section) => relativeFile.startsWith(section.dir)) ?? SECTION_BY_KEY.get("other");
}

function resolveExistingPost({ repoRoot, file, title }) {
  if (file) {
    const relative = path.isAbsolute(file) ? path.relative(repoRoot, file) : file;
    const absolute = path.join(repoRoot, relative);
    if (!fs.existsSync(absolute)) {
      throw new Error(`找不到文章文件：${relative}`);
    }
    return relative;
  }

  if (!title) {
    throw new Error("发布文章时需要显式传入 --file，或用 --title 精确匹配现有文章。");
  }

  const files = walkFiles(path.join(repoRoot, "_posts")).filter((item) => item.endsWith(".md"));
  const matches = files.filter((absolute) => {
    const content = fs.readFileSync(absolute, "utf8");
    const parsed = splitFrontMatter(content);
    if (!parsed) {
      return false;
    }
    return stripWrappingQuotes(extractFrontMatterValue(parsed.frontMatter, "title") ?? "") === title;
  });

  if (matches.length === 0) {
    throw new Error(`找不到标题为“${title}”的文章，请改用 --file。`);
  }
  if (matches.length > 1) {
    throw new Error(`标题“${title}”匹配到多篇文章，请改用 --file。`);
  }

  return path.relative(repoRoot, matches[0]);
}

function buildFrontMatter(spec) {
  const lines = [
    "layout: post",
    `title: ${quoteYaml(spec.title)}`,
    spec.subtitle ? `subtitle: ${quoteYaml(spec.subtitle)}` : null,
    spec.description ? `description: ${quoteYaml(spec.description)}` : null,
    `date: ${spec.date}`,
    `author: ${quoteYaml(spec.author)}`,
    `catalog: ${spec.catalog ? "true" : "false"}`,
    "header-style: text",
    spec.headerImage ? `header-img: ${quoteYaml(spec.headerImage)}` : null,
    spec.headerMask ? `header-mask: ${spec.headerMask}` : null,
    `published: ${spec.published ? "true" : "false"}`,
    spec.excerptSeparator ? `excerpt_separator: ${quoteYaml(spec.excerptSeparator)}` : null,
    ...formatArrayField("tags", spec.tags),
    `categories: ${quoteScalarIfNeeded(spec.category)}`
  ];
  return lines.filter(Boolean).join("\n");
}

function updateFrontMatter(frontMatter, spec) {
  let lines = frontMatter.split(/\r?\n/);
  lines = setScalarField(lines, ["title"], quoteYaml(spec.title));
  lines = setOptionalScalarField(lines, ["subtitle"], spec.subtitle ? quoteYaml(spec.subtitle) : "");
  lines = setOptionalScalarField(lines, ["description"], spec.description ? quoteYaml(spec.description) : "");
  lines = setScalarField(lines, ["date"], spec.date);
  lines = setScalarField(lines, ["published"], spec.published ? "true" : "false");
  lines = setScalarField(lines, ["catalog"], spec.catalog ? "true" : "false");
  lines = setOptionalScalarField(lines, ["header-img"], spec.headerImage ? quoteYaml(spec.headerImage) : "");
  lines = setOptionalScalarField(lines, ["header-mask"], spec.headerMask || "");
  lines = setOptionalScalarField(
    lines,
    ["excerpt_separator"],
    spec.excerptSeparator ? quoteYaml(spec.excerptSeparator) : ""
  );
  lines = setArrayField(lines, "tags", spec.tags);
  lines = setScalarField(lines, ["categories", "catrgories"], quoteScalarIfNeeded(spec.category), "categories");
  return lines.join("\n");
}

function setScalarField(lines, keys, value, outputKey = keys[0]) {
  const index = findFieldIndex(lines, keys);
  const nextLines = [...lines];
  if (index >= 0) {
    nextLines[index] = `${outputKey}: ${value}`;
    return removeFollowingArrayLines(nextLines, index);
  }
  const insertAt = findInsertIndex(nextLines);
  nextLines.splice(insertAt, 0, `${outputKey}: ${value}`);
  return nextLines;
}

function setOptionalScalarField(lines, keys, value, outputKey = keys[0]) {
  const index = findFieldIndex(lines, keys);
  if (!value) {
    if (index < 0) {
      return lines;
    }
    const nextLines = [...lines];
    const end = findFieldBlockEnd(nextLines, index);
    nextLines.splice(index, end - index);
    return nextLines;
  }
  return setScalarField(lines, keys, value, outputKey);
}

function setArrayField(lines, key, items) {
  const normalized = normalizeList(items);
  const arrayLines = formatArrayField(key, normalized);
  const index = findFieldIndex(lines, [key]);
  const nextLines = [...lines];
  if (index >= 0) {
    const end = findFieldBlockEnd(nextLines, index);
    nextLines.splice(index, end - index, ...arrayLines);
    return nextLines;
  }
  const insertAt = findInsertIndex(nextLines);
  nextLines.splice(insertAt, 0, ...arrayLines);
  return nextLines;
}

function findFieldIndex(lines, keys) {
  return lines.findIndex((line) => keys.some((key) => new RegExp(`^${escapeRegex(key)}\\s*:`).test(line)));
}

function removeFollowingArrayLines(lines, index) {
  const end = findFieldBlockEnd(lines, index);
  if (end <= index + 1) {
    return lines;
  }
  lines.splice(index + 1, end - index - 1);
  return lines;
}

function findFieldBlockEnd(lines, index) {
  let cursor = index + 1;
  while (cursor < lines.length) {
    if (/^[A-Za-z0-9_-]+\s*:/.test(lines[cursor])) {
      break;
    }
    if (!lines[cursor].trim()) {
      const next = lines[cursor + 1];
      if (!next || /^[A-Za-z0-9_-]+\s*:/.test(next)) {
        break;
      }
    }
    cursor += 1;
  }
  return cursor;
}

function findInsertIndex(lines) {
  const categoriesIndex = findFieldIndex(lines, ["categories", "catrgories"]);
  return categoriesIndex >= 0 ? categoriesIndex : lines.length;
}

function formatArrayField(key, items) {
  if (!items.length) {
    return [`${key}: []`];
  }
  return [`${key}:`, ...items.map((item) => `- ${item}`)];
}

function runGitSteps({ repoRoot, relativeFile, title, action, flags }) {
  if (!toBoolean(flags.stage, false) && !toBoolean(flags.commit, false) && !toBoolean(flags.push, false)) {
    return;
  }

  execFileSync("git", ["add", relativeFile], { cwd: repoRoot, stdio: "pipe" });
  if (!toBoolean(flags.commit, false) && !toBoolean(flags.push, false)) {
    return;
  }

  const message =
    flags["commit-message"] ??
    `feat(post): ${action === "publish" ? "publish" : action === "unpublish" ? "hide" : "add"} ${title}`;
  execFileSync("git", ["commit", "-m", message], { cwd: repoRoot, stdio: "pipe" });

  if (toBoolean(flags.push, false)) {
    execFileSync("git", ["push", "origin", currentBranch(repoRoot)], { cwd: repoRoot, stdio: "pipe" });
  }
}

function currentBranch(repoRoot) {
  return execFileSync("git", ["branch", "--show-current"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function buildResultPayload({ repoRoot, action, relativeFile, spec, dryRun }) {
  const siteUrl = readSiteUrl(repoRoot);
  const slug = path.basename(relativeFile, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return {
    ok: true,
    action,
    dryRun,
    file: relativeFile,
    absoluteFile: path.join(repoRoot, relativeFile),
    title: spec.title,
    date: spec.date,
    published: spec.published,
    section: spec.section.key,
    category: spec.category,
    tags: spec.tags,
    description: spec.description ?? "",
    slug,
    url: siteUrl ? `${siteUrl}${buildPermalink(spec.date, slug)}` : buildPermalink(spec.date, slug)
  };
}

function formatHumanResult(payload) {
  if (payload.message) {
    return payload.message;
  }
  if (payload.sections) {
    return payload.sections.map((item) => `${item.key}\t${item.dir}\t${item.category}`).join("\n");
  }
  return [
    `ok: ${payload.ok}`,
    `action: ${payload.action}`,
    `file: ${payload.file}`,
    `title: ${payload.title}`,
    `date: ${payload.date}`,
    `published: ${payload.published}`,
    `section: ${payload.section}`,
    `category: ${payload.category}`,
    `tags: ${payload.tags.join(", ") || "(none)"}`,
    `description: ${payload.description || "(none)"}`,
    `url: ${payload.url}`,
    payload.dryRun ? "mode: dry-run" : "mode: write"
  ].join("\n");
}

function normalizeDate(input) {
  if (!input) {
    return formatDateTime(new Date());
  }
  const value = String(input).trim();
  const normalized = value
    .replace(/年/g, "-")
    .replace(/月/g, "-")
    .replace(/[日号]/g, "")
    .replace(/点/g, ":")
    .replace(/时/g, ":")
    .replace(/：/g, ":")
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const full = normalized.includes(":") ? normalized : `${normalized} ${currentTimePart()}`;
  const date = new Date(full.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) {
    throw new Error(`无法解析日期：${input}`);
  }
  return formatDateTime(date);
}

function normalizeSlug(value, fileDate) {
  const base = String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  if (base) {
    return base;
  }
  const hash = crypto.createHash("md5").update(String(value)).digest("hex").slice(0, 6);
  return `post-${fileDate.replace(/-/g, "")}-${hash}`;
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (!value) {
    return [];
  }
  return String(value)
    .split(/[、,，/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)$/);
  if (!match) {
    return null;
  }
  return { frontMatter: match[1], body: match[2] };
}

function extractFrontMatterValue(frontMatter, key) {
  const lines = frontMatter.split(/\r?\n/);
  const index = lines.findIndex((line) => new RegExp(`^${escapeRegex(key)}\\s*:`).test(line));
  if (index < 0) {
    return undefined;
  }
  return lines[index].replace(new RegExp(`^${escapeRegex(key)}\\s*:\\s*`), "").trim();
}

function extractFrontMatterArray(frontMatter, key) {
  const lines = frontMatter.split(/\r?\n/);
  const index = lines.findIndex((line) => new RegExp(`^${escapeRegex(key)}\\s*:`).test(line));
  if (index < 0) {
    return [];
  }

  const inlineValue = lines[index].replace(new RegExp(`^${escapeRegex(key)}\\s*:\\s*`), "").trim();
  if (inlineValue && inlineValue !== "[]") {
    return normalizeList(inlineValue);
  }

  const items = [];
  for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
    if (/^[A-Za-z0-9_-]+\s*:/.test(lines[cursor])) {
      break;
    }
    const match = lines[cursor].match(/^\s*-\s+(.+)$/);
    if (match?.[1]) {
      items.push(stripWrappingQuotes(match[1].trim()));
    }
  }
  return items;
}

function readSiteUrl(repoRoot) {
  const configFile = path.join(repoRoot, "_config.yml");
  if (!fs.existsSync(configFile)) {
    return "";
  }
  const content = fs.readFileSync(configFile, "utf8");
  const match = content.match(/^url:\s*"?(.*?)"?\s*(?:#.*)?$/m);
  return match?.[1] ?? "";
}

function buildDescription({ title, subtitle, tags, section }) {
  const fragments = [title, subtitle, tags.slice(0, 3).join(" / "), section?.category]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return fragments.join(" | ").slice(0, 120);
}

function buildBodyTemplate(spec) {
  const intro = spec.description || "这里先写一段导语。";
  const separator = spec.excerptSeparator || "<!--more-->";
  const template = String(spec.template || "default").toLowerCase();

  if (template === "tutorial") {
    return [intro, "", separator, "", "## 问题背景", "", "## 环境说明", "", "## 核心步骤", "", "## 关键细节", "", "## 总结"].join("\n");
  }
  if (template === "note") {
    return [intro, "", separator, "", "## 现象记录", "", "## 原因分析", "", "## 处理方式", "", "## 补充备注"].join("\n");
  }
  if (template === "review") {
    return [intro, "", separator, "", "## 背景", "", "## 优点", "", "## 不足", "", "## 结论"].join("\n");
  }
  return [intro, "", separator, "", "## 背景", "", "## 正文", "", "## 总结"].join("\n");
}

function buildPermalink(dateTime, slug) {
  const [datePart] = dateTime.split(" ");
  const [year, month, day] = datePart.split("-");
  return `/${year}/${month}/${day}/${slug}/`;
}

function resolveRepoRoot(startPath) {
  let current = path.resolve(startPath);
  const stats = fs.existsSync(current) ? fs.statSync(current) : null;
  if (stats?.isFile()) {
    current = path.dirname(current);
  }
  while (true) {
    if (fs.existsSync(path.join(current, "_config.yml")) && fs.existsSync(path.join(current, "_posts"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`找不到博客仓库根目录，请显式传入 --repo。起始路径：${startPath}`);
    }
    current = parent;
  }
}

function walkFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}

function quoteYaml(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function quoteScalarIfNeeded(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return '""';
  }
  if (/^[A-Za-z0-9_-]+$/.test(text)) {
    return text;
  }
  return quoteYaml(text);
}

function stripWrappingQuotes(value) {
  return String(value ?? "").replace(/^["'“”《]|["'“”》]$/g, "");
}

function requiredText(value, flagName) {
  const text = optionalText(value);
  if (!text) {
    throw new Error(`缺少必填参数 ${flagName}。`);
  }
  return text;
}

function optionalText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  const text = String(value).trim();
  return text;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "y", "是", "publish", "published"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "no", "n", "否", "draft", "hide"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function currentTimePart() {
  const now = new Date();
  return [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join(":");
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
