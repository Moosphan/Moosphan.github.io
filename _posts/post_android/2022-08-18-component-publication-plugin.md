---
layout: post
title: "Gradle手札之组件发布迅疾如风"
date: 2022-08-20 10:10:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Android Library
- Gradle Plugin
- Maven
- GitHub
categories: 
- Gradle
---

大浪淘沙，随着 jcenter 的落幕，组件发布逐渐转向了 maven central 仓库。各种平台层出不穷，不论组件存储在何处，作为开发更加关注的是组件发布的效率，这也正是本文接下来想要阐述的主题。

### 发布Android组件

Android Gradle 早早地就更新换代到了 `maven-publish` 插件。一般情况下，我们发布一个普通的 Android 组件通常需要添加如下代码：

```groovy
plugins {
  id 'com.android.library'
  id 'org.jetbrains.kotlin.android'
	id 'maven-publish'
}

task androidSourcesJar(type: Jar) {
	archiveClassifier.set('sources')
	from android.sourceSets.main.java.srcDirs
}

// Because the components are created only during the afterEvaluate phase, you must
// configure your publications using the afterEvaluate() lifecycle method.
afterEvaluate {
    publishing {
        publications {
            // Creates a Maven publication called "release".
            register<MavenPublication>("release") {
                // Applies the component for the release build variant.
                from(components["release"])

                artifact(androidSourcesJar)

                groupId = 'com.example'
                artifactId = 'custom-library'
                version = '1.0'

                pom {
                    //...
                }
                repositories {
                    maven {
                        url = version.endsWith('SNAPSHOT') 
                      ? snapshotsRepoUrl : releasesRepoUrl
                        val properties = gradleLocalProperties(rootDir)
                        credentials {
                            username = properties.getProperty("OSSRH_USERNAME")
                            password = properties.getProperty("OSSRH_PASSWORD")
                        }
                    }
                }
            }
        }
    }
}

```

需要注意的是，Android libary 发布比较特殊，需要根据当前的 variant 来生成 sources jar 和 javadoc jar，然后再打包成 aar 产物，这里我们仅考虑 release variant 的情况。最后，我们默认只需要执行 `./gradlew publishReleasePublicationToMavenRepository` 即可成功发布组件。

此外，AGP 7.1 引入了新的 DSL，以控制在发布期间使用哪些 build 变体以及忽略哪些 build 变体。借助 DSL，我们可以更加方便地发布具有一个或多个 variant 内容变体的 SoftwareComponent。

```kotlin
// 单个内容变体
android {
  publishing {
    singleVariant("release") {
        withSourcesJar()
    }
  }
}
// 多个内容变体
android {
  publishing {
    multipleVariants {
      allVariants()
      withJavadocs()
    }
  }
}
```

### 发布 Java/Kotlin 组件

相较于 Android Library，发布 Java 和 Kotlin Library 更加简单些，基本步骤还是差不多的：

1. 为生成源码和文档 JAR 创建对应的 Task，用于最终集成进发布产物当中
2. 创建 `MavenPublication` 对象并声明产物发布的仓库信息（repositories）
3. 提供发布所需的软件组件声明（SoftwareComponent）
4. 为发布内容提供签名（可选）

方便理解，直接看以下示例：

```kotlin
val sourceSets = the<SourceSetContainer>()
  val javadocJar = tasks.register("javadocJar", Jar::class.java) {
    archiveClassifier.set("javadoc")
    val task = tasks.named(JavaPlugin.JAVADOC_TASK_NAME)
    dependsOn(task)
    from(task)
  }
  val sourcesJar = tasks.register("sourcesJar", Jar::class.java) {
    dependsOn(JavaPlugin.CLASSES_TASK_NAME)
    archiveClassifier.set("sources")
    from(sourceSets["main"].allSource)
  }

  publishing {
    repositories {
      maven {
        url = if (version.endsWith('SNAPSHOT')) snapshotsRepoUrl else releasesRepoUrl
      }
    }
    publications {
      register("maven", MavenPublication::class) {
        groupId = "com.sample"
        artifactId = project.name
        version = "1.0.0-alpha"

        from(components["java"])

        artifact(sourcesJar.get())
        artifact(javadocJar.get())

        pom {
              name.set(PluginInfo.artifactId)
              description.set(PluginInfo.description)
              url.set(PluginInfo.url)

              scm {
                   connection.set(PluginInfo.scmConnection)
                   developerConnection.set(PluginInfo.scmConnection)
                   url.set(PluginInfo.url)
              }

              licenses {
                  license {
                      name.set("The Apache Software License, Version 2.0")
                      url.set("http://www.apache.org/licenses/LICENSE-2.0.txt")
                      distribution.set("repo")
                  }
              }

              developers {
                  developer {
                      name.set(PluginInfo.developer)
                      email.set(PluginInfo.email)
                  }
              }
        }
      }
    }
  }

  signing {
    sign(publishing.publications)
  }
```

### 插件封装

组件数量较少时，我们上述方式发布也无可厚非。但问题来了，一旦随着我们团队的组件数量持续攀升，每次发布组件都需要关注如此繁杂的配置，这显然会增加出错几率、降低我们的研发效率。因此，我将上述功能封装成一个 [**Gradle 插件**](https://github.com/Moosphan/component-publisher) 供其他待发布组件使用，对外屏蔽复杂且重复的发布配置，同时也支持更多组件类型（e.g. Gradle Library）。只需要简单的三步即可帮你完成一切：

##### 1.引入插件

对于 AGP 6.8 之前的项目，可以通过以下方式配置：

> *项目根目录 build.gradle:*

```groovy
buildscript {
  repositories {
    maven {
      url "https://plugins.gradle.org/m2/"
    }
  }
  dependencies {
    classpath "cn.dorck:publish-plugin:1.0.0"
  }
}

apply plugin: "cn.dorck.component.publisher"
```

AGP 6.8 及之后项目，可以替换成下面新的方式引入插件：

> *待发布项目 build.gradle:*

```groovy
plugins {
  id "cn.dorck.component.publisher" version "1.0.0"
}
```

##### 2. 配置发布选项

我们只需要在待发布组件的 `build.gradle` 中增加如下 dsl 即可：

```kotlin
publishOptions {
    group = "com.dorck.android"
    version = "0.1.0-LOCAL"
    artifactId = "sample-library"
}
```

如上所示，倘若我们希望发布一个组件到 mavenLocal，只需如此简单配置即可，本地发布的组件默认存储在 `/Users/<username>/.m2/repository` 目录下。

更多可配置选项参考：[*[component-publisher](https://github.com/Moosphan/component-publisher)*](https://github.com/Moosphan/component-publisher/blob/main/README.md)

##### 3. 发布组件

配置完发布属性后，我们只需要在终端执行如下命令即可开始发布：

```
$ ./gradlew :<component module name>:publishComponent
```

接下来，如果我们在终端看到如下发布结果日志即代表发布成功：

<img src="/img/in-post/post-android/component_output.png" alt="component_output" style="zoom:50%;" />

从输出的信息来看，组件发布成功后，此插件已经帮我们组装完成了最终的依赖链接，直接复制到项目中同步下即可。

##### 全局配置

通常，我们的存储库 url 和凭证信息对于不同的组件来说一般是相同的。 为防止重复配置，此处支持配置全局默认发布选项。 您可以像这样将全局发布选项放在根项目的 `local.properties` 中：

```properties
REPO_USER=Moosphan
REPO_PASSWORD=*****
REPO_RELEASE_URL=https://maven.xx.xx/repository/releases/
REPO_SNAPSHOT_URL=https://maven.xx.xx/repository/snapshots/
```

如此一来，插件会优先读取待发布组件的 `publishOptions` 中的配置，如果未设置，则会获取项目本地根目录下 `local.properties` 中的配置。

> *开源仓库地址：[component-publisher](https://github.com/Moosphan/component-publisher)*

### 参考

- [*Publish Android library*](https://developer.android.google.cn/studio/build/maven-publish-plugin)
- [*Gradle maven publish plugin*](https://docs.gradle.org/current/userguide/publishing_maven.html)
- [*Publishing setup*](https://docs.gradle.org/current/userguide/publishing_setup.html)
- [*Gradle Plugin publishing*](https://plugins.gradle.org/docs/publish-plugin)