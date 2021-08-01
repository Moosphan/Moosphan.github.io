---
layout:     post
title: "带你领略 Kotlin 中的 “when”魔法"
date: 2019-05-21 13:04:43
author:     "Dorck"
catalog: false
header-style: text
tags: Kotlin
---
提到 **`when`**，大家都会联想到 Java 中的 **`switch`**，然而在 kotlin 中，`when` 显然比 Java 中的 `switch` 要强大得多。首先，我们先来看看 when 的特点：

- 它可以作为表达式使用
- 使用更加安全
- 强大灵活的分支结构
- 可以不带参数

接下来，我来带大家逐步领略这些特点。以下面这段 Java 功能代码为例：<!--more-->

```java
switch(animal) {
    case EAGLE:
        System.out.println("鸟类");
        break;
    case DOLPHIN:
        System.out.println("兽类");
        break;
    case LOCUST:
        System.out.println("昆虫类");
        break;
    case CARP:
        System.out.println("鱼类");
        break;
    case TIGER:
        System.out.println("兽类");
        break;
    case DUCK:
        System.out.println("鸟类");
        break;
    default:
        System.out.println("未知动物");
        break;
}
```

从以上代码可以看出，我们这里实现的功能是：通过用户输入一个动物名称来得到其对应的种类信息。乍一看，你可能会觉得上面的代码再正常不过，但是倘若我们的输入情形很多的话，就会增加密密麻麻的限制条件，这肯定是我们不想看到的。那么，让我们来看看通过 Kotlin 的 when 表达式如何实现相同功能：

```kotlin
when(animal) {
    EAGLE, DUCK -> println("鸟类")
    DOLPHIN, TIGER -> println("兽类")
    CARP -> println("鱼类")
    LOCUST -> println("昆虫类")
    else -> println("未知动物")
}
```

OK，以上就是该功能代码的 kotlin 实现方式，代码不仅简化了很多，也省去了大量的 `break` 语句，避免了 Java 中因遗漏 `break` 而导致的 bug，增强了安全性。如果匹配成功，对应的分支便会执行，同时也可以把多个情况合并到同一个分支，只需要通过逗号隔开，并没有额外的代码。

> PS：每个条件分支的处理通过在 **`->`** 之后来进行。

#### 作为表达式使用

首先，我们需要重温一下**表达式**与**语句**的区别。表达式有值，并能作为另一个表达式的一部分来使用；而语句没有返回值。Java 中的控制结构皆为**语句**。而在 Kotlin 中，除了循环体结构外，大多数控制结构都是**表达式**。举个栗子😄，还是上面的例子，我们可以将其优化为以下代码：

```kotlin
var result = when(animal) {
    EAGLE, DUCK -> "鸟类"
    DOLPHIN, TIGER -> "兽类"
    CARP -> "鱼类"
    LOCUST -> "昆虫类"
    else -> "未知动物"
}
// 输入：DUCK，返回：当前动物的种类为：鸟类
println("当前动物的种类为： $result")
```

此外，我们也可以直接通过**表达式函数**来直接得到最终的结果：

```kotlin
fun displayAnimalType(animal: Animal) =
            when(animal) {
                Animal.EAGLE, Animal.DUCK -> "鸟类"
                Animal.DOLPHIN, Animal.TIGER -> "兽类"
                Animal.CARP -> "鱼类"
                Animal.LOCUST -> "昆虫类"
                else -> "未知动物"
            }
```

#### 强大灵活的分支

Kotlin 中的 **`when`** 远比 Java 当中的 **`switch`** 要强大得多。`switch` 只能以常量作为分支条件，而 `when` 允许使用任意对象。emmm～举个简单的例子吧：

```kotlin
fun handleResult(score: Int) =
            when(score) {
                in 0..39 -> "fail to go up to the next grade."
                in 40 until 60 -> "not pass, should test again."
                97,98,99,100 -> "learning outstanding results."
                else -> "pass the test."
            }
```

Java 当中，当我们的分支情况比较多或者每种分支可能会重复多次时，势必会通过 `if-else` 来各种判断，而在 Kotlin 当中，一个 `when` 就能帮我们完成这些操作。

此外，如果你想判断一个未知变量的类型，而其可能类型有很多种可能性，那么也可以通过 `when` 来实现，例如：

```kotlin
fun judgeAnimalKind(animal: Any) =
            when(animal) {
                is Bird -> "这是鸟类"
                is Fish -> "这是鱼类"
                judgeIfInsect(animal) -> "这是昆虫"
                else -> "我不知道这是什么动物"
            }
```

当然，我们也可以将**代码块**作为我们的分支体，这时候，代码块中最后一个表达式或者变量就是该分支体的返回结果，如：

```kotlin
fun judgeAnimalKind(animal: Any) =
            when(animal) {
                is Bird -> "这是鸟类"
                is Fish -> "这是鱼类"
                judgeIfInsect(animal) -> "这是昆虫"
                else -> {
                    val kind = if (judgeDolphin(animal) || judgeTiger(animal)) {
                        "这是兽类"
                    }else {
                        "我不知道这是什么动物"
                    }
                    kind
                }
            }
```

上述代码中，`kind` 即为我们的 else 分支块中的最终返回结果。

#### 无参的情况

特别地，`when` 中的参数可能并非满足我们的需求，我们可以选择省略该参数，例如这样：

```kotlin
when {
    phoneNumber?.length != 11 -> toast("illegal phone number.")
    password.isNullOrEmpty() -> toast("please input password")
}
```

#### 总结

通过以上的介绍，我们不难发现：**`when`** 的使用场景要比 Java 的 `switch` 灵活、强大的多，同时，我们也可以借助 when 来重构和优化复杂的 if-else 结构，以简化我们的代码，提高代码的可读性。

