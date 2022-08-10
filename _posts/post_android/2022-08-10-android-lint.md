---
layout: post
title: "Android代码检查之自定义Lint"
date: 2022-08-10 19:23:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Gradle
- Lint
- 静态代码检查
categories: 
- Android
---

### 概述

**Lint** 是 Android studio 提供的一款静态代码检查工具，它可以帮助我们检查 Android 项目源文件是否有潜在的 bug，以及在正确性、安全性、性能、易用性、无障碍性和国际化方面是否需要优化改进。Lint 的好处不言而喻，它能够在编码阶段就帮我们提前发现代码中的“坏味道”，显著降低线上问题出现的概率；同时也能有效促进团队的开发规范的统一。

![lint-process](/img/in-post/post-android/lint-process.png)

关于执行 lint 检查的几种方式不多做赘述，接下来着重来看下如何实现自定义 Lint 规则并应用到实际项目中。

### 自定义 Lint 接入方案

自定义 Lint 规则最终都会打成 JAR 包，只需将该输出 JAR 提供给其他组件使用即可。目前有两种方式可供选择：

##### 全局方案

把此 jar 拷贝到 `~/.android/lint/` 目录中即可。缺点显而易见：针对所有工程生效，会影响同一台机器其他工程的 Lint 检查。即便触发工程时拷贝过去，执行完删除，但其他进程或线程使用 `./gradlew lint` 仍可能会受到影响。

##### AAR 壳方案

<img src="/img/in-post/post-android/custom-lint-compose.jpg" alt="custom-lint-compose" style="zoom:50%;" />

另一种实现方式是将 jar 置于一个 aar 中，如果某个工程想要接入执行自定义的 lint 规则，只需依赖这个发布后的 aar 即可，如此一来，新增的 lint 规则就可将影响范围控制在单个项目内了。另外，该方案也是 Google 目前推荐的方式，aar 内容也支持 `lint.jar` 条目：

```
AAR 文件的文件扩展名为 .aar，Maven 工件类型应该也是 aar。此文件本身是一个 zip 文件。唯一的必需条目是 /AndroidManifest.xml。AAR 文件可能包含以下一个或多个可选条目：
xx.aar
|-/classes.jar
|-/res/
|-/R.txt
|-/public.txt
|-/assets/
|-/libs/name.jar
|-/jni/abi_name/name.so（其中 abi_name 是 Android 支持的 ABI 之一）
|-/proguard.txt
|-/lint.jar
|-/api.jar
|-/prefab/（用于导出原生库）
```

具体可参考 Android 官方对于 aar 的介绍：<https://developer.android.com/studio/projects/android-library.html#aar-contents>

### 编写自定义 Lint 规则

接下来主要从以下几个方面来介绍自定义 Lint 的开发流程。

##### 1. 创建 java-library & 配置 lint 依赖

自定义的 lint 规则最终输出格式为 jar 包，所以我们只需要创建一个 java-library 即可，`build.gradle` 配置如下：

> *lint-rules/build.gradle*

```groovy
plugins {
    id 'java-library'
    id 'org.jetbrains.kotlin.jvm'
}

dependencies {
  	// 官方提供的Lint相关API，并不稳定，每次AGP升级都可能会更改，且并不是向下兼容的
    compileOnly "com.android.tools.lint:lint-api:${rootProject.ext.lintVersion}"
  	// 目前Android中内置的lint检测规则
    compileOnly "com.android.tools.lint:lint-checks:${rootProject.ext.lintVersion}"
    compileOnly "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"

    testImplementation "junit:junit:4.13.2"
    testImplementation "com.android.tools.lint:lint:$lintVersion"
    testImplementation "com.android.tools.lint:lint-tests:$lintVersion"
}

java {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}

jar {
    manifest {
        // Only use the "-v2" key here if your checks have been updated to the
        // new 3.0 APIs (including UAST)
        attributes('Lint-Registry-V2': 'com.dorck.lint.rules.old.MyCustomIssueRegistry')
    }
}

configurations {
    lintJarOutput
}
dependencies {
    lintJarOutput files(jar)
}
defaultTasks 'assemble'
```

配置期间如果发现如下问题：

<img src="/img/in-post/post-android/java_version_1.7_error.png" alt="java_version_1.7_error" style="zoom:50%;" />

需要将 java 闭包中的 `sourceCompatibility` 和 `targetCompatibility` 改为 1.8。

此外，如果你创建 module 时选择的是 kotlin 语言，还可能会遇到以下这个坑：

<img src="/img/in-post/post-android/prepare_lint_for_publish_error.png" alt="prepare_lint_for_publish_error" style="zoom:50%;" />

只需要将 kotlin 标准库依赖方式改为 compileOnly 即可：

```groovy
compileOnly "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"
```

##### 2. 编写 lint-rules

平时经常使用 kotlin 开发项目的同学应该都遇到过这种情况：一旦我们希望类 A 实现一个接口 B，那么通过 AS 快捷键 `option+ enter` 选择 `implement members` 后就会为我们的类 A 自动实现 B 中接口，并加了一堆 TODO 方法：

<img src="/img/in-post/post-android/todo_interface_not_impl.png" alt="todo_interface_not_impl" style="zoom:50%;" />

目前编码环境并不会提示任何错误，然而，如果我们粗心忘记去掉上面接口实现中的 `TODO` 方法，一旦我们其他类调用到这个类 `SomethingNew`，程序就立马抛出一个 `NotImplementedError` 异常。显然，如果前置静态代码检查阶段没有拦住这个问题进而跑到了线上，那么就只能祈祷别人不会去调用了，否则故障在所难免了。好了，既然需求过来了，我就来尝试通过自定义 Lint 帮助团队其他成员在编码阶段就发现问题并强制处理。

首先，在上一步中，我们在 `lint-rules/build.gradle` 中指定了自定义的 `MyCustomIssueRegistry`，现在里面空空如也，我们需要先创建一个 Detector 用于检测 `Standard.kt` 中的 `TODO()` 方法：

```kotlin
@Suppress("UnstableApiUsage")
class KotlinTodoDetector : Detector(), Detector.UastScanner {

    override fun getApplicableMethodNames(): List<String> {
        return listOf("TODO")
    }

    override fun visitMethodCall(context: JavaContext, node: UCallExpression, method: PsiMethod) {
        println("KotlinTodoDetector >>> matched TODO in [${method.parent.containingFile.toString()}]")
        if (context.evaluator.isMemberInClass(method, "kotlin.StandardKt__StandardKt")) {
            val deleteFix = fix().name("Delete this TODO method")
                .replace().all().with("").build()
            context.report(
                ISSUE,
                context.getLocation(node),
                "You must fix `TODO()` first.", deleteFix)
        }
    }

    companion object {
        private const val ISSUE_ID = "KotlinTodo"
        val ISSUE = Issue.create(
            ISSUE_ID,
            "Detecting `TODO()` method from kotlin/Standard.kt.",
            """
                You have unimplemented method or undo work marked by `TODO()`,
                please implement it or remove dangerous TODO.
                """,
            category = Category.CORRECTNESS,
            priority = 9,
            severity = Severity.ERROR,
            implementation = Implementation(KotlinTodoDetector::class.java, Scope.JAVA_FILE_SCOPE),
        )
    }
}
```

此处我们需要检测的对象是 Java 源文件，这里只需要继承自 `Detector` 并实现 `Detector.UastScanner` 接口即可。当然，我们也可以选择按组合方式实现更多其他 Scanner，这取决于我们希望扫描的文件范围。目前支持的扫描范围有：

- UastScanner：扫描 Java 或者 kotlin 源文件
- ClassScanner：扫描字节码或编译的类文件
- BinaryResourceScanner：扫描二进制资源文件（res/raw/bitmap等）
- ResourceFolderScanner：扫描资源文件夹
- XmlScanner：扫描 xml 格式文件
- GradleScanner：扫描 Gradle 格式文件
- OtherFileScanner：其他类型文件

检测 Java 源文件，可以通过 `getApplicableMethodNames` 指定扫描的方法名，其他还有类名、文件名、属性名等等，并通过 `visitMethodCall` 接受检测到的方法。这里我们只需要检测 Kotlin 标准库中的 `Standard.kt` 中的 `TODO` 方法，匹配到后通过 `context.report` 来报告具体问题，这里需要指定一个 Issue 对象来描述问题具体信息，相关字段如下：

- id : 唯一值，应该能简短描述当前问题。利用 Java 注解或者 XML 属性进行屏蔽时，使用的就是这个 id。
- summary : 简短的总结，通常5-6个字符，描述问题而不是修复措施。
- explanation : 完整的问题解释和修复建议。
- category : 问题类别。常见的有：CORRECTNESS、SECURITY、COMPLIANCE、USABILITY、LINT等等。
- priority : 优先级。1-10 的数字，10 为最重要/最严重。
- severity : 严重级别：Fatal, Error, Warning, Informational, Ignore。
- Implementation : 为 Issue 和 Detector 提供映射关系，Detector 就是当前 Detector。声明扫描检测的范围Scope，Scope 用来描述 Detector 需要分析时需要考虑的文件集，包括：Resource文件或目录、Java文件、Class文件等。

此外，我们还可以设置出现该 issue 上报时的默认解决方案 fix，这里我们创建了一个 `deleteFix` 实现开发者快速移除报错位置的 `TODO` 代码。

最后，只需要自定义一个 Registry 声明自己需要检测的 Issues 即可：

```kotlin
@Suppress("UnstableApiUsage")
class MyCustomIssueRegistry : IssueRegistry() {
    init {
        println("MyCustomIssueRegistry, run...")
    }

    override val issues: List<Issue>
        get() = listOf(
            JcenterDetector.ISSUE,
            KotlinTodoDetector.ISSUE,
        )

    override val minApi: Int
        get() = 8 // works with Studio 4.1 or later; see com.android.tools.lint.detector.api.Api / ApiKt

    override val api: Int
        get() = CURRENT_API

    override val vendor: Vendor
        get() = Vendor(
            vendorName = "Dorck",
            contact = "xxx@gmail.com"
        )

}
```

更多关于 AST 相关类及语法介绍可参考[官方指导文档](https://googlesamples.github.io/android-custom-lint-rules/api-guide.html)或者 Lint 源码，此处不多做介绍，这里很难一言以蔽之。

##### 3. Lint 发布&接入

文章开头部分已经介绍了 Lint 的相关接入方案，出于灵活性和可用性角度考虑自然选择 aar 壳的方式。经过这几年 lint 的发展，实现起来也很简单：只需要创建一个 Android-Library module，然后稍微配置下 gradle 即可：

> *lint-aar:*

```groovy
plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
}
dependencies {
    lintPublish project(':checks')
    // other dependencies
}
```

就是这么简单，此处的 `lintPublish` 配置允许我们引用另一个 module，它会获取该组件输出的 jar 并将其打包为 `lint.jar` 然后放到自身的 AAR 中。

<img src="/img/in-post/post-android/lintPublish_output.png" alt="lintPublish_output" style="zoom:50%;" />

最后，我们在 app 模块中依赖一下 `lint-aar` 这个组件，并编写以下测试代码：

```kotlin
interface SimpleInterface {
    fun initialize()
    fun doSomething()
}

 class SomethingNew : SimpleInterface {
        override fun initialize() {
            TODO("Not yet implemented")
        }

        override fun doSomething() {
            TODO("Not yet implemented")
        }

    }
```

接下来执行一下 `./gradlew :app:lint` 即可看到控制台输出以下内容：

<img src="/img/in-post/post-android/todo_rule_run_output.png" alt="todo_rule_run_output" style="zoom:50%;" />

我们也可以点击 Lint 输出的测试报告链接去查看详细信息：

<img src="/img/in-post/post-android/todo_rule_run_html_output.png" alt="todo_rule_run_html_output" style="zoom:50%;" />

> *Note：AGP 7.0 开始，执行 `./gradlew :app:lint` 只会作用于默认变体 lint 任务上，而不是诸如此前的执行所有变体 lint 任务。*
>
> *例如：我们此前执行 `./gradlew :app:lint` 可能会导致 `debugLint`、`releaseLint`、`releaseChinaLint` 等诸多变体 lint 任务的执行，严重拖慢了编译速度，所以一般要指定特定变体的 lint 任务来执行：`./gradlew :app:lintDebug`。而7.0开始将无需如此麻烦，尽管放心使用 `./gradlew :app:lint` 即可。*

最后，在 Android studio 中我们也可以看到编译器给我们的代码警告了：

<img src="/img/in-post/post-android/todo_rule_as_preview.png" alt="todo_rule_as_preview" style="zoom:50%;" />

并且我们上面设置的 deleteFix 也生效了，即点击 `Delete this TODO method` 就可以轻松移除 `TODO()` 方法，快速解决问题。

##### 4. 编写测试代码

TTD（Test-Driven Development）是一个不错的习惯，很多时候作为开发人员大多时候无需关心最新编写的 lint 组件发布状态，因为不断发布和集成到示例代码中测试是一个比较糟糕的体验，严重消耗我们的精力。如此一来，我们就不得不了解下 lint 规则编码时的单测流程了，我相信能够显著提升你的开发效率。

首先，我们需要依赖 Lint 的单测组件：

```groovy
testImplementation "com.android.tools.lint:lint-tests:$lintVersion"
```

接着，在 `lint-rules` 模块中创建单测文件用于验证我们之前的 `KotlinTodo` 规则：

<img src="/img/in-post/post-android/todo_rule_test_dir.png" alt="todo_rule_test_dir" style="zoom:60%;" />

最后来看下 `KotlinTodoDetectorTest` 如何实现的：

```kotlin
package com.dorck.lint.examples

import com.android.tools.lint.checks.infrastructure.TestFiles.kotlin
import com.android.tools.lint.checks.infrastructure.TestLintTask.lint
import com.dorck.lint.rules.old.issues.KotlinTodoDetector
import org.junit.Test

@Suppress("UnstableApiUsage")
class KotlinTodoDetectorTest {

    @Test
    fun sampleTest() {
        lint().files(
            kotlin(
                """
                    package test.pkg
                    class SimpleInterfaceImpl : SimpleInterface {
                    
                        override fun doSomething(){
                            TODO("Not yet implemented")
                        }
                    }
                    interface SimpleInterface {
                        fun doSomething()
                    }
                """.trimIndent()
            ))
            .issues(KotlinTodoDetector.ISSUE)
            .run()
            .expect(
                """
                    src/test/pkg/SimpleInterfaceImpl.kt:5: Error: You must fix TODO() first. [KotlinTodo]
                            TODO("Not yet implemented")
                            ~~~~~~~~~~~~~~~~~~~~~~~~~~~
                    1 errors, 0 warnings
                """.trimIndent()
            )
      			.expectFixDiffs(
                """
                    Fix for src/test/pkg/SimpleInterfaceImpl.kt line 5: Delete this TODO method:
                    @@ -5 +5
                    -         TODO("Not yet implemented")
                """.trimIndent()
            )
    }
}
```

其实也很简单，只需要模拟创建一个 Java/kotlin/Gradle/xml 等格式的源文件，然后在 `java()` 或 `koltin()` 方法参数里面写上测试代码，并指定要验证的 Issue 以及期待的反馈内容。当然，`expect()` 中期待的输出检查结果我们是无法知晓的，我们只需要先设置为空字符串，然后先跑一下测试用例，预期肯定会失败，如此，我们只需要将终端输出的实际错误信息 copy 到 `expect()` 中即可：

<img src="/img/in-post/post-android/todo_rule_lint_test_output.png" alt="todo_rule_lint_test_output" style="zoom:50%;" />

最后，重新 run 一下单测，就会发现能够正常通过测试了。更多关于 Lint 单元测试的用法可以参考：[Lint unit testing](http://googlesamples.github.io/android-custom-lint-rules/api-guide/unit-testing.md.html)

##### 5. 忽略某些规则检查

某些情况下，我们希望忽略某些 Lint 规则的检查或者更改 Lint 规则的严重级别，那么，我们可以选择增加一个 Lint 配置文件，用于解决上述问题。我们可以手动在项目 app/根目录下创建一个名为 `lint.xml` 的文件：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<lint>
    <!-- list of issues to configure -->
    <issue id="DefaultLocale" severity="ignore"/>
    <issue id="DeprecatedProvider" severity="ignore"/>
    <issue id="ObsoleteLayoutParam">
        <!-- The <ignore> tag has two possible attributes: path and regexp (see below) -->
        <ignore path="res/layout-xlarge/activation.xml" />
        <!-- You can use globbing patterns in the path strings -->
        <ignore path="**/layout-x*/onclick.xml" />
        <ignore path="res/**/activation.xml" />
    </issue>

  	<issue id="MissingTranslation" severity="ignore"/>
  	<issue id="KotlinTodo" severity="ignore"/>
</lint>
```

在 lint.xml 中我们可以选择更改某条规则的严重级别，使原本不受重视的规则更加引人注意或者放宽其他规则的级别。当然，我们也可以指定某条规则在特定匹配路径下被忽略，这将取决于我们自己设定的 regex 匹配规则。

> *Note：如果我们创建了 lint.xml (文件名强约定)，并且 `build.gradle` 的 `lintOptions` 中没有自定义设定 lint 配置文件的名称和路径，则 AGP自动在临近目录中寻找名为 `lint.xml` 的配置文件。*
>
> *详细参考：[Configure by lint xml](http://googlesamples.github.io/android-custom-lint-rules/user-guide.md.html#configuringusinglint.xmlfiles/nesting&precedence)*

此外，我们也可以通过在 `build.gradle` >> `lintOptions` DSL 中设置开启或者关闭某些特定规则，当然也可以配置报告的输出格式以及路径：

```groovy
lintOptions {
    textReport false
    lintConfig file('default-lint.xml') // At `app/default-lint.xml`
    disable 'KotlinTodo', 'MissingTranslation'
    xmlOutput file("lint-report.xml")
}
```

更多关于 `LintOptions` DSl 的配置可查看官方文档：[LintOptions-dsl](https://developer.android.com/reference/tools/gradle-api/4.1/com/android/build/api/dsl/LintOptions)

> *Note：如果你项目中使用了 lint plugin，那么可以参考 lint DSL的相关释义：[AGP-lint-dsl](http://googlesamples.github.io/android-custom-lint-rules/usage/agp-dsl.md.html)*

其他的设置 lint 配置的方式还有手动在 Android studio 的工具栏 Analyze > Inspect Code > Specify Inspection Scope 中或者通过 Lint 命令行工具来配置，这两种方式就不具体介绍了，感兴趣的朋友可以去看下[官方文档](https://developer.android.google.cn/studio/write/lint?hl=zh-cn#config)的介绍。

### 版本迭代过程

<img src="/img/in-post/post-android/lint_plugin_update.png" alt="lint_plugin_update" style="zoom:50%;" />

AGP 4.0开始，Android studio 支持了独立的 `com.android.lint` 插件，进一步降低了自定义 lint 的成本。借助此插件，在上述 `lint-rules/build.gradle` 中通过在 manifest 中注册自定义 `Registry` 改为通过服务表单注册（当然，以前的方式目前还是可以用的）。以下是基于官方最新推荐的方式来配置和注册自定义规则的：

```groovy
plugins {
    id 'java-library'
    id 'org.jetbrains.kotlin.jvm'
    id 'com.android.lint'
}

dependencies {
    // 官方提供的Lint相关API，并不稳定，每次AGP升级都可能会更改，且并不是向下兼容的
    compileOnly "com.android.tools.lint:lint-api:${rootProject.ext.lintVersion}"
    // 目前Android中内置的lint检测规则
    compileOnly "com.android.tools.lint:lint-checks:${rootProject.ext.lintVersion}"
    compileOnly "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"

    testImplementation "junit:junit:4.13.2"
    testImplementation "com.android.tools.lint:lint:$lintVersion"
    testImplementation "com.android.tools.lint:lint-tests:$lintVersion"
}

java {
    sourceCompatibility = JavaVersion.VERSION_1_8
    targetCompatibility = JavaVersion.VERSION_1_8
}
```

<img src="/img/in-post/post-android/lint_spi_usage.png" alt="lint_spi_usage" style="zoom:70%;" />

可以看到，以此插件方式，我们需要关注的额外配置更少了，很大程度上降低了接入成本。

下面再来谈谈 AGP-7.0 开始的改动。其一变动是上面谈及过的执行 `./gradlew lint` 只会作用于默认变体的 Lint 任务上，而不是以前的所有变体任务。

另外一项是在 7.0 中，lint 最终将能够跨模块增量运行，这意味着如果我们只更改一个模块中的代码，lint 只需在该模块下游的模块上重新运行分析检测。对于具有许多模块的大型项目，这应该是一项重大的改进。

### 开发技巧

##### 1. 借助 Psi 工具查看 AST 语法树

Lint 检查的实质是对代码的 AST（Abstract Syntax Tree，即抽象语法树）数据进行检查分析，故而会用到大量 AST 与 lombok.ast 开源库相关知识。阅读源码是一种不错的分析语法树方式，不过我们可以借助 AS 的一些插件帮我们快速便捷解析类的节点树并加以解读。

<img src="/img/in-post/post-android/psiviewer_usage.png" alt="psiviewer_usage" style="zoom:50%;" />

利用 `PsiViewer` 就可以查看类的 AST 构造，如此一来我就可以另辟蹊径找到特定的属性来匹配特定代码了。值得注意的是，上面的 AST viewer 插件对 kotlin 代码支持不是很好，如果有需要，建议先将 kotlin 反编译为 java 再分析。

##### 2. 参考 Android 内置 Lint 规则

我发现官方近期对于 Lint 的技术推进很上心，各路文档和 FAQ 陆续补齐了。关于内置规则，Android官方团队也对每条做了详细说明和用法指导，详细参考：<https://googlesamples.github.io/android-custom-lint-rules/checks/index.md.html>

### 相关参考

- [*https://developer.android.google.cn/studio/write/lint*](https://developer.android.google.cn/studio/write/lint)
- [*googlesamples/android-custom-lint-rules*](https://github.com/googlesamples/android-custom-lint-rules)
- [*美团/Android自定义lint实践*](https://tech.meituan.com/2016/03/21/android-custom-lint.html)
- [*android-custom-lint-user-guide*](https://googlesamples.github.io/android-custom-lint-rules/api-guide.html)
- [*Publishing a link check*](https://googlesamples.github.io/android-custom-lint-rules/api-guide/publishing.md.html)
- *https://juejin.cn/post/6861562664582119432*