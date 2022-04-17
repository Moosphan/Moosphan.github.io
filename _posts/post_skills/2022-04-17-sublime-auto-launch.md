---
layout: post
title: "Sublime Text在Mac上开机自启动问题"
date: 2022-04-17 17:06:29
author:     "Dorck"
catalog: false
header-style: text
tags: 

- 工具
- 奇技淫巧

---

去年自从重新下载了 Sublime Text 来作为主要的代码及文本阅读工具后就一直“苦开机自启动问题久矣”，每次开机Sublime Text 都会自动打开一个空的文件，极度影响使用体验（我又不是每次打开电脑都需要用 sublime🤮）。于是乎，稍微 Google 搜索了下如何关闭 Sublime Text 自启动，其实也很简单，此处记录下以防忘记。

### 系统偏好设置

进入 Mac 的系统偏好设置中心，点击 **用户与群组**就可以看到开机启动项：

<img src="/img/in-post/post-other/sublime-auto-start-1.png" alt="sublime-auto-start-1" style="zoom:50%;" />

找到 sublime text 应用并关掉相应的自启动项即可。然而不知道是版本问题还是什么原因，我电脑上的 Sublime text 启动项并不在这边显示，如果像我一样，可以参考下面的第二种方式。

### 在 sublime-settings 更改配置

我们需要进入 Sublime text 的设置中心并修改自启动配置即可：

<img src="/img/in-post/post-other/st-auto-start-2.png" alt="st-auto-start-2" style="zoom:30%;" />

需要在 Sublime text 的顶部工具栏点击 Tools 并选择打开 Command Palette（或者直接快捷键 shift+command+P），输入 `settings` 关键字并选择 **`Preference: Settings-Syntax Specific`** 选项卡你就可以看到如上页面。接着在右侧输入栏填写以下内容：

```json
// These settings override both User and Default settings for the Plain text syntax
{
	"hot_exit": false,
	"remember_open_files": false,
}

```

这样一来就可以修改 Sublime Text 当前用户的自启动配置，我们这里将它设置为了关闭状态。

> 关于网上很多说在 Sublime text 菜单栏 -> `Preferences` -> `Settings` 中设置实测其实是没效果的，大家可动手亲自一试。

### 相关参考

- <https://forum.sublimetext.com/t/have-sublime-3-auto-open-files/55306/9>