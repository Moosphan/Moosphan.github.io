---
layout:     post
title: "文章后续课题及题材统计"
visible: false
date: 2022-04-10 20:36:12
author:     "Dorck"
catalog: false
header-style: text
published: false
tags: 
- 写作
- 技术文章
categories: other
---

### Android

##### 屏幕适配

- https://developer.android.com/training/multiscreen/screensizes
- https://developer.android.com/guide/practices/screens_support

##### 安全加密

- 常见的加密算法的原理及实现、使用场景
- Android内置加密工具
- keystore 机制

##### 中台技术

- 组件化方案、壳组件（blankj）
- 组件化路由框架设计及微服务（依赖注入/控制反转）
- lint 静态代码检查工具封装及使用场景（安全合规）
- 基础UI组件库设计
- 换肤工具
- App异步初始化及启动优化（startup）
- Gradle 插件开发（组件依赖分析、编译分析、组件发布）
- 单元测试
- CI/CD
- APM 及调试工具
- RN 容器、JSBridge容器
- 埋点技术
- 日志工具：[BLog](https://github.com/kaedea/b-log/blob/master/README_CN.md)

##### 性能优化

常见方法论：[Android 性能调优的技术优化点](https://kaedea.com/2015/11/12/android-best-performance-points/)

- APM（Application-preference-monitor）
  - [腾讯 Matrix](https://github.com/Tencent/matrix)
  - [Facebook Battery-Metrics](https://github.com/facebookincubator/Battery-Metrics)
  - [电量优化原理分析](https://kaedea.com/2022/01/20/android-apm-battery-canary/)

##### 插件化

参考系列文章：<https://kaedea.com/categories/Android/>

开源方案参考：

- [android-dynamic-loading](https://github.com/kaedea/android-dynamical-loading)
- [Tencent热修复方案](https://github.com/Tencent/tinker)
- [dynamic-load-apk](https://github.com/singwhatiwanna/dynamic-load-apk)

### 数据结构算法

- 递归的宏观和微观世界
- 链表类型Leetcode题型思路解析