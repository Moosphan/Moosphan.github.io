---
layout: post
title: "GitHub Actions实践之自动发布组件"
date: 2022-09-06 09:30:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Maven Publishing
- Maven Central
- Android
- Gradle
categories: skill
---

在[关于发布Gradle插件到Maven开放仓库的碎碎念](https://dorck.cn/gradle/2022/08/28/how-to-publish-gradle-plugin/)一文中简单介绍了如何发布一款 Gradle 插件到 Maven Central。虽说最终发布只需要本地执行 `./gradlew publishPlugins` 命令即可快速发布完成，但每次发布都需要区分本地和远程仓库的环境差异，然后手动配置。举个最简单的例子：我不希望本地敏感信息上传到远程仓库中，所以，每次执行完发布操作还需要手动擦除敏感信息，还是比较麻烦的。另外，有没有一种方式可以完全解放双手，甚至不需要执行上述命令然后等待其漫长地发布过程呢？自然是存在的，就是本文要介绍的 GitHub Actions。

### 概述

谈及 [GitHub Actions](https://docs.github.com/cn/actions/learn-github-actions)，很多人应该都不陌生，它是 GitHub 提供的一套 CI/CD 平台，为广大开源贡献者提供持续集成、测试和交付部署的能力。在这里，我们希望它能够实现自动帮我们发布插件，通过类似 push / PR /TAG 等事件来触发其运转。此外，当切换到本地工作环境后，同样能够通过执行 gradle 命令来手动发布，无需额外配置。

### 修改本地 Gradle 配置

首先，我们发布插件过程涉及到若干隐私信息，如远程仓库用户名、密码、加密key和secret等，如果是本地发布，我们一般将隐私信息存放在 `local.properties` 以保证不会误提交到远程代码仓库中；如果是远程环境，借助于 [GitHub Actions env variables](https://docs.github.com/cn/actions/learn-github-actions/environment-variables)，我们可以从当前的系统环境中读取暂存的隐私信息，并用作发布使用。所以，我们将 Plugin 模块的 `build.gradle.kts` 修改如下：

```kotlin
import com.android.build.gradle.internal.cxx.configure.gradleLocalProperties

plugins {
    `java-gradle-plugin`
    `kotlin-dsl`
    `maven-publish`
    id("com.gradle.plugin-publish") version "1.0.0-rc-1"
}

// Load and configure secrets of publication.
ext["signing.keyId"] = null
ext["signing.password"] = null
ext["signing.secretKeyRingFile"] = null
ext["gradle.publish.key"] = null
ext["gradle.publish.secret"] = null
ext["ossrh.username"] = null
ext["ossrh.password"] = null

// We can get secrets from local.properties or system env.
val localPropsFile = project.rootProject.file(com.android.SdkConstants.FN_LOCAL_PROPERTIES)
if (localPropsFile.exists()) {
    val properties = gradleLocalProperties(rootDir)
    if (properties.isNotEmpty()) {
        properties.onEach { (key, value) ->
            ext[key.toString()] = value
        }
    }
} else {
    ext["signing.keyId"] = System.getenv("GPG_KEY_ID")
    ext["signing.password"] = System.getenv("GPG_PASSWORD")
    ext["signing.secretKeyRingFile"] = System.getenv("GPG_SECRET_KEY_RING_FILE")
    ext["gradle.publish.key"] = System.getenv("GRADLE_PUBLISH_KEY")
    ext["gradle.publish.secret"] = System.getenv("GRADLE_PUBLISH_SECRET")
    ext["ossrh.username"] = System.getenv("OSSRH_USERNAME")
    ext["ossrh.password"] = System.getenv("OSSRH_PASSWORD")
}

java {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
    withJavadocJar()
    withSourcesJar()
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
            // Note: We need to make here id as same as module name, or
            // it will publish two different plugins.
            id = PluginInfo.id
            implementationClass = PluginInfo.implementationClass
            displayName = PluginInfo.displayName
            description = PluginInfo.description
        }
    }
}

dependencies {
    //...
}

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
                val repoUrl = if (version.toString().endsWith("SNAPSHOT")) {
                    "https://s01.oss.sonatype.org/content/repositories/snapshots/"
                } else {
                    "https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/"
                }
                url = uri(repoUrl)
              	credentials {
                        username = this@afterEvaluate.ext["ossrh.username"].toString()
                        password = this@afterEvaluate.ext["ossrh.password"].toString()
                    }
            }
        }
    }
}
```

可以看到，我们首先判断当前项目工作空间是否存在 `local.properties` 文件，如果存在则优先从中读取发布的账户和密钥信息，如果不存在该文件，一般是在远程工作空间内（Android项目的 `.gitignore` 文件会自动录入 `local.properties` 文件，不将其列入 git 管辖范围），如此一来，我们只要从环境变量中读取上述信息即可。但前提是我们在仓库的 Settings >> Secrets >> Actions 处录入密钥等信息：

<img src="/img/in-post/post-tools/github-actions-env-config.png" alt="github-actions-env-config" style="zoom:50%;" />

### 发布 Action 脚本实现

其实，远程自动发布也无非是克隆一份与本地类似的工作环境而已，然后从 GitHub Environment variables 中读取发布所需账户和密钥信息，最终同样执行发布命令即可。相对来说比较简单，更多的还是参照 GitHub Actions 官方提供的文档，这里直接附上脚本代码：

> *.github/workflows/publisher.yml*

```yaml
# A workflow service to setup and publish my plugin.
name: Plugin Publisher
on:
  push:
    tags:
      - '*'
  # Allows you to run this workflow manually from the Actions tab.
  workflow_dispatch:
  # Custom webhook event provided to trigger action execution by network request.
  repository_dispatch:
    types: [publish]
jobs:
  publish:
    name: Publication Job
    runs-on: ubuntu-latest
    if: github.repository == 'Moosphan/component-publisher'
    env:
      GPG_SECRET_KEY_RING_FILE: ${{ github.workspace }}/secring.gpg
    steps:
      # Checkout to source code repo.
      - name: Checkout
        uses: actions/checkout@v2
      # Set up java env with specific version and distribution.
      - name: Set up JDK-8
        uses: actions/setup-java@v2
        with:
          distribution: 'zulu'
          java-version: '11'
      # Prepare signing for publication.
      - name: Set up signing
        run: |
          echo "Generate GPG private key file in $GPG_SECRET_KEY_RING_FILE"
          echo $GPG_SECRET_KEY_RING_FILE_CONTENT | base64 --decode > $GPG_SECRET_KEY_RING_FILE
          echo "GPG private key created succeed."
      # Publish plugin into Portal.
      - name: Plugin publication
        env:
          GPG_KEY_ID: ${{ secrets.GPG_KEY_ID }}
          GPG_PASSWORD: ${{ secrets.GPG_PASSWORD }}
          GRADLE_PUBLISH_KEY: ${{ secrets.GRADLE_PUBLISH_KEY }}
          GRADLE_PUBLISH_SECRET: ${{ secrets.GRADLE_PUBLISH_SECRET }}
          OSSRH_USERNAME: ${{ secrets.OSSRH_USERNAME }}
          OSSRH_PASSWORD: ${{ secrets.OSSRH_PASSWORD }}
        run: |
          echo "Start publish plugin on Maven Plugin Portal."
          echo "Load secret gpg file: ${{ env.GPG_SECRET_KEY_RING_FILE }}"
          echo "The release version is: ${GITHUB_REF_NAME}"
          ./gradlew clean :publish-plugin:publishPlugins -S --no-daemon

```

这里我是通过本地 push tags 的时候触发 GitHub 上的插件发布任务，每次 push 代码到远程分支之后，执行 `git tag v1.0.x & git push origin v1.0.x` 即可触发脚本的执行了，执行完成就可看到以下成功状态：

<img src="/img/in-post/post-tools/github-actions-succeed.png" alt="github-actions-succeed" style="zoom:50%;" />

### 相关参考

- *<https://docs.github.com/cn/actions>*
- *<https://2bab.me/2021/05/09/trap-of-maven-central-publish>*
- [*GitHub Actions security guides*](https://docs.github.com/cn/actions/security-guides/encrypted-secrets#storing-large-secrets)
