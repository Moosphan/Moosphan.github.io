---
layout: post
title: "把数组排成最小的数"
date: 2022-03-19 09:18:28
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 数据结构
- 排序
- 算法
catrgories: Algorithm
---

本文是对于 [常用排序算法合集](2022-03-19-sort-collections.md) 的扩展应用。

### 题目内容

**把数组排成最小的数。**要求如下：

输入一个非负整数数组，把数组里所有数字拼接起来排成一个数，打印能拼接出的所有数字中最小的一个。

**附加说明：**

- `0 < nums.length <= 100`

- 输出结果可能非常大，所以你需要返回一个字符串而不是整数
- 拼接起来的数字可能会有前导 0，最后结果不需要去掉前导 0

### 题意分析

首先写几条测试用例来带入实际场景看一下情况：

- 输入 `[2, 10, 6]`，输出拼接后的最小值是：`1026`。
- 输入 `[48, 3, 305, 16]`，输出拼接后的最小值：`16305348`。

由上可知，想要拼接得到最小值，只需要将数组中的元素按某种规律依次“从小到大”排列即可。值得注意的是，这里的**“大小”**并不是简单数值比较，而是与目标元素拼接后哪个较小。举个例子，数字 3 与数字 305 比较大小，正常来说 `3 < 305` ，而在本题情境下，显然 305 应该排在 3 之前，因为 `3305 > 3053`。那么，我们不难得出以下结论：

- 若 x + y > y + x，则 x “大于” y，本题情境下，y 应该排在 x 之前；
- 若 x + y < y + x，则 x “小于” y，x 应排在 y 之前。

### 代码实现

```java
class Solution {
    public String minNumber(int[] nums) {
        String[] stringValues = new String[nums.length];
        for (int i = 0; i < nums.length; i++) {
            stringValues[i] = String.valueOf(nums[i]);
        }
        quickSort(stringValues, 0, stringValues.length - 1);
        StringBuilder stringBuilder = new StringBuilder();
        for (int i = 0; i < stringValues.length; i++) {
            stringBuilder.append(stringValues[i]);
        }
        return stringBuilder.toString();
    }

    private void quickSort(String[] array, int start, int end) {
        if (start >= end) return;
        int position = partition(array, start, end);
        quickSort(array, start, position-1);
        quickSort(array, position+1, end);
    }

    private int partition(String[] array, int l, int h) {
        // Last element as pivot.
        String pivot = array[h];
        int i = l;
        for (int j = l; j < h; j++) {
            String target = array[j];
            if ((array[j]+pivot).compareTo(pivot+array[j]) < 0) {
                if (i == j) {
                    // No need swapping.
                    ++i;
                } else {
                    // Need to move by exchange.
                    String temp = array[i];
                    array[i++] = target;
                    array[j] = temp;
                }
            }
        }
        String temp = array[i];
        array[i] = pivot;
        array[h] = temp;
        return i;
    }
}
```

### 复杂度分析

解题思路基于快排算法实现，所以平均时间复杂度为 O(NlogN)，最坏退化为 O(N^2)，空间复杂度为 O(N)，以为内额外申请了一个大小为 N 的 `stringValues` 数组用于存放字符串。
