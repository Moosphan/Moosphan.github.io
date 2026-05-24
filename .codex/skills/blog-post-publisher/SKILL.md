---
name: blog-post-publisher
description: 当用户想在这个 Jekyll 个人博客仓库里创建、修改、公开或隐藏文章时使用此技能。先从用户需求中整理出结构化参数，再调用仓库内脚本创建或发布文章；支持标题、显示发布时间、是否公开、专栏、标签、摘要、封面图，以及按需执行 git 提交与推送。适用于 Codex 与 Claude Code 共用的博客发文流程。
---

# 博客文章创建与发布技能

当任务明确与当前仓库的博客文章创建、更新、公开、草稿切换或发布上线有关时，使用此技能。

## 仓库实现要点

- 站点基于 `Jekyll`，文章位于 `_posts/` 下，并按主题拆分到 `_posts/post_android`、`_posts/post_skills` 等子目录。
- 文章是否对外可见，当前仓库主要通过 front matter 中的 `published: true/false` 控制。
- 文章展示时间来自 front matter 中的 `date`，不必与文件名日期完全一致，但文件名前缀仍需保持 `YYYY-MM-DD`。
- 文章页 SEO 描述默认走 `excerpt`，页面头部还支持 `subtitle`、`description`、`header-img` 等字段，因此生成文章时优先补这些元数据。
- `Rakefile` 里的 `rake post` 只会往 `_posts/` 根目录生成基础文章，不符合当前仓库多数文章的分目录习惯；优先使用本技能附带的共享 CLI。

## 共享 CLI

统一使用仓库内脚本，脚本层只接受结构化参数：

```bash
node ./tools/blog-post-skill/bin/blog-post-skill.js sections --json
node ./tools/blog-post-skill/bin/blog-post-skill.js create --title "<标题>" --section skills --date "2026-05-24 21:30" --published false --tags "博客,自动化" --json
node ./tools/blog-post-skill/bin/blog-post-skill.js publish --file "<文章路径>" --published true --json
```

由 skill 本身负责把用户自然语言整理为这些参数，例如：

```bash
node ./tools/blog-post-skill/bin/blog-post-skill.js create \
  --title "Launcher 启动分析" \
  --section android \
  --date "2026-05-24 21:30" \
  --published false \
  --description "分析 Launcher 启动主链路" \
  --tags "Android,源码分析,Launcher" \
  --json
```

## 工作流程

1. 先判断用户是要“新建文章”还是“发布已有文章”。
2. 从用户描述中自行整理出结构化参数：至少包括标题；通常还包括 section、date、published、tags、description。
3. 新建文章时，先用 `create ... --dry-run --json` 预演一次，确认目标路径和元数据都正确。
4. 预演结果合理后，再执行真实写入。
5. 发布已有文章时，优先用 `publish --file <path>`；只有文件路径未知时，才允许用 `--title` 做精确标题匹配。
6. 只有用户明确提到“提交”“commit”“推送”“上线到远端”“发到 GitHub Pages”时，才附加 `--stage --commit`，以及必要时 `--push`。

## 默认约定

- 如果用户没说是否公开，传 `--published false`。
- 如果用户没指定专栏，传 `--section other`。
- 如果用户没给正文，不要自行长篇代写，只让脚本生成骨架模板。
- 如果用户没给摘要，可以省略 `--description`，由脚本基于标题、subtitle、标签和专栏自动生成短描述。
- 如果用户只说“发布时间是某天”，在调用脚本前把它整理成标准日期时间字符串。

## 结果要求

执行完成后，向用户返回：

- 生成或更新的文章路径
- 解析出的标题、显示发布时间、公开状态
- 预估文章访问链接
- 如果做了 `git commit` / `git push`，一并明确说明

## 仅在必要时追问

只有以下情况才需要追问用户：

- 标题缺失，无法安全创建文章
- section 不明确且自动归入 `other` 可能风险较高
- 标题匹配到多篇现有文章，无法确定要发布哪一篇
- 用户要求推送远端，但当前 git 状态或提交失败
