---
layout:     post
title: "发布组件到GitHub Packages"
date: 2022-07-26 20:36:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Github
- Github Packages
- Maven publish
categories:
- Gradle
---

使用过 Maven Central 的朋友应该都体会过组件发布流程的繁琐，于是乎心里萌生了一个想法：是否可以将组件发布到 GitHub 仓库呢？果断去 Google 了一下，果不其然，GitHub 提供了 [GitHub Packages](https://docs.github.com/cn/actions/publishing-packages) 可以让作为开发者组件发布的分发仓库。下面来看下如何具体实现本地 Library 发布到 GitHub Packages 以及在项目中下载依赖库。

> *GitHub Packages 是一种软件包托管服务，可让您私下或公开托管软件包，并将软件包用作项目中的依赖项。*

### 申请访问令牌

我们可以在 Settings >> Developer Settings >> [Personal access tokens](https://github.com/settings/tokens/new) 处申请 GitHub 的访问令牌。对于 GitHub Package 而言，可以分配以下三种访问权限：

| 权限   | 访问描述                                                     |
| :----- | :----------------------------------------------------------- |
| 读取   | 可以下载包。  可以读取包元数据。                             |
| 写入   | 可以上传和下载此包。  可以读取和写入包元数据。               |
| 管理员 | 可以上传、下载、删除和管理此包。  可以读取和写入包元数据。  可以授予包权限。 |

对于组件发布而言，首先需要具有发布的权限，即“写”的权限，那么我们可以先申请一个拥有写入权限的令牌：

![generate_github_write_token](/img/in-post/post-android/generate_github_write_token.png)

将生成的 Access Token 保存到本地之后，再申请一个访问依赖组件的权限，即能够从 GitHub Packages 下载所需组件：

![generate_github_read_token](/img/in-post/post-android/generate_github_read_token.png)

### 组件发布到 GitHub Package

实现其实很简单，发布逻辑我封装在一个[自定义插件](https://plugins.gradle.org/plugin/cn.dorck.component.publisher)中了，具体实现可以查看[源码](https://github.com/Moosphan/component-publisher)，这里说一下需要的配置信息。首先，我们需要创建一个用于存储 GitHub Packages 的仓库，例如：`Moosphan/MavenRepo`，接下来只需要在 `local.properties` 中添加配置信息：

```groovy
REPO_USER=<Your_GitHub_Username>
REPO_PASSWORD=<Your_Github_Access_Token>
REPO_RELEASE_URL=https://maven.pkg.github.com/<Your_GitHub_Username>/<Your_GitHub_Repository>
```

主要包含三个信息：

- GitHub 用户名，e.g，`Moosphan`
- GitHub 申请的具有**写权限**的令牌，即 Access Token
- Github Packages 所托管的 Maven 仓库，`https://maven.pkg.github.com/` 是固定的，后面紧跟 GitHub 用户名和刚刚创建的仓库名称就可以了。

接下来，我们只需要在待发布组件中引入以下插件：

```kotlin
plugins {
  id("cn.dorck.component.publisher") version "1.0.2"
}
```

然后增加 DSL 配置如下：

```kotlin
publishOptions {
    group = "com.dorck.android"
    version = "0.1.0"
    artifactId = "sample-library"
}
```

随后执行一下 `./gradlew :<component module name>:publishComponent` 即可发布。

其实，我们也可以在 publishOptions 中来配置仓库信息，如：

```kotlin
publishOptions {
    group = "com.dorck.android"
    version = "0.1.0"
    artifactId = "sample-library"
    userName = "Moosphan"
    password = "Your_Access_Token"
    releaseRepoUrl = "https://maven.pkg.github.com/Moosphan/MavenRepo"
}
```

刚刚之所以在 `local.properties` 中配置是因为如果我们发布组件比较多时，通常它们的 Repository 是同一个，所以，`local.properties` 中可做一些全局配置，省去我们重复的配置，提高效率而已。

对于不希望引入第三方插件的用户来说，其实源码实现也很简单：

```kotlin
afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("mavenPub") {
                group = PluginInfo.group
                artifactId = PluginInfo.artifactId
                version = PluginInfo.version
                from(components["java"])

                pom {
                    //...
                }
            }
        }
        repositories {
            maven {
                url = uri("https://maven.pkg.github.com/Moosphan/MavenRepo")
                credentials {
                        username = "<Your_GitHub_Username>"
                        password = "<Your_Github_Access_Token>"
                    }
            }
        }
    }
}
```

接下里，不出意外的话，我们可以在先前 GitHub 上创建的托管仓库（e.g. `MavenRepo`）Packages 中看到自己发布成功的产物了：

<img src="/img/in-post/post-android/github_packages_repo.png" alt="github_packages_repo" style="zoom:50%;" />

接下来看下如何在项目中依赖使用发布到 GitHub Packages 的组件。

### 依赖 Github Packages 托管的组件

AGP 6.8 开始，我们只需要在 `settings.gradle` 中配置如下仓库源：

```groovy
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.PREFER_SETTINGS)
    repositories {
        google()
        mavenCentral()
        maven { url "https://jitpack.io" }
      	// Add Github packages maven repo
        maven {
            name 'GithubRepo'
            url 'https://maven.pkg.github.com/Moosphan/MavenRepo'
            credentials {
                username '<Your_GitHub_Username>'
                password '<Your_Github_Access_Token>'
            }
        }
        mavenLocal()
    }
}
```

可以看到，所需的信息和上面发布时用到的信息其实大体是一样的，只不过 password 对应的令牌信息是我们具有**读权限**的令牌。最后，只需要在项目中依赖已发布的组件即可，如：

```groovy
implementation 'com.dorck.android:sample-library:0.1.0'
```

接下来，可以看到 `sample-library` 被成功下载和解析，jar/aar 里面的 API 也可成功调用了。
