---
layout: post
title: "AOSP在Mac上的编译实践（上）"
date: 2023-04-21 14:15:00
author:     "Dorck"
catalog: false
header-style: text
published: false
tags: 
- repo
- framework
- AOSP
catrgories: Android
---

AOSP，即 Android Open Source Project，对于 Android 开发者来说再熟悉不过的项目，本文将着重介绍如何在 MacOS Monterey 环境上下载完整的 AOSP 源码。

## Git & Python

#### 1. Git 安装和配置

在安装了 [Homebrew](https://brew.sh/) 的情况下，安装 git 我们只需要执行如下命令：

```bash
brew install git
```

接着初始化一下 Git 的全局配置信息：

```bash
git config --global user.name "User Name"
git config --global user.email "your@example.com"
```

#### 2. 配置 python 环境

一般情况下我们电脑上都会安装了 python 环境，如果没有安装，可以前往 [python官方站点](https://www.python.org)下载。安装成功并做好解释器关联后执行以下命令查看版本信息：

```bash
➜  ~ python --version
Python 3.10.4
```

目前的 repo 都是基于 python 3.0，我们需要留意最新的 [repo](https://android.googlesource.com/tools/repo) 版本中的 main.py 文件中定义的版本和我们本地的 python 环境是否一致。这里能跑通并不代表整个环境就万事大吉了，后面在安装 repo 的时候会提到因 python 配置而遇到的一个问题。

## 安装 repo

Repo 是建立在 Git 上的一个多仓库管理工具，可以组织多个仓库的上传和下载。它是 Google 基于 Python 和 Git 编写的脚本工具，可以协助我们管理多个 Git 存储仓库。首先，我们通过如下命令安装和配置 repo：

```bash
➜ mkdir ~/DevKit/bin
➜ curl https://storage.googleapis.com/git-repo-downloads/repo > ~/DevKit/bin/repo
➜ chmod a+x ~/DevKit/bin/repo
```

如果提示网络问题可能需要翻墙，可尝试使用国内镜像：

```bash
curl https://mirrors.tuna.tsinghua.edu.cn/git/git-repo -o ~/DevKit/bin/repo
chmod a+x ~/DevKit/bin/repo
```

接着执行 `repo --version` 查看是否安装成功：

```bash
➜  ~ repo --version
<repo not installed>
repo launcher version 2.32
       (from /Users/dorck/DevKit/bin/repo)
git 2.32.0 (Apple Git-132)
Python 3.10.4 (v3.10.4:9d38120e33, Mar 23 2022, 17:29:05) [Clang 13.0.0 (clang-1300.0.29.30)]
OS Darwin 21.4.0 (Darwin Kernel Version 21.4.0: Fri Mar 18 00:46:32 PDT 2022; root:xnu-8020.101.4~15/RELEASE_ARM64_T6000)
CPU arm64 (arm)
Bug reports: https://bugs.chromium.org/p/gerrit/issues/entry?template=Repo+tool+issue
➜  ~ 
```

若出现上述版本提示信息说明安装成功，可继续进行下一步操作。But，在笔者的 M1 电脑上遇到了一个坑，在执行 `repo --version` 时提示 python 配置问题：

```bash
env: python: No such file or directory
```

出现这类问题的常见原因一般是本地有多个 python 版本环境，导致链接出错，于是我先定位一下本地机器中的 python 解释器版本有哪些：

```bash
➜ where python
/Library/Frameworks/Python.framework/Versions/3.10/bin/python3.10
```

可以看到我电脑指向的是 /Library/Frameworks 下的内置 python 环境，然而我又翻看了一下 `~/.bash_profile` 中的 python 环境配置：

```bash
# Python 配置
alias python="/Library/Frameworks/Python.framework/Versions/3.10/bin/python3.10"
export PATH="/Library/Frameworks/Python.framework/Versions/3.10/bin:$PATH"
export PATH=/usr/local/bin:$PATH
export PATH=/Users/{YOUR_NAME}/DevKit/bin:$PATH
export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo'
```

可以看到，我这边配置了不止一项 python 环境，`/usr/local/bin` 下还存在一个 3.0 版本的 python，那么为什么 repo 中的 python 代码执行不了呢？简单看了下 repo 的[内部代码](https://docs.python.org/3/library/sys.html)，发现他里面是通过 sys 库来获取的当前运行的 python 解释器。以下是笔者的个人猜测：在 macOS 系统中，系统默认的 Python 解释器是 Python 2.x 版本，如果安装了 Python 3.x 版本，而且没有设置符号链接将其路径添加到系统 PATH 中，那么系统就无法找到 Python 3.x 版本的可执行文件。因此，当您在终端中输入  `python3`  命令时，系统会去默认的路径  `/usr/bin/`  中查找 Python 解释器，而无法找到 Python 3.x 版本的解释器，从而导致 "env: python: No such file or directory" 错误的发生。 要解决这个问题，我们可以执行以下命令：

```bash
ln -sf /Library/Frameworks/Python.framework/Versions/3.10/bin/python3 /usr/local/bin/python
```

 这个命令的作用是将 Python 3.10 版本的可执行文件添加到了  `/usr/local/bin`  目录下，并创建了一个符号链接(软链接)，使得  `python`  命令可以正确地指向 Python 3.10 版本的可执行文件，从而避免在使用  `python`  命令时出现因为找不到 Python 3.10 版本的可执行文件而报错的问题。这样，当我们在终端中输入  `python`  或  `python3`  命令时，系统会优先在  `/usr/local/bin`  目录下查找，找到该目录下的  `python`  或  `python3`  命令，然后使用其中的 Python 3.10 版本的可执行文件来执行程序，从而保证我们使用的是正确的 Python 版本。  

接下来，安装完成 repo 后，我可以将以下 `REPO_URL` 地址替换为国内的镜像地址，方便后续下载 AOSP 源码，由于该项目较大，需要保证稳定的网络环境，不具备翻墙条件的此步骤为必选项：

```bash
export REPO_URL='https://mirrors.tuna.tsinghua.edu.cn/git/git-repo'
export PATH=/Users/{YOUR_NAME}/DevKit/bin:$PATH
```

以上配置请复制到 ~/.bash_profile 中，并执行 `source ~/.bash_profile` 使其生效。这里需要将 repo 的 path 也放置到环境变量中，方便我们全局调用。

> 关于 repo 的具体用法可以参考：[多仓库管理工具—Repo](https://juejin.cn/post/6971009369693503519)

## 下载 AOSP

接下来我们就可以愉快的下载 AOSP 代码了：

```bash
➜ mkdir AOSP
➜ cd ~/AOSP
➜ repo init -u https://mirrors.tuna.tsinghua.edu.cn/git/AOSP/platform/manifest -b android-13.0.0_r30
```

通过 repo init 命令来初始化、关联具体的 repo 项目，并指定了下载分支为 Android 13 版本的代码。当然，事情可能并不会一帆风顺，出现了下面的报错信息：

```
fatal: Cannot get https://gerrit.googlesource.com/git-repo/clone.bundle 
fatal: error [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed (_ssl.c:590)
```

我们需要执行一下 Python 安装包下的 `Install Certificates.command` 脚本来安装证书，然后重新执行上述命令：

```
Downloading Repo source from https://mirrors.tuna.tsinghua.edu.cn/git/git-repo
remote: Enumerating objects: 4463, done.
remote: Counting objects: 100% (4463/4463), done.
remote: Compressing objects: 100% (2123/2123), done.
remote: Total 8034 (delta 3979), reused 2340 (delta 2340), pack-reused 3571
Receiving objects: 100% (8034/8034), 3.74 MiB | 13.53 MiB/s, done.
Resolving deltas: 100% (5171/5171), done.
repo: Updating release signing keys to keyset ver 2.3
```

输出以上信息说明 repo 的 manifest 配置下载成功，接下来只需要同步一下代码即可：

```bash
➜ repo sync
```

代码同步时间会比较长，我们能做的就是耐心等待了。最终下载完成的 AOSP 大小直逼 150 GB：

<img src="/img/in-post/post-android/aosp_download_suc.png" alt="aosp_download_suc" style="zoom: 50%;" />

下一篇文章将会一起探索如何在 Mac 上编译 Android Open Source Project 项目，拭目以待。

## 参考

- [*代号、标记和 build 号  | Android 开源项目  | Android Open Source Project (google.cn)*](https://source.android.google.cn/docs/setup/about/build-numbers?hl=zh-cn#source-code-tags-and-builds)