---
layout: post
title: "效率编程之快捷键篇"
date: 2023-04-16 11:00:00
author:     "Dorck"
catalog: false
header-style: text
published: false
tags: 
- Android studio
- 效率工具
- Coding
- Mac
categories: 
- skill

---

这是一个关于如何**效率编程**的系列专题，未来将会涉及诸如工具、脚本、插件、开源框架等各方面，只要能够帮助我们提升开发效率。

在日常当中，熟练地运用各种快捷键能够极大地提升我们的开发和工作效率。当看到其他同学通过快捷键两三下操作就帮你定位了问题代码并修改完毕，你是否也曾露出羡慕之色。正所谓磨刀不误砍柴工，快捷键也像宝刀一样，长时间弃而不用就会生锈，长此以往我们就会失去这一强大的臂助。

> *以下常用快捷键指令皆基于 MAC 系统。*

### 基础文本操作

其实很多文本类工具都提供了通用的快捷键，比如文本选择、光标快速移动等等，毋以善小而不为，不要小看这些小小的效率提升，聚沙成塔，长久以后就会凝聚成我们自身强大工作流的一部分。

##### 光标移动

- 光标移动到行头/尾：`Cmd + ←` / `Cmd + →`
- 光标移动到文本开头/结尾：`Cmd + ↑` / `Cmd + ↓`
- 光标向前/向后隔一词跳跃：`Option + ←` / `Option + →`

##### 文本浏览

- 移动到文本开始/末尾：`Fn + ←` / `Fn + →`（浏览器和部分文本工具支持）
- 文本上/下翻页：`Fn + ↑` / `Fn + ↓` （大部分文本工具都支持）

##### 文本选取

通过 **`Shift`** 搭配上方的光标移动快捷键，我们可以便捷实现文本选取。

- 从当前位置选取到行首/尾：`Cmd + Shift + ←` / `Cmd + Shift + →`
- 从当前位置选取到文本开头/结尾：`Cmd + Shift + ↑` / `Cmd + Shift + ↓` 或者使用 `Fn + Shift + ←` / `Fn + Shift + →`
- 从当前位置向前/向后选取一个单词：`Option + Shift + ←` / `Option + Shift + →`
- 从当前位置向上/下选取一页：`Fn + Shift + ↑` / `Fn + Shift + ↓`

##### 文本删除

- 向前删除：`Delete`
- 向后删除：`Fn + delete`
- 向前删除一个词：`Option + delete`
- 向后删除一个词：`Option + Fn + delete`
- 删除至行首：`Cmd + delete`

##### 文本查询

- 当前文稿内查询：`Cmd + F`
- 项目内查询：`Cmd + Shift + F`

- 查询并定位命中的下一个目标：`Enter` / `Cmd + G`
- 查询并定位命中的上一个目标：`Cmd + Shift + G`

##### 文本样式

- 粗体：`Cmd + B`
- 斜体：`Cmd + I`
- 下划线：`Cmd + U`
- 文字超链接：`Cmd + K`

### 窗口操作

##### 切换

- 隐藏屏幕正在显示的最上层窗口：`Cmd + H`
- 隐藏屏幕正在显示的底层窗口（除最上层以外的窗口）：`Cmd + Option + H`
- 在多个全屏窗口之间前后切换：`Control + ←` / `Control + →`
- 将所有窗口进入/退出预览模式：`Control + ↑` / `Control + ↓` 

##### 应用程序

- 在多个应用程序间前后切换：`Cmd + Tab` / `Cmd + Shift + Tab` / `Cmd + Tab + ←` / `Cmd + Tab + →`
- 退出最上层的应用程序：`Cmd + Q`
- 退出除最上层以外的其他应用：`Cmd + Shift + Q`

##### 关闭

- 关闭窗口：`Cmd + W`

### 文件操作

- 新建文件夹：`Command + Shift + N`
- 弹出窗口输入绝对路径课直达目标文件夹：`Command + Shift + G`
- 打开所选文件：`Command + O`
- 前往当前文件夹的上/下一层文件夹：`Command + ↑` / `Command + ↓`
- 将文件移至废纸篓：`Command + Delete`
- 清理废纸篓：`Command + Shift + Delete`
- 文件预览：`Space`
- 查看文件简介：`Command + I`
- 进入当前文件操作栈的上/下一层：`Cmd + [` / `Cmd + ]`
- 最小化窗口：`Cmd + M`
- 查看最近使用的文件：`Shift + Cmd + F`
- 进入下载目录：`Option + Cmd + L`
- 进入个人目录：`Shift + Cmd + H`

### 其他系统快捷键

##### 截图

- 截取整个屏幕内容到桌面：`Command + Shift + 3`
- 截取整个屏幕内容到剪贴板：`Command + Shift + Control + 3`
- 截取所选屏幕区域到桌面，或按空格键仅捕捉一个窗口：`Command + Shift + 4`
- 截取所选屏幕区域到剪贴板，或按空格键仅捕捉一个窗口：`Command + Shift + Control + 4`

##### 撤销与恢复

很多时候，我们在经常编辑文本或处理文件的时候会大量用到撤销和恢复撤销两个动作。

- 撤销：`Cmd + Z`
- 恢复撤销：`Cmd + Shift + Z`

##### 锁屏与关机

- 锁定屏幕：`Control + Command + Q`
- 重启：`Control + Command + Power`
- 关机：`Command + Option + COntrol + Power`

### Android Studio 快捷键

##### 搜索&替换

| 快捷键说明                       | Windows ｜ Linux | MacOS               |
| -------------------------------- | ---------------- | ------------------- |
| 全局搜索（代码、文件、菜单）     | Shift + Shift    | Shift + Shift       |
| 当前文件内查找代码               | Ctrl + F         | Command + F         |
| 当前文件内代码替换               | Ctrl + R         | Command + R         |
| 全局搜索代码（路径、项目、模块） | Ctrl + Shift + F | Command + Shift + F |
| 全局替换（路径、项目、模块）     | Ctrl + Shift + R | Command + Shift + R |
| 查找下一项内容                   | F3               | Command + G         |
| 查找上一项内容                   | Shift + F3       | Command + Shift+ G  |
| 查看最近打开的文件窗口           | Ctrl + E         | Command + E         |
| 查看最近编辑过的文件窗口         | Ctrl + Shift + E | Command + Shift + E |
| 关闭当前窗口                     | Ctrl + F4        | Command + W         |

##### 代码查看&编辑

| 快捷键说明                                | Windows ｜ Linux                              | MacOS                                                        |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| 进入源代码                                | F4 或 Ctrl + Enter                            | Command + ↓ 或 Command + 鼠标单击                            |
| 跳转到代码指定行                          | Ctrl+G                                        | Command + L                                                  |
| 跳转到上一个代码编辑的位置                | Ctrl + Shift + 退格键                         | Command + Option + ← 或 Command+Shift+Delete                 |
| 跳转到下一个代码编辑的位置                |                                               | Command + Option + →                                         |
| 查看类层次结构(继承关系)                  | Ctrl + H                                      | **Ctrl + H**                                                 |
| 查看方法层次结构                          | Ctrl + Shift + H                              | Command + Shift + H                                          |
| 查看调用层次结构                          | Ctrl + Alt + H                                | **Ctrl + Option + H**                                        |
| 插入模版代码                              | Alt + Insert                                  | Command + N                                                  |
| 前往子类实现该方法                        | Ctrl + I                                      | Ctrl + I                                                     |
| 选择重写父类某个方法                      | Ctrl + O                                      | Ctrl + O                                                     |
| 将代码放入条件语句中(if-else/try-catch..) | Ctrl + Alt + T                                | **Command + Option + T**                                     |
| 删除整行                                  | Ctrl + Y                                      | Command + Delete                                             |
| 收起/展开当前代码块                       | Ctrl + 减号键Ctrl + 加号键                    | Command+减号键或Command+加号键                               |
| 收起/展开所有代码块                       | Ctrl + Shift + 减号键或 Ctrl + Shift + 加号键 | Command+Shift+减号键或 Command+Shift+加号键                  |
| 复制当前行并另起一行粘贴(不会放到粘贴板)  | Ctrl + D                                      | Command + D                                                  |
| 快速预览查看文档                          | Ctrl + Q                                      | Ctrl + J                                                     |
| 预览查看选定方法的参数                    | Ctrl + P                                      | **Command + P**                                              |
| 显示或直接跳转到方法调用方                | Ctrl + B 或 Ctrl + 点击                       | Command + B 或 Command + 点击                                |
| 显示或直接跳转到方法实现处                | Ctrl + Alt + B                                | **Command + Option + B**                                     |
| 跳转到超类方法处                          | Ctrl + U                                      | **Command + U**                                              |
| 快速预览方法定义                          | Ctrl + Shift + I                              | **Command + Y**                                              |
| 切换项目左侧工具窗口的可见性              | Alt + 1                                       | **Command + 1**                                              |
| 添加/取消行注释                           | Ctrl + /                                      | Command + /                                                  |
| 添加/取消块注释                           | Ctrl + Shift + /                              | **Command + Shift + /**                                      |
| 增加选中的代码块                          | Ctrl + W                                      | Option + 向上箭头                                            |
| 减少选中的代码块                          | Ctrl + Shift + W                              | Option + 向下箭头                                            |
| 移动到代码块起始位置                      | Ctrl + [                                      | **Option + Command + [**                                     |
| 移动到代码块结束位置                      | Ctrl + ]                                      | **Option + Command + ]**                                     |
| 从当前位置选择到代码块起始位置            | Ctrl + Shift + [                              | Option + Command + **Shift** + [                             |
| 从当前位置选择到代码块结束位置            | Ctrl + Shift + ]                              | Option + Command + **Shift** + ]                             |
| 包名导入优化                              | Ctrl + Alt + O                                | **Control + Option + O**                                     |
| 显示快速修复建议                          | Alt + Enter                                   | **Option + Enter**                                           |
| 重新格式化代码                            | Ctrl + Alt + L                                | Command + Option + L                                         |
| 自动修复行缩进                            | Ctrl + Alt + I                                | Ctrl + Option + I                                            |
| 缩进/取消缩进行                           | Tab 或 Shift + Tab                            | Tab 或 Shift + Tab                                           |
| 另起一行                                  | Shift + Enter                                 | Shift + Enter(注意和 Command + Enter 区别：前者光标自动跟进到下一行开头，而后者光标停留在原地) |

##### 版本控制

| 快捷键说明               | Windows ｜ Linux | MacOS              |
| ------------------------ | ---------------- | ------------------ |
| 将项目提交到 VCS（Push） | Ctrl + K         | Command + K        |
| 从 VCS 更新项目（Pull）  | Ctrl + T         | Command + T        |
| 查看最近变更             | Alt + Shift + C  | Option + Shift + C |
| 打开 VCS 对话框          | Alt +`（反引号） | Ctrl + V           |

##### 重构相关

| 快捷键说明                                               | Windows ｜ Linux | MacOS                    |
| -------------------------------------------------------- | ---------------- | ------------------------ |
| 复制                                                     | F5               | Fn + F5                  |
| 移动                                                     | F6               | FN + F6                  |
| 安全删除                                                 | Alt+Delete       | Command + Delete         |
| 重命名（方法、属性、文件等）                             | Shift+F6         | **Fn + Shift + F6**      |
| 更改方法/属性签名                                        | Ctrl+F6          | **Fn + Command + F6**    |
| 方法内联（将方法内实现部分提取到方法调用处）             | Ctrl + Alt + N   | **Command + Option + N** |
| 提取方法                                                 | Ctrl+Alt+M       | **Command + Option + M** |
| 提取为局部变量                                           | Ctrl+Alt+V       | **Command + Option + V** |
| 提取为类成员字段                                         | Ctrl+Alt+F       | **Command + Option + F** |
| 提取为常量                                               | Ctrl+Alt+C       | **Command + Option + C** |
| 提取为方法参数（e.g,将方法内局部变量提取为通过外部传入） | Ctrl+Alt+P       | **Command + Option + P** |

##### 代码调试

| 快捷键说明     | Windows ｜ Linux  | MacOS                     |
| -------------- | ----------------- | ------------------------- |
| 调试           | Shift + F9        | Ctrl+D                    |
| 单步跳过       | F8                | Fn + F8                   |
| 单步进入       | F7                | Fn + F7                   |
| 智能单步进入   | Shift + F7        | Fn + Shift + F7           |
| 单步退出       | Shift + F8        | Fn + Shift + F8           |
| 运行到光标位置 | Alt + F9          | Fn + Option + F9          |
| 评估表达式     | Alt + F8          | Fn + Option + F8          |
| 继续运行程序   | F9                | Command + Option + R      |
| 切换断点       | Ctrl + F8         | Fn + Command + F8         |
| 查看断点       | Ctrl + Shift + F8 | Fn + Command + Shift + F8 |

##### 自定义快捷键

Android Studio 还有很多操作没有关联上具体的快捷键，而我们也可以通过自定义的方式来为高频操作绑定上快捷键。只需要到工具栏的 Android Studio 一栏找到 Preference（或用快捷键 `Cmd + ,` ）进入设置 `keymap` 选项中搜索对应的操作即可。这里以 *Sync Project with Gradle Files* 操作为例：

<img src="/img/in-post/post-skills/image-20230416085732692.png" alt="image-20230416085732692" style="zoom:50%;" />

接下来只需选中目标项绑定快捷键即可，我这里绑定的快捷键是 `CMd + Option + S`。Android Studio 比较智能，如果绑定了已被使用的快捷键会提示冲突问题。



### 参考

- [*Android Studio shortcuts*](https://developer.android.google.cn/studio/intro/keyboard-shortcuts?hl=zh-cn)
