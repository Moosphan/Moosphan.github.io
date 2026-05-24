---
description: 根据自然语言整理结构化参数，然后调用仓库脚本创建、更新或发布文章；支持标题、显示发布时间、是否公开、专栏、标签、摘要、封面图和正文模板，以及按需提交推送。
allowed-tools: Bash
---

使用仓库内共享 CLI，不要手写 front matter。CLI 只接结构化参数，不接整段自然语言。

流程：
1. 先根据用户意图整理出结构化参数，例如 `title`、`section`、`date`、`published`、`tags`、`description`。
2. 如需确认专栏可先执行：
   `node ./tools/blog-post-skill/bin/blog-post-skill.js sections --json`
3. 先执行一次 dry-run 预演：
   `node ./tools/blog-post-skill/bin/blog-post-skill.js create --title "<title>" --section "<section>" --date "<date>" --published "<true|false>" --tags "<a,b>" --dry-run --json`
   或
   `node ./tools/blog-post-skill/bin/blog-post-skill.js publish --file "<path>" --published "<true|false>" --dry-run --json`
4. 检查预演结果：
   - 如果标题缺失，或发布目标不唯一，再向用户补问这一个问题。
   - 如果用户没有明确要求提交或推送，不要追加 `--stage --commit --push`。
5. 真正执行写入，沿用同一组结构化参数，只去掉 `--dry-run`。
6. 只有当用户明确提到“提交”“commit”“推送”“上线到 GitHub Pages / 远端”时，才追加：
   - `--stage --commit`
   - 如用户明确要推送，再追加 `--push`
7. 最终把文章路径、显示发布时间、公开状态和链接返回给用户。
8. 如果用户没有提供正文内容，不要自行长篇代写，只使用 CLI 生成骨架模板。
