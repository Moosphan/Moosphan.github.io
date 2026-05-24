# Blog Post Skill

这个目录提供一套仓库内可复用的博客发文能力，供 `Codex` 与 `Claude Code` 共用。
脚本层只接受结构化参数；自然语言理解由上层 skill 或命令封装完成。

## 结构

- `bin/blog-post-skill.js`
  共享 CLI 入口
- `src/cli.js`
  结构化参数校验、front matter 生成、发布状态切换
- `test/`
  最小自动化测试

## 本地调用

```bash
node ./tools/blog-post-skill/bin/blog-post-skill.js sections --json
node ./tools/blog-post-skill/bin/blog-post-skill.js create --title "Activity 启动过程" --section android --date "2026-05-24 09:30" --published false --tags "Android,源码分析"
node ./tools/blog-post-skill/bin/blog-post-skill.js publish --file "./_posts/post_android/2026-05-24-activity.md" --published true
```

## 分发建议

如果要迁移到其他 Jekyll 博客仓库，最少复制这些内容：

- `tools/blog-post-skill/`
- `.codex/skills/blog-post-publisher/`
- `.claude/commands/blog-post.md`

然后把目标仓库里的目录映射和默认分类按实际情况改到 `src/cli.js` 的 `SECTION_CONFIG`。
