---
layout: post
title: "MotionLayout：打开动画新世界大门(partI)"
date: 2019-10-19 22:23:10
author:     "Dorck"
catalog: false
header-style: text
tags: 
- MotionLayout
- Android 动画
categories: Android
---
最初接触到 **MotionLayout** 是在国外知名博客的 [Android 专栏](https://medium.com/google-developers)上。第一眼见到 `MotionLayout` 时无疑是兴奋的，在经过使用和熟悉了这个布局组件之后，我就想将这份喜悦传递给国内开发者，从此“拳打”设计，“脚踢”产品😁。当然，由于关于 `MotionLayout` 的外文专栏相关介绍已足够详细，所以本文仅对其进行总结和简单应用。老规矩，正文开始前先上一张图：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f3afe537b4f?w=220&h=388&f=gif&s=2910185)<!-- more -->



## 简介

由于本文的受众需要有一点 `ConstraintLayout` 的用法基础，如果你对它并不熟悉，可以先去花几分钟看一下本人之前的译文：[带你领略 ConstraintLayout 1.1 的新功能](https://juejin.im/post/6844903608064933895)。回到正题，什么是 ***MotionLayout*** ？很多人可能会对这个名词比较陌生，但如果说到它的前身 — **`ConstraintLayout`**，大家应该就多少有些了解了。*MotionLayout* 其实是  Google 在去年开发者大会上新推的布局组件。我们先来看看 **Android 官方**对于它的定义：

>***[MotionLayout](https://developer.android.com/reference/android/support/constraint/motion/MotionLayout) is a layout type that helps you manage motion and widget animation in your app. MotionLayout is a subclass of [`ConstraintLayout`](https://developer.android.com/training/constraint-layout) and builds upon its rich layout capabilities.***

简单翻译过来就是：`MotionLayout` 是一个能够帮助我们在 app 中**管理手势**和控件**动画**的布局组件。它是 `ConstraintLayout` 的子类并且基于它自身丰富的布局功能来进行构建。

当然，你也可以按照字面意思将它简单理解为“运动布局”。为什么这么说呢？通过上图来对比传统的布局组件（如：`FrameLayout`、`LinearLayout` 等），我们不难发现：`MotionLayout` 是布局组件中的一个“里程碑”，由此开始就告别了 XML 文件中只能”静态“操作 UI 的历史。通过 `MotionLayout`，我们就能更加轻易处理其内部子 `View` 的手势操作和"运动"效果了。正如 *Nicolas Roard* 所说的那样：

>*你可以在 MotionLayout 功能方面将其看作是属性动画、TransitionManager 和 CoordinatorLayout 的结合体*。

## MotionLayout 基础

首先，我们需要从 `MotionLayout` 的一些基本属性和用法讲起，这样对于我们后面的实际操作将会很有帮助。

#### 引入 MotionLayout 库

```groovy
dependencies {
    implementation 'com.android.support.constraint:constraint-layout:2.0.0-beta2'
}
```

目前，`MotionLayout` 仍处于 `beta` 版本，虽然官方之前说过 `MotionLayout` 的动画辅助工具将会在 `beta` 版本推出，但目前还没有出现，不出意外应该是在下一个版本了。到时候应该就可以像 `ConstraintLayout` 那样直接通过布局编辑器来进行部分预览和参数操作了。

#### 在布局文件中使用 MotionLayout

想要使用 `MotionLayout`，只需要在布局文件中作如下声明即可：

```xml
<android.support.constraint.motion.MotionLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layoutDescription="@xml/scene1">

</android.support.constraint.motion.MotionLayout>
```

由于 `MotionLayout` 作为 `ConstraintLayout` 的子类，那么就自然而然地可以像 `ConstraintLayout` 那样使用去“约束”子视图了，不过这可就有点“大材小用了”，`MotionLayout` 的用处可远不止这些。我们先来看看 MotionLayout 的构成：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f424c2dc530?w=973&h=709&f=png&s=74710)

由上图可知，MotionLayout 可分为 *`<View>`* 和 *`<Helper>`* 两个部分。*`<View>`* 部分可简单理解为一个 `ConstraintLayout`，至于 *`<Helper>`* 其实就是我们的“动画层”了。MotionLayout 为我们提供了 `layoutDescription` 属性，我们需要为它传入一个 `MotionScene` 包裹的 `XML` 文件，想要实现动画交互，就必须通过这个“媒介”来连接。

## MotionScene：传说中的“百宝袋”

什么是 MotionScene？结合上图 MotionScene 主要由三部分组成：**`StateSet`**、**`ConstraintSet`** 和 **`Transition`**。为了让大家快速理解和使用 MotionScene，本文将重点讲解 `ConstarintSet` 和 `Transition`，至于 `StateSet` 状态管理将会在后续文章中为大家介绍具体用法和场景。同时，为了帮助大家理解，此处将开始结合一些具体小实例来帮助大家快速理解和使用它。

首先，我们从实现下面这个简单的效果讲起：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f494ade8e8f?w=480&h=267&f=gif&s=106098)

GIF 画质有点渣，见谅，但从上图我们可以发现这是一个简单的平移动画，通过点击自身（篮球）来触发，让我们来通过 MotionLayout 的方式来实现它。首先来看下布局文件：

```xml
<?xml version="1.0" encoding="utf-8"?>
<android.support.constraint.motion.MotionLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:layoutDescription="@xml/step1"
        tools:context=".practice.MotionSampleActivity">
    <ImageView
        android:id="@+id/ball"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:src="@drawable/ic_basketball"/>
</android.support.constraint.motion.MotionLayout>
```

布局文件很简单，只不过你可能会注意到，我们对 `ImageView` 并没有添加任何约束，原因在于：我们会在 `MotionScene` 中声明 `ConstraintSet`，里面将包含该 `ImageView` 的“运动”起始点和终点的约束信息。当然你也可以在布局文件中对其加以约束，**但 `MotionScene` 中对于控件约束的优先级会高于布局文件中的设定**。这里我们通过 `layoutDescription` 来为 `MotionLayout` 设置它的 `MotionScene` 为 `step1`，接下来就让我们一睹 `MotionScene` 的芳容：

```xml
<?xml version="1.0" encoding="utf-8"?>
<!--describe the animation for activity_motion_sample_step1.xml-->
<MotionScene xmlns:android="http://schemas.android.com/apk/res/android"
             xmlns:app="http://schemas.android.com/apk/res-auto">
    <!-- A transition describes an animation via start and end state -->
    <Transition
        app:constraintSetStart="@id/start"
        app:constraintSetEnd="@id/end"
        app:duration="2200">
        <OnClick
                app:targetId="@id/ball"
                app:clickAction="toggle" />
    </Transition>

    <!-- Constraints to apply at the start of the animation -->
    <ConstraintSet android:id="@+id/start">
        <Constraint
                android:id="@+id/ball"
                android:layout_width="48dp"
                android:layout_height="48dp"
                android:layout_marginStart="12dp"
                android:layout_marginTop="12dp"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintTop_toTopOf="parent"/>
    </ConstraintSet>

    <!-- Constraints to apply at the end of the animation -->
    <ConstraintSet android:id="@+id/end">
        <Constraint
                android:id="@+id/ball"
                android:layout_width="48dp"
                android:layout_height="48dp"
                android:layout_marginEnd="12dp"
                android:layout_marginBottom="12dp"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
    </ConstraintSet>

</MotionScene>
```

首先，可以发现我们定义了两个 *`<ConstraintSet>`*，分别描述了这个🏀 `ImageView` 的动画起始位置以及结束位置的约束信息（仅包含少量必要信息，如：width、height、margin以及位置属性等）。显而易见，篮球的起始位置为屏幕左上角，结束位置为屏幕右下角，那么问题来了，如何让它动起来呢？这就要依靠我们的 *`<Transition>`* 元素了。事实上，我们都知道，动画都是有开始位置和结束位置的，而 `MotionLayout` 正是利用这一客观事实，将首尾位置和动画过程分离，两个点位置和距离虽然是固定的，但是它们之间的 **Path** 是无限的，可以是“一马平川”，也可以是"蜿蜒曲折"的。

回到上面这个例子，我们只需要为 `Transition` 设置起始位置和结束位置的 `ConstraintSet` 并设置动画时间即可，剩下的都交给 `MotionLayout` 自动去帮我们完成。当然你也可以通过 `onClick` 点击事件来触发动画，绑定目标控件的 id 以及通过 `clickAction` 属性来设置点击事件的类型，这里我们设置的是 `toggle`，即通过反复点击控件来切换动画的状态，其他还有很多属性可以参照官方文档去研究，比较简单，这里就不一一讲解它们的效果了。如此一来，运行一下就能看到上面的效果了。另外，为了方便测试，我们可以给 `MotionLayout` 加上调试属性：*`app:motionDebug="SHOW_PATH"`*，然后就能轻易的查看其动画内部的运动轨迹：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f4cf6fccc0d?w=480&h=267&f=gif&s=81933)

什么？你说这个动画效果太基础？那好，我就来个简陋版的“百花齐放”效果吧，比如下面这样：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f511987271b?w=230&h=406&f=gif&s=181633)

首先，让我们分析一下这个效果：仔细看我们可以发现，通过向上滑动蓝色的 Android 机器人，紫色和橙色的机器人会慢慢淡出并分别忘左上角和右上角移动。布局文件很简单，一把梭就OK了😂：

```xml
<?xml version="1.0" encoding="utf-8"?>
<android.support.constraint.motion.MotionLayout
        xmlns:android="http://schemas.android.com/apk/res/android"
        xmlns:tools="http://schemas.android.com/tools"
        xmlns:app="http://schemas.android.com/apk/res-auto"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        app:motionDebug="SHOW_PATH"
        app:layoutDescription="@xml/step2"
        tools:context=".practice.MotionSampleActivity">
    <ImageView
            android:id="@+id/ic_android_blue"
            android:layout_width="42dp"
            android:layout_height="42dp"
            android:src="@mipmap/android_icon_blue"/>
    <ImageView
            android:id="@+id/ic_android_left"
            android:layout_width="42dp"
            android:layout_height="42dp"
            android:src="@mipmap/android_icon_purple"/>
    <ImageView
            android:id="@+id/ic_android_right"
            android:layout_width="42dp"
            android:layout_height="42dp"
            android:src="@mipmap/android_icon_orange"/>
    <TextView
            android:id="@+id/tipText"
            android:text="Swipe the blue android icon up"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            app:layout_constraintEnd_toEndOf="parent"
            android:layout_marginEnd="16dp"
            android:layout_marginTop="16dp"
            app:layout_constraintTop_toTopOf="parent"/>
</android.support.constraint.motion.MotionLayout>
```

下面我们来看下 `step2` 中的 MotionScene：

```xml
<?xml version="1.0" encoding="utf-8"?>
<!--describe the animation for activity_motion_sample_step2.xml-->
<!--animate by dragging target view-->
<MotionScene xmlns:android="http://schemas.android.com/apk/res/android"
             xmlns:app="http://schemas.android.com/apk/res-auto">
    <!--At the start, all three stars are centered at the bottom of the screen.-->
    <ConstraintSet android:id="@+id/start">
        <Constraint
                android:id="@+id/ic_android_blue"
                android:layout_width="42dp"
                android:layout_height="42dp"
                android:layout_marginBottom="20dp"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
        <Constraint
                android:id="@+id/ic_android_left"
                android:layout_width="42dp"
                android:layout_height="42dp"
                android:alpha="0.0"
                android:layout_marginBottom="20dp"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
        <Constraint
                android:id="@+id/ic_android_right"
                android:layout_width="42dp"
                android:layout_height="42dp"
                android:layout_marginBottom="20dp"
                android:alpha="0.0"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
    </ConstraintSet>

    <!--Define the end constraint to set use a chain to position all three stars together below @id/tipText.-->
    <ConstraintSet android:id="@+id/end">
        <Constraint
                android:id="@+id/ic_android_left"
                android:layout_width="58dp"
                android:layout_height="58dp"
                android:layout_marginEnd="90dp"
                android:alpha="1.0"
                app:layout_constraintHorizontal_chainStyle="packed"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintEnd_toStartOf="@id/ic_android_blue"
                app:layout_constraintTop_toBottomOf="@id/tipText"/>
        <Constraint
                android:id="@+id/ic_android_blue"
                android:layout_width="58dp"
                android:layout_height="58dp"
                app:layout_constraintEnd_toStartOf="@id/ic_android_right"
                app:layout_constraintStart_toEndOf="@id/ic_android_left"
                app:layout_constraintTop_toBottomOf="@id/tipText"/>
        <Constraint
                android:id="@+id/ic_android_right"
                android:layout_width="58dp"
                android:layout_height="58dp"
                android:layout_marginStart="90dp"
                android:alpha="1.0"
                app:layout_constraintStart_toEndOf="@id/ic_android_blue"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintTop_toBottomOf="@id/tipText"/>
    </ConstraintSet>
    <!-- A transition describes an animation via start and end state -->
    <Transition
            app:constraintSetStart="@id/start"
            app:constraintSetEnd="@id/end">
        <!-- MotionLayout will track swipes relative to this view -->
        <OnSwipe app:touchAnchorId="@id/ic_android_blue"/>
    </Transition>
</MotionScene>
```

上面代码其实很好理解，之前我们定义了一个控件的 `Constraint`，现在只需要多加两个即可。由于三个 Android 机器人起点位置是一样的，而只有蓝色的显示，那么只要在开始位置将另外的两个机器人透明度设置为 0 即可，然后在结束位置将三个小机器人分开摆放，这里设计到 `ConstraintLayout` 的基础，就不多说了。接着将结束位置的左、右 Android 机器人透明度设置为 1，动画开始后，`MotionLayout` 会自动处理目标控件 **alpha** 属性的变化效果，让其看起来依旧丝滑。

另外，我们这里没有再通过 *`<OnClick>`* 来触发动画效果，类似的，我们使用了 *`<OnSwipe>`* 手势滑动来触发动画，只需要指定 `touchAnchorId` 为蓝色小机器人即可，怎么样，是不是有种“拍案惊奇”的感觉😁。此外，你可以通过指定 `touchAnchorSide` 和 `dragDirection` 等来指定自己想要的滑动手势和滑动方向，默认为向上滑动，手势滑动我们将在后面示例中穿插使用和讲解，这里不做具体介绍，忍不住的小伙伴可以去查看一下官方文档介绍。OK，就这样，我们上面的伪“百花齐放”效果就已经实现了，没什么难的对吧😄。

到这里，你可能会说：前面两个示例的动画轨迹一直是"直线"，如果想要某段动画过程的轨迹是"曲线"效果可以吗？当然没问题！**Keyframes** 关键帧帮你安排！

## KeyFrameSet：让动画独树一帜

如果我们想实现“独树一帜”的动画交互效果，那就离不开 KeyFrameSet 这个强大的属性。它可以改变我们动画过程中某个关键帧的位置以及状态信息。这样说可能不太好理解，我们先来看下面这个示例：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f56c94abb3d?w=480&h=266&f=gif&s=147065)

以大家的慧眼不难发现：风车的运动轨迹为曲线，并且旋转并放大至中间位置时会达到零界点，然后开始缩小。布局代码就不上了，很简单，里面唯一重要的就是我们需要实现的 MotionScene 效果 — `step3.xml` 了：

```xml
<?xml version="1.0" encoding="utf-8"?>
<!--describe the animation for activity_motion_sample_step3.xml-->
<!--animate in the path way on a view-->
<MotionScene xmlns:android="http://schemas.android.com/apk/res/android"
             xmlns:app="http://schemas.android.com/apk/res-auto">
    <!-- Constraints to apply at the start of the animation -->
    <ConstraintSet android:id="@+id/start">

        <Constraint
                android:id="@id/windmill"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_marginStart="12dp"
                android:layout_marginBottom="12dp"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>

        <Constraint
                android:id="@id/tipText"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:alpha="0.0"
                app:layout_constraintStart_toStartOf="parent"
                app:layout_constraintBottom_toBottomOf="@id/windmill"
                app:layout_constraintTop_toTopOf="@id/windmill"/>
    </ConstraintSet>
    <!-- Constraints to apply at the end of the animation -->
    <ConstraintSet android:id="@+id/end">
        <!--this view end point should be at bottom of parent-->
        <Constraint
                android:id="@id/windmill"
                android:layout_width="40dp"
                android:layout_height="40dp"
                android:layout_marginBottom="12dp"
                android:layout_marginEnd="12dp"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
        <Constraint
                android:id="@+id/tipText"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginBottom="12dp"
                android:alpha="1.0"
                android:layout_marginEnd="72dp"
                app:layout_constraintEnd_toEndOf="parent"
                app:layout_constraintBottom_toBottomOf="parent"/>
    </ConstraintSet>

    <!-- A transition describes an animation via start and end state -->
    <Transition
            app:constraintSetStart="@id/start"
            app:constraintSetEnd="@id/end">
        
        <KeyFrameSet>
            <KeyPosition
                    app:framePosition="50"
                    app:motionTarget="@id/windmill"
                    app:keyPositionType="parentRelative"
                    app:percentY="0.5"/>
            <!--apply other animation attributes-->
            <!--前半段的动画效果：逆时针旋转一圈，同时放大一倍-->
            <KeyAttribute
                    app:motionTarget="@id/windmill"
                    android:rotation="-360"
                    android:scaleX="2.0"
                    android:scaleY="2.0"
                    app:framePosition="50"/>
            <!--后半段的动画效果：逆时针旋转一圈，同时变回原样-->
            <KeyAttribute
                    app:motionTarget="@id/windmill"
                    android:rotation="-720"
                    app:framePosition="100"/>
            <!--延迟动画——0-85过程中将透明度一直维持在0.0-->
            <KeyAttribute
                    app:motionTarget="@id/tipText"
                    app:framePosition="85"
                    android:alpha="0.0"/>
        </KeyFrameSet>

        <OnSwipe
            app:touchAnchorId="@id/windmill"
            app:touchAnchorSide="bottom"
            app:dragDirection="dragRight"/>
    </Transition>

</MotionScene>
```

从上述代码我们可以发现：`KeyFrameSet` 需要被包含在 `Transition` 里面，同时 `KeyFrameSet` 中定义了 *`<KeyPosition>`* 和 *`<KeyAttribute>`* 两种元素，它们主要用来设置动画某个位置的关键帧，进而**为某段动画指定所期望的效果**。顾名思义，`KeyPosition` 用于指定动画某个关键帧的位置信息，而 `KeyAttribute` 则用来描述动画某关键帧的属性配置（如：透明度、缩放、旋转等）。除此以外，`KeyFrameSet` 中还支持 *`<KeyCycle>`* 和 *`<KeyTimeCycle>`* 来让动画变得更加有趣和灵活，因篇幅有限，将在后续文章对二者进行讲解。

我们先来看下 `KeyPosition` 的构成：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f5bb1b874a5?w=251&h=372&f=png&s=41630)

从上图可见，`keyPositionType` 一共有三种，本文使用的是 `parentRelative`，即以整个 `MotionLayout` 的布局为坐标系，左上角为坐标原点，即参考 View 的坐标系即可，而另外两种将在后续文章统一讲解和应用，它们的区别在于坐标系选取的参考点不同而已。我们通过 `framePosition` 属性来**指定关键帧所在的位置**，取值范围为 `0 - 100`，本示例中设置的 `50` 即为动画中点位置。另外，可以通过指定 `percentX` 和 `percentY` 来设置该关键帧位置的偏移量，它们取值一般为 `0 — 1`，当然也可以设置为负数或者大于一，比如，本示例中如果没有设置偏移量，那么动画的轨迹无疑是一条平行于 x 轴的直线，但通过设置 `app:percentY="0.5"`，那么风车就会在动画中点位置向 y 轴方向偏移一半的高度，即下图的效果（开始 `debug` 模式）：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f60667bc150?w=648&h=362&f=png&s=21055)

可能会有人问了：为什么轨迹不是三角形，而是曲线呢？哈哈，这个问题问得好！因为 `MotionLayout` 会自动地将关键帧位置尽量衔接的圆滑，让动画执行起来不那么僵硬。其他代码应该就比较好理解了，可以参照文档理解。

了解完 `KeyFrameSet` 的用法，那么我们就很轻易的实现下面这个效果啦：


![](https://user-gold-cdn.xitu.io/2019/8/18/16ca4f653135b802?w=230&h=406&f=gif&s=263179)

代码就不贴了，`MotionLayout` 系列代码都会上传至 GitHub 上，感兴趣的小伙伴可以去看一下。不知不觉已经讲了这么多，但发现还有很多内容没有涉及到或是讲清楚，由于篇幅有限，就只能放在后面几期来为大家介绍啦😄。如果大家觉得对本文有什么问题或者建议，欢迎评论区留言，知无不言，言无不尽。



> ***本文全部代码：https://github.com/Moosphan/ConstraintSample***
>
> 后续文章将继续跟进相关进阶用法，该仓库也将持续更新，敬请期待~

## 参考和感谢：

>[*Introduction to MotionLayout (part I)*](https://medium.com/google-developers/introduction-to-motionlayout-part-i-29208674b10d)
>
>[*Introduction to MotionLayout (part II)*](https://medium.com/google-developers/introduction-to-motionlayout-part-ii-a31acc084f59)
>
>[*Introduction to MotionLayout (part III)*](https://medium.com/google-developers/introduction-to-motionlayout-part-iii-47cd64d51a5)
>
>[*Defining motion paths in MotionLayout*](https://medium.com/google-developers/defining-motion-paths-in-motionlayout-6095b874d37?)
>
>[*MotionLayout development*](https://developer.android.google.cn/reference/androidx/constraintlayout/motion/widget/MotionLayout?hl=en)

## 最后

>本文的出发点是希望仅仅为大家提供一个“钥匙孔”的角色，通过这个“孔”，大家可以依稀看见门里“宝藏”的余光，想要打开门寻得宝藏，就需要大家"事必躬亲"，拿到“钥匙”来打开这扇门了😄。当然，大家也可以继续关注我的后续之作，来发现更多 `MotionLayout` 的宝藏。