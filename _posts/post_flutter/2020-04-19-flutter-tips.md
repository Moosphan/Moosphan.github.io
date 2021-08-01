---
layout: post
title: "Flutter 开发小结 | Tips"
date: 2020-04-19 23:37:12
author:     "Dorck"
catalog: false
header-style: text
tags: Flutter
categories: Flutter
---
接触 Flutter 已经有一阵子了，期间记录了很多开发小问题，苦于忙碌没时间整理，最近项目进度步上正轨，借此机会抽出点时间来统一记录这些问题，并分享项目开发中的一点心得以及多平台打包的一些注意事项，希望能对大家有所帮助😁。

### UI 组件使用

官方为我们提供了大量原生效果的组件，如以 Android 中常见的 **Material Design** 系列组件和 iOS 系统中让设计师们“欲罢不能”的 **Cupertino** 系列组件。从我这一个月左右对于 Flutter UI 组件的使用情况来看，不得不感慨一句：“真香”。由于本人之前是做 Android 开发的，所以对于 Android 方面的一些“诟病”深有体会。例如，设计师经常让我们还原设计稿中的阴影效果，一般需要设置阴影颜色、x/y偏移量和模糊度等，然而 Android 原生并没有提供支持所有这些属性的一款组件，所以只能我们自己通过自定义控件去实现，现在还有多少人依然通过 CardView 来“鱼目混珠”呢？然而，在 Flutter 中就无需担心这种问题，通过类似前端中常用的盒子组件—— Container 就可以轻松实现。

当然，Flutter 虽然很强大，但 UI 组件也不是万能的，跨平台之路注定漫长而布满荆棘，偶尔也会伴随着一些小问题。<!-- more -->

#### TextField

- **软键盘弹起后组件溢出的问题**

  由于页面不支持滚动，一旦使用 TextField，软键盘弹起后很容易会覆盖一些UI组件，如果不以为意，那么下面这个问题就会成为“家常便饭”：

  ```verilog
  A RenderFlex overflowed by xx pixels on the bottom.
  ```

  常用的解决方案就是通过嵌套一层 `SingleChildScrollView` 来规避，当软键盘弹起时，下方的组件会被软键盘自动顶上去。

- **HintText 不居中问题**

  这个问题很多人应该都遇到过，当我们在项目中设置中文 Locale 后，在 TextField 的 InputDecoration 中设置 `hintText` 时，会发现提示文本向下偏移几个像素，这应该属于 Flutter 的bug。如何解决这个问题呢？很简单，只需要设置 `textBaseine` 属性，如下代码所示：

  ```dart
  TextFormField(
       decoration: InputDecoration(
       		prefixIcon: Icon(
              Icons.lock_outline
          ),
          hintText: S.of(context).loginPasswordHint,
       ),
       style: TextStyle(
         	/// handle hint text offset problem.
          textBaseline: TextBaseline.alphabetic
       ),
       keyboardType: TextInputType.number,
       onSaved: (password) {},
  )
  ```

  具体可参考：https://github.com/flutter/flutter/issues/40118
  
- **焦点问题**

  输入框的焦点问题主要体现在两点：
  
  1. 前往另一个页面返回后自动弹出了软键盘（即自动获取了焦点）
  2. iOS手机上切换至数字键盘后无法关闭软键盘
  
  这两个问题其实都可以借助 `FocusNode` 来解决，先来看下面一段代码：
  
  ```dart
  FocusNode _writingFocusNode = FocusNode();
  ...
    
    void _clearTextFieldFocus() {
      if (_writingFocusNode.hasFocus) {
        _writingFocusNode.unfocus();
      }
    }  
  ```
  
  上述代码创建了一个 `FocusNode` 对象，并声明了移除焦点的方法，相信大家不难判断出。此外，我们需要给 `TextField` 的 `focusNode` 属性传入我们创建的 `_writingFocusNode`。问题一中，我们可以在页面跳转前先移除焦点，这样，从二级页面返回后输入框就不会自动弹出软键盘。问题二中，我们可以在用户点击空白区域后自动移除焦点（关闭软键盘），以下代码供参考：
  
  ```dart
  Widget _buildInputArea() =>
        Stack(
          children: <Widget>[
            // 通过空白区域的点击事件来关闭软键盘
            GestureDetector(
              onTap: () {
                _clearTextFieldFocus();
              },
              child: Container(
                /// 此处注意设置背景颜色，否则默认透明色可能会穿透，无法响应点击事件
                color: AppTheme.surfaceColor,
                width: MediaQuery.of(context).size.width,
                height: MediaQuery.of(context).size.height,
              ),
            ),
            Column(
              children: <Widget>[
                ScreenUtils.verticalSpace(32),
                // account input edit text
                Padding(
                  padding: EdgeInsets.only(bottom: AutoSize.covert.dpToDp(12)),
                  child: TextField(
                    controller: _accountTextController,
                    decoration: InputDecoration(
                      prefixIcon: Padding(
                        padding: EdgeInsets.all(AutoSize.covert.dpToDp(12)),
                        child: ImageIcon(AssetImage(ImageAssets.ic_login_user_input)),
                      ),
                      hintText: S.of(context).loginAccountHint,
  
                    ),
                    keyboardType: TextInputType.number,
                  ),
                ),
  
                // password input edit text
                Padding(
                  padding: EdgeInsets.only(bottom: AutoSize.covert.dpToDp(12)),
                  child: ValueListenableBuilder(
                    valueListenable: obscureTextModel,
                    builder: (context, value, child) => TextField(
                      controller: _passwordTextController,
                      obscureText: value,
                      decoration: InputDecoration(
                        prefixIcon: Padding(
                          padding: EdgeInsets.all(AutoSize.covert.dpToDp(12)),
                          child: ImageIcon(AssetImage(ImageAssets.ic_login_pwd_input)),
                        ),
                        suffixIcon: IconButton(
                            icon: Icon(value ? Icons.visibility_off : Icons.visibility, size: AutoSize.covert.dpToDp(20)),
                            onPressed: () {
                              obscureTextModel.value = !value;
                            }
                        ),
                        hintText: S.of(context).loginPasswordHint,
                      ),
                      keyboardType: TextInputType.text,
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
  
  ```

#### Container

- 盒子模型特点

  对于接触过前端的人来说，应该都领略过“盒子模型”的强大了，所以，Container 的强大之处相信也不用我多说了：它几乎是一个万能的“容器”，既能设置 margin、padding、aligment，又可以装饰它的背景 docoration 属性，例如阴影效果、渐变色、圆角效果等等。

- 设置背景色问题

  Container虽好，但也需要在使用时注意一些问题，例如，它的源码注释中就说到：我们可以通过 `color` 和 `decoration` 来设置盒子背景，但两者却不能同时存在，如果我们既希望保留背景色，又想使用装饰器 (decoration)，我们可以直接设置 `BoxDecoration` 的 `color` 属性。 

#### SafeArea

Android中存在状态栏、底部导航栏，而 iOS 中也存在状态栏和"底部导航条"，所以如果我们页面中的**边界部分**需要固定显示一些小组件，那么我们最好能够在最外层嵌套一层 `SafeArea` 组件，即让UI组件处于“安全区域”，不至于引起适配问题。

```dart
Material( 
  color: AppTheme.surfaceColor,
  child: SafeArea(
    child: Container(),
  ),
)
```

#### 列表组件

Flutter中常见的列表组件有 ListView、GridView、PageView 等，一个完整的应用肯定也离不开这些组件。我们在使用时，需要留意以下几点：

- **Vertical viewport was given unbounded height 问题**

  作为初学者，我们在初期应该都碰到过这个问题：Vertical/Horizontal viewport was given unbounded height，这是由于我们没有给列表组件指定高度或者宽度而引起的，一般出现场景是在 `Column ` 中，我们可以给列表组件包裹一层盒子或者被 `Expanded` 包裹，让其尽可能占据最大空间：

  ```dart
  Column(
  	children:[
  		...,
  		Expanded(
                    child: GridView.builder(
                ....
                    )           
      	        )
         )
    ]
  )
  ```

- **physics 属性**

  做过原生开发的都知道，在 Android 中，支持滚动的组件滑到顶或者滑到底后自带 colorPrimary 色调的水波纹效果，至于iOS，则是越界回弹效果。你拿着 Android 中的默认效果去给设计师看，“亲果党”的他们肯定不干了，硬是让你改成 iOS 的回弹效果。所幸，Flutter 早就考虑到了这一点，支持滑动的组件中都提供了 `physics` 属性，只需要将其设置为 `BouncingScrollPhysics` 就能完美实现回弹效果。同时，physics 还有其他属性，这里不再一一介绍，大家可以去查看相关文档和源码，这里提一下 `NeverScrollableScrollPhysics`，即禁止滑动。这个有什么用呢？其实还是挺有用的，比如嵌套的两个滑动组件中就可以将其中一个的 physics 属性设置为 `NeverScrollableScrollPhysics`，这样可以简单快速解决滑动冲突。此外，有些特殊场景我们可能不希望用户可以滑动，而是通过按钮点击来控制列表滑动，这时候，设置该属性就再好不过啦。

#### 自定义弹窗

Flutter 为我们提供了一些内置的定制弹窗，这里不再一一说明了。如何自定义弹窗？其实很简单，只需要明白：弹窗即页面。以下面的效果为例：

![自定义弹窗效果图](https://user-gold-cdn.xitu.io/2020/3/26/17115a56cf9ed307?w=280&h=623&f=png&s=71429)

相信对于大家来说，上面的UI页面实现起来并不困难，那我们离 Dialog 效果仅剩一步之遥了：点击空白区域关闭。其实，在上面的某段代码中我已经贴了关键代码，细心的小伙伴应该也察觉到了，没错，我们可以通过 `Stack` 组件包裹半透明蒙层（如Container）和分享功能组件，我们只需为半透明蒙层增加点击事件即可：

```dart
Stack(
        children: <Widget>[
          // 通过空白区域的点击事件来关闭弹窗
          GestureDetector(
            onTap: () {
            	//关闭弹窗
              Navigator.maybePop(context);
            },
            child: Container(
              color: AppTheme.dialogBackgroundColor,
              width: MediaQuery.of(context).size.width,
              height: MediaQuery.of(context).size.height,
            ),
          ),
          Container(
          	child: ...
          )
     )
```

哈哈，是不是有种恍然大悟的感觉，如此一来，弹窗对于我们来说不就是写一个页面那么简单了吗😄。

#### InkWell

InkWell 在 Android 中比较常见，俗称“水波纹”效果，属于按钮的一种，它支持设置波纹颜色、圆角等属性。我们偶尔可能会遇到水波纹失效的问题，这一般是因为我们在 `InkWell` 内部的 child 中设置了背景，从而导致水波纹效果被遮盖。如何解决这个问题？其实很简单，只需要在 `InkWell` 外层套上 `Material` 并设置 `color` 即可:

```dart
Material(
  color: Colors.white,
  child: InkWell(
    borderRadius: AppTheme.buttonRadius, // 圆角
    splashColor: AppTheme.splashColor,   // 波纹颜色
    highlightColor: Colors.transparent,  // 点击状态
    onTap: () {},												 // 点击事件
    child: Container(
      ...
    ),
  ),
)
```

或者，我们也可以借助于之前实现自定义 Dialog 的思路，使用 `Stack` 包裹需要点击的区域，并将 `InkWell` 放在上层：

```dart
		Stack(
            children: <Widget>[
              Image(),
              Material(
                  color: Colors.transparent,
                  child: InkWell(
                    splashColor: AppTheme.splashColor,
                    onTap: () {},
                  ),
                )
              )
            ],
          )

```
#### IconButton

和上面 `InkWell` 一样，IconButton 同样可能有类似点击效果问题，与上面解决方法大同小异：

```dart
Material(
        type: MaterialType.circle,
        color: Colors.transparent,
        clipBehavior: Clip.antiAlias,
        child: IconButton(
            onPressed: () => Share.share(S.of(context).commonWhoAppShareIconButtonDescription),
            icon: Icon(
                Icons.share,
                size: 22,
            )
        ),
),
```



#### Theme 相关

Android中的 Theme 相信大家也不陌生了，它能够定制化我们某类组件的风格 ，能够大幅度减少重复代码和工作量。Flutter 中也提供了 Theme 来让我们配置和复用全局组件的样式。正常来说，我们应用的高保真设计图中的一类组件一般风格相似，如：


![高保真Theme示例](https://user-gold-cdn.xitu.io/2020/3/27/1711b0ff509ae515?w=1600&h=1200&f=png&s=210368)

上图两个页面的按钮样式应该是一样的，所以我们可以抽离成 Theme，其他组件同理。可做如下配置(仅供参考)：

```dart
class AppTheme {
  AppTheme._();

  /// common colors used in theme, text, background or borders
  static const Color primaryColor = Color(0xFF92C9AA);
  static const Color secondaryColor = Color(0x96A3E4C5);
  static const Color colorAccent = Color(0xFFE5F378);

  static const Color textPrimaryColor = Color(0xFF2A2A2A);
  static const Color textSecondaryColor = Color(0xFF383838);
  static const Color textHintColor = Color(0xFFB3B3B3);
  static const Color borderColor = Color(0xFFE8E8E8);
  static const Color surfaceColor = Color(0xFFF9F9F9);
  static const double underlineBorderWidth = 0.6;

  static TextTheme textTheme = TextTheme(
    headline: headline,
    title: title,
    body1: body1,
    body2: body2,
    caption: small
  );

  // large title
  static const headline = TextStyle(
    fontWeight: FontWeight.bold,
    fontSize: 30,
    letterSpacing: 0.27,
    color: textPrimaryColor
  );

  // normal title
  static const title = TextStyle(
    fontSize: 18,
    letterSpacing: 0.18,
    color: textPrimaryColor
  );

  // normal text body1
  static TextStyle body1 = TextStyle(
    fontSize: 16,
    letterSpacing: 0.48,
    color: textPrimaryColor
  );

  // normal text body2
  static TextStyle body2 = TextStyle(
    fontSize: 14,
    letterSpacing: 0.25,
    color: textSecondaryColor
  );

  static TextStyle small = TextStyle(
    fontSize: 12,
    color: textHintColor
  );

  // input field border decoration style
  static const inputDecorationTheme = InputDecorationTheme(
    hintStyle: TextStyle(fontSize: 14),
    focusedBorder: UnderlineInputBorder(
      borderSide: BorderSide(width: underlineBorderWidth, color: primaryColor)
    ),
    border: UnderlineInputBorder(
      borderSide: BorderSide(width: underlineBorderWidth, color: borderColor)
    ),
    enabledBorder: UnderlineInputBorder(
        borderSide: BorderSide(width: underlineBorderWidth, color: borderColor)
    ),
    disabledBorder: UnderlineInputBorder(
        borderSide: BorderSide(width: underlineBorderWidth, color: borderColor)
    ),
  );
}
```

那么，我们可以在入口程序将这套 Theme 规则应用到全局：

```dart
MaterialApp(
          title: 'xxx',
          // 全局主题配置
          theme: ThemeData(
            textTheme: AppTheme.textTheme,
            primaryColor: AppTheme.primaryColor,
            canvasColor: AppTheme.surfaceColor,
            scaffoldBackgroundColor: AppTheme.surfaceColor,
            inputDecorationTheme: AppTheme.inputDecorationTheme,
            appBarTheme: AppTheme.appBarTheme,
            //...
          ),
          home: xxxPage()
        )
```

以上仅列举了部分常见UI组件的使用技巧和问题，如有其他问题欢迎留言探讨。

### 功能需求实现

除了 Flutter 中的一些 UI 组件的的使用以外，应用自然还需要涉及到很多具体的业务功能需求，常见的有第三方登录、分享、地图、Lottie 动画接入、第三方字体下载和加载等等。这个时候就需要我们灵活变通了，在保证项目进度顺利进行的前提下有选择性地去借助一些插件和工具，或者前往 Flutter 的 Github Issue 社区去寻找答案了，这里也选择几个常用需求简单说一下。

#### 当前设备的系统语言

很多时候我们需要根据当前系统使用的语言去动态选择加载的内容，举个例子，我们经常需要根据当前语言去加载中文或者英文版的用户隐私条款，我们可以借助 Localizations 去获取当前使用语言的 `languageCode`，进而比对和处理：

```dart
 /// 判断当前语言类型
 _navigateToUrl(Localizations.localeOf(context).languageCode == 'zh'
                      ? Api.PRIVACY_POLICY_ZH_CN
                      : Api.PRIVACY_POLICY_EN);
```

#### 第三方登录/分享

这部分当初考虑自己写插件来对接原生的分享sdk，但考虑到时间成本就暂时搁置了，找到几个不错的插件来实现了该部分功能：

- fluwx

  该插件应该是在微信社会化分享、支付等方面功能集成度比较高的插件了，是由 OpenFlutter 社区负责维护的，目前没发现有什么问题。具体配置的细节就不再说明了，它的文档很详细，具体可参考：https://github.com/OpenFlutter/fluwx

  另外，他们组织中还有其他很多优秀的 Flutter 相关项目，大家也可以去学习一下。

- flutter fake toolkit

  这个是一系列插件，包括了微信、微博、QQ、支付宝等众多平台，让人佩服作者的产出率。目前使用起来也没发现什么大问题，也希望作者能够多邀请几个小伙伴来维护，提升更新的频率。这里附上其中几个常用的插件：

  >QQ插件：https://github.com/v7lin/fake_tencent
  >
  >微博插件：https://github.com/v7lin/fake_weibo
  >
  >支付宝：https://github.com/v7lin/fake_alipay

#### Lottie动画

相信大家对 Airbnb 公司推出的这个动画工具已经有所耳闻了，Lottie 支持多平台，使用同一个JSON 动画文件，可在不同平台实现相同的动画效果。现在复杂动画很多时候都借助于它，能够有效减少开发成本和保持动画的高还原度。同样，Flutter 中也有一些封装了 Lottie 动画的插件，让我们可以在 Flutter 上也可以感受到它的魅力。

这里，我个人使用的插件是 `flutter_lottie` 插件，还算稳定，支持动画属性和进度操作，唯一遗憾就是有段时间没更新了😂，后续考虑到 iOS 方面的兼容性可能会自己写一个插件。在 `pubspec.yaml` 中依赖操作如下：

```yaml
# Use Lottie animation in Flutter.
  # @link: https://pub.dev/packages/flutter_lottie
  flutter_lottie: 0.2.0
```

具体使用技巧可参考它的example：https://github.com/CameronStuartSmith/flutter_lottie

这里附上控制动画进度的部分代码：

```dart
int _currentIndex = 0;
  LottieController _lottieController;
  PageController _pageController = PageController();
  // the key frames of animation
  final ANIMATION_PROGRESS = [
    0.0,
    0.2083,
    0.594,
    0.8333,
    1
  ];
  // the duration of each animation sections
  final ANIMATION_TIMES = [
    2300,
    4500,
    3500
  ];
  // animation progress controller
  Animation<double> animation;
  AnimationController _animationController;

  
  @override
  void initState() {
    super.initState();
    _animationController = new AnimationController(
        duration: Duration(milliseconds: ANIMATION_TIMES[_currentIndex]), vsync: this);
    final Animation curve =
        new CurvedAnimation(parent: _animationController, curve: Curves.linear);
    animation = new Tween(begin: 0.0, end: 1.0).animate(curve);
    animation.addListener(() {
      _applyAnimation(animation.value);
    });
  }

// 布局代码
.......
  
  Positioned(
              bottom: 0,
              child: Container(
                width: MediaQuery.of(context).size.width,
                // 此处为了将动画组件居下放置
                height: AutoSize.covert.dpToDp(667),
                child: LottieView.fromFile(
                  filePath: 'assets/anims/user_guide_anim.json',
                  autoPlay: false,
                  loop: true,
                  reverse: true,
                  onViewCreated: (controller) {
                    _lottieController = controller;
                    Future.delayed(Duration(milliseconds: 1), () {
                      _animationController.forward();
                    });
                  },
                ),
              ),
            ),

// description page view
            Container(
              width: MediaQuery.of(context).size.width,
              height: MediaQuery.of(context).size.height,
              margin: EdgeInsets.only(bottom: 60),
              child: PageView(
                physics: BouncingScrollPhysics(),
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentIndex = index;
                    _animationController.duration = Duration(milliseconds: ANIMATION_TIMES[index]);
                  });
                  Future.delayed(Duration(microseconds: 600), () {
                    _animationController.forward(from: 0);
                  });
                },
                children: _buildPageGroup(),
              ),
            ),

......
  
  void _applyAnimation(double value) {
    var startProgress = ANIMATION_PROGRESS[_currentIndex];
    var endProgress = ANIMATION_PROGRESS[_currentIndex + 1];
    var progress = startProgress + (endProgress - startProgress) * value;
    _lottieController.setAnimationProgress(progress);
  }

```

简单解释一下上述代码逻辑，我们这里主要借助于 Lottie 来实现用户引导页的切换动画，引导页分为三个画面，所以需要我们记录和保存动画的关键帧和每段画面的执行时间。至于动画的控制执行权交由上层的 `PageView` 来滑动实现，每次滑动通过 `AnimationController` 和 `setState((){})` 来控制和刷新每段动画的执行时间和执行刻度。具体demo效果如下所示：


![Flutter中的lottie动画效果](https://user-gold-cdn.xitu.io/2020/3/26/17115a9407eeccf2?w=200&h=431&f=gif&s=1064911)

#### 外部字体下载和加载

如果接触过文字编辑功能开发的小伙伴应该都知道，我们一般会提供几十种字体供用户使用，当然，我们不可能在项目打包时就放入这么多字体包，这样显而会严重增加安装包大小。我们一般的做法是：当用户第一次点击想使用某个字体时，我们会先将其下载到手机本地存储，然后加载字体，后续当用户再次选择该字体，那么直接从本地加载即可。那么问题来了，Flutter 目前的示例中仅为我们提供了从本地 Asset 目录下加载字体的方式，显然想要实现上述需求，需要我们自己寻求出路。

幸运的是，上帝为我们关上了一扇门，也为我们打开了一扇窗，Flutter 中为我们提供了一个 FontLoader 工具，它有一个 `addFont` 方法，支持将 `ByteData` 格式数据转化为字体包并加载到应用字体资源库：

```dart
  /// Registers a font asset to be loaded by this font loader.
  ///
  /// The [bytes] argument specifies the actual font asset bytes. Currently,
  /// only TrueType (TTF) fonts are supported.
  void addFont(Future<ByteData> bytes) {
    if (_loaded)
      throw StateError('FontLoader is already loaded');

    _fontFutures.add(bytes.then(
        (ByteData data) => Uint8List.view(data.buffer, data.offsetInBytes, data.lengthInBytes)
    ));
  }
...

 /// Loads this font loader's font [family] and all of its associated assets
  /// into the Flutter engine, making the font available to the current
  /// application.
  ///
  /// This method should only be called once per font loader. Attempts to
  /// load fonts from the same loader more than once will cause a [StateError]
  /// to be thrown.
  ///
  /// The returned future will complete with an error if any of the font asset
  /// futures yield an error.
  Future<void> load() async {
    if (_loaded)
      throw StateError('FontLoader is already loaded');
    _loaded = true;

    final Iterable<Future<void>> loadFutures = _fontFutures.map(
        (Future<Uint8List> f) => f.then<void>(
            (Uint8List list) => loadFont(list, family)
        )
    );
    return Future.wait(loadFutures.toList());
  }
```

如此一来，那我们解决思路也就“手到擒来”了：只需要将字体下载到本地并以文件形式存储，在使用时将字体文件再转为 `ByteData` 数据格式供 FontLoader 加载即可。这里附上简化后的部分关键代码：

```dart
/// 加载外部的字体
Future loadFontFile(LetterFont font) async {
    // load font file
    var fontLoader = FontLoader(font.fontName);
    fontLoader.addFont(await fetchFont(font));
    await fontLoader.load();
  }
/// 从网络下载字体资源
Future<ByteData> fetchFont(LetterFont font) async {
    final response = await https.get(
        font.fontUrl);

    if (response.statusCode == 200) {
      // 这里也可以做保存到本地的逻辑处理
      return ByteData.view(response.bodyBytes.buffer);
    } else {
      // If that call was not successful, throw an error.
      throw Exception('Failed to load font');
    }
  }
```

### 打包上架相关

打包方面也有一部分细节需要注意一下，这里谈一下 Android 和 iOS 开发环境配置和打包差异以及列举部分常见问题，其他问题因人而异，也因版本而异，就不单独拿出来讲了。

#### Android方面

1. 开发工具

   Android studio3.6稳定版

2. 代码编译环境

   Kotlin + AndroidX

   >目前Flutter创建项目默认勾选两个选项

3. 版本号配置

   在 `android/app/build.gradle` 中配置 `flutterVersionCode` 和 `flutterVersionName`。

   > 注意：如果在 `pubspec.yaml` 中配置了version，那么 Flutter 具体打包的版本会实际根据 `pubspec.yaml` 的 `version` 来构建。

4. 网络配置

   目前 Android 官方不建议采用http请求格式，推荐使用 https，所以，如果项目中使用到了http格式请求，那么需要添加网络配置。首先在 `android/app/src/main/res` 路径下创建名为 `xml` 的文件夹：然后创建名为 `network_security_config` 的 xml 文件，接着将如下代码复制进去：

   ```xml
   <?xml version="1.0" encoding="utf-8"?>
   <network-security-config>
       <base-config cleartextTrafficPermitted="true"/>
   </network-security-config>
   ```

   然后在 `AndroidManifest.xml` 文件中设置 `networkSecurityConfig` 属性即可：

   ```xml
    <application
           android:name="io.flutter.app.FlutterApplication"
           android:label="Timeory"
           android:icon="@mipmap/ic_launcher"
           tools:replace="android:name"
           android:usesCleartextTraffic="true"
           android:networkSecurityConfig="@xml/network_security_config"
           tools:ignore="GoogleAppIndexingWarning">
      ......
   </application>
   ```

5. 权限配置

   一般我们项目中都会用到权限申请，并且很多 flutter 插件中也会要求我们去自己配置权限，我们可能需要在 `AndroidManifest.xml` 文件中添加如下常用权限（只是样例）：

   ```xml
   <uses-permission android:name="android.permission.INTERNET"/>
       <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
       <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
       <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
       <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
       <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
       <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
       <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   ```

   当然这些还是不够的，Android6.0及以上，我们还需要在代码中动态申请权限，Flutter中有很多优秀的权限申请插件，iOS 上面一般没问题，Android由于碎片化比较严重，可能会在不同机型上出现各种奇怪问题，比如，红米部分机型借助于 `permission_hanlder` 插件申请定位权限可能会失败的问题，这里需要注意一下，留个心眼。

6. Logo 配置

   Logo 需要在 `android/app/src/main/res` 中添加和配置，一般只需要准备 `hdpi`、`mdpi`、`xhdpi`、`xxhdpi`、`xxxhdpi`格式即可。另外，Android8.0 及以上需要适配圆角logo，否则在部分高版本机型上会显示 Android 默认的机器人logo。

   具体可以参考该文章：https://blog.csdn.net/guolin_blog/article/details/79417483

7. 打包

   一般情况下我们通过 `flutter build apk` 来打包，生成的安装在 *build/app/outputs/apk/release* 目录下，这样打出来的包一般比较大，因为它包含了 `arm64-v8a`、`armeabi-v7a` 和 `x86_64` 三种cpu架构的包。大家可以根据需要有选择性的针对特定机型的cpu架构打包，执行如下命令即可：

   ```
   flutter build apk --target-platform android-arm,android-arm64,android-x64 --split-per-abi
   ```

   执行完毕后就会在 `release` 目录下生成三种格式的apk包。

   另外，大家可以选择一些apk体积优化的方案，具体可参考：

   https://my.oschina.net/u/1464083/blog/2395914

   https://www.jianshu.com/p/555c948e5195

#### iOS 方面

由于本人之前做 Android 开发，没有接触过 iOS，所以打包到 iOS 平台还是遇到不少问题。

1. 开发工具：

   Xcode11.3.1 稳定版 (打包环境) + Visual Studio Code 1.42.1 (编码环境)

2. 代码编译环境：Swift + Objective-C (目前创建Flutter项目默认勾选为swift，由于项目启动时Flutter尚未更新该配置，所以项目中部分插件采用的是oc)，希望后面逐步替换为主流的swift。

3. 版本号配置：

   只需要在Xcode中 `Runner -> targets -> General -> Identity` 配置即可。

4. 网络配置

   iOS 中，官方同样约束我们使用 https 请求，如果我们需要暂时使用http格式请求来测试，可以做如下配置：

   在 `Runner -> targets -> General -> Info` 中添加 `App Transport Security Settings` 属性，并在此属性标签内添加 `Allow Arbitrary Loads` 子属性，并将值设置为 `YES` 即可。

5. Logo配置

   iOS 中的 logo 配置只需要找到如下入口：

    ![](https://user-gold-cdn.xitu.io/2020/3/26/17115ad8e38a8eb0?w=797&h=657&f=png&s=76335)

   点击 ➡️ 即可进入 logo 资源目录，默认的为 Flutter 的官方 logo，我们只需要根据具体 logo 尺寸去替换资源即可。

6. 国际化语言配置

   项目中如果支持国际化语言，Android 中无需额外配置，iOS 中需要在 `Info.plist` 中添加 `Localized resource can be mixed` 属性，并设置值为 `YES` 即可，否则APP运行后可能会出现实际展示的是英文的情况。

7. 打包相关

   Xcode打包时切记要使用稳定版，不要使用 `beta` 版本，否则可能会出现下面的问题：
    ![](https://user-gold-cdn.xitu.io/2020/3/26/17115ac013934e80?w=745&h=450&f=png&s=37091)


以上就是本人对近期 Flutter 开发过程的一点简单总结，如果能够帮助到您那将再好不过😄。刚接触 Flutter 不久，相关阐述可能不够严谨或存在理解错误，如您发现，还请指出，感谢您的阅读。