---
layout: post
title: "Git 默认编辑器替换"
date: 2021-11-12 22:59:14
author:     "Dorck"
catalog: false
header-style: text
tags: 

- 开发技巧
- 效率工具
- Git
categories: 奇技淫巧

---

一般情况下，Git 的默认编辑器是 vim，对于新手来说上手可能比较困难。例如常见地我们输入 `git commit` 会看到如下场景，终端自动通过 vim 打开了本地 git 文件：

<img src="/img/in-post/post-tools/git_default_editor.png" alt="git_default_editor" style="zoom:40%;" />

那么，通过以下方式我们可以指定默认编辑器，这里以 vscode 为例。首先下载安装完 VsCode 后点击工具栏 **View** >> **Command palette** （或者快捷键 Shift + command + P）后输入框搜索 “code command” 并安装即可。然后终端输入如下命令来指定 Git 全局内容编辑器为 VsCode：

```
> git config --global core.editor "code --wait"
```

接下来，重新输入 `git commit` 来看下：

<img src="/img/in-post/post-tools/git_vscode_editor.png" alt="git_vscode_editor" style="zoom:40%;" />

可见我们已经成功替换到了 VsCode 编辑器。我们后续输入类似 `git config --global -e` 指令就会发现自动通过 VsCode 来打开全局的配置文件了。

> 通常，我们可以通过 `code file1` 来通过 vscode 打开某个文件。

除了正常的打开 git 配置文件到默认编辑器功能，vscode 还可以取代 git 中默认的 diff 及 merge 工具，通过更加可视化和美观的 vscode 内置工具替代 vimdiff：

```gfm
[core]
	editor = code --wait
[diff]
	tool = vscode
[difftool "vscode"]
	cmd = "code --wait --diff $LOCAL $REMOTE"
[merge]
    tool = vscode
[mergetool "vscode"]
    cmd = code --wait $MERGED
```



> *目前收录于 《开发必备的奇技淫巧》，持续更新中。*
