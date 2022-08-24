---
layout:     post
title: "关于博客更换评论系统的一场厮杀"
visible: false
date: 2022-07-16 20:36:12
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 评论系统
categories:
- other
---

从去年建站 ***dorck.cn*** 开始到现在，我已经陆续更换过三四次评论系统了，以至于最近半年甚至都未开启这个功能，只因为它们太不稳定或者体验太差。有一阵子没更新博客了，重拾起来一段时间之后发现评论功能还是要有的，毕竟要客观了解到他人对于文章内容质量的看法，沟通的平台少不了的，更重要的一点是：以后遇到相关知识点还能应急性地自我评论，补充一二思路。

从最初的 **畅言** 到 **Valine** 再到 **Disqus**，它们都找到了自己的适众，却唯独留不下我。畅言是国人维护的，经常断掉不够稳定；而 valine 需要绑定 LeanCloud，还要填一大堆备案信息等，麻烦至极，并且免费版的额度有限，骨鲠在喉；Disqus 我发现也不稳定，可能是因为国外平台的原因，需要梯子。索性这些我都放弃了，于是我等来了 **Gitalk** 和 **Giscus**，虽然迟了一些，但却是我想要的，因为它们本就离我很近。它们都是基于 Github 这个世界第一开源社区衍生出来的小产品，Gitalk 基于仓库的 issue 系统，而 Giscus 基于 Github 刚推出不久的 Discussion 功能，支持楼中楼回复，从体验上来说，我最终选择了 Giscus。

由于我是基于 Jekyll 来建站的，所以下面就基于 Jekyll 来记录下如何分别配置 Gitalk 和 Giscus 评论系统。

### Gitalk 配置

首先在 `_includes/` 目录下创建 `gitalk_comments.html` 文件，拷贝内容如下：

```html
<div id="gitalk-container"></div>
 <link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">
 <script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
 <script>
 var gitalk = new Gitalk({
     id: location.pathname,
     clientID: "{{ site.clientID }}",
     clientSecret: "{{ site.clientSecret }}",
     repo: "{{ site.repo }}",
     owner: "{{ site.owner }}",
     admin: "{{ site.admin }}", 
     labels: ['Gitalk'],
 })
 gitalk.render('gitalk-container')
 </script>
```

然后在 `_layouts/post.html` 中加入头文件声明并在评论区设置的 Div 中追加如下内容：

```html
<!--//添加GitTalk评论系统-->
 <link rel="stylesheet" href="/css/gittalk.css">
 <script src="/js/gittalk.min.js"></script>

<!-- .... -->

<!-- gitalk -->

    <div class="comment">
        <div id="gitalk-container"></div>
        <link rel="stylesheet" href="https://unpkg.com/gitalk/dist/gitalk.css">
        <script src="https://unpkg.com/gitalk/dist/gitalk.min.js"></script>
        <script>
                var gitalk = new Gitalk({
                    id: location.pathname,
                    clientID: "{{ site.clientID }}",
                    clientSecret: "{{ site.clientSecret }}",
                    repo: "{{ site.repo }}",
                    owner: "{{ site.owner }}",
                    admin: "{{ site.admin }}", 
                    labels: ['Gitalk'],
                })
                gitalk.render('gitalk-container')
        </script>
    </div>
```

最后，只需要在 `_config.yml` 中配置一下 Github repository 等信息即可：

```yaml
# GitTalk comment settings
 gitalk:
 enable: true
 owner: "GitHub repo owner"
 repo: "GitHub repo"
 clientID: "GitHub Application Client ID"
 clientSecret: "GitHub Application Client Secret"
 admin: ["GitHub repo owner and collaborators, only these guys can initialize github issues"]
```

> *Note：clientId 和 clientSecret 需要在 Github 个人设置的 Developer Settings 中 OAuth Apps 处申请。*

### Giscus 配置

Giscus 的优点有很多：

- [开源](https://github.com/giscus/giscus)。🌏
- 无跟踪，无广告，永久免费。📡 🚫
- 无需数据库。全部数据均储存在 GitHub Discussions 中。
- 支持[自定义主题](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md#data-theme)！🌗
- 支持[多种语言](https://github.com/giscus/giscus/blob/main/CONTRIBUTING.md#adding-localizations)。🌐
- [高度可配置](https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md)。🔧
- 自动从 GitHub 拉取新评论与编辑。🔃
- [可自建服务](https://github.com/giscus/giscus/blob/main/SELF-HOSTING.md)！🤳

相对来说，Giscus 的配置更加简单，进入 [Giscus](https://giscus.app) 站点按需勾选后即可生成个人配置，里面也有具体步骤的操作细节，比较详细，这里只提一下代码中如何配置。

第一步，在 `_includes/` 下创建 `giscus_comments.html` 文件，内容如下：

```html
<!-- https://giscus.app/ -->
 <script async src="https://giscus.app/client.js"
 	data-repo="{{ site.giscus.repo }}"
 	data-repo-id="{{ site.giscus.repo_id }}"
 	data-category="{{ site.giscus.category }}"
 	data-category-id="{{ site.giscus.category_id }}"
 	data-mapping="{{ site.giscus.mapping }}"
 	data-reactions-enabled="1"
 	data-emit-metadata="0"
 	data-input-position="{{ site.giscus.input_position }}"
 	data-theme="{{ site.giscus.theme }}"
 	data-lang="{{ site.giscus.lang }}"
     data-loading="lazy"
 	crossorigin="anonymous"
 	async>
 </script> 
```

第二步，在 `_layouts/post.html` 中评论区处加入如下代码即可：

```html
<div class="comment">
      {% include giscus_comments.html %}
</div>
```

最后一步，只需要在 `_config.yml` 中加入 giscus 站点生成的个人 repo 相关配置信息即可：

```yaml
# Giscus comment settings
 giscus:
   repo: "The discussion repository"
   category: "Custom category on github discussion"
   repo_id: "Giscus generated repo id"
   category_id: "Giscus generated category id"
   mapping: 'pathname'
   input_position: 'top'
   theme: 'Giscus generated theme style'
   lang: "en"
```

看官可根据自己喜好选择其一来使用，以后数据完全存储在 Github，可以自行迁移或者删改，自由度不言而喻。

> *Note：本人的 Jekyll 主题是 Hux，魔改较多，相对而言更加小众，如果是普通主题可以他处看看，外面铺子还是很多的。*