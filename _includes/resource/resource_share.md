> 以下主要针对个人技术成长路线做适当沉淀，方便后续查漏补缺。

![android_road_map](/img/personal/android_road_map.png)

下面涉及到的技术知识点都会按照**核心等级**、**考察频率**等分配相应数值，也会对当前掌握状态更新对应的**回报指数**。接下来也会针对某一块知识点做拆分，梳理内部频繁考察的枝节，并对具有关联性的优质的学习资源做简要整理。此处个人技术栈整理是本着循序渐进的心态去进行的，冰冻三尺非一日之寒，随心而更，仅此而已。

> 注：核心等级、考察频率和掌握程度数值以 **1-10** 范围内数值表示，数值越大表示知识点越重要、考察频率越高。具体数值仅代表个人主观看法，是其之于本人心中所在位置而产出的。

## 1. Android 方向

### 1.1 Binder 机制

| 核心等级 | 考察频率 | 掌握程度 | 状态描述 |
| :------: | :------: | :------: | -------- |
|    10    |    9     |    4     | 了解阶段 |

Binder 是 Android 系统核心重点之一，是作为高级开发必须掌握的知识点。

#### 系列文章推荐

- 来自维术大佬的 Binder 学习指南：<https://weishu.me/2016/01/12/binder-index-for-newer/>
- 罗升阳针对 Binder 机制的长文介绍：<https://blog.csdn.net/luoshengyang/article/details/6618363>
- 早期 Binder 系统性讲解的优质范文：<https://blog.csdn.net/universus/article/details/6211589>
- 来自 Gityuan 大佬的 Binder系列文章：
  - [Binder系列1—Binder Driver初探](http://gityuan.com/2015/11/01/binder-driver/)
  - [Binder系列2—Binder Driver再探](http://gityuan.com/2015/11/02/binder-driver-2/)
  - [Binder系列3—启动Service Manager](http://gityuan.com/2015/11/07/binder-start-sm/)
  - [Binder系列4—获取Service Manager](http://gityuan.com/2015/11/08/binder-get-sm/)
  - [Binder系列5—注册服务(addService)](http://gityuan.com/2015/11/14/binder-add-service/)
  - [Binder系列6—获取服务(getService)](http://gityuan.com/2015/11/15/binder-get-service/)
  - [Binder系列7—framework层分析](http://gityuan.com/2015/11/21/binder-framework/)
  - [Binder系列8—如何使用Binder](http://gityuan.com/2015/11/22/binder-use/)
  - [Binder系列9—如何使用AIDL](http://gityuan.com/2015/11/23/binder-aidl/)
  - [Binder系列10—总结](http://gityuan.com/2015/11/28/binder-summary/)

#### 过程记录

- [x] 看Android文档，`Parcel, IBinder, Binder` 等涉及到跨进程通信的类；
- [x] 不依赖 AIDL 工具，手写远程 Service 完成跨进程通信
- [x] 看[《Binder设计与实现》](http://blog.csdn.net/universus/article/details/6211589)
- [ ] 看老罗的博客或者书（书结构更清晰）
- [ ] 再看[《Binder设计与实现》](http://blog.csdn.net/universus/article/details/6211589)
- [ ] 学习Linux系统相关知识，适当看源码
- [ ] Binder 通信过程绘图及文章输出。



## 2. Java 层面

### 2.1 Java 锁机制

| 核心等级 | 考察频率 | 掌握程度 | 状态描述 |
| :------: | :------: | :------: | -------- |
|    10    |    9     |          |          |

#### 系列文章推荐

- 不可不说的 Java“锁”事：https://www.itblogcn.com/article/1181.html

### 2.2 Java 线程池

| 核心等级 | 考察频率 | 掌握程度 | 状态描述 |
| :------: | :------: | :------: | -------- |
|    9     |    8     |          |          |

#### 系列文章

- Java 线程池原理及其在美团业务中的实践：https://tehub.com/a/3RqS6XpL8o

## 3. Kotlin 相关

| 主题                         | 学习站点                                                   | 备注 |
| ---------------------------- | ---------------------------------------------------------- | ---- |
| Kotlin 官方                  | https://www.kotlincn.net/docs/reference/                   | 中文 |
| Android 官方出品             | https://developer.android.com/kotlin/                      | 中文 |
| 国人早期 Kotlin 文档翻译版本 | https://hltj.gitbooks.io/kotlin-reference-chinese/content/ | 中文 |



## 4. 开发规范

<https://github.com/Blankj/AndroidStandardDevelop>

## 5. 工具系列

#### 5.1 图表绘制

- PlanUML：<https://plantuml.com/zh/>
- Mermaid：<https://mermaid-js.github.io/mermaid-live-editor/>
- flow：<https://github.com/adrai/flowchart.js>
- 飞书文档

#### 5.2 文档书写

- Typora (Markdown)
- 飞书文档
- 语雀



## 6. 简历规范

