---
layout: post
title: "简单聊聊 ChatGPT"
date: 2023-03-29 10:50:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 工作技巧
- ChatGPT
categories: skill
---

关于国内如何注册和使用 ChatGPT 可以参考这篇文章：[国内注册一个属于自己的免费ChatGPT账号](https://chatgpt-plus.github.io/chatgpt/)。本文不是扫盲贴，只是通过这两天对 ChatGPT 的使用体验来随便聊聊。

首先，对于他所具备的能力想必大家已经心照不宣了，从它（ChatGPT 3.0）问世以来的各项 DAU、MAU 数据就可以知道其火爆程度了。它的出现及发展代表着自然语言处理提升到了新的高度，甚至有人称其为第三次工业革命的前兆。当然，目前大家对于 CHatGPT 的赞美之词是”甚嚣尘上“，其中可能夹杂着部分夸大之词，但不可否认的是： AI 即将步入寻常百姓家。

### ChatGPT 能为开发做什么

说了这么多，那么对于我们普通开发人员来说，它的出现意味着什么呢？于我而言，它其实是一位可敬的对手，也是一位可靠的伙伴。

例如，我想找出 LeetCode 上排名 Hot 100 的题目，不出三十秒，ChatGPT 就能为我列举出来所有题目，比我们自己找题要节省很多时间。

```
Q：请整理出Leetcode hot100的题目

A：（From ChatGPT）
1. Two Sum
2. Add Two Numbers
3. Longest Substring Without Repeating Characters
4. Median of Two Sorted Arrays
5. Longest Palindromic Substring
6. ZigZag Conversion
7. Reverse Integer
8. String to Integer (atoi)
9. Palindrome Number
10. Regular Expression Matching
11. Container With Most Water
12. Integer to Roman
13. Roman to Integer
14. 3Sum
15. 3Sum Closest
16. Letter Combinations of a Phone Number
17. 4Sum
18. Remove Nth Node From End of List
19. Valid Parentheses
20. Merge Two Sorted Lists
21. Generate Parentheses
22. Merge k Sorted Lists
23. Swap Nodes in Pairs
24. Group Anagrams
25. Reverse Nodes in k-Group
26. Remove Duplicates from Sorted Array
27. Search Insert Position
28. Maximum Subarray
29. Length of Last Word
30. Climbing Stairs
31. Best Time to Buy and Sell Stock
32. Same Tree
33. Symmetric Tree
34. Maximum Depth of Binary Tree
35. Count and Say
36. Construct Binary Tree from Preorder and Inorder Traversal
37. Binary Tree Level Order Traversal
38. Maximum Depth of Binary Tree
39. Binary Tree Zigzag Level Order Traversal
40. Path Sum
41. Path Sum II
42. Sum Root to Leaf Numbers
43. Flatten Binary Tree to Linked List
44. Minimum Depth of Binary Tree
45. Balanced Binary Tree
46. Convert Sorted Array to Binary Search Tree
47. Unique Binary Search Trees
48. Unique Binary Search Trees II
49. Recover Binary Search Tree
50. Populating Next Right Pointers in Each Node
51. Populating Next Right Pointers in Each Node II
52. Sum Root to Leaf Numbers
53. Convert Sorted List to Binary Search Tree
54. Insert Interval
55. Merge Intervals
56. Longest Consecutive Sequence
57. LRU Cache
58. Gas Station
59. Jump Game
60. Jump Game II
61. Spiral Matrix
62. Permutations
63. Permutations II
64. Rotate Image
65. N-Queens
66. N-Queens II
67. Combinations
68. Combinations II
69. Minimum Path Sum
70. Unique Paths
71. Unique Paths II
72. Word Search
73. Restore IP Addresses
74. Evaluate Reverse Polish Notation
75. Sort Colors
76. Subsets
77. Subsets II
78. Scramble String
79. Partition Equal Subset Sum
80. Search a 2D Matrix
81. Search a 2D Matrix II
82. Remove Duplicates from Sorted List
83. Remove Duplicates from Sorted List II
84. Wildcard Matching
85. Edit Distance
86. Sum of Left Leaves
87. Find All Anagrams in a String
88. Remove Invalid Parentheses
89. Word Ladder
90. Sliding Window Maximum
91. Kth Largest Element in an Array
92. LRU Cache
93. Number of Islands
94. Verify Preorder Sequence in Binary Search Tree
95. Decode String
96. Sum of Two Integers
97. Design TinyURL
98. Maximum Product Subarray
99. Best Time to Buy and Sell Stock with Cooldown
100. Unique Binary Search Trees III
```

或者，我还可以让他模拟面试官的身份与我对话（场景模拟），考察我岗位职责内需要掌握的知识点，写漏补缺，协助我在后面的真实面试过程中取得好成绩。

![p2](/Users/dorck/github/Moosphan.github.io/img/in-post/post-skills/p2.png)

> 上图来源于网络，仅做举例展示，侵权删。

又或者，我们在编码时经常会遇到功各种各样的问题，ChatGPT 完全有能力可以协助我们做一些简单的编码、单元测试、函数功能检测等工作。前几天我遇到一个问题，两年前的一个项目中有一个功能函数（从 /proc/stat 中获取 CPU 数据）在高版本的机器上无法正常运行，抛出了异常。下面来展示一下借助于 ChatGPT 帮我们查找问题的对话过程：

1. 请帮我检查一下下面的函数存在什么问题？

   ```kotlin
   private fun readProcFile(file: String): Array<String>? {
           var procFile: RandomAccessFile? = null
           var procFileContents: String
           return try {
               procFile = RandomAccessFile(file, "r")
               procFileContents = procFile.readLine()
               val rightIndex = procFileContents.indexOf(")")
               if (rightIndex > 0) {
                   procFileContents = procFileContents.substring(rightIndex + 2)
               }
   
               procFileContents.split(" ").toTypedArray()
           } catch (ioe: IOException) {
               ioe.printStackTrace()
               return null
           } finally {
               procFile?.close()
           }
       }
   ```

   Answer：

   ```
   1. 没有处理读取文件可能抛出的异常；
   2. 没有检查读取到的字符串是否为空；
   3. 没有处理RandomAccessFile在关闭时可能抛出的异常；
   4. 没有判断右括号 ')' 的位置是否合法，以防止越界访问。
   ```

2. 上面函数的作用是什么？ 

   Answer：

   ```
   这个函数的作用是从给定文件中读取内容，并根据空格分割成字符串数组返回。
   ```

3. 一般用来获取什么？

   Answer：

   ```
   一般用来获取系统信息，比如文件状态、进程信息等。
   ```

4. 如果获取的 /proc/stat 虚拟文件信息，会有什么问题吗？

   Answer：

   ```
   如果获取的是 /proc/stat 虚拟文件信息，那么可能会出现越界访问的问题，因为procFileContents.indexOf(")")的结果可能会大于procFileContents的长度。
   ```

5. 在Android系统中会有版本兼容问题吗？

   Answer：

   ```
   在Android系统中如果用到 /proc/stat 虚拟文件信息，可能会出现版本兼容问题，因为/proc/stat 虚拟文件的格式在不同的Android版本中可能会有所不同。
   ```

6. 比如说呢？

   Answer：

   ```
   比如：Android 8.0 之前的版本中，/proc/stat 虚拟文件的格式是：cpu  user  nice  system  idle  iowait  irq  softirq  ...
   而Android 8.0 及以后的版本中，/proc/stat 虚拟文件的格式改变了：cpu  user  nice  system  idle  iowait  irq  softirq  steal  guest  guest_nice  ...
   ```

7. 那么 /proc/stat 文件访问权限有变化吗？

   Answer：

   ```
   /proc/stat 文件的访问权限在Android 8.0 之前的版本中是公开的，任何应用都可以访问，但从Android 8.0 开始，/proc/stat 文件的访问权限仅限于系统应用。
   ```

自始至终，我们通过 7 轮问答最终得到了想要的答案。然而事实上，如果我们在向 ChatGPT 提问时能够尽可能描述清楚问题，提供足够多的已知信息，则能够大幅度缩短获取我们所期望的答案。上述问题在经过优化好的话术，例如开头给出问题发生的背景是在 Android 手机上，Android 6.0 执行没有问题等等，新一轮回答只经过 3 轮就得到了我们期望的结果。由此可见，**“提问的艺术”对于 ChatGPT 来说也是至关重要的，它能够左右我们距离最终结果的长短以及结果的质量。**

在 ChatGPT 的帮助下，单元测试将变得简单易得，收益率大幅提高。为什么这么说呢？实际上，据笔者估计，目前开发人员中日常编写单元测试的人不到 30%，原因大抵是浪费时间，出力不讨好，不在公司绩效考察范围内等。而根据软件工程长期的历史数据统计和测试经验来看，单元测试却能帮我们解决 80% 的编码缺陷。单元测试重要性由此可见。自此，在 ChatGPT 的加持下，单元测试成本大幅度降低，开发人员也不用被繁琐的测试用例所缠身，只需要丢给 ChatGPT 去完成就好了。比如，我们让 ChatGPT 为上述代码编写单元测试：

```kotlin
// Q：请帮我为优化后的代码编写单元测试？

// A：单元测试代码如下：
@Test
fun testReadProcFile() {
    val fileName = "/proc/stat"

    // 测试文件存在
    val contents = readProcFile(fileName)
    assertNotNull(contents)

    // 测试文件不存在
    val notExistsFileName = "/not/exists/file"
    val notExistsContents = readProcFile(notExistsFileName)
    assertNull(notExistsContents)
}
```

### ChatGPT 未来趋势

对于我们开发者而言，除以上能力以外，ChatGPT 还可以在源码阅读、API 文档生成、文档翻译、代码补全&纠错、协作编程等方面为我们提供帮助，能够显著提高我们的工作和学习效率。笔者预测，未来 ChatGPT 势必会走入寻常百姓家，每个人都会感受到 AI 带给我们的变化，行业可能会重新洗牌。以后每个人的身边势必会有一个私人定制的 “ChatGPT” 与我们形影不离，不论是开发者、医生、司机、金融工作者、学生还是老师，每个人都会享受 AI 的便利。

### 我们能做什么？

作为一名普通人，不要盲目的抵制，也无需毫无保留的拥抱。对技术心存敬畏，虚心向学，也要保持距离。毕竟，AI 的产生就是为了服务于人，倘若有一天你不能从 ta 身上感受到积极的变化或无法占据主导地位，那就疏远 ta 吧。