---
layout:     post
title: "记一次Kotlin DSL的糟糕体验"
date: 2022-08-27 09:46:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Gradle
- Kotlin DSL
categories:
- Kotlin
---

昨天在用 Kotlin 写 Gradle 插件的时候遇到个奇怪的问题，折磨良久，最后才发现是 Kotlin Dsl 的坑。我们先来看下这段代码：

```kotlin
 internal fun Project.javaSourceJarTask(packSource: Boolean): TaskProvider<*> =
            if (!packSource) {
                emptySourceJar()
            } else tasks.register("javaSourceJarFor${name.formatCapitalize()}", SourceJarTask::class.java) {
                dependsOn(JavaPlugin.CLASSES_TASK_NAME)
                val sourceSets = the<SourceSetContainer>()
                from(sourceSets["main"].allSource)
            }
```

上面这段代码很简单，只是配置了一个输出组件 *artifact* 源码的 task。这里着重关注下 `the<T>()` 方法，它是 kotlin-dsl 插件扩展包中提供的用于获取 `Project#Convention` 的扩展方法，此处是为了拿到 SourceSetContainer 实例。结果在插件测试的时候发现执行组件发布任务报错了：

```bash
FAILURE: Build failed with an exception.

* What went wrong:
Could not determine the dependencies of task ':java-library-sample:publishMavenPublicationToMavenRepository'.
> Could not create task ':java-library-sample:javaSourceJarForJava-library-sample'.
   > Extension of type 'SourceSetContainer' does not exist. Currently registered extension types: [ExtraPropertiesExtension]
```

原本天真的以为 SourceSetContainer 是绝对存在的，`the()` 扩展方法肯定可以获取到 SourceSetContainer。经过一番排查发现，问题还是出在 `the()` 这个扩展方法上，查看一下它是如何实现的：

<img src="/img/in-post/post-android/the_extension_aware_impl.png" alt="the_extension_aware_impl" style="zoom:80%;" />

WTF？竟然莫名其妙用的是 `ExtensionAware` 的同名扩展方法，而我记忆中的扩展方法实现应该是 Project 的扩展方法呀：

<img src="/img/in-post/post-android/the_project_impl.png" alt="the_project_impl" style="zoom:80%;" />

如此一来，心里不惊一个警惕，虽然 Kotlin 丰富了 DSL 生态，如果在 DSL 中嵌套，很可能会出现类似上面的问题，导致最终调用的并不是预期方法。如果不去查看源码，很难联想到是 DSL 的问题 = =.

你以为解决了这一个问题就一劳永逸了吗？答案是否定的，如果要将 Kotlin DSL 作为日常开发主力工具，需要一直警惕这种问题，比如，今天我又遇到一次😓：

```kotlin
plugins {
    `kotlin-dsl`
    `maven-publish`
}
ext["ossrh.username"] = "Your_USERNAME"
ext["ossrh.password"] = "YOUR_PASSWORD"
//....
publishing {
    // Configure MavenCentral repository
    repositories {
        maven {
            name = "sonatype"
            setUrl("https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/")
            credentials {
                username = ext["ossrh.username"]
                password = ext["ossrh.password"]
            }
        }
    }
}
```

看起来应该没什么问题对吧，没想到 Gradle Sync 的时候发现问题了：

<img src="/img/in-post/post-android/kotlin-dsl-conflict.png" alt="kotlin-dsl-conflict" style="zoom:50%;" />

提示找不到 "ossrh.username" 额外属性，是不是很离谱呢？最终我发现这里拿到的的 **ext** 扩展属性其实是 `PublishingExtension` 的：

<img src="/img/in-post/post-android/ext_publishing_impl.png" alt="ext_publishing_impl" style="zoom:50%;" />

如此一来，肯定获取不到 “ossrh.username” 属性了，真正的 ext 实现应该在 Project 下：

<img src="/img/in-post/post-android/ext_project_impl.png" alt="ext_project_impl" style="zoom:50%;" />

解决方法也很简单，只要指定 ext 宿主是 Project 作用域就可以了：

```kotlin
//...
publishing {
    // Configure MavenCentral repository
    repositories {
        maven {
            name = "sonatype"
            setUrl("https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/")
            credentials {
                username = project.ext["ossrh.username"]
                password = project.ext["ossrh.password"]
            }
        }
    }
}
```

经此一事，才发现 DSL 也并不是完美的，它在提高开发效率的同时，也会增加额外的学习成本，除非对引入的插件很熟悉，否则很难清除它增加了哪些 DSL 配置。一旦遇到复杂的情况，插件之间相互使用或者 DSL 嵌套，具体如何使用，就只能两眼一抹黑了。就像前面的 `kotlin-dsl` 和 `maven-publish` 之间有作用域冲突问题，要不是去查源码，是很难排查问题的，真不得不说“乱花渐欲迷人眼”啊🤔。