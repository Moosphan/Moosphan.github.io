---
layout: post
title: "Gradle手札系列之命令行接口一览"
date: 2022-06-30 18:02:09
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Gradle
- Android
categories: 
- Gradle

---

### 概述

Gradle 命令行接口是与 Gradle 交互的主要方法之一，以下内容可作为执行和自定义 Gradle 命令或在编写脚本、配置持续集成时的参考用法。强烈建议使用 Gradle Wrapper。使用包装器时，应该在以下所有示例中用 `./gradlew` 或 `gradlew.bat` 代替 `gradle`。

### Gradle 构建基础命令

以下提供常见的 gradle 命令用法介绍。

##### 1. 查看帮助

Command： `./gradlew help`

```
> Configure project :app

> Task :help

Welcome to Gradle 6.7.1.

To run a build, run gradlew <task> ...

To see a list of available tasks, run gradlew tasks

To see a list of command-line options, run gradlew --help

To see more detail about a task, run gradlew help --task <task>

For troubleshooting, visit https://help.gradle.org

BUILD SUCCESSFUL in 2s
1 actionable task: 1 executed

```

##### 2. 查看命令帮助选项

Command：`./gradlew --help`

```
→ ./gradlew --help

USAGE: gradlew [option...] [task...]

-?, -h, --help                     Shows this help message.
-a, --no-rebuild                   Do not rebuild project dependencies.
-b, --build-file                   Specify the build file.
--build-cache                      Enables the Gradle build cache. Gradle will try to reuse outputs from previous builds.
-c, --settings-file                Specify the settings file.
--configuration-cache              Enables the configuration cache. Gradle will try to reuse the build configuration from previous builds. [incubating]
--configuration-cache-problems     Configures how the configuration cache handles problems (fail or warn). Defaults to fail. [incubating]
--configure-on-demand              Configure necessary projects only. Gradle will attempt to reduce configuration time for large multi-project builds. [incubating]
--console                          Specifies which type of console output to generate. Values are 'plain', 'auto' (default), 'rich' or 'verbose'.
--continue                         Continue task execution after a task failure.
-D, --system-prop                  Set system property of the JVM (e.g. -Dmyprop=myvalue).
-d, --debug                        Log in debug mode (includes normal stacktrace).
--daemon                           Uses the Gradle Daemon to run the build. Starts the Daemon if not running.
--export-keys                      Exports the public keys used for dependency verification. [incubating]
-F, --dependency-verification      Configures the dependency verification mode (strict, lenient or off) [incubating]
--foreground                       Starts the Gradle Daemon in the foreground.
-g, --gradle-user-home             Specifies the gradle user home directory.
-I, --init-script                  Specify an initialization script.
-i, --info                         Set log level to info.
--include-build                    Include the specified build in the composite.
-M, --write-verification-metadata  Generates checksums for dependencies used in the project (comma-separated list) [incubating]
-m, --dry-run                      Run the builds with all task actions disabled.
--max-workers                      Configure the number of concurrent workers Gradle is allowed to use.
--no-build-cache                   Disables the Gradle build cache.
--no-configuration-cache           Disables the configuration cache. [incubating]
--no-configure-on-demand           Disables the use of configuration on demand. [incubating]
--no-daemon                        Do not use the Gradle daemon to run the build. Useful occasionally if you have configured Gradle to always run with the daemon by default.
--no-parallel                      Disables parallel execution to build projects.
--no-scan                          Disables the creation of a build scan. For more information about build scans, please visit https://gradle.com/build-scans.
--no-watch-fs                      Disables watching the file system. [incubating]
--offline                          Execute the build without accessing network resources.
-P, --project-prop                 Set project property for the build script (e.g. -Pmyprop=myvalue).
-p, --project-dir                  Specifies the start directory for Gradle. Defaults to current directory.
--parallel                         Build projects in parallel. Gradle will attempt to determine the optimal number of executor threads to use.
--priority                         Specifies the scheduling priority for the Gradle daemon and all processes launched by it. Values are 'normal' (default) or 'low' [incubating]
--profile                          Profile build execution time and generates a report in the <build_dir>/reports/profile directory.
--project-cache-dir                Specify the project-specific cache directory. Defaults to .gradle in the root project directory.
-q, --quiet                        Log errors only.
--refresh-dependencies             Refresh the state of dependencies.
--refresh-keys                     Refresh the public keys used for dependency verification. [incubating]
--rerun-tasks                      Ignore previously cached task results.
-S, --full-stacktrace              Print out the full (very verbose) stacktrace for all exceptions.
-s, --stacktrace                   Print out the stacktrace for all exceptions.
--scan                             Creates a build scan. Gradle will emit a warning if the build scan plugin has not been applied. (https://gradle.com/build-scans)
--status                           Shows status of running and recently stopped Gradle Daemon(s).
--stop                             Stops the Gradle Daemon if it is running.
-t, --continuous                   Enables continuous build. Gradle does not exit and will re-execute tasks when task file inputs change.
--update-locks                     Perform a partial update of the dependency lock, letting passed in module notations change version. [incubating]
-v, --version                      Print version info.
-w, --warn                         Set log level to warn.
--warning-mode                     Specifies which mode of warnings to generate. Values are 'all', 'fail', 'summary'(default) or 'none'
--watch-fs                         Enables watching the file system for changes, allowing data about the file system to be re-used for the next build. [incubating]
--write-locks                      Persists dependency resolution for locked configurations, ignoring existing locking information if it exists [incubating]
-x, --exclude-task                 Specify a task to be excluded from execution.

```

##### 3. 查看项目结构

Command：`./gradlew projects`

```
> Configure project :app
> Task :projects

------------------------------------------------------------
Root project
------------------------------------------------------------

Root project 'TuyaSamartBizubundle'
+--- Project ':activator'
+--- Project ':alexa_google_bind'
+--- Project ':app'
+--- Project ':cloudstorage'
+--- Project ':control'
+--- Project ':devicedetail'
+--- Project ':family'
+--- Project ':feedback'
+--- Project ':groupmanager'
+--- Project ':ipc'
+--- Project ':lightscene'
+--- Project ':location'
+--- Project ':mall'
+--- Project ':message'
+--- Project ':ota'
+--- Project ':panel'
+--- Project ':panelmore'
+--- Project ':qqmusic'
+--- Project ':scene'
+--- Project ':share'
\--- Project ':speech'

To see a list of the tasks of a project, run gradlew <project-path>:tasks
For example, try running gradlew :activator:tasks

BUILD SUCCESSFUL in 31s
1 actionable task: 1 executed

```

##### 4. 查看当前根项目可运行的 task

Command：`./gradlew :<moduleName>:tasks`

如果想查看所有 task，可以通过 `./gradlew :<module>:tasks --all` 查看

```
> Task :app:tasks

------------------------------------------------------------
Tasks runnable from project :app
------------------------------------------------------------

Android tasks
-------------
androidDependencies - Displays the Android dependencies of the project.
signingReport - Displays the signing info for the base and test modules
sourceSets - Prints out all the source sets defined in this project.

Build tasks
-----------
assemble - Assemble main outputs for all the variants.
assembleAndroidTest - Assembles all the Test applications.
build - Assembles and tests this project.
buildDependents - Assembles and tests this project and all projects that depend on it.
buildNeeded - Assembles and tests this project and all projects it depends on.
bundle - Assemble bundles for all the variants.
clean - Deletes the build directory.
cleanBuildCache - Deletes the build cache directory.
compileDebugAndroidTestSources
compileDebugSources
compileDebugUnitTestSources
compileReleaseSources
compileReleaseUnitTestSources

Cleanup tasks
-------------
lintFix - Runs lint on all variants and applies any safe suggestions to the source code.

Help tasks
----------
buildEnvironment - Displays all buildscript dependencies declared in project ':app'.
components - Displays the components produced by project ':app'. [incubating]
dependencies - Displays all dependencies declared in project ':app'.
dependencyInsight - Displays the insight into a specific dependency in project ':app'.
dependentComponents - Displays the dependent components of components in project ':app'. [incubating]
help - Displays a help message.
model - Displays the configuration model of project ':app'. [incubating]
outgoingVariants - Displays the outgoing variants of project ':app'.
projects - Displays the sub-projects of project ':app'.
properties - Displays the properties of project ':app'.
tasks - Displays the tasks runnable from project ':app'.

Install tasks
-------------
installDebug - Installs the Debug build.
installDebugAndroidTest - Installs the android (on device) tests for the Debug build.
uninstallAll - Uninstall all applications.
uninstallDebug - Uninstalls the Debug build.
uninstallDebugAndroidTest - Uninstalls the android (on device) tests for the Debug build.
uninstallRelease - Uninstalls the Release build.

Verification tasks
------------------
check - Runs all checks.
connectedAndroidTest - Installs and runs instrumentation tests for all flavors on connected devices.
connectedCheck - Runs all device checks on currently connected devices.
connectedDebugAndroidTest - Installs and runs the tests for debug on connected devices.
deviceAndroidTest - Installs and runs instrumentation tests using all Device Providers.
deviceCheck - Runs all device checks using Device Providers and Test Servers.
lint - Runs lint on all variants.
lintDebug - Runs lint on the Debug build.
lintRelease - Runs lint on the Release build.
lintVitalRelease - Runs lint on just the fatal issues in the release build.
test - Run unit tests for all variants.
testDebugUnitTest - Run unit tests for the debug build.
testReleaseUnitTest - Run unit tests for the release build.

Rules
-----
Pattern: clean<TaskName>: Cleans the output files of a task.
Pattern: build<ConfigurationName>: Assembles the artifacts of a configuration.
Pattern: upload<ConfigurationName>: Assembles and uploads the artifacts belonging to a configuration.

To see all tasks and more detail, run gradlew tasks --all

To see more detail about a task, run gradlew help --task <task>

BUILD SUCCESSFUL in 1s
1 actionable task: 1 executed

```

##### 5. 查看某个 task 的额外帮助信息

Command：`./gradlew help --task <taskname>`

```
> Task :help
Detailed task information for assemble

Paths
     :activator:assemble
     :app:assemble

Type
     Task (org.gradle.api.Task)

Description
     Assemble main outputs for all the variants.

Group
     build

BUILD SUCCESSFUL in 921ms
1 actionable task: 1 executed

```

主要包含哪个 project 拥有该 task 以及他的 group、类型和描述等信息。

##### 6. 打印 Gradle 版本信息

Command：`./gradlew -v`

```
------------------------------------------------------------
Gradle 6.7.1
------------------------------------------------------------

Build time:   2020-11-16 17:09:24 UTC
Revision:     2972ff02f3210d2ceed2f1ea880f026acfbab5c0

Kotlin:       1.3.72
Groovy:       2.5.12
Ant:          Apache Ant(TM) version 1.10.8 compiled on May 10 2020
JVM:          1.8.0_251 (Oracle Corporation 25.251-b08)
OS:           Mac OS X 10.15.6 x86_64

```

##### 7. 查看模块依赖

Command：`./gradlew :<module>:dependencies`

扩展：

- 查看依赖关系并检索：`./gradlew :<module>:dependencies | grep `
- 将gradle输出导出到特定文件：`./gradlew :<module>:dependencies > ~/Desktop/out.txt`

### 执行 Task

##### 1. 执行某个特定的 task

Command：`gradle [taskName...] [--option-name...]`

e.g. `./gradlew :app:assemble`

其中参数选项配置允许紧跟在 task 名称之前/之后，如：`./gradlew build --build-cache`（布尔类型），当然，也可以通过增加 `--no-` 前缀来取反，原长破折号改为短破折号：`./gradlew build --no-build-cache`。

另外，任务名称可以采用驼峰缩写形式，如：`./gradlew assembleChinaDebug` 可以简化为：`./gradlew aCD`。如果想执行多个任务可以直接：`./gradlew clean assemble`。此外，项目名称也支持简写形式：

```
$ ./gradlew mAL:cT

> Task :my-awesome-library:compileTest
compiling unit tests

BUILD SUCCESSFUL in 0s
1 actionable task: 1 executed
```

##### 2.  设置构建任务时的项目属性

Command：`./gradlew app:<taskName> -P<propertyName>=<propertyValue>`

e.g. 给 `dependencyCheckOutput` 开始任务构建&设置项目属性 `outputDir`

```
./gradlew app:dependencyCheckOutput -PoutputDir=/User/xx/Desktop/deps.txt
```

##### 3. 命令行执行顺序安全性

尽管 Gradle 将始终尝试尽快执行构建，但命令行命令安全性也需要得到尊重。例如，以下内容将根据 clean 和 build 两个任务的依赖关系来执行它们。

```
./gradlew clean build
```

##### 4. 执行过程排除某些任务

![commandLineTutorialTasks](/img/in-post/post-android/commandLineTutorialTasks.png)

*Figure 1. Simple Task Graph*

```
$ gradle dist --exclude-task test

> Task :compile
compiling source

> Task :dist
building the distribution

BUILD SUCCESSFUL in 0s
2 actionable tasks: 2 executed
```

通过执行记录可以发现 `test` 并未被执行，此外，`test` 的依赖项 `compileTest` 也未得到执行。至于其他任务的依赖项 `compile` 可以正常被执行。

##### 5. 强制执行 task

我们可以通过 `--rerun-tasks` 来忽略增量构建并强制执行某个任务：

```
$ ./gradlew test --rerun-tasks
```

这将强制执行 `test` 和它所有依赖的任务。这有点像执行 `gradle clean test`，只是没有删除构建生成的输出。

##### 6. 忽略错误继续构建

默认情况下，当某个 task 执行错误都会导致 Gradle 终止执行并使其构建失败。这种机制允许当前构建更快速完成，但也同样隐藏了后续构建可能出现的其他问题。为了在单次构建过程中尽可能多地及早发现其他故障，我们可以使用 `--continue` 选项：

```
$ ./gradlew test --continue
```

当使用 `--continue` 选项执行构建时，Gradle 将执行构建过程中依赖的每个任务，其中每个任务都会执行完成且并不会因为失败而终止，过程中遇到的每个故障都会在构建结束后生成最终报告。值得注意的是，某个任务一旦执行失败，那么依赖该 task 的其他任务将不会被执行。

### 部分内置 task 及选项说明

##### 1. 构建所有输出

在 Gradle 构建中，`build` 任务通常指定组装所有输出并运行所有检查。

##### 2. 检查任务

通常，所有验证任务（包括测试和 lint）都使用 `check` 任务来执行。

##### 3. 查看依赖报告

`--scan` 选项配置提供了一个完整的可视化报告链接，说明该次构建过程中各个配置中依赖关系、传递依赖关系和依赖关系版本选项等。

```
➜  Minos ./gradlew assemble --scan

BUILD SUCCESSFUL in 1m 23s
72 actionable tasks: 72 executed

Publishing a build scan to scans.gradle.com requires accepting the Gradle Terms of Service defined at https://gradle.com/terms-of-service. Do you accept these terms? [yes, no] yes
Gradle Terms of Service accepted.

Publishing build scan...
https://gradle.com/s/a2nqu2n3jech2

```

个人感觉这个工具很强大，能支持从多个维度查看某次项目构建的数据指标，比如依赖关系、所有执行的任务以及执行时长、日志、插件依赖及性能监控等。

<img src="/img/in-post/post-android/gradle_cmd_scan_summary.png" alt="gradle_cmd_scan_summary" style="zoom:50%;" />



<img src="/img/in-post/post-android/gradle_cmd_scan_dep.png" alt="gradle_cmd_scan_dep" style="zoom:50%;" />

##### 4. 日志选项

我们可以使用以下选项自定义 Gradle 日志记录的详细程度。首先是设置全局日志输出级别的默认配置：

- `-Dorg.gradle.logging.level=(quiet,warn,lifecycle,info,debug)`

我们也可以指定单次构建过程的日志输出级别：

- `-q` 或者`--quiet`：仅输出 error 级别日志
- `-w` 或者 `--warn`：设置为 warning 级别
- `-i` 或者 `--info`：设置为 info 级别
- `-d` 或者 `--debug`：已调试模式输出日志，包括堆栈信息

另外，我们可以通过以下命令设置日志输出的格式。gradle 全局配置属性如下：

- `-Dorg.gradle.console=(auto,plain,rich,verbose)`

也可以同样指定单次构建过程的日志输出格式：

- `--console=(auto,plain,rich,verbose)`

##### 5. Gradle 开启调试模式

很多时候我们写 Gradle 插件希望开启调试模式，方便我们排查代码。首先，需要点击 `Edit configurations` 后点击右上角 `+` 选择 `Remote JVM Debug` 模块创建一个调试模块：

<img src="/img/in-post/post-android/gradle_plugin_debug.png" alt="gradle_plugin_debug" style="zoom:50%;" />

接着，在 Android studio 终端输入以下命令即可调试 Gradle 客户端进程。默认情况下，Gradle 将等待我们在 `localhost：5005` 上附加调试器：

```
$ ./gradlew build -Dorg.gradle.debug=true
```

最终，只需要添加断点并点击工具栏 `Debug [process name]` 即可，可通过 CMD+D 快捷开启。

### 参考

- *<https://docs.gradle.org/current/userguide/command_line_interface.html>*