---
layout:     post
title: "Android Activity 属性概述"
date: 2022-03-22 20:36:12
author:     "Dorck"
catalog: false
header-style: text
published: false
tags: 
- Android
- 面试题集
- 四大组件
- Activity
categories: Android
---

>本文仅用于回顾 Activity 基本知识点，源码解析参考后续源码专栏。

### Activity 是什么

Activity 是构成一个 Android 应用程序基本组件，APP 所见几乎皆是一个 Activity（e.g, 系统发送短信页面、邮件列表、相册等都是一个 Activity） 。那么它是怎么来的呢，我可以简单理解为 main 主程序函数执行后会默认执行启动我们应用中声明的第一个 Activity，接着，我就会看到所谓“页面”出现在我们的手机上，这一般是我们的首页或者 splash 页。

### 如何构造一个 Activity

首先，我们需要在清单文件 - AndroidManifest.xml 文件中显式声明一个 Activity 和其具有的基本属性（意图过滤器、权限、元数据等）：

```xml
    <manifest ... >
      <application ... >
          <activity android:name=".ExampleActivity" />
          ...
      </application ... >
      ...
    </manifest >
    
```

我们只需要通过 Java/Kotlin 代码编写一个类 ExampleActivity 继承自 Activity 即可，你可以借助于 Jetpack compose 或者 xml 布局文件来声明自己的UI样式，并运行展示效果。下面我们着重介绍一下 Activity 的“正菜”。

### Activity 属性介绍

```xml
<activity android:allowEmbedded=["true" | "false"]
          android:allowTaskReparenting=["true" | "false"]
          android:alwaysRetainTaskState=["true" | "false"]
          android:autoRemoveFromRecents=["true" | "false"]
          android:banner="drawable resource"
          android:clearTaskOnLaunch=["true" | "false"]
          android:colorMode=[ "hdr" | "wideColorGamut"]
          android:configChanges=["mcc", "mnc", "locale",
                                 "touchscreen", "keyboard", "keyboardHidden",
                                 "navigation", "screenLayout", "fontScale",
                                 "uiMode", "orientation", "density",
                                 "screenSize", "smallestScreenSize"]
          android:directBootAware=["true" | "false"]
          android:documentLaunchMode=["intoExisting" | "always" |
                                  "none" | "never"]
          android:enabled=["true" | "false"]
          android:excludeFromRecents=["true" | "false"]
          android:exported=["true" | "false"]
          android:finishOnTaskLaunch=["true" | "false"]
          android:hardwareAccelerated=["true" | "false"]
          android:icon="drawable resource"
          android:immersive=["true" | "false"]
          android:label="string resource"
          android:launchMode=["standard" | "singleTop" |
                              "singleTask" | "singleInstance"]
          android:lockTaskMode=["normal" | "never" |
                              "if_whitelisted" | "always"]
          android:maxRecents="integer"
          android:maxAspectRatio="float"
          android:multiprocess=["true" | "false"]
          android:name="string"
          android:noHistory=["true" | "false"]  
          android:parentActivityName="string" 
          android:persistableMode=["persistRootOnly" | 
                                   "persistAcrossReboots" | "persistNever"]
          android:permission="string"
          android:process="string"
          android:relinquishTaskIdentity=["true" | "false"]
          android:resizeableActivity=["true" | "false"]
          android:screenOrientation=["unspecified" | "behind" |
                                     "landscape" | "portrait" |
                                     "reverseLandscape" | "reversePortrait" |
                                     "sensorLandscape" | "sensorPortrait" |
                                     "userLandscape" | "userPortrait" |
                                     "sensor" | "fullSensor" | "nosensor" |
                                     "user" | "fullUser" | "locked"]
          android:showForAllUsers=["true" | "false"]
          android:stateNotNeeded=["true" | "false"]
          android:supportsPictureInPicture=["true" | "false"]
          android:taskAffinity="string"
          android:theme="resource or theme"
          android:uiOptions=["none" | "splitActionBarWhenNarrow"]
          android:windowSoftInputMode=["stateUnspecified",
                                       "stateUnchanged", "stateHidden",
                                       "stateAlwaysHidden", "stateVisible",
                                       "stateAlwaysVisible", "adjustUnspecified",
                                       "adjustResize", "adjustPan"] >   
    . . .
</activity>
```

以上属性来自于 Android 官方文档统计，下面介绍一些常用属性的含义：

> 名词解释：
>
> - 任务：即对应于 Activity 任务栈
> - 根 Activity：Activity 任务栈根部的实例

##### enabled

系统是否可实例化 Activity，`true` 表示可以，`false` 表示不可以。默认值为 `true` 。

`<application> `元素具有自己的 `enabled` 属性，该属性适用于所有应用组件，包括 Activity。只有在 `<application>` 和 `<activity>` 属性都为 `true`（因为它们都默认使用该值）时，系统才能将 Activity 实例化。如果其中任一属性为 `false`，则无法实例化。

##### exported

此元素设置 Activity 是否可由其他应用的组件启动：

- 如果设为 `true`，那么 Activity 可由任何应用访问，并且可通过其确切类名称启动。
- 如果设为 `false`，则 Activity 只能由同一应用的组件、使用同一用户 ID 的不同应用或具有特权的系统组件启动。 没有 intent 过滤器时，这是默认值。

如果应用中的 Activity 包含 intent 过滤器，请将此元素设置为 `true`，则允许其他应用启动该 Activity。例如，假设 Activity 是应用的主要 Activity，并且包含 `category`“`android.intent.category.LAUNCHER`”。

如果此元素设为 `false`，并且应用尝试启动该 Activity，系统会抛出 `ActivityNotFoundException`。此属性并非是限制 Activity 向其他应用公开的唯一方式。权限还可用于限制可调用 Activity 的外部实体（请参阅 `permission` 属性）。

##### allowTaskReparenting

当下一次将启动 Activity 的任务转至前台时，Activity 是否能从该任务转移至与其有相似性的任务，`true` 表示可以转移，`false` 表示仍须留在启动它的任务处。如果未设置该属性，则对 Activity 应用由 `<application>` 元素的相应 `allowTaskReparenting` 属性所设置的值。默认值为 `false`。

正常情况下，Activity 启动时会与启动它的任务栈关联，并在其整个生命周期中一直留在该任务栈中。当不再显示现有任务时，您可以使用该属性强制 Activity 将其父项（任务栈）更改为与其有相似性的任务栈。该属性通常用于将应用的 Activity 转移至与该应用关联的主任务栈。

例如，如果电子邮件消息包含网页链接，则点击该链接会调出可显示该网页的 Activity。该 Activity 由浏览器应用定义，但作为电子邮件任务栈的一部分启动。如果将该 Activity 的父项更改为浏览器任务栈，则它会在浏览器下一次转至前台时显示，在电子邮件任务栈再次转至前台时消失。

Activity 的相似性由 `taskAffinity` 属性定义。通过读取任务栈根部 Activity 的相似性即可确定任务的相似性。因此，按照定义，根 Activity 始终位于具有同一相似性的任务栈中。由于具有 `singleTask` 或 `singleInstance` 启动模式的 Activity 只能位于任务栈根部，因此更改父项仅限于 `standard` 和 `singleTop` 模式。

##### alwaysRetainTaskState

系统是否始终保持 Activity 所在任务栈的状态：`true` 表示是，`false` 表示允许系统在特定情况下将任务栈重置到其初始状态。默认值为 `false`。该属性只对任务栈根 Activity 有意义；所有其他 Activity 均可忽略该属性。

正常情况下，当用户从主屏幕重新选择某个任务时，系统会在特定情况下清除该任务（移除根 Activity 上的所有其他 Activity）。通常，如果用户在一段时间（如 30 分钟）内未访问任务，系统会执行此操作。不过，如果该属性的值是 `true`，则无论用户如何返回任务栈，该任务栈始终会显示最后一次的状态。例如，该属性非常适用于网络浏览器这类应用，因为其中存在大量用户不愿丢失的状态（如多个打开的标签）。

##### autoRemoveFromRecents

由具有该属性的 Activity 启动的任务栈是否一直保留在[概览屏幕](https://developer.android.com/guide/components/recents)中，直至任务栈中的最后一个 Activity 被销毁为止。若为 `true`，则自动从概览屏幕中移除任务。它会替换动态调用的 `FLAG_ACTIVITY_RETAIN_IN_RECENTS` 方式。通俗来讲，就是 Activity 被关闭后是否还一直保留在概览屏幕中。

##### excludeFromRecents

是否应从最近使用的应用列表（即[概览屏幕](https://developer.android.com/guide/components/recents)）中排除该 Activity（栈顶 Activity）。

##### clearTaskOnLaunch

**（TODO: 待试验）**

是否每当从主屏幕重新启动任务栈时都从中移除根 Activity 之外的所有 Activity。`true` 表示始终将任务清除到只剩其根 Activity；`false` 表示不做清除。默认值为 `false`。该属性只对启动新任务的 Activity（根 Activity）有意义；任务中的所有其他 Activity 均可忽略该属性。

若值为 `true`，则每次当用户再次启动任务时，无论用户最后在任务中正在执行哪个 Activity，也无论用户是使用“返回”还是“主屏幕”按钮离开，系统都会将用户转至任务的根 Activity。当值为 `false` 时，可在某些情况下清除任务中的 Activity（请参阅 `alwaysRetainTaskState` 属性），但也有例外。

例如，假设用户从主屏幕启动 Activity P，然后从该处转到 Activity Q。接着，该用户按下*主屏幕*，然后返回到 Activity P。正常情况下，用户将看到 Activity Q，因为这是其最后在 P 的任务中所执行的 Activity。不过，如果 P 将此标志设置为 `true`，当用户从主屏幕启动 Activity P 时，系统会移除 P 上方的所有 Activity（在本例中为 Q）。因此用户在返回任务时只会看到 P。

如果该属性和 `allowTaskReparenting` 的值均为 `true`，则如上所述，任何可更改父项的 Activity 都将转移至与其有相似性的任务；而其余 Activity 随即会被移除。如果未设置 `FLAG_ACTIVITY_RESET_TASK_IF_NEEDED`，系统将忽略此属性。

##### finishOnTaskLaunch

每当用户再次启动 Activity 的任务（在主屏幕上选择任务）时，是否应关闭（完成）根 Activity 之外的现有 Activity 实例。“`true`”表示应关闭，“`false`”表示不应关闭。默认值为“`false`”。如果此属性和 `allowTaskReparenting` 的值均为“`true`”，则优先使用此属性。系统会忽略 Activity 的相似性。系统不会更改 Activity 的父项，而是将其销毁。

如果未设置 `FLAG_ACTIVITY_RESET_TASK_IF_NEEDED`，系统将忽略此属性。

##### taskAffinity

与 Activity 有着相似性的任务。从概念上讲，具有同一相似性的 Activity 归属同一任务（从用户的角度来看，则是归属同一“应用”）。任务的相似性由其根 Activity 的相似性确定。默认情况下，应用中的所有 Activity 都具有同一相似性。您可以设置该属性，以不同方式将其分组，甚至可以在同一任务内放置不同应用中定义的 Activity。如要指定 Activity 与任何任务均无相似性，请将其设置为空字符串。当其与 `allowTaskReparenting` 一起使用的时候会产生特殊效果。

taskAffinity，是一种物以类聚的思想，它倾向于将 `taskAffinity` 属性相同的 Activity，扔进同一个 Task 中。不过，它的约束力，较之 `launchMode` 而言，弱了许多。只有当中的 `allowTaskReparenting` 设置为 `true`，抑或是调用方将 Intent 的 flag 添加 `FLAG_ACTIVITY_NEW_TASK` 属性时才会生效。如果有机会用到Android的 Notification 机制就能够知道，每一个由 `notification` 进行触发的 Activity，都必须是一个设成 FLAG_ACTIVITY_NEW_TASK 的 Intent 来调用。这时候，开发者很可能需要妥善配置 `taskAffinity` 属性，使得调用起来的 Activity，能够找到组织，在同一 `taskAffinity` 的 Task 中进行运行。

每个 Activity 都有 `taskAffinity` 属性，这个属性指出了它希望进入的 Task。如果一个 Activity 没有显式的指明该 Activity的 `taskAffinity`，那么它的这个属性就等于 Application 指明的 taskAffinity，如果 Application 也没有指明，那么该 `taskAffinity` 的值就等于包名。而 Task 也有自己的 **affinity** 属性，它的值等于它的根 Activity 的 `taskAffinity` 的值。

一开始，创建的 Activity 都会在创建它的 Task 中，并且大部分都在这里度过了它的整个生命。然而有一些情况，创建的 Activity 会被分配其它的 Task 中去，有的本来在一个Task中，之后出现了转移。如果该 Activity 的 `allowTaskReparenting` 设置为 `true`，它进入后台，当一个和它有相同 `affinity` 的 Task 进入前台时，它会重新宿主，进入到该前台的 task 中。

> 详细用法可参照：[Activity之taskAffinity和allowTaskReparenting](https://blog.csdn.net/iromkoear/article/details/70198605)

##### configChanges

列出 Activity 将自行处理的配置变更。在运行时发生配置变更时，默认情况下会关闭 Activity 并将其重启，但使用该属性声明配置将阻止 Activity 重启。相反，Activity 会保持运行状态，并且系统会调用其 `onConfigurationChanged()` 方法。

| 值                     | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| **density**            | 显示密度发生变更 - 用户可能已指定不同的显示比例，或者有不同的显示现处于活跃状态。在 API 级别 24 中引入。 |
| **fontScale**          | 字体缩放系数发生变更 - 用户已选择新的全局字号。              |
| **keyboard**           | 键盘类型发生变更 - 例如，用户插入外置键盘。                  |
| **keyboardHidden**     | 键盘无障碍功能发生变更 - 例如，用户显示硬键盘。              |
| **layoutDirection**    | 布局方向发生变更 - 例如，自从左至右 (LTR) 更改为从右至左 (RTL)。在 API 级别 17 中引入。 |
| **locale**             | 语言区域发生变更 - 用户已为文本选择新的显示语言。            |
| **mcc**                | IMSI 移动设备国家/地区代码 (MCC) 发生变更 - 检测到 SIM 并更新 MCC。 |
| **mnc**                | IMSI 移动设备网络代码 (MNC) 发生变更 - 检测到 SIM 并更新 MNC。 |
| **navigation**         | 导航类型（轨迹球/方向键）发生变更。（这种情况通常不会发生。） |
| **orientation**        | 屏幕方向发生变更 - 用户旋转设备。**注意**：如果应用面向 Android 3.2（API 级别 13）或更高版本的系统，则还应声明 `"screenSize"` 和 `"screenLayout"` 配置，因为当设备在纵向模式与横向模式之间切换时，该配置也会发生变更。 |
| **screenLayout**       | 屏幕布局发生变更 - 现处于活跃状态的可能是其他显示模式。      |
| **screenSize**         | 当前可用屏幕尺寸发生变更。该值表示目前可用尺寸相对于当前宽高比的变更，当用户在横向模式与纵向模式之间切换时，它便会发生变更。在 API 级别 13 中引入。 |
| **smallestScreenSize** | 物理屏幕尺寸发生变更。该值表示与方向无关的尺寸变更，因此它只有在实际物理屏幕尺寸发生变更（如切换到外部显示器）时才会变化。对此配置所作变更对应 [smallestWidth 配置](https://developer.android.com/guide/topics/resources/providing-resources#SmallestScreenWidthQualifier)的变化。在 API 级别 13 中引入。 |
| **touchscreen**        | 触摸屏发生变更。（这种情况通常不会发生。）                   |
| **uiMode**             | 界面模式发生变更 - 用户已将设备置于桌面或车载基座，或者夜间模式发生变更。如需了解有关不同界面模式的更多信息，请参阅 `UiModeManager`。在 API 级别 8 中引入。 |

任何或所有下列字符串均是该属性的有效值。若有多个值，则使用“`|`”进行分隔，例如 `locale|navigation|orientation`。所有这些配置变更都可能影响应用所看到的资源值。因此，调用 `onConfigurationChanged()` 时，通常有必要再次检索所有资源（包括视图布局、可绘制对象等），以正确处理变更。

##### directBootAware

Activity 是否可感知直接启动 (direct-boot)；即，它是否可以在用户解锁设备之前运行。详细用法参照：[Direct-boot doc](https://developer.android.com/training/articles/direct-boot) 和 [DirectBootSample](https://github.com/android/security-samples/tree/master/DirectBoot/)。举例说明：一般应用于闹钟和短信等提供重要优先级通知的应用。

##### maxRecents

概览屏幕中基于此活动的最大任务数。达到该设定条目数时，系统会从概览屏幕中移除近期最少使用的实例。有效值为 1 至 50（内存较小的设备使用 25）；0 为无效值。该值必须是整数，例如 50。默认值为 16。

##### maxAspectRatio

Activity 支持的最大宽高比。如果应用在具有较大宽高比的设备上运行，则系统会自动为其添加黑边，不会使用屏幕的某些部分，以便应用可按其指定的最大宽高比运行。最大宽高比表示为设备长边除以短边的商（小数形式）。例如，如果最大宽高比为 7:3，则此属性的值应设为 2.33。在非穿戴式设备上，此属性的值需设为大于或等于 1.33。在穿戴式设备上，该值必须大于或等于 1.0。否则，系统将忽略此设定值。

##### noHistory

当用户离开 Activity 且屏幕上不再显示该 Activity 时，是否应从 Activity 堆栈中将其移除并完成（调用其 `finish()` 方法）。`true` 表示应将其结束，`false` 表示不应将其结束。默认值为 `false`。`true` 一值表示 Activity 不会留下历史跟踪记录。它不会留在任务的 Activity 堆栈内，因此用户将无法返回 Activity。在此情况下，如果您通过启动另一个 Activity 来获取该 Activity 的结果，系统永远不会调用 `onActivityResult()`。

该属性是 API 级别 3 中的新增属性。

##### persistableMode

定义当设备重启时，如何在包含任务中保留 Activity 实例。如果使用此属性，您必须将其值设置为以下某个值：

| 值                     | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| `persistRootOnly`      | **默认值。**系统重启时会保留 Activity 任务，但仅使用根 Activity 的启动 Intent。如果应用的启动 Intent 加载应用的根 Activity，则此 Activity 不会接收 `PersistableBundle` 对象。 因此，在设备重启时，请勿使用 `onSaveInstanceState()` 保留应用根 Activity 的状态。 |
| `persistAcrossReboots` | 系统将保留此 Activity 的状态，以及每个高于[返回堆栈](https://developer.android.com/guide/components/activities/tasks-and-back-stack)且已将自身的 `persistableMode` 属性设置为 `persistAcrossReboots` 的 Activity 的状态。当 Intent 加载应用中将 `persistableMode` 属性设置为 `persistAcrossReboots` 的 Activity 时，此 Activity 将在其 `onCreate()` 方法中接收 `PersistableBundle` 对象。因此，您可使用 `onSaveInstanceState()` 在跨设备重新启动时保留 Activity 的状态，只要其 `persistableMode` 属性设置为 `persistAcrossReboots`。 |
| `persistNever`         | 系统不会保留 Activity 的状态。                               |

该属性是 API 级别 21 中的新增属性。

##### permission

启动 Activity 或以其他方式使 Activity 响应 Intent 时，客户端必须具备的权限的名称。如果系统尚未向 `startActivity()` 或 `startActivityForResult()` 的调用方授予指定权限，则其 Intent 将不会传递给 Activity。如果未设置该属性，则对 Activity 应用由 `<application>` 元素的 `permission` 属性所设置的权限。如果二者均未设置，则 Activity 不受权限保护。

如需详细了解权限，请参阅简介中的[权限](https://developer.android.com/guide/topics/manifest/manifest-intro#sectperm)部分以及另一篇文档 - [安全与权限](https://developer.android.com/guide/topics/security/security)。

##### process

Activity 运行的进程的名称。正常情况下，应用的所有组件均以为应用创建的默认进程名称运行，您无需使用该属性。但如有必要，您可以使用该属性替换默认进程名称，以便将应用组件散布到多个进程中。

如果为该属性分配的名称以冒号（“:”）开头，则系统会在需要时创建应用专用的新进程，并且 Activity 会在该进程中运行。如果进程名称以小写字符开头，则 Activity 将在采用该名称的全局进程中运行，前提是它具有相应权限。这样，不同应用中的组件就可以共享进程，从而减少资源使用量。

`<application>` 元素的 `process` 属性可为所有组件设置一个不同的默认进程名称。

##### screenOrientation

Activity 在设备上的显示方向。如果 Activity 是在[多窗口模式](https://developer.android.com/guide/topics/ui/multi-window)下运行，则系统会忽略该属性。

其值可以是下列任一字符串：

| `unspecified`      | 默认值。由系统选择方向。在不同设备上，系统使用的政策以及基于政策在特定上下文中所做的选择可能会有所差异。 |
| ------------------ | ------------------------------------------------------------ |
| `behind`           | 与 Activity 堆栈中紧接其后的 Activity 的方向相同。           |
| `landscape`        | 屏幕方向为横向（显示的宽度大于高度）。                       |
| `portrait`         | 屏幕方向为纵向（显示的高度大于宽度）。                       |
| `reverseLandscape` | 屏幕方向是与正常横向方向相反的横向。 *在 API 级别 9 中引入。* |
| `reversePortrait`  | 屏幕方向是与正常纵向方向相反的纵向。 *在 API 级别 9 中引入。* |
| `sensorLandscape`  | 屏幕方向为横向，但可根据设备传感器调整为正常或反向的横向。即使用户锁定基于传感器的旋转，系统仍可使用传感器。 *在 API 级别 9 中引入。* |
| `sensorPortrait`   | 屏幕方向为纵向，但可根据设备传感器调整为正常或反向的纵向。即使用户锁定基于传感器的旋转，系统仍可使用传感器。 *在 API 级别 9 中引入。* |
| `userLandscape`    | 屏幕方向为横向，但可根据设备传感器和用户首选项调整为正常或反向的横向。在 API 级别 18 中引入。 |
| `userPortrait`     | 屏幕方向为纵向，但可根据设备传感器和用户首选项调整为正常或反向的纵向。 在 API 级别 18 中引入。 |
| `sensor`           | 屏幕方向由设备方向传感器决定。显示方向取决于用户如何手持设备，它会在用户旋转设备时发生变化。但在默认情况下，一些设备不会旋转为所有四种可能的方向。如要支持所有这四种方向，请使用 `"fullSensor"`。即使用户锁定基于传感器的旋转，系统仍可使用传感器。 |
| `fullSensor`       | 屏幕方向由使用 4 种方向中任一方向的设备方向传感器决定。 这与 `"sensor"` 类似，不同之处在于无论设备在正常情况下使用哪种方向，该值均支持所有 4 种可能的屏幕方向（例如，一些设备正常情况下不使用反向纵向或反向横向，但其支持这些方向）。*在 API 级别 9 中引入。* |
| `nosensor`         | 确定屏幕方向时不考虑物理方向传感器。系统会忽略传感器，因此显示内容不会随用户手持设备的方向而旋转。 |
| `user`             | 用户当前的首选方向。                                         |
| `fullUser`         | 如果用户锁定基于传感器的旋转，则其行为与 `user` 相同，否则，其行为与 `fullSensor` 相同，并且支持所有 4 种可能的屏幕方向。 在 API 级别 18 中引入。 |
| `locked`           | 将方向锁定在其当前的任意旋转方向。在 API 级别 18 中引入。    |



##### windowSoftInputMode

Activity 的主窗口与包含屏幕软键盘的窗口之间的交互方式。该属性的设置会影响两点内容：

- 当 Activity 成为用户注意的焦点时软键盘的状态 - 隐藏还是可见。
- 对 Activity 主窗口所做的调整 - 是否将其尺寸调小，为软键盘腾出空间；或当软键盘遮盖部分窗口时，是否平移其内容以使当前焦点可见。

| 值                     | 说明                                                         |
| :--------------------- | :----------------------------------------------------------- |
| “`stateUnspecified`”   | 不指定软键盘的状态（隐藏还是可见）。系统会选择合适的状态，或依赖主题中的设置。这是对软键盘行为的默认设置。 |
| “`stateUnchanged`”     | 当 Activity 转至前台时保留软键盘最后所处的任何状态，无论是可见还是隐藏。 |
| “`stateHidden`”        | 当用户选择 Activity 时（换言之，当用户确实是向前导航到 Activity，而不是因离开另一 Activity 而返回时）隐藏软键盘。 |
| “`stateAlwaysHidden`”  | 当 Activity 的主窗口有输入焦点时始终隐藏软键盘。             |
| “`stateVisible`”       | 当用户选择 Activity 时（换言之，当用户确实是向前导航到 Activity，而不是因离开另一 Activity 而返回时）显示软键盘。 |
| “`stateAlwaysVisible`” | 当窗口获得输入焦点时，会显示软键盘。                         |
| “`adjustUnspecified`”  | 不指定 Activity 的主窗口是否通过调整尺寸为软键盘腾出空间，或者是否通过平移窗口内容以在屏幕上显示当前焦点。根据窗口的内容是否存在任何可滚动其内容的布局视图，系统会自动选择其中一种模式。如果存在这种视图，系统会调整窗口尺寸，前提是可通过滚动操作在较小区域内看到窗口的所有内容。这是对主窗口行为的默认设置。 |
| “`adjustResize`”       | 始终调整 Activity 主窗口的尺寸，以为屏幕上的软键盘腾出空间。 |
| “`adjustPan`”          | 不通过调整 Activity 主窗口的尺寸为软键盘腾出空间。相反，窗口的内容会自动平移，使键盘永远无法遮盖当前焦点，以便用户始终能看到自己输入的内容。这通常不如调整窗口尺寸可取，因为用户可能需关闭软键盘才能进入被遮盖的窗口部分，并与之进行交互。 |

该属性是 API 级别 3 中的新增属性。

### Activity 意图过滤器

#### 概述

Android 中组件间通信离不开大功臣 Intent。`Intent` 是一个消息传递对象，您可以用来从其他[应用组件](https://developer.android.com/guide/components/fundamentals#Components)请求操作。尽管 Intent 可以通过多种方式促进组件之间的通信，但其基本用例主要包括以下三个：

- 启动 Activity

  `Activity` 表示应用中的一个屏幕。通过将 `Intent` 传递给 `startActivity()`，您可以启动新的 `Activity` 实例。`Intent` 用于描述要启动的 Activity，并携带任何必要的数据。

  如果您希望在 Activity 完成后收到结果，请调用 `startActivityForResult()`。在 Activity 的 `onActivityResult()` 回调中，您的 Activity 将结果作为单独的 `Intent` 对象接收。

- 启动服务

  `Service` 是一个不使用用户界面而在后台执行操作的组件。使用 Android 5.0（API 级别 21）及更高版本，您可以启动包含 `JobScheduler` 的服务。如需了解有关 `JobScheduler` 的详细信息，请参阅其 `API-reference documentation`。

  对于 Android 5.0（API 级别 21）之前的版本，您可以使用 `Service` 类的方法来启动服务。通过将 `Intent` 传递给 `startService()`，您可以启动服务执行一次性操作（例如，下载文件）。`Intent` 用于描述要启动的服务，并携带任何必要的数据。

- 传递广播

  广播是任何应用均可接收的消息。系统将针对系统事件（例如：系统启动或设备开始充电时）传递各种广播。通过将 `Intent` 传递给 `sendBroadcast()` 或 `sendOrderedBroadcast()`，您可以将广播传递给其他应用。

#### Intent 类型

Intent 分为两种类型：

- **显式 Intent**：通过提供目标应用的软件包名称或完全限定的组件类名来指定可处理 Intent 的应用。通常，您会在自己的应用中使用显式 Intent 来启动组件，这是因为您知道要启动的 Activity 或服务的类名。例如，您可能会启动您应用内的新 Activity 以响应用户操作，或者启动服务以在后台下载文件。
- **隐式 Intent** ：不会指定特定的组件，而是声明要执行的常规操作，从而允许其他应用中的组件来处理。例如，如需在地图上向用户显示位置，则可以使用隐式 Intent，请求另一具有此功能的应用在地图上显示指定的位置。

下图显示如何在启动 Activity 时使用 Intent。当 `Intent` 对象显式命名某个具体的 Activity 组件时，系统立即启动该组件。

<img src="/Users/moos/blog/dorck-blog/img/in-post/post-android/intent-filters.png" alt="intent-filters" style="zoom:67%;" />

**[1]** *Activity A* 创建包含操作描述的 `Intent`，并将其传递给 `startActivity()`。

**[2]** Android 系统搜索所有应用中与 Intent 匹配的 Intent 过滤器。

**[3]** 找到匹配项后，该系统通过调用匹配 Activity (*Activity B*) 的 `onCreate()` 方法并将其传递给 `Intent`，以此启动匹配 Activity。

使用隐式 Intent 时，Android 系统通过将 Intent 的内容与在设备上其他应用的[清单文件](https://developer.android.com/guide/topics/manifest/manifest-intro)中声明的 *Intent 过滤器*进行比较，从而找到要启动的相应组件。如果 Intent 与 Intent 过滤器匹配，则系统将启动该组件，并向其传递 `Intent` 对象。如果多个 Intent 过滤器兼容，则系统会显示一个对话框，支持用户选取要使用的应用。

Intent 过滤器是应用清单文件中的一个表达式，用于指定该组件要接收的 Intent 类型。例如，通过为 Activity 声明 Intent 过滤器，您可以使其他应用能够直接使用某一特定类型的 Intent 启动 Activity。同样，如果您*没有*为 Activity 声明任何 Intent 过滤器，则 Activity 只能通过显式 Intent 启动。

#### 创建 Intent



### Activity Alias 介绍



### Activity 生命周期



### Activity 状态保存



### 参考文档

- [*Android Activity introduction*](https://developer.android.com/guide/components/activities/intro-activities)

- [*Android manifest elements*](https://developer.android.com/guide/topics/manifest/activity-element)
- [*Intent Flags*](https://tkuong.cn/2021/09/27/Intent_Flags/)