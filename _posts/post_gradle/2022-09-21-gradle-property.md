---
layout:     post
title: "Gradle手札之Properties配置"
date: 2022-09-21 18:01:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Project Properties
- System Properties
- Build Environment
categories:
- Gradle
---

Gradle 很多构建属性可以通过 Properties 来设置。**Properties** 文件格式可由 `java.util.Properties` 解析，其中包含若干键值对，类似 `Map<String,String>` 格式数据来存储。

### 配置构建环境

根据[官方](https://docs.gradle.org/current/userguide/build_environment.html)介绍，Gradle 提供了多种方式和机制来配置 Gradle 自身或者特定项目的行为。常见的有以下几种方式，优先级分别**从高到低**排列：

- 命令行参数 flags：例如，我们希望在执行构建任务时开启构建缓存，只需要加上 `--build-cache` flag 参数即可（该配置要优先于 Properties 和环境变量生效，e.g, 我们在 `gradle.properties` 中配置的 `org.gradle.caching=false` 将会被此处的 flag 覆盖生效）。
- 系统属性：例如，存储在 `gradle.properties` 文件中的 `systemProp.http.proxyHost=somehost.org` 属性。
- Gradle 属性：例如，`org.gradle.caching=true` 通常存储在项目根目录的 `gradle.properties` 文件或用户 `GRADLE_USER_HOME` 下的环境变量中。
- 环境变量：例如由执行 Gradle 的环境提供的 `GRADLE_OPTS`。
- 项目属性：例如我们可以使用项目属性（如 `-PbuildType=release` 来配置指定项目的构建过程。

下面来一一介绍它们的用法和使用场景。

### Gradle properties

Gradle 提供了一些相关选项用于配置执行构建任务的 Java 进程。当然，我们也可以在本地环境中通过 `GRADLE_OPTS` 或者 `JAVA_OPTS` 来配置这些选项，但显然在版本控制中存储一些诸如 JVM 内存大小和 JDK 存储位置等配置对于整个团队来说会很有帮助。为此，我们可以将这些配置放入能够接受版本控制工具管辖的 `gradle.properties` 文件中。比如下面这样：

> *gradle.properties:*

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
# When configured, Gradle will run in incubating parallel mode.
# This option should only be used with decoupled projects. More details, visit
# http://www.gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects
# org.gradle.parallel=true
# AndroidX package structure to make it clearer which packages are bundled with the
# Android operating system, and which are packaged with your app"s APK
# https://developer.android.com/topic/libraries/support-library/androidx-rn
android.useAndroidX=true
# Kotlin code style for this project: "official" or "obsolete":
kotlin.code.style=official
# Enables namespacing of each library's R class so that its R class includes only the
# resources declared in the library itself and none from the library's dependencies,
# thereby reducing the size of the R class for that library
android.nonTransitiveRClass=true
```

Gradle 同时支持在命令行和 `gradle.properties` 文件中来配置以上选项，一般来说，命令行上设置的属性优先级总是最高的，而 `gradle.properties` 文件因其存放位置有所差异导致其优先级也略有不同。以下是按照优先级**从高到低**排列的：

- 通过命令行设置环境选项，如：`-P` / `--project-prop`
- `GRADLE_USER_HOME` 目录下的 `gradle.properties` 文件
- 项目根目录下的 `gradle.properties` 文件
- Gradle 安装目录下的 `gradle.properties` 文件

值得注意的是，Gradle 用户目录的位置是可以通过命令行上传递的 `-Dgradle.user.home` 系统属性来预先更改的。

以下是常见可用于配置 Gradle 构建环境的相关属性：

| 配置选项                                                     | 说明                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| *org.gradle.caching=(true,false)*                            | 当设置为 true 时，Gradle 将尽可能重用任何先前构建的任务输出，从而加快构建速度。默认情况下，构建缓存未启用。 |
| *org.gradle.caching.debug=(true,false)*                      | 当设置为 true 时，开启 debug 模式，每个任务的输入属性哈希和构建缓存键都会控制台上作为日志输出。 |
| *org.gradle.configureondemand=(true,false)*                  | 设置为 true 时，启用按需配置，gradle 仅尝试在必要的项目上应用。默认值为 false。 |
| *org.gradle.console=(auto,plain,rich,verbose)*               | 自定义控制台输出颜色或详细程度。 默认值取决于 Gradle 的调用方式。 |
| *org.gradle.continuous.quietperiod=(# of quiet period millis)* | 当使用持续构建时，Gradle 将等待静默期过去，然后再触发另一个构建。 此静默期内的任何其他更改都会重新开始等待静默期。 默认值为 250 毫秒。 |
| *org.gradle.daemon=(true,false)*                             | 当设置为 true 时，Gradle 将开启守护进程用于运行构建。 默认为 true，构建将使用守护程序运行。 |
| *org.gradle.daemon.idletimeout=(# of idle millis)*           | Gradle Daemon 将在指定的空闲毫秒数后自行终止。 默认值为 10800000（3 小时）。 |
| *org.gradle.debug=(true,false)*                              | 当设置为 true 时，Gradle 将在启用远程调试的情况下运行构建，侦听端口 5005。请注意，这相当于将 -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=5005 添加到 JVM 命令行，并将挂起虚拟机，直到附加调试器。 默认为 false。 |
| *org.gradle.debug.port=(port number)*                        | 调试模式开启情况下，自定义用于监听的端口号，默认为 5005。    |
| *org.gradle.debug.server=(true,false)*                       | 如果设置为 true 并启用调试，Gradle 将使用调试器的套接字连接模式运行构建。 否则，使用套接字侦听模式。 默认为 true。 |
| *org.gradle.debug.suspend=(true,false)*                      | 当设置为 true 并启用调试时，运行 Gradle 的 JVM 将挂起，直到附加调试器。 |
| *org.gradle.java.home=(path to JDK home)*                    | 指定 Gradle 构建过程的 Java Home。 一般设置为 JDK 路径，默认会从环境变量的 JAVA_HOME 派生出一个默认值。 |
| *org.gradle.jvmargs=(JVM arguments)*                         | 指定用于 Gradle 守护进程的 JVM 参数。 该设置对于配置 JVM 内存设置以提高构建性能特别有用。 这不会影响 Gradle 客户端 VM 的 JVM 设置。 默认值为 -Xmx512m "-XX:MaxMetaspaceSize=256m"。 |
| o*rg.gradle.logging.level=(quiet,warn,lifecycle,info,debug)* | 当设置为 quiet、warn、lifecycle、info 或 debug 时，Gradle 将使用此日志级别。 这些值不区分大小写，默认值为 lifecycle。 |
| *org.gradle.parallel=(true,false)*                           | 配置后，Gradle 将 fork 到 org.gradle.workers.max JVM 以并行执行项目。默认为 false。 |
| *org.gradle.priority=(low,normal)*                           | 指定 Gradle 守护进程及其启动的所有进程的调度优先级。  默认为 normal。 |
| *org.gradle.vfs.watch=(true,false)*                          | 是否启用监视文件系统。 启用后，Gradle 会重复使用它在构建过程中收集的有关文件系统的信息。 在 Gradle 支持此功能的操作系统上默认启用。 |
| *org.gradle.vfs.verbose=(true,false)*                        | 在监视文件系统时配置详细日志记录。 默认为 false。            |
| *org.gradle.warning.mode=(all,fail,summary,none)*            | 当设置为 all、summary 或 none 时，Gradle 将使用不同的警告类型显示。默认为 `summary`。 |
| *org.gradle.workers.max=(max # of worker processes)*         | Gradle 将会使用给定工作线程数的最大值用于构建任务使用。默认值为 CPU数量。 |
| *org.gradle.logging.stacktrace=(internal,all,full)*          | 指定堆栈跟踪是否应在异常时显示为构建结果的一部分。 当设置为 internal 时，堆栈跟踪仅在内部异常的情况下出现在输出中。 当设置为 all 或 full 时，堆栈跟踪会出现在所有异常和构建失败的输出中。 使用 full 不会截断堆栈跟踪，这会导致更详细的输出。 默认为 internal。 |
| *org.gradle.welcome=(never,once)*                            | 控制 Gradle 是否应打印欢迎消息。 如果设置为从不，那么欢迎消息将被禁止。 如果设置为 once，则每个新版本的 Gradle 都会打印一次消息。 默认为 once。 |

 除了以上内置的配置属性，我们当然也可以在 `gradle.properties` 中来自定义属性，例如：

```properties
publishType=local
releaseRepoUrl=https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/
```

获取自定义属性也很简单，只需要调用如下方法即可：

```kotlin
val repoUrl = project.properties.get("releaseRepoUrl")
val publishType = project.properties.get("publishType")
System.out.println(repoUrl)
System.out.println(publishType)
```

### 系统属性（System Properties）

使用 `-D` 命令行选项，您可以将系统属性传递给运行 Gradle 的 JVM。 gradle 命令的 `-D` 选项与 java 命令的 `-D` 选项作用相同。我们还可以在 `gradle.properties` 文件中使用前缀 **`systemProp`** 设置系统属性。

```properties
systemProp.gradle.wrapperUser=myuser
systemProp.gradle.wrapperPassword=mypassword
```

值得注意的是，通过命令行方式传递系统属性优先级总是高于在 `gradle.properties` 中设置系统属性。目前常见的系统属性主要有：

| 系统属性                                 | 说明                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| *`gradle.wrapperUser=(myuser)`*          | 指定用户名以使用 HTTP 基本身份验证从服务器下载 Gradle 对应版本。 可以在 [Authenticated wrapper downloads](https://docs.gradle.org/current/userguide/gradle_wrapper.html#sec:authenticated_download) 中了解更多信息。 |
| *`gradle.wrapperPassword=(mypassword)`*  | 使用 Gradle 包装器指定用于下载 Gradle 的密码。               |
| *`gradle.user.home=(path to directory)`* | 指定 Gradle 用户主目录。                                     |
| *`https.protocols`*                      | 以逗号分隔格式指定支持的 TLS 版本。 例如：TLSv1.2、TLSv1.3。 |
| *`(http|https).proxyHost`*               | 指定代理 host， 主要用于下载依赖项                           |
| *`(http|https).proxyPort`*               | 指定 HTTP/HTTPS 代理的 port                                  |
| *`(http|https).proxyUser`*               | 同上                                                         |
| *`(http|https).proxyPassword`*           | 同上                                                         |

需要注意的是，在多项目构建中，如果使用 “systemProp”， 除根目录下 `gradle.properties` 以外的任何项目中设置的系统属性都将被忽略。 也就是说，只会检查根项目的 `gradle.properties` 文件中以“systemProp”开头的属性。

此外，我们也可以通过 `System.setProperty('http.proxyHost', 'www.somehost.org')` 来同样达到指定系统属性的效果。

> *Gradle Wrapper 其实是一个用于管理 Gradle 版本的脚本工具，基于此，开发人员可以快速启动并运行 Gradle 项目，而无需遵循手动安装过程。*
>
> <img src="/img/in-post/post-gradle/wrapper-workflow.png" alt="wrapper-workflow" style="zoom:80%;" />

### 环境变量

以下环境变量可用于 `gradle` 命令。 请注意，命令行选项和系统属性优先于环境变量生效。

##### GRADLE_OPTS
指定启动 Gradle 客户端 VM 时要使用的 JVM 参数。 客户端 VM 仅处理命令行输入/输出，因此很少需要更改其 VM 参数。 实际构建由 Gradle 守护程序进行，不受此环境变量的影响。

##### GRADLE_USER_HOME
指定 Gradle 用户主目录（如果未设置，则默认为 `$USER_HOME/.gradle` ）。

##### JAVA_HOME
指定用于客户端 VM 的 JDK 安装目录。 此 VM 也用于守护进程，除非在带有 `org.gradle.java.home` 的 Gradle 属性文件中指定了不同的 VM。

### 项目属性（Project Properties）

您可以通过 `-P` 命令行选项将属性直接添加到自己的项目对象。Gradle 还可以在看到**特殊命名**的系统属性或环境变量时自动设置项目属性。 如果环境变量名称看起来像 `ORG_GRADLE_PROJECT_prop=somevalue`，那么 Gradle 将在您的项目对象上设置一个 `prop` 属性，其值为 `somevalue`。 Gradle 也支持系统属性，但命名模式不同，类似于 `org.gradle.project.prop`。 以下两项都将您的 Project 对象上的 `foo` 属性设置为 `“bar”`。

##### 通过系统属性设置项目属性

```properties
org.gradle.project.foo=bar
```

##### 通过环境变量设置项目属性

```properties
ORG_GRADLE_PROJECT_foo=bar
```

> *用户主目录中的 `gradle.properties` 优先于项目目录中的 `gradle.properties` 文件生效。*

当你没有持续集成服务器的管理员权限并且您需要设置不易看到的属性值时，此功能非常有用。 由于我们不能在该场景中使用 `-P` 选项，也不能更改系统级配置文件，因此正确的策略是更改持续集成构建作业的配置，添加与预期模式匹配的环境变量设置。 这对系统上的普通用户是不可见的。我们可以像使用变量一样使用其名称来访问构建脚本中的项目属性。

> *如果引用了项目属性但不存在，则会引发异常并且构建将失败。在使用 `Project.hasProperty(java.lang.String)` 方法访问可选项目属性之前，应该先检查它们是否存在。*

### 配置 JVM 参数

我们可以通过以下两种方式来调整 Gradle 的 JVM 参数选项：

##### 更改构建 VM 的 JVM 配置

`org.gradle.jvmargs` 这个 Gradle 属性用于控制运行构建的 VM，它的默认值是 `-Xmx512m "-XX:MaxMetaspaceSize=256m"`。

我们可以通过以下方式自定义构建 VM 的参数：

```properties
org.gradle.jvmargs=-Xmx2g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
```

##### 修改客户端 VM 的 JVM 配置

`JAVA_OPTS` 环境变量控制命令行客户端，仅用于显示控制台输出。 默认为 `-Xmx64m`。

```properties
JAVA_OPTS="-Xmx64m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8"
```

在这种情况下，客户端 VM 也可以用作构建 VM：如果我们停用 Gradle 守护程序并且客户端 VM 与构建 VM 所需的设置，则客户端 VM 将直接运行构建。 否则，客户端 VM 将派生一个新 VM 来执行实际构建，以支持不同的配置。

> *对于某些任务，如测试任务，也会派生额外的 JVM 进程，我们可以在配置任务时传递这些参数。 他们都默认使用-Xmx512m。*

例如，我们可以给 JavaCompile 类型的 Task 设置 Java 编译参数：

```kotlin
plugins {
    java
}

tasks.withType<JavaCompile>().configureEach {
    options.compilerArgs = listOf("-Xdoclint:none", "-Xlint:none", "-nowarn")
}
```

通过 [Build Scans](https://scans.gradle.com/?_ga=2.53238312.1850167400.1663713716-546874468.1662381368) 我们也可以直接了解到执行构建过程所基于的 JVM 配置信息，只需要执行 `--scan` 即可：

![build-scan-infrastructure](/img/in-post/post-gradle/build-scan-infrastructure.png)

### 基于项目属性配置 Task

某些场景下，我们希望可以在任务调用时根据指定的项目属性来更改任务的行为。假设我们希望确保发布构建仅由 CI 触发，处理此问题的一种简单方法是通过设置 `isCI` 项目属性，然后在任务执行逻辑中获取该属性并在 `isCI` 为 true 的情况下执行发布逻辑：

```kotlin
tasks.register("performRelease") {
    doLast {
        if (project.hasProperty("isCI")) {
            println("Performing release actions")
        } else {
            throw InvalidUserDataException("Cannot perform release outside of CI")
        }
    }
}
```

此外，我们也可以通过 StartParameter 来获取项目属性或者系统属性：

```kotlin
if (project.gradle.startParameter.projectProperties.containsKey('isCI')) {
    println("Execute with CI config")
}
if (project.gradle.startParameter.systemPropertiesArgs.containsKey('gpgSecring')) {
    println("Get system properties.")
}
```

只需要在命令行参数中指定 `-D` 即可：

```sh
./gradlew performRelease -PisCI=true -DgpgSecring=/Users/dorck/demo/secring.gpg --quiet
```

### 相关参考

- *<https://docs.gradle.org/current/userguide/build_environment.html>*