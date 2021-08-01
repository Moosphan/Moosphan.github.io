---
layout: post
title: "一篇文章带你领略Android混淆的魅力"
date: 2020-06-29 17:01:52
author:     "Dorck"
catalog: false
header-style: text
tags: 
  - Android
  - Proguard
---
 

在 Android 日常开发过程中，**混淆**是我们开发 App 的一项必不可少的技能。只要是我们亲身经历过 App 打包上线的过程，或多或少都需要了解一些代码混淆的基本操作。那么，混淆到底是什么？它的好处有哪些？具体效果如何？别急，下面我们来一一探索它的"独特"魅力🐳。

## 混淆简介

> **代码混淆**（*Obfuscated code*）是将程序中的代码以某种规则转换为难以阅读和理解的代码的一种行为。

#### 混淆的好处

混淆的好处就是它的目的：令 APK 难以被逆向工程，即很大程度上增加反编译的成本。此外，Android 当中的"混淆"还能够在打包时移除无用资源，显著减少 APK 体积。最后，还能以变通方式避免 Android 中常见的 **64k** 方法数引用的限制。

我们先来看一下混淆前后的 APK 结构对比。<!--more-->

混淆前：
![混淆前](https://user-gold-cdn.xitu.io/2019/6/29/16ba23561fe3d0b5?w=2128&h=1200&f=png&s=378013)


混淆后：
![混淆后](https://user-gold-cdn.xitu.io/2019/6/29/16ba23634d2dacb7?w=2134&h=1226&f=png&s=340067)

从上面两张图可以看出：经过混淆处理之后，我们的 APK 中包名、类名、成员名等都被替换为随机、无意义的名称，增加了代码阅读和理解的困难程度，提高了反编译的成本。细心的小伙伴可能又会注意到：混淆前后 APK 的体积竟然从 2.7M 减小到了 1.4M，体积缩减了近一倍！真的有这么神奇吗？哈哈，确实是这么神奇，让我们慢慢来揭开它的神秘面纱吧😏。

## Android 当中的混淆

在 Android 中，我们平常所说的"混淆"其实有两层意思，一个是 Java **代码的混淆**，另外一个是**资源的压缩**。其实这两者之间并没有什么关联，只不过习惯性地放在一起来使用。那么，说了这么多，Android 平台上到底该如何开启混淆呢？

#### 启用混淆

```groovy
......
  
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

以上就是开启混淆的基本操作了，通过 ***`minifyEnabled`*** 设置为 `true` 来开启混淆。同时，可以设置 ***`shrinkResources`*** 为 `true` 来开启资源的压缩。不难看出，我们一般在打 release 包时才启用混淆，因为混淆会增加额外的编译时间，所以不建议在 debug 模式下启用。此外，需要注意的是：只有在启用混淆的前提下开启资源压缩才会有效！以上代码中的 ***`proguard-android.txt`*** 表示 Android 系统为我们提供的默认混淆规则文件，而 ***`proguard-rules.pro`*** 则是我们想要自定义的混淆规则，至于如何自定义混淆规则我们将在接下来会讲到😄。

#### 代码混淆

其实，Java 平台为我们提供了 ***Proguard*** 混淆工具来帮助我们快速地对代码进行混淆。根据 Java 官方介绍，Proguard 对应的具体中文定义如下：

- 它是一个包含代码文件**压缩**、**优化**、**混淆**和**校验**等功能的工具
- 它能够检测并删除无用的类、变量、方法和属性
- 它能够优化字节码并删除未使用的指令
- 它能够将类、变量和方法的名字重命名为无意义的名称从而达到混淆效果
- 最后，它还会校验处理后的代码，主要针对 Java 6 及以上版本和 Java ME

#### 资源压缩

Android 中，编译器为我们提供了另外一项强大的功能：**资源的压缩**。资源压缩能够帮助我们移除项目及依赖仓库中未使用到的资源，有效地降低了apk包的大小。由于资源压缩与代码混淆是协同工作，所以，如果需要开启资源的压缩，**切记要先开启代码混淆**，否则会出现以下问题：

```
ERROR: Removing unused resources requires unused code shrinking to be turned on. See http://d.android.com/r/tools/shrink-resources.html for more information.
Affected Modules: app
```

#### 自定义要保留的资源

当我们开启了资源压缩之后，系统会默认替我们移除所有未使用的资源，假如我们需要保留某些特定的资源，可以在我们项目中创建一个被 `<resources>` 标记的 XML 文件（如 `res/raw/keep.xml`），并在 `tools:keep` 属性中指定每个要保留的资源，在 `tools:discard` 属性中指定每个要舍弃的资源。这两个属性都接受逗号分隔的资源名称列表。同样，我们可以使用字符 **`*`** 作为通配符。如：

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:keep="@layout/activity_video*,@layout/dialog_update_v2"
    tools:discard="@layout/unused_layout,@drawable/unused_selector" />
```

#### 启用严格检查模式

正常情况下，资源压缩器可准确判定系统是否使用了资源。不过，如果您的代码（包含库）调用 `Resources.getIdentifier()`，这就表示您的代码将根据动态生成的字符串查询资源名称。这时，资源压缩器会采取防御性行为，将所有具有匹配名称格式的资源标记为可能已使用，无法移除。例如，以下代码会使所有带 `img_` 前缀的资源标记为已使用：

```Java
String name = String.format("img_%1d", angle + 1);
res = getResources().getIdentifier(name, "drawable", getPackageName());
```

这时，我可以开启资源的严格审查模式，只会保留确定已使用的资源：
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources xmlns:tools="http://schemas.android.com/tools"
    tools:shrinkMode="strict" />
```

#### 移除备用资源

Gradle 资源压缩器只会移除未被应用引用的资源，这意味着它不会移除用于不同设备配置的[备用资源](https://developer.android.google.cn/guide/topics/resources/providing-resources.html#AlternativeResources)。必要时，我们可以使用 Android Gradle 插件的 `resConfigs` 属性来移除您的应用不需要的备用资源文件（常见的有用于国际化支持的 `strings.xml`，适配用的 `layout.xml` 等）：

```groovy
android {
    defaultConfig {
        ...
        //保留中文和英文国际化支持
        resConfigs "en", "zh"
    }
}
```

## 自定义混淆规则

品尝完了以上"配菜"，下面让我们来品味一下本文的"主菜"：**自定义混淆规则**。首先，我们来了解一下常见的混淆命令。

#### keep 命令

这里说的 **keep** 命令指的是一系列以 **-keep** 开头的命令，它主要用来保留 Java 中不需要进行混淆的元素。以下是常见的 -keep 命令：

- **-keep**

  作用：保留指定的类和成员，防止被混淆处理。例如：

  ```
  # 保留包：com.moos.media.entity 下面的类以及类成员
  -keep public class com.moos.media.entity.**
  
  # 保留类：NumberProgressBar
  -keep public class com.moos.media.widget.NumberProgressBar {*;}
  ```

- **-keepclassmembers**

  作用：保留指定的类的成员（变量/方法），它们将不会被混淆。如：

  ```
  # 保留类的成员：MediaUtils类中的特定成员方法
  -keepclassmembers class com.moos.media.MediaUtils {
      public static *** getLocalVideos(android.content.Context);
      public static *** getLocalPictures(android.content.Context);
  }
  ```

- **-keepclasseswithmembers**

  作用：保留指定的类和其成员（变量/方法），前提是它们在压缩阶段没有被删除。与`-keep` 使用方式类似：

  ```
  # 保留类：BaseMediaEntity 的子类
  -keepclasseswithmembers public class * extends com.moos.media.entity.BaseMediaEntity{*;}
  
  # 保留类：OnProgressBarListener接口的实现类
  -keep public class * implements com.moos.media.widget.OnProgressBarListener {*;}
  ```

- **@Keep**

  除了以上方式，你也可以选择使用 **`@Keep`** 注解来保留期望代码，防止它们被混淆处理。比如，我们通过 `@Keep` 修饰一个类来保留它不被混淆：

  ```kotlin
  @Keep
  data class CloudMusicBean(var createDate: String,
                            var id: Long,
                            var name: String,
                            var url: String,
                            val imgUrl: String)
  ```
  同样地，我们也可以让 `@Keep` 来修饰方法或者字段进而保留它们。

#### 其他命令

1. **dontwarn**

   *`-dontwarn`* 命令一般在我们引入新的 library 时会使用到，常用于处理 library 中无法解决的警告。如：

   ```
   -keep class twitter4j.** { *; }
   
   -dontwarn twitter4j.**
   ```

2. 其他的命令用法可参考 Android 系统提供的默认混淆规则：

   ```
   #混淆时不生成大小写混合的类名
   -dontusemixedcaseclassnames
   
   #不跳过非公共的库的类
   -dontskipnonpubliclibraryclasses
   
   #混淆过程中记录日志
   -verbose
   
   #关闭预校验
   -dontpreverify
   
   #关闭优化
   -dontoptimize
   
   #保留注解
   -keepattributes *Annotation*
   
   #保留所有拥有本地方法的类名及本地方法名
   -keepclasseswithmembernames class * {
       native <methods>;
   }
   
   #保留自定义View的get和set方法
   -keepclassmembers public class * extends android.view.View {
      void set*(***);
      *** get*();
   }
   
   #保留Activity中View及其子类入参的方法，如: onClick(android.view.View)
   -keepclassmembers class * extends android.app.Activity {
      public void *(android.view.View);
   }
   
   #保留枚举
   -keepclassmembers enum * {
       **[] $VALUES;
       public *;
   }
   
   #保留序列化的类
   -keepclassmembers class * implements android.os.Parcelable {
     public static final android.os.Parcelable$Creator CREATOR;
   }
   
   #保留R文件的静态成员
   -keepclassmembers class **.R$* {
       public static <fields>;
   }
   
   -dontwarn android.support.**
   
   -keep class android.support.annotation.Keep
   
   -keep @android.support.annotation.Keep class * {*;}
   
   -keepclasseswithmembers class * {
       @android.support.annotation.Keep <methods>;
   }
   
   -keepclasseswithmembers class * {
       @android.support.annotation.Keep <fields>;
   }
   
   -keepclasseswithmembers class * {
       @android.support.annotation.Keep <init>(...);
   }
   ```

   更多混淆命令可以参考文章：[***Proguard 最全混淆规则说明***](https://juejin.im/entry/6844903474740592647) ，这里就不做详细讲解了。

## 混淆"黑名单"

我们在了解了混淆的基本命令之后，很多人应该还是一头雾水：到底哪些内容该混淆？其实，我们在使用代码混淆时，ProGuard 对我们项目中大部分代码进行了混淆操作，为了防止编译时出错，我们应该通过 `keep` 命令保留一些元素不被混淆。所以，我们只需要知道**哪些元素不应该被混淆**：

#### 枚举

项目中难免可能会用到枚举类型，然而它不能参与到混淆当中去。原因是：枚举类内部存在 `values` 方法，混淆后该方法会被重新命名，并抛出 `NoSuchMethodException`。庆幸的是，Android 系统默认的混淆规则中已经添加了对于枚举类的处理，我们无需再去做额外工作。想了解更多枚举内部细节可以去查看源码，篇幅有限不再细说。

#### 被反射的元素

被反射使用的类、变量、方法、包名等不应该被混淆处理。原因在于：代码混淆过程中，被反射使用的元素会被重命名，然而反射依旧是按照先前的名称去寻找元素，所以会经常发生 `NoSuchMethodException` 和 `NoSuchFiledException` 问题。

#### 实体类

实体类即我们常说的"数据类"，当然经常伴随着**序列化**与**反序列化**操作。很多人也应该都想到了，混淆是将原本有特定含义的"元素"转变为无意义的名称，所以，经过混淆的"洗礼"之后，序列化之后的 `value` 对应的 `key` 已然变为没有意义的字段，这肯定是我们不希望的。同时，反序列化的过程创建对象从根本上来说还是借助于**反射**，混淆之后 `key` 会被改变，所以也会违背我们预期的效果。

#### 四大组件

Android 中的四大组件同样不应该被混淆。原因在于：

1. 四大组件使用前都需要在 **`AndroidManifest.xml`** 文件中进行注册声明，然而混淆处理之后，四大组件的类名就会被篡改，实际使用的类与 `manifest` 中注册的类并不匹配，故而出错。
2. 其他应用程序访问组件时可能会用到类的包名加类名，如果经过混淆，可能会无法找到对应组件或者产生异常。

#### JNI 调用的Java 方法

当 JNI 调用的 Java 方法被混淆后，方法名会变成无意义的名称，这就与 C++ 中原本的 Java 方法名不匹配，因而会无法找到所调用的方法。

#### 其他不应该被混淆的

- 自定义控件不需要被混淆
- JavaScript 调用 Java 的方法不应混淆
- Java 的 native 方法不应该被混淆
- 项目中引用的第三方库也不建议混淆

## 混淆后的堆栈跟踪

代码经过 ProGuard 混淆处理后，想要读取 **StackTrace**（堆栈追踪）信息就会变得很困难。由于方法名称和类的名称都经过混淆处理，即使程序发生崩溃问题，也很难定位问题所在。幸运的是，ProGuard 为我们提供了补救的措施，在着手进行之前，我们先来看一下 ProGuard 每次构建后生成了哪些内容。

#### 混淆输出结果

混淆构建完成之后，会在 **`<module-name>/build/outputs/mapping/release/`** 目录下生成以下文件：

- **dump.txt**

  说明 APK 内所有类文件的内部结构。

- **mapping.txt**

  提供混淆前后的内容对照表，内容主要包含类、方法和类的成员变量。

- **seeds.txt**

  罗列出未进行混淆处理的类和成员。

- **usage.txt**

  罗列出从 APK 中移除的代码。

#### 恢复堆栈跟踪

了解完混淆构建完毕后输出的内容之后，我们现在就来看一下之前的问题：混淆处理后，StackTrace 定位困难。如何来恢复 StackTrace 的定位能力呢？系统为我们提供了 **retrace** 工具，结合上文提到的 **`mapping.txt`** 文件，就可以将混淆后的**崩溃堆栈追踪信息**还原成正常情况下的 **StackTrace** 信息。主要有两种方式来恢复 StackTrace，为了方便理解，我们以下面这段崩溃信息为例，借助两种方式分别来还原：

```ruby
 java.lang.RuntimeException: Unable to start activity 
     Caused by: kotlin.KotlinNullPointerException
        at com.moos.media.ui.ImageSelectActivity.k(ImageSelectActivity.kt:71)
        at com.moos.media.ui.ImageSelectActivity.onCreate(ImageSelectActivity.kt:58)
        at android.app.Activity.performCreate(Activity.java:6237)
        at android.app.Instrumentation.callActivityOnCreate(Instrumentation.java:1107)
```

1. 通过 retrace 脚本工具

   首先我们要进入到 Android SDK 路径的 **`/tools/proguard/bin`** 目录中，这里以 Mac 系统为例，可以看到如下内容：

   ![retrace脚本目录](https://user-gold-cdn.xitu.io/2019/6/29/16ba23882f427945?w=1540&h=808&f=png&s=108657)

   可以看到如上三个文件，而 `proguardgui.sh` 才是我们需要的 `retrace` 脚本（Windows系统下为 `proguardgui.bat` ）。Windows 系统中只需要双击脚本 `proguardgui.bat` 即可运行，至于 Mac 系统，如果你没有做任何配置，只需要将 `proguardgui.sh` 脚本拖动到 Mac 自带的终端中，回车键即可运行。接着，我们会看到如下界面：

   ![retrace脚本界面](https://user-gold-cdn.xitu.io/2019/6/29/16ba23825e40dbc7?w=1826&h=1256&f=png&s=306786)

   选择 **`ReTrace`** 栏 ，并添加我们项目中混淆生成的 **`mapping.txt`** 文件所在位置，然后将我们的混淆后的崩溃信息复制到 `Obfuscated stack trace` 那一栏，点击 `ReTrace!` 按钮即可还原出我们的崩溃日志信息，结果如上图所示，我们之前的混淆日志：`at com.moos.media.ui.ImageSelectActivity.k(ImageSelectActivity.kt:71)` 被还原成了 **`at com.moos.media.ui.ImageSelectActivity.initView(ImageSelectActivity.kt:71)`**。`ImageSelectActivity.k` 是我们混淆后的方法名，`ImageSelectActivity.initView` 则是最初未混淆前的方法名，借助于 ReTrace 工具的帮助，我们就可以像以前一样很快定位到崩溃代码区域了。

2. 通过 retrace 命令行

   我们先要将崩溃信息复制到 `txt` 格式的文件（如：proguard_stacktrace.txt）中保存，然后执行以下命令即可（MAC系统）：

   ```
   retrace.sh -verbose mapping.txt proguard_stacktrace.txt
   ```

   如果你是 windows 系统，可以执行以下命令：

   ```
   retrace.bat -verbose mapping.txt proguard_stacktrace.txt
   ```

   最终还原的结果和之前效果一样：

   ![retrace命令行还原stacktrace](https://user-gold-cdn.xitu.io/2019/6/29/16ba2392da5787be?w=1794&h=582&f=png&s=218077)

   

   也许你通过以上两种方式在对 stackTrace 进行恢复时，发现 **`Unknown Source`** 问题：

   ![unknown source问题](https://user-gold-cdn.xitu.io/2019/6/29/16ba23998473ad0a?w=1796&h=522&f=png&s=205649)

   

值得注意的是，记得在混淆规则中加上如下配置来提升我们的 StackSource 查找效率：

```
# 保留源文件名和具体代码行号
-keepattributes SourceFile,LineNumberTable
```

此外，我们每次使用 ProGuard 创建发布构建时都都会覆盖之前版本的 `mapping.txt` 文件，因此我们每次发布新版本时都必须小心地保存一个副本。通过为每个发布构建保留一个 `mapping.txt` 文件副本，我们就可以在用户提交的已混淆的 StackTrace 来对旧版本应用的问题进行调试和修复。

## 涨姿势的操作

经过上文的介绍，我们知道，APK 在经过代码混淆处理后，包名、类名、成员名被转化为无意义、难以理解的名称，增加反编译的成本。Android ProGuard 为我们提供了默认的"混淆字典"，即将元素名称转为英文小写字母的形式。那么，我们可以定义自己的混淆字典吗？卖个关子，我们先来看一张效果图：


![自定义混淆字典](https://user-gold-cdn.xitu.io/2019/6/29/16ba23a42a4d143f?w=1932&h=936&f=png&s=367469)

这个波操作是不是有点"出类拔萃"了？哈哈，就不卖关子了，其实很简单，只要生成一套自己的 `txt` 格式的混淆字典，然后在混淆规则 **`Proguard-rules.pro`** 中应用一下即可：


![混淆字典配置](https://user-gold-cdn.xitu.io/2019/6/29/16ba23a8aad6613f?w=2166&h=976&f=png&s=391529)

> 本文中使用的混淆字典可以在此处查看并下载：[**proguard_tradition.txt**](https://github.com/Moosphan/SelfAssetRepository/blob/master/github/files/proguard-tradition.txt)

当然，大家也可以自己去定制化自己的"混淆字典"，增加反编译的难度。

一路走下来，我们发现，从混淆技术的必要性和优点来看，它还是很值得我们去深入学习和研究的，本文带大家领略的仅仅是"冰山一角"。由于本人的技术水平有限，若大家发现有问题或者阐述不当之处，欢迎指出并修正。

## 相关参考

- [*Shrink your app*](https://developer.android.google.cn/studio/build/shrink-code)

- [*读懂Android中的代码混淆*](https://droidyue.com/blog/2016/07/10/understanding-android-obfuscated-code-by-proguard)

- [*Practical ProGuard rules example*](https://medium.com/androiddevelopers/practical-proguard-rules-examples-5640a3907dc9)

- [*Android ProGuard 代码混淆那些事儿*](http://johnnyshieh.me/posts/android-proguard)

- [*Proguard 最全混淆规则说明*](https://juejin.im/entry/6844903474740592647)


