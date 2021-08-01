---
layout: post
title: "Flutter 中“倒计时”的那些事儿"
date: 2020-02-18 21:20:55
author:     "Dorck"
catalog: false
header-style: text
tags: Flutter
categories: Flutter
toc: true
---
好久不见了，文章有一段时间没有更新了，最近一直在沉迷工作无法自拨😂。上周，应公司号召以及上次Google大会中Flutter宣讲的感染，计划将公司新项目采用Flutter技术实现。大概花了几天熟悉了一下Flutter基础语法和结构组成，便着手开始项目的搭建和基础模块功能开发，毕竟只有通过实战才能加快新技术的熟悉和“消化”。

说到验证码功能，我们通常的做法可能是借助于**计时器**来实现，抱着几乎肯定的态度赶紧去查了一下 Flutter 官网有没有相关的计时器组件。果不其然，官方的确为我们提供了一个 [**Timer**](https://api.flutter.dev/flutter/dart-async/Timer-class.html) 组件来实现倒计时，我们来看看官方对于它的描述：
<article class="message is-primary" style="font-size:1em">
<div class="message-body">
Count-down timer that can be configured to fire once or repeatedly.
</div>
</article>
<!-- more -->

即**它是一个支持一次或者多次周期性触发的计时器**。首先，让我们来熟悉这两种场景下的基本用法。

### 单次触发

这种情况下的一般场景是作为**延时器**来使用，我们并不会接收到倒计时的进度，只会在倒计时结束后收到回调提醒。例如，我们来看下 Flutter 官方提供的示例代码：

```dart
const timeout = const Duration(seconds: 3);
const ms = const Duration(milliseconds: 1);

startTimeout([int milliseconds]) {
  var duration = milliseconds == null ? timeout : ms * milliseconds;
  return new Timer(duration, handleTimeout);
}
...
void handleTimeout() {  // callback function
  ...
}
```

从上面代码可以看到，通过 `new Timer(Duration duration, void callback())` 方式创建的定时器会提供一个 `callback` 回调方法来处理计时结束后的操作。这显然不符合我们验证码功能中实时显示进度的需求，让我们来看看 Timer 如何重复性触发回调。

### 周期性触发

周期性触发计时回调的场景就很普遍了，只要是涉及到定时相关的操作可能都离不开它：**我们既需要被告知计时什么时候结束，也需要实时地监测计时的进度**。这正符合了我们最初想要的验证码功能这个需求。`dart-async 包` 同样为我们提供了 `Timer.periodic` 构造方法来创建一个可以重复回调的计时器：

```dart
Timer.periodic(
	Duration duration,
	void callback(
		Timer timer
	)
)
```

此外，官方是这样描述 `callback` 参数的：

> ***The `callback` is invoked repeatedly with `duration` intervals until canceled with the [cancel](https://api.flutter.dev/flutter/dart-async/Timer/cancel.html) function.***

大概意思是：`callback` 回调方法会伴随时间推移而被多次调用（调用周期为 `duration`），直到调用 `Timer.cancel` 方法。值得注意的是，周期性回调的计时器并不会“结束计时”，或者说它并不会自动结束计时任务，所以我们需要手动去统计时间并及时取消计时任务。具体如何操作呢？说了这么多，下面让我们进入本文正题：验证码倒计时实现吧😂。其实，该功能的实现代码很简单，这里就直接贴代码了：

```dart
	Timer _countDownTimer;
  int _currentTime = 60;
  bool get _isTimeCountingDown => _currentTime != 60;

	void _startTimeCountDown() {
    if (_countDownTimer != null) {
      timer.cancel();
      timer = null;
    }
    _countDownTimer = Timer.periodic(Duration(seconds: 1), (timer) {
      if (timer.tick == 60) {
        _currentTime = 60;
        _countDownTimer.cancel();
        _countDownTimer = null;
      } else {
        _currentTime--;
      }
      setState(() {
      });
    });
  }

	@override
  void dispose() {
    _countDownTimer?.cancel();
    _countDownTimer = null;
    super.dispose();
  }
```

我们可以通过 `Timer.tick` 来获取当前计时（递增）的进度，同时借助于 `_currentTime`  来标记计时的进度值，其他的逻辑代码应该就比较好理解了。

什么？你以为到这里就完了？哈哈，当然不会，假如倒计时功能需要在我们项目里有很多不同的使用情景，那么就该对倒计时这个功能进行封装了，况且，通过 `setState` 方式来实时展示倒计时进度而去刷新整个视图树着实不太友好。

### 倒计时封装

目前，Flutter 状态管理方案呈现“百家争鸣”之态，个人还是比较喜欢 [Provider](https://github.com/rrousselGit/provider) 来管理状态。下面就用 Provider 来将倒计时功能封装为一个组件：

```dart
import 'dart:async';
import 'package:flutter/material.dart';

/// 计时器组件
class CountDownTimeModel extends ChangeNotifier {
  final int timeMax;
  final int interval;
  int _time;
  Timer _timer;

  int get currentTime => _time;

  bool get isFinish => _time == timeMax;

  CountDownTimeModel(this.timeMax, this.interval) {
    _time = timeMax;
  }

  void startCountDown() {
    if (_timer != null) {
      _timer.cancel();
      _timer = null;
    }
    _timer = Timer.periodic(Duration(seconds: interval), (timer) {
      if (timer.tick == timeMax) {
        _time = timeMax;
        timer.cancel();
        timer = null;
      } else {
        _time--;
      }
      notifyListeners();
    });
  }
  
  void cancel() {
    if (_timer != null) {
      _timer.cancel();
      _timer = null;
    }
  }

  @override
  void dispose() {
    _timer.cancel();
    _timer = null;
    super.dispose();
  }
}
```

具体如何使用呢？熟悉 Provider 用法的小伙伴应该就不用多说了，这边为了演示方便，就以下面这个效果为例：




![](https://user-gold-cdn.xitu.io/2019/12/2/16ec4a41445af54e?w=287&h=500&f=gif&s=86983) 

点击“获取验证码”按钮开始 60 秒倒计时服务，结束倒计时过程中按钮需要处于不可点击状态，倒计时结束后恢复点击状态。具体代码如下：

```dart
class _LoginPageState extends State<TestPage> {
  @override
  Widget build(BuildContext context) {
    final logo = Hero(
      tag: 'hero',
      child: CircleAvatar(
        backgroundColor: Colors.transparent,
        radius: 48.0,
        child: Image.asset(ImageAssets.holder_logo),
      ),
    );

    final email = TextFormField(
      keyboardType: TextInputType.emailAddress,
      autofocus: false,
      initialValue: 'alucard@gmail.com',
      decoration: InputDecoration(
        hintText: 'Email',
        contentPadding: EdgeInsets.fromLTRB(20.0, 10.0, 20.0, 10.0),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(32.0)),
      ),
    );

    final password = TextFormField(
      autofocus: false,
      initialValue: 'some password',
      obscureText: true,
      decoration: InputDecoration(
        hintText: 'Password',
        contentPadding: EdgeInsets.fromLTRB(20.0, 10.0, 20.0, 10.0),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(32.0)),
      ),
    );

    final loginButton = Padding(
      padding: EdgeInsets.symmetric(vertical: 16.0),
      child: RaisedButton(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
        onPressed: () {
        },
        padding: EdgeInsets.all(12),
        color: Colors.lightBlueAccent,
        child: Text('Log In', style: TextStyle(color: Colors.white)),
      ),
    );

    final forgotLabel = FlatButton(
      child: Text(
        'Forgot password?',
        style: TextStyle(color: Colors.black54),
      ),
      onPressed: () {},
    );

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: ListView(
          shrinkWrap: true,
          padding: EdgeInsets.only(left: 24.0, right: 24.0),
          children: <Widget>[
            logo,
            SizedBox(height: 48.0),
            email,
            SizedBox(height: 8.0),
            ScreenUtils.verticalSpace(2),
            Stack(
              children: <Widget>[
                password,

                PartialConsumeComponent<CountDownTimeModel>(
                  model: CountDownTimeModel(60, 1),
                  builder: (context, model, _) => Positioned(
                    right: 10,
                    bottom: 1,
                    top: 1,
                    child: FlatButton(
                        disabledColor: Colors.grey.withOpacity(0.36),
                        color: Colors.white70.withOpacity(0.7),
                        onPressed: !model.isFinish ? null : () {
                          model.startCountDown();
                        },
                        child: Text(
                          model.isFinish ? '获取验证码' : model.currentTime.toString()+'秒后重新获取',
                          style: TextStyle(color: model.isFinish ? Colors.lightBlueAccent : Colors.white),
                        )
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 24.0),
            loginButton,
            forgotLabel
          ],
        ),
      ),
    );
  }


}
```

这里，我们通过在 `CountDownTimeModel` 中定义的 `isFinish` 字段来判断倒计时是否正在进行，进而处理按钮的各种状态（如颜色、点击状态、文字内容等）。此处为了方便对**当前页面状态进行管理**，我单独封装了一个公用的消费者组件：

```dart
class PartialConsumeComponent<T extends ChangeNotifier> extends StatefulWidget {

  final T model;
  final Widget child;
  final ValueWidgetBuilder<T> builder;

  PartialConsumeComponent({
    Key key,
    @required this.model,
    @required this.builder,
    this.child
  }) : super(key: key);

  @override
  _PartialConsumeComponentState<T> createState() => _PartialConsumeComponentState<T>();

}

class _PartialConsumeComponentState<T extends ChangeNotifier> extends State<PartialConsumeComponent<T>> {

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<T>.value(
      value: widget.model,
      child: Consumer<T>(
          builder: widget.builder,
          child: widget.child,
      ),
    );
  }
}
```

### 最后

本人刚接触 Flutter 两周左右，有些地方可能会为了开发进度而忽略一些细节，如有不严谨或者疏漏之处欢迎指正。此外，后续我将为大家带来更多 Android 和 Flutter 方面文章，请期待。

### 参考

- [*Flutter 官方文档*](https://api.flutter.dev/flutter/dart-async/Timer-class.html)
- [*Provider*](https://github.com/rrousselGit/provider)
- [*Flutter状态管理指南篇—Provider*](https://juejin.im/post/6844903864852807694)