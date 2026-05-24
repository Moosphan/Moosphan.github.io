import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { executeCommand } from "../src/cli.js";

function createTempRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "blog-post-skill-"));
  fs.mkdirSync(path.join(repoRoot, "_posts", "post_android"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "_posts", "post_gradle"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "_posts", "post_other"), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, "_config.yml"),
    'url: "https://example.com"\npermalink: pretty\n',
    "utf8"
  );
  return repoRoot;
}

test("sections command returns supported section keys", async () => {
  const repoRoot = createTempRepo();
  const result = await executeCommand(["sections", "--json"], { cwd: repoRoot });

  assert.equal(result.payload.ok, true);
  assert.ok(result.payload.sections.some((item) => item.key === "android"));
  assert.ok(result.payload.sections.some((item) => item.key === "skills"));
});

test("create command builds post from explicit flags", async () => {
  const repoRoot = createTempRepo();
  const result = await executeCommand(
    [
      "create",
      "--title",
      "Activity 启动过程",
      "--section",
      "android",
      "--date",
      "2026-05-24 09:30",
      "--published",
      "false",
      "--tags",
      "Android,源码分析",
      "--description",
      "记录一次 Activity 启动流程分析",
      "--template",
      "tutorial"
    ],
    { cwd: repoRoot }
  );

  assert.equal(result.payload.file, "_posts/post_android/2026-05-24-activity.md");
  assert.equal(result.payload.published, false);
  assert.equal(result.payload.date, "2026-05-24 09:30:00");
  assert.deepEqual(result.payload.tags, ["Android", "源码分析"]);
  assert.equal(result.payload.description, "记录一次 Activity 启动流程分析");

  const created = fs.readFileSync(path.join(repoRoot, result.payload.file), "utf8");
  assert.match(created, /title: "Activity 启动过程"/);
  assert.match(created, /published: false/);
  assert.match(created, /description: "记录一次 Activity 启动流程分析"/);
  assert.match(created, /excerpt_separator: "<!--more-->"/);
  assert.match(created, /## 核心步骤/);
});

test("publish command updates post metadata from explicit flags", async () => {
  const repoRoot = createTempRepo();
  const relativeFile = "_posts/post_other/2026-05-24-post-20260524-a1b2c3.md";
  fs.mkdirSync(path.dirname(path.join(repoRoot, relativeFile)), { recursive: true });
  fs.writeFileSync(
    path.join(repoRoot, relativeFile),
    [
      "---",
      "layout: post",
      'title: "自动化草稿"',
      "date: 2026-05-24 10:00:00",
      'author: "Dorck"',
      "catalog: false",
      "header-style: text",
      "published: false",
      "tags:",
      "- 自动化",
      "categories: other",
      "---",
      "",
      "正文"
    ].join("\n"),
    "utf8"
  );

  const result = await executeCommand(
    [
      "publish",
      "--file",
      relativeFile,
      "--published",
      "true",
      "--date",
      "2026-05-25 08:00",
      "--tags",
      "自动化,博客",
      "--description",
      "统一博客自动化发文入口"
    ],
    { cwd: repoRoot }
  );

  assert.equal(result.payload.file, relativeFile);
  assert.equal(result.payload.published, true);
  assert.equal(result.payload.date, "2026-05-25 08:00:00");
  assert.equal(result.payload.description, "统一博客自动化发文入口");

  const updated = fs.readFileSync(path.join(repoRoot, relativeFile), "utf8");
  assert.match(updated, /published: true/);
  assert.match(updated, /date: 2026-05-25 08:00:00/);
  assert.match(updated, /- 博客/);
  assert.match(updated, /description: "统一博客自动化发文入口"/);
});
