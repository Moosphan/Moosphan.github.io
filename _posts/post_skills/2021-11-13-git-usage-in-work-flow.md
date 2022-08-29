---
layout: post
title: "工作流中常用 Git 命令小记"
date: 2021-11-14 22:51:03
author:     "Dorck"
catalog: false
header-style: text
published: false
tags: 

- 工作技巧
- 效率工具
- 命令
- Git
categories: skill

---

### 操作类命令

```
> git rm xx					// 删除并提交变更到git暂存区
> git rm --cached -r xxdir/ // 从暂存区递归删除目录文件
> git restore --staged xxfile // 恢复
```



### 查看类命令

```
> git -h
> git rm -h
> git commit -h
> git add -h
> git log --oneline --reverse // 一行显示提交内容简介，并倒序排列
> git show // 查看某次提交完整信息
> git ls-files 			// 列出当前目录下所有git标记的文件
```

