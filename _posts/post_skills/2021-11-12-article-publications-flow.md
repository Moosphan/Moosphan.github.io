---
layout: post
title: "文章发布流程记录"
date: 2021-11-12 10:52:01
author:     "Dorck"
catalog: false
header-style: text
tags: 

- 杂谈
- 文章发布
categories: skill

---

隔了两个月未更新本地文章到 Github，今天突然想去发布两篇，结果流程命令全然忘记了。为防止以后出现类似情况，这里描述一下文章发布的工作流，仅作记录使用。

# Posts

Blogging is baked into Jekyll. You write blog posts as text files and Jekyll provides everything you need to turn it into a blog.

## The Posts Folder

The `_posts` folder is where your blog posts live. You typically write posts in [Markdown](https://daringfireball.net/projects/markdown/), HTML is also supported.

## Creating Posts

To create a post, add a file to your `_posts` directory with the following format:

```
YEAR-MONTH-DAY-title.MARKUP
```

Where `YEAR` is a four-digit number, `MONTH` and `DAY` are both two-digit numbers, and `MARKUP` is the file extension representing the format used in the file. For example, the following are examples of valid post filenames:

```
2011-12-31-new-years-eve-is-awesome.md
2012-09-12-how-to-write-a-blog.md
```

All blog post files must begin with [front matter](http://jekyllrb.com/docs/front-matter/) which is typically used to set a [layout](http://jekyllrb.com/docs/layouts/) or other meta data. For a simple example this can just be empty:

```
---
layout: post
title:  "Welcome to Jekyll!"
---

# Welcome

**Hello world**, this is my first Jekyll blog post.

I hope you like it!
```

##### ProTip™: Link to other posts

Use the [`post_url`](http://jekyllrb.com/docs/liquid/tags/#linking-to-posts) tag to link to other posts without having to worry about the URLs breaking when the site permalink style changes.

##### Be aware of character sets

Content processors can modify certain characters to make them look nicer. For example, the `smart` extension in Redcarpet converts standard, ASCII quotation characters to curly, Unicode ones. In order for the browser to display those characters properly, define the charset meta value by including `<meta charset="utf-8">` in the `<head>` of your layout.

## Including images and resources

At some point, you’ll want to include images, downloads, or other digital assets along with your text content. One common solution is to create a folder in the root of the project directory called something like `assets`, into which any images, files or other resources are placed. Then, from within any post, they can be linked to using the site’s root as the path for the asset to include. The best way to do this depends on the way your site’s (sub)domain and path are configured, but here are some simple examples in Markdown:

Including an image asset in a post:

```
... which is shown in the screenshot below:
![My helpful screenshot](/assets/screenshot.jpg)
```

Linking to a PDF for readers to download:

```
... you can [get the PDF](/assets/mydoc.pdf) directly.
```

## Displaying an index of posts

Creating an index of posts on another page should be easy thanks to [Liquid](https://docs.shopify.com/themes/liquid/basics) and its tags. Here’s a simple example of how to create a list of links to your blog posts:

```
<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
    </li>
  {% endfor %}
</ul>
```

You have full control over how (and where) you display your posts, and how you structure your site. You should read more about [how templates work](http://jekyllrb.com/docs/templates/) with Jekyll if you want to know more.

Note that the `post` variable only exists inside the `for` loop above. If you wish to access the currently-rendering page/posts’s variables (the variables of the post/page that has the `for` loop in it), use the `page` variable instead.

## Tags and Categories

Jekyll has first class support for *tags* and *categories* in blog posts.

### Tags

Tags for a post are defined in the post’s front matter using either the key `tag` for a single entry or `tags` for multiple entries.
Since Jekyll expects multiple items mapped to the key `tags`, it will automatically *split* a string entry if it contains whitespace. For example, while front matter `tag: classic hollywood` will be processed into a singular entity `"classic hollywood"`, front matter `tags: classic hollywood` will be processed into an array of entries `["classic", "hollywood"]`.

Irrespective of the front matter key chosen, Jekyll stores the metadata mapped to the plural key which is exposed to Liquid templates.

All tags registered in the current site are exposed to Liquid templates via `site.tags`. Iterating over `site.tags` on a page will yield another array with two items, where the first item is the name of the tag and the second item being *an array of posts* with that tag.

```
{% for tag in site.tags %}
  <h3>{{ tag[0] }}</h3>
  <ul>
    {% for post in tag[1] %}
      <li><a href="{{ post.url }}">{{ post.title }}</a></li>
    {% endfor %}
  </ul>
{% endfor %}
```

### Categories

Categories of a post work similar to the tags above:

- They can be defined via the front matter using keys `category` or `categories` (that follow the same logic as for tags)
- All categories registered in the site are exposed to Liquid templates via `site.categories` which can be iterated over (similar to the loop for tags above.)

*The similarity between categories and tags however, ends there.*

Unlike tags, categories for posts can also be defined by a post’s file path. Any directory above `_post` will be read-in as a category. For example, if a post is at path `movies/horror/_posts/2019-05-21-bride-of-chucky.markdown`, then `movies` and `horror` are automatically registered as categories for that post.

When the post also has front matter defining categories, they just get added to the existing list if not present already.

The hallmark difference between categories and tags is that categories of a post may be incorporated into [the generated URL](http://jekyllrb.com/docs/permalinks/#global) for the post, while tags cannot be.

Therefore, depending on whether front matter has `category: classic hollywood`, or `categories: classic hollywood`, the example post above would have the URL as either `movies/horror/classic%20hollywood/2019/05/21/bride-of-chucky.html` or `movies/horror/classic/hollywood/2019/05/21/bride-of-chucky.html` respectively.

## Post excerpts

You can access a snippet of a posts’s content by using `excerpt` variable on a post. By default this is the first paragraph of content in the post, however it can be customized by setting a `excerpt_separator` variable in front matter or `_config.yml`.

```
---
excerpt_separator: <!--more-->
---

Excerpt with multiple paragraphs

Here's another paragraph in the excerpt.
<!--more-->
Out-of-excerpt
```

Here’s an example of outputting a list of blog posts with an excerpt:

```
<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a>
      {{ post.excerpt }}
    </li>
  {% endfor %}
</ul>
```

## Drafts

Drafts are posts without a date in the filename. They’re posts you’re still working on and don’t want to publish yet. To get up and running with drafts, create a `_drafts` folder in your site’s root and create your first draft:

```
.
├── _drafts
│   └── a-draft-post.md
...
```

To preview your site with drafts, run `jekyll serve` or `jekyll build` with the `--drafts` switch. Each will be assigned the value modification time of the draft file for its date, and thus you will see currently edited drafts as the latest posts.

## Post command line

The Jekyll gem makes a `jekyll` executable available to you in your terminal.

The `jekyll` program has several commands but the structure is always:

```
jekyll command [argument] [option] [argument_to_option]

Examples:
    jekyll new site/ --blank
    jekyll serve --config _alternative_config.yml
```

Typically you’ll use `jekyll serve` while developing locally and `jekyll build` when you need to generate the site for production.

For a full list of options and their argument, see [Build Command Options](http://jekyllrb.com/docs/configuration/options/#build-command-options).

Here are some of the most common commands:

- `jekyll new PATH` - Creates a new Jekyll site with default gem-based theme at specified path. The directories will be created as necessary.
- `jekyll new PATH --blank` - Creates a new blank Jekyll site scaffold at specified path.
- `jekyll build` or `jekyll b` - Performs a one off build your site to `./_site` (by default).
- `jekyll serve` or `jekyll s` - Builds your site any time a source file changes and serves it locally.
- `jekyll clean` - Removes all generated files: destination folder, metadata file, Sass and Jekyll caches.
- `jekyll help` - Shows help, optionally for a given subcommand, e.g. `jekyll help build`.
- `jekyll new-theme` - Creates a new Jekyll theme scaffold.
- `jekyll doctor` - Outputs any deprecation or configuration issues.

To change Jekyll’s default build behavior have a look through the [configuration options](http://jekyllrb.com/docs/configuration/).



> *以上内容皆来自 Jekyll 官网，更多内容可前往：http://jekyllrb.com/docs/*
>
> *中文可参考：[Jekyll中的配置和模板语法](https://onblogs.net/_posts/2021/2021-01-05-Jekyll%E4%B8%AD%E7%9A%84%E9%85%8D%E7%BD%AE%E5%92%8C%E6%A8%A1%E6%9D%BF%E8%AF%AD%E6%B3%95/)*