---
layout: post
title: "关于发布Gradle插件到Maven开放仓库的碎碎念"
date: 2022-08-28 08:23:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Gradle Plugin
- Maven Publishing
- Maven Plugin Portal
- Maven Central
- Android
categories: 
- Gradle
---

早几年前发布过几个开源库到 Jcenter 上，有一段时间没关注 GitHub 也就逐渐淡忘了。最近几天刚好想起此事，也就打算迁移一下历史组件，顺便将前阵子搞的一个 Gradle 插件也发布一下，于是便有了这篇文章。以下仅记录发布涉及的主要步骤以及遇到的一些坑，前车之鉴，后车之师而已矣。

### Library 发布 到 Maven Central

熟悉开源库发布的朋友应该都体验过 Maven Central 发布的繁琐&严格，对于第一次发布的开发者而言肯定费时费力。一方面，对于国内而言这块教程文章相对来说比较少，但是很多都是“年久失修”，按照文中一步步操作很难一帆风顺；另一方面，官方文档虽然介绍详细，但对于部分细枝末节仍未覆盖完全，目前来看，对于组件发布的教程仍停留在 `maven` 插件而不是 `maven-publish`。所以，建议大家可以尝试参考下外文的教程，相对来说更新较为及时。另外，即使是本篇文章也不能保证在你看到之后还能与官方最新的 changelog 保持同步。

步入正题，总的来说，一般我们通过 Sonatype 来发布组件并同步到 Maven Central，主要步骤如下：

- Sonatype 平台[账号注册](https://issues.sonatype.org/secure/Signup!default.jspa)
- 创建申请新建项目的 JIRA 工单
- 验证 **`groupId`** 的有效性并回复工单待人工审核
- 下载 GPG 管理工具并生成密钥
- **配置 Library 待发布项目，满足发布[要求](https://central.sonatype.org/publish/requirements/)**

上面前三步可以参考 [*Publishing libraries to Maven Central*](https://getstream.io/blog/publishing-libraries-to-mavencentral-2021/) 这篇文章进行实操，中文教程可参考 [*Android库发布到Maven central全攻略*](https://juejin.cn/post/6932485276124233735)，流程相对比较简单，不做赘述。这里需要提一下：上面的 groupId 是和你自己绑定的，理论上来说你可以拥有多个 groupId，但需要证明你拥有对应域名或者 Github 仓库的权限。以域名为例，假如我的域名是 `dorck.cn`，那么 groupId 就是 `cn.dorck`，我们需要根据 JIRA 工单中提供的 Code 到域名解析管理处新增 DNS 解析记录，如下所示：

<img src="/img/in-post/post-android/domain_dns_verify.png" alt="domain_dns_verify" style="zoom:50%;" />

然后，我们在终端输入如下命令验证是否成功：

```bash
$ host -t txt dorck.cn
dorck.cn descriptive text "OSSRH-xxx"
```

显示如上内容即代表验证通过，只需要在 JIRA 工单备注中说明一下就可以静待工作人员审核通过了（一般一天左右）。

> *Note：上面列出的五步法诀中前四步是一次性配置，而第五步则是每次发布组件都需要配置一次。*

##### 关于生成 GPG 密钥

生成 GPG 密钥前，需要先去下载 [GPG Suite](https://gpgtools.org)（Mac）或者 [Gpg4Win](https://www.gpg4win.org/download.html)（Windows），安装后在终端输入 `gpg --version` 验证下是否安装成功。接下来，在终端键入 `gpg --full-gen-key` 来生成密钥，只需要根据提示来一步步选择并最终设置密码即可。通过 `gpg --list-keys` 可以看到我们生成密钥信息：

```bash
$ gpg --list-keys
/Users/xx/.gnupg/pubring.kbx
-------------------------------
pub   rsa4096 2022-08-18 [SC]
      xxxxxB1xxxxFFDCxxxx4FDExxxEIVNExxxABCDEFGH
uid             [ 绝对 ] Dorck (none) <xxx@gmail.com>
sub   rsa4096 2022-08-18 [E]
```

需要留意 40 位密钥的后 8 位 `ABCDEFGH`，这是我们的 key ID，后续流程中需要用到。再尔只需要将公钥发布即可：

```bash
$ gpg --keyserver keyserver.ubuntu.com --send-keys ABCDEFGH
```

有的教程基本介绍到这里就完成了，其实还有很重要的一步，那就是生成 GPG 私钥文件，因为后续发布的时候需要指定这个密钥地址（我怀疑是老版本 GPG 在生成密钥对时会为我们自动导出私钥文件，然而现在并不会自动生成了）。其实很简单，只需要键入如下命令即可：

```bash
$ cd ~/.gnupg
$ gpg --export-secret-keys -o secring.gpg
```

如此一来我们就能在 `.gnupg` 目录下找到 `secring.gpg` 文件了。

##### 配置组件发布

组件发布相关配置就比较简单了，MavenPublication 的相关配置就不提及了，这里仅提一下发布到 Maven Central 的一些特殊配置：

> *xxModule/build.gradle:*

```kotlin
import com.android.build.gradle.internal.cxx.configure.gradleLocalProperties
plugins {
    `java-gradle-plugin`
    `maven-publish`
    signing
}

group = "cn.dorck"
version = "1.0.0"

afterEvaluate {
    publishing {
        publications {
            create<MavenPublication>("mavenPub") {
                //...

                pom {
                    //...
                }
            }
        }
        repositories {
            maven {
                val repoUrl = if (version.toString().endsWith("SNAPSHOT")) {
                    "https://s01.oss.sonatype.org/content/repositories/snapshots/"
                } else if (version.toString().endsWith("LOCAL")) {
                    layout.buildDirectory.dir("repos/locals").get().asFile.path
                } else {
                    "https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/"
                }
                url = uri(repoUrl)
                val properties = gradleLocalProperties(rootDir)
                credentials {
                    username = properties.getProperty("OSSRH_USERNAME")
                    password = properties.getProperty("OSSRH_PASSWORD")
                }
            }
        }
    }
}
```

从上面代码可以看到，首先我们需要引入 `signing` 签名插件，声明 `group` 和 `version` 两个 Property ，分别代表发布组件制品的**组名**和**版本号**，需要注意的是，这里的 group 需要与在 sonatype 的 JIRA 中所申请组名保持一致。接着，发布仓库信息中配置待发布仓库地址和证书信息，分别来自 JIRA 工单中分配的地址和sonatype的账号&密码。如下所示：

<img src="/img/in-post/post-android/sonatype_jira_result.png" alt="sonatype_jira_result" style="zoom:50%;" />

然后，需要对所有待发布组件制品进行签名：

```kotlin
signing {
    sign(publishing.publications)
}
```

并在项目根目录下的 `gradle.properties` 中添加签名密钥信息：

```groovy
signing.keyId=ABCDEFGH
signing.password=pwd1234
signing.secretKeyRingFile=C:/Users/John.Doe/AppData/Roaming/gnupg/secring.gpg
```

`keyId` 即为上面让你保存的信息，`secretKeyRingFile` 指定上面我们导出生成的 `secring.gpg` 路径即可。

接着，只要分别执行以下两个命令即可发布组件：

```bash
$ ./gradlew :<ready_published_library_module>:sign
$ ./gradlew :<ready_published_library_module>:publishMavenPubPublicationToMavenRepository
```

发布成功后可以前往登录 <https://oss.sonatype.org> 去查看发布状态，在 `Staging Repositories` 一栏找到你发布的组件，确认无误后点击 **Close** 按钮，稍等片刻可以看到如下状态即代表关闭成功。

<img src="/img/in-post/post-android/sonatype_artifacts_repo_page.png" alt="sonatype_artifacts_repo_page" style="zoom:50%;" />

最后，点击 **Release** 按钮来正式发布组件即可，成功后等待大概小半天时间就应该审核成功了。之后，你就可以在 [Maven Searcher](https://search.maven.org) 这里根据 *groupId+artifactId* 搜索到你的组件了：

<img src="/img/in-post/post-android/maven_central_repo_search.png" alt="maven_central_repo_search" style="zoom:50%;" />

> *Note：Gradle Plugin 是 Gradle 项目，属于 Library 类型的一种，常见的还有 java-library、kotlin-library、android-library 等，更多类型可参考：[Gradle 官方文档介绍](https://docs.gradle.org/current/userguide/build_init_plugin.html#supported_gradle_build_types)*。

### Plugin 发布到 Maven Plugin Portal

如果是发布普通的 Library 组件（e.g. Android-library、kotlin-library、java-library）发布到 Maven Central 即可万事大吉了。虽然 Gradle plugin 发布到 Maven Central 同样能用，但对于我个人的使用体验来说还是远远不够。升级到 AGP 6.8 后，我们需要这么使用自定义插件：

> *settings.gradle:*

```groovy
pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
        mavenLocal()
    }
   // Resolution strategy for plugins without Plugin Marker Artifact
    resolutionStrategy {
        eachPlugin {
            if (requested.id.id == 'component-publisher') {
                useModule("com.dorck.android.plugin:component-publisher:1.0.0")
            }
        }
    }
}
```

最后在组件的 `build.gradle` 中引用插件：

```groovy
plugins {
  id "component-publisher" version "1.0.0"
}
```

如此一来升级 AGP 后反而使用自定义插件更加麻烦了。按照官方的[说法](https://docs.gradle.org/current/userguide/custom_plugins.html#note_for_plugins_published_without_java_gradle_plugin)，如果我们的自定义 Gradle 插件时没有引入 `java-gradle-plugin` 来进行发布，那么我们只能通过上面那种方式在 *`pluginManagement`* -> *`resolutionStrategy`* -> *`eachPlugin {}`* 中去根据 *plugin-id* 匹配解析到对应的插件。

> *If your plugin was published without using the [Java Gradle Plugin Development Plugin](https://docs.gradle.org/current/userguide/java_gradle_plugin.html#java_gradle_plugin), the publication will be lacking [Plugin Marker Artifact](https://docs.gradle.org/current/userguide/plugins.html#sec:plugin_markers), which is needed for [plugins DSL](https://docs.gradle.org/current/userguide/plugins.html#sec:plugins_block) to locate the plugin. In this case, the recommended way to resolve the plugin in another project is to add a `resolutionStrategy` section to the `pluginManagement {}` block of the project’s settings file as shown below.*

实际上，Gradle 官方提供了 [Gradle Plugin Portal](https://plugins.gradle.org)，有点类似 Flutter 的 [pub.dev](https://pub.dev) 插件平台。开发者可以通过 `com.gradle.plugin-publish` 插件来将自定义插件发布到 Plugin Portal 平台，不仅能够提高曝光度，还可以让我们像下面这样通过 plugin-id 间接引用插件：

```groovy
plugins {
  id "cn.dorck.component.publisher" version "1.0.0"
}
```

至于具体的如何发布插件到 Gradle Plugin Portal 可参考完整的官方文档，其实流程上与发布组件到 Maven Central 大差不差：[*Publishing custom plugin to Gradle Plugin Portal*](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)

以下配置仅供参考：

> *Plugin module >> build.gradle:*

```kotlin
plugins {
    `java-gradle-plugin`
    `kotlin-dsl`
    `maven-publish`
    id("com.gradle.plugin-publish") version "1.0.0-rc-1"
}

group = PluginInfo.group
version = PluginInfo.version

pluginBundle {
    website = "https://github.com/Moosphan/component-publisher"
    vcsUrl = "https://github.com/Moosphan/component-publisher.git"
    tags = listOf("component publication", "publish library", "maven-publish", "android-library", "kotlin-library")
}

gradlePlugin {
    plugins {
        create(PluginInfo.name) {
            id = PluginInfo.id
            implementationClass = PluginInfo.implementationClass
            displayName = PluginInfo.displayName
            description = PluginInfo.description
        }
    }
}
```

> *rootProject >> gradle.properties:*

```groovy
# Used for publishing onto Gradle plugin portal.
gradle.publish.key=xxxxxxx
gradle.publish.secret=xxxxxxx
```

这边的 key 和 secret 可以从你在 [Gradle Plugin Portal](https://plugins.gradle.org) 注册的个人主页获取。最后终端键入 `./gradlew publishPlugins` 即可开启发布任务，发布成功后会显示如下信息：

<img src="/img/in-post/post-android/plugin_publish_to_portal_succeed.png" alt="plugin_publish_to_portal_succeed" style="zoom:50%;" />

发布之后会有几天的审核时间，最终结果会通过邮箱发送。另外，一般邮件会先通知我们验证下个人域名或者 Github 的仓库拥有者权限，这步操作流程其实和上面发布到 Maven Central 流程如出一辙，不再赘述了。待人工审核成功后，我们就可以根据 **Plugin Id** 在 https://plugins.gradle.org 搜索到自己的插件了。

### 相关参考

- [*Requirement of publications*](https://central.sonatype.org/publish/requirements/)
- [*Publishing libraries to Maven Central*](https://getstream.io/blog/publishing-libraries-to-mavencentral-2021/)
- [*User guide to publish gradle plugins*](https://docs.gradle.org/current/userguide/publishing_gradle_plugins.html)