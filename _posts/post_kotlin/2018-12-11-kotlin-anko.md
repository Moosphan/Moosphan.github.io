---
layout: post
title: "Android Kotlin 快速开发之 Anko 魔法"
date: 2018-12-11 20:50:14
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Kotlin
- Anko
categories: kotlin
---
众所周知，目前 kotlin 已经作为 Google 官方推荐的 Android 开发语言，目前 GitHub 上面关于 kotlin 的项目已然呈现一片势不可挡的热度。作为一名 Android 开发者，学好 koltin 已经成为我们必须 get 的技能，而想要在工作中使用 kotlin 快速开发项目，Anko 无疑成为首选利器！

​	那么 Anko 到底是什么呢？可以为我们做哪些事情呢？

​	Anko 是一款 kotlin 的扩展库，可以帮助我们更加简单、快速的开发 Android 应用。它能够让我们的代码更加洁净易读，并且忘记 Java 那种繁琐、复杂的编程方式。Anko 库主要分为以下几个部分：

- *Anko Commons*（通用扩展库）：一个轻量级的帮助库，可以让我们使用少量代码就可以轻松、快速使用 `Intent`、`Dialog`、 `Log`、 `Toast` 、 `SnackBar` 等常用功能。
- *Anko Layouts*（布局扩展库）：一种快速、类型安全的方式去通过代码动态编写 Android 布局，有点类似 swift 中的方式。
- *Anko SQLite*（SQLite扩展库）：一个针对Android的SQLite查询DSL和解析器的集合。
- *Anko Coroutines*（kotlin协程扩展库）：基于 `kotlinx.coroutines` 库的扩展<!--more-->




由于一篇文章篇幅较长，故分为上下两部分来讲解，上篇主要介绍**Anko Commons**扩展库的相关功能。



### Anko Commons

该库主要包含一些常见功能的扩展和封装，常见的有 `dialogs` 、`intent`、`toast`、`snackBar` 等，下面我们先来看看具体如何使用它们。首先需要依赖一下扩展包：

```
// Anko Commons
implementation "org.jetbrains.anko:anko-commons:0.10.8"
```

#### Toasts

Toast（吐司）算是我们最常用的功能，大家项目中或多或少都对其进行了一层封装，anko 中使用也很方便，只需要这样：

```
toast("login success!")
toast(R.string.login_success)
longToast("Wow, nice work!")
```



#### SnackBars

SnackBar 是Android5.0后 `material design` 中常用控件之一，它的出现和 `Toast` 差不多，为了给用户带来一些提示性信息，具体特点可以自行查阅相关文章。通过 Anko 我们只需要通过以下方式就可以直接体会到它的魅力：

```
view.snackbar("login success!")
view.snackbar(R.string.login_success)
view.longSnackbar("Wow, nice work!")
view.snackbar("Action, reaction", "Click me!") { doSomeThing() }
```



#### Dialogs

Dialog 是我们最常用的功能之一，它较为醒目，层级较高，其中最常用的当属 `AlertDialog` 了，通常我们这样使用：

```
AlertDialog.Builder(this)
        .setPositiveButton(R.string.btn_allow_text) { _, _ -> request.proceed() }
        .setNegativeButton(R.string.btn_deny_text) { _, _ -> request.cancel() }
        .setCancelable(false)
        .setTitle("提示")
        .setMessage("我们需要请求使用您手机的部分权限，是否同意？")
        .show()
```

虽然是链式调用，但使用较多时依旧很麻烦，通过 Anko，我们可以直接通过下面代码来实现相同功能：

```
alert("我们需要请求使用您手机的部分权限，是否同意？", "提示"){
    yesButton {
        request.proceed() 
    }

    noButton {
		request.cancel()
    }
}.show()
```

比较下来，是不是很方便，节省了一多半的代码量。

当然，很多时候我们需要使用  `AppCompat` 下的 `AlertDialog` ，因为它提供了向下兼容的特性，保证在不同Android系统上尽量达到相同效果，这时我们需要依赖针对 AppCompat 的扩展包：

```
// Appcompat-v7 (only Anko Commons)
implementation "org.jetbrains.anko:anko-appcompat-v7-commons:0.10.8"
```

然后我就可以直接这样使用 `AppCompat` 下的 `AlertDialog` 了：

```
alert(Appcompat, "我们需要请求使用您手机的部分权限，是否同意？", "提示"){
    yesButton {
        request.proceed() 
    }

    noButton {
		request.cancel()
    }
}.show()
```

如果我们想自定义弹窗的布局呢？别着急，Anko 同样为我们提供方式实现：

```
alert {
    customView {
        editText()
    }
}.show()
```

什么？这就完了？没错，如果你想在弹窗里放一个输入框，这样就实现了。你肯定会好奇，怎么设置layout呢？先别急，这是anko为我们提供的另外一个强大功能，这块将在后面说到，先卖卖关子😁。

你可能又会突然想起来，`AlertDialog` 还为我们提供了列表单选功能呢，哈哈，anko 同样为我们考虑到了，我们只需要这样写：

```
alert(Appcompat, "Please select your country where you come from", "Tips"){
            yesButton {
                
            }

            noButton {

            }

            val countries = listOf("Russia", "USA", "Japan", "Australia")
            selector("Where are you from?", countries) { _, i ->
                toast("So you're living in ${countries[i]}, right?")
            }
        }.show()

```

怎么样，是不是也很方便？只需要在`alert`域中通过 `selector` 实现就可以了。

另外，Anko 同样为我们提供了快速使用 `ProgressDialog` 方式，例如：

```
val dialog = progressDialog(message = "Please wait…", title = "Tips")
```

#### Intent

开发过 Android 都知道，`Intent` 是我们构建页面时必不可少的工具，它是四大组件通信的"信使"。一般地，我们在项目中这样使用：

```
val intent = Intent(this, SomeOtherActivity::class.java)
intent.putExtra("id", 5)
intent.setFlag(Intent.FLAG_ACTIVITY_SINGLE_TOP)
startActivity(intent)
```

而我们通过 Anko 就完全可以通过一行代码实现：

```
startActivity(intentFor<SomeOtherActivity>("id" to 5).singleTop())
```

怎么样，是不是超级方便？而且它给我们提供的链式调用，很清晰，此外，它还为我们提供了 `Intent` 常用功能，例如拨打电话、发邮件、分享等等：

| Goal            | Solution                                   |
| --------------- | ------------------------------------------ |
| Make a call     | `makeCall(number)` without **tel:**        |
| Send a text     | `sendSMS(number, [text])` without **sms:** |
| Browse the web  | `browse(url)`                              |
| Share some text | `share(text, [subject])`                   |
| Send a email    | `email(email, [subject], [text])`          |

#### Log

Log 日志功能我们平时应该说用的最多了，通常用来打印一些关键信息，测试一些关键逻辑正确性。Anko 为我们提供了自己的扩展封装，使用起来很方便：

```
class SomeActivity : Activity(), AnkoLogger {
    private fun someMethod() {
        info("London is the capital of Great Britain")
        debug(5) // .toString() method will be executed
        warn(null) // "null" will be printed
    }
}
```

或者不想通过实现接口方式，可以借助以下方式：

```
class SomeActivity : Activity() {
    private val log = AnkoLogger(this.javaClass)
    private val logWithASpecificTag = AnkoLogger("my_tag")

    private fun someMethod() {
        log.warning("Big brother is watching you!")
    }
}
```

对应的日志打印方法如下：

| android.util.Log | AnkoLogger  |
| ---------------- | ----------- |
| `v()`            | `verbose()` |
| `d()`            | `debug()`   |
| `i()`            | `info()`    |
| `w()`            | `warn()`    |
| `e()`            | `error()`   |
| `wtf()`          | `wtf()`     |

#### 其他特殊扩展功能

1. **Colors**

   Anko为我们提供了两种针对色彩的扩展功能来让我们的代码更佳易读，如：

   | Function           | Result                  |
   | ------------------ | ----------------------- |
   | `0xff0000.opaque`  | 不透明的红色            |
   | `0x99.gray.opaque` | 不透明的#999999（灰色） |

2. **Dimensions**

   你可以指定 dimension 的 **dip** (density-independent pixels) 或  **sp** (scale-independent pixels)值: `dip(dipValue)` 或 `sp(spValue)`. **注意** `textSize`属性默认接受**sp** (`textSize = 16f`). 使用 `px2dip` 和 `px2sp` 相互转换.

3. **applyRecursively**

   `applyRecursively` 方法将lambda表达式应用于传递 `View` 的本身，如果它是 `ViewGroup` ，则递归到它的每个字节点，例如这样：

   ```
   verticalLayout {
       editText {
           hint = "Name"
       }
       editText {
           hint = "Password"
       }
       button("login now") {
           onClick { toast("login success!") }
       }
   }.applyRecursively { view -> when(view) {
       is EditText -> view.textSize = 20f
       is Button   -> view.text = "点我呀～"
   }}
   ```



**Anko Commons** 基础扩展库已经介绍的差不多了，怎么样？看完 Anko 施加在 Android 上的“魔法”，是不是迫不及待地想去大展身手了？原来代码还可以这样简洁明了，方便易用。
