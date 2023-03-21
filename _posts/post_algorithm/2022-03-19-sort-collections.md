---
layout: post
title: "常见排序算法整理"
date: 2022-03-19 10:08:20
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 数据结构
- 排序
catrgories: Algorithm
---



> ***今日寄语：靡不有初，鲜克有终。***

排序是数据结构和算法中非常重要的一环，如今各种排序算法可谓是呈“百家争鸣”之态。最近在温习算法，刚好借此机会记录一些常见的排序算法，便于日后温故知新。

本章前**暂时**涉及到的算法有：冒泡排序、插入排序、选择排序、归并排序、快速排序、希尔排序、桶排序、计数排序和基数排序等，后面将不定期补充其他排序算法。

### 冒泡排序（Bubble Sort）

**原理：**每次冒泡排序都会比较相邻两个元素，看它们是否满足大小关系要求，若不满足则互换位置；每次冒泡排序至少能够让一个元素归位（移到它应该在的位置），如此重复 n 次，也就完成了 n 个元素的排序了。

**特点：**基于**比较**的**原地排序**算法，即空间复杂度为 **O(1)**，而时间复杂度为 **O(n^2)**，属于**稳定**的排序算法。

**Java 代码实现：**

```java
int[] bubbleSort(int[] array, int n) {
        if (n < 1) return null;
        for (int i = 0; i < n; i++) {
            // 冒泡排序是否提前结束
            boolean stopFlag = true;
            for (int j = 0; j < n - i - 1; j++) {
                if (array[j] > array[j + 1]) {
                    int temp = array[j];
                    array[j] = array[j + 1];
                    array[j + 1] = temp;
                    // 还有数据交换
                    stopFlag = false;
                }
            }
            // 表示没有数据交换，即排序结束
            if (stopFlag) break;
        }
        return array;
    }
```

需要注意的是，这里通过增加了一个 `stopFlag` 字段来尽量减少排序的次数，也就是在已经全部排好序的情况下即时停止防止继续循环，是一种优化策略。

### 插入排序（Insertion Sort）

**原理：**将数组中的数据分为两个区间，已排序区间和未排序区间。初始已排序区间只有一个元素，就是数组的第一个元素。**插入算法的核心思想是取未排序区间中的元素，在已排序区间中找到合适的插入位置将其插入，并保证已排序区间数据一直有序**。重复这个过程，直到未排序区间中元素为空，算法结束。

**特点：**基于**比较**的**原地排序算法**。空间复杂度为 **O(1)**，最坏和平均时间复杂度为 **O(n^2)**，最好时间复杂度为 **O(n)**，属于**稳定**的排序算法。

**图解：**

```
 *     已排序        未排序       移动次数
 *      3|   5   2   6   1      		0
 *      3    5|  2   6   1      		0
 *      2    3   5|  6   1      		2
 *      2    3   5   6   1      		0
 *      1    2   3   5   6      		4
```

**Java 代码实现：**

```java
int[] insertionSort(int[] array, int n) {
        if (n < 1) return  null;
        for (int i = 1; i < n; i++) {
            int target = array[i];
            int j = i - 1;
            for (; j >= 0; j--) {
                if (array[j] > target) {
                    // 依次往后移动
                    array[j+1] = array[j];
                } else  {
                    break;
                }
            }
            // 在正确位置插入目标数据
            array[j+1] = target;
        }
        return array;
    }
```

我们都知道，数组是连续的内存空间，插入和删除操作需要不断的 copy 数组，会增加额外的内存消耗。这里我们通过元素的不断移动就可以巧妙地规避这个问题。

### 选择排序（Selection Sort）

**原理：**选择排序算法的实现思路有点类似插入排序，也分已排序区间和未排序区间。但是选择排序每次会从未排序区间中找到最小的元素，将其放到已排序区间的末尾。

**特点：**选择排序空间复杂度为 O(1)，是一种原地排序算法。选择排序的最好情况时间复杂度、最坏情况和平均情况时间复杂度都为 O(n2)。它是一种不稳定排序算法（每次从未排序的元素中寻找最小值然后与前面元素交换，破坏了稳定性，日常使用较少）。

**图解：**

<img src="/img/in-post/post-algo/selection_sort.png" alt="selection_sort" style="zoom:67%;" />

**Java 代码实现：**

```java
public int[] selectionSort(int[] array, int n) {
        if (n < 1) return  null;
        for (int i = 0; i < n; i++) {
            int target = array[i];
            int minIndex = i;
            int j = i;
            for (; j < n; j++) {
                if (array[j] < array[minIndex]) {
                    minIndex = j;
                }
            }
            array[i] = array[minIndex];
            array[minIndex] = target;
        }
        return array;
    }
```

### 快速排序（Quick Sort）

**原理：**如果要排序数组中下标从 p 到 r 之间的一组数据，我们选择 p 到 r 之间的任意一个数据作为 pivot（分区点）。我们遍历 p 到 r 之间的数据，将小于 pivot 的放到左边，将大于 pivot 的放到右边，将 pivot 放到中间。经过这一步骤之后，数组 p 到 r 之间的数据就被分成了三个部分，前面 p 到 q-1 之间都是小于 pivot 的，中间是 pivot，后面的 q+1 到 r 之间是大于 pivot 的。根据**分治、递归**的处理思想，我们可以用**递归**排序（通过元素交换来移动和分区以节省空间）下标从 p 到 q-1 之间的数据和下标从 q+1 到 r 之间的数据，直到区间缩小为 1，就说明所有的数据都有序了。

```
递推公式：
quick_sort(p…r) = quick_sort(p…q-1) + quick_sort(q+1… r)

终止条件：
p >= r
```

> 我们通过游标 i 把 A[p...r-1]分成两部分。A[p...i-1]的元素都是小于 pivot 的，我们暂且叫它“已处理区间”，A[i...r-1]是“未处理区间”。我们每次都从未处理的区间 A[i...r-1]中取一个元素 A[j]，与 pivot 对比，如果小于 pivot，则将其加入到已处理区间的尾部，也就是 A[i]的位置。
>
> 如果我们希望快排是原地排序算法，那它的空间复杂度得是 O(1)，那 `partition()` 分区函数就不能占用太多额外的内存空间，我们就需要在 A[p...r]的原地完成分区操作。在数组某个位置插入元素，需要搬移数据，非常耗时。有一种处理技巧，就是交换，在 O(1) 的时间复杂度内完成插入操作。这里我们也借助这个思想，只需要将 A[i] 与 A[j] 交换，就可以在 O(1) 时间复杂度内将 A[j] 放到下标为 i 的位置。

**特点：**快排是一种原地、不稳定的排序算法。时间复杂度为：O(nlogn)，空间复杂度 O(1)。

**与归并排序的区别：**

归并排序的处理过程是由下到上的，先处理子问题，然后再合并。而快排正好相反，它的处理过程是由上到下的，先分区，然后再处理子问题。归并排序虽然是稳定的、时间复杂度为 O(nlogn) 的排序算法，但是它是非原地排序算法。我们前面讲过，归并之所以是非原地排序算法，主要原因是合并函数无法在原地执行。快速排序通过设计巧妙的原地分区函数，可以实现原地排序，解决了归并排序占用太多内存的问题。

**图解：**

<img src="/img/in-post/post-algo/quick_sort.png" alt="quick_sort" style="zoom: 50%;" />

**Java 代码实现：**

```java
		public int[] sort(int[] array, int n) {
        if (n < 1) return null;
        quickSort(array, 0, n-1);
        return array;
    }

    private void quickSort(int[] array, int start, int end) {
        if (start >= end) return;
        int position = partition(array, start, end);
        quickSort(array, start, position-1);
        quickSort(array, position+1, end);
    }

    // 返回pivot基准值的下标
    private int partition(int[] array, int start, int end) {
        int pivot = array[end];
        int left = start;
        for (int i = start; i < end; i++) {
            if (array[i] < pivot) {
                // 碰到较小值则交换
              	if (left == i) {
                    // 如果位置不变则没必要交换了，优化效率
                    left++;
                } else {
                    int temp = array[left];
                    array[left++] = array[i];
                    array[i] = temp;
                }
            }
        }
        int temp = array[left];
        array[left] = pivot;
        array[end] = temp;
        return left;
    }
```

### 归并排序（Merge Sort）

**原理：**如果要排序一个数组，我们先把数组从中间分成前后两部分，然后对前后两部分分别排序，再将排好序的两部分合并在一起，这样整个数组就都有序了。归并排序使用的分治思想。

```
递推公式：
merge_sort(p…r) = merge(merge_sort(p…q), merge_sort(q+1…r))

终止条件：
p >= r 不用再继续分解
```

**特点：**是稳定的排序算法，时间复杂度O(nlogn)，空间复杂度 O(n)。

**图解：**

![merge_sort](/img/in-post/post-algo/merge_sort.png)

**Java 代码实现：**

```java
 public int[] sort(int[] array, int n) {
        if (n < 1) return  null;
        mergeSort(array, 0, n-1);
        return array;
    }

    private void mergeSort(int[] array, int start, int end) {
        if (start >= end) return;
        int mid = (start + end) / 2;
        // 分治递归分解
        mergeSort(array, start, mid);
        mergeSort(array, mid+1, end);
        // 合并序列
        merge(array, start, mid, end);
    }

    // 合并
    private void merge(int[] array, int start, int mid, int end) {
        int[] temp = new int[end - start + 1];
        int k = 0;
        int left = start;
        int right = mid + 1;
        while (left <= mid && right <= end) {
            if (array[left] <= array[right]) { // 等于号保证算法稳定性(保证相同值排序前后的顺序不改变)
                temp[k++] = array[left++];
            } else  {
                temp[k++] = array[right++];
            }
        }
        // 找到有剩余元素的区间
        int restStartIndex = left;
        int restEndIndex = mid;
        if (right <= end) {
            restStartIndex = right;
            restEndIndex = end;
        }
        // 将剩下的元素拷贝到临时数组
        while (restStartIndex <= restEndIndex) {
            temp[k++] = array[restStartIndex++];
        }
        for (int i = 0; i < end - start + 1; i++) {
            array[start+i] = temp[i];
        }

    }
```

### 计数排序（Counting Sort）

**原理：**计数排序其实是桶排序的一种特殊情况，只是桶的大小颗粒度不同。当要排序的 n 个数据，所处的范围并不大的时候，比如最大值是 k，我们就可以把数据划分成 k 个桶。每个桶内的数据值都是相同的，省掉了桶内排序的时间。步骤如下：

1. 若最大值 K 未知，则先遍历找出 K；
2. 创建一个容量为 K 的容器 count，存储每个数据出现次数；
3. 将容器 count 内的每个元素依次累加求和；
4. 由于容器 c 内数据已经具有顺序性，只需要根据目标数作为下标，就可以找到他所在的“桶”，以及里面数据的个数，再依据 `count[originArray[i]] - 1` 求得数据所在排名。

**特点：**计数排序只能用在数据范围不大的场景中，如果数据范围 k 比要排序的数据 n 大很多，就不适合用计数排序了。而且，计数排序只能给非负整数排序，如果要排序的数据是其他类型的，要将其在不改变相对大小的情况下，转化为非负整数。时间复杂度为 O(n)。

**图解：**

![counting_sort](/img/in-post/post-algo/counting_sort.png)

**Java 代码实现：**

```java
public class CountingSort {

    public int[] countingSort(int[] array, int n) {
        if (n < 1) return null;
        // 找出数据范围
        int max = array[0];
        for (int i = 0; i < n; i++) {
            if (max < array[i]) {
                max = array[i];
            }
        }
        // 创建容器并初始化
        int[] container = new int[max+1];
        for (int i = 0; i <= max; i++) {
            container[i] = 0;
        }
        // 存储每个数据的出现次数
        for (int i = 0; i < n; i++) {
            container[array[i]]++;
        }
        // 依次累加求和
        for (int i = 0; i <= max; i++) {
            container[i] = container[i] + container[i-1];
        }

        // 创建临时数组存储排序后的结果
        int[] results = new int[n];
        for (int i = n-1; i >= 0; i--) {
            int index = container[array[i]] - 1;
            results[index] = array[i];
            container[array[i]] = index;
        }

        return results;
    }
}

```

### 基数排序（Radix Sort）

**原理：**将数据大小比较拆分成每一位的对比，要求数据可以划分成高低位，位之间有递进关系。比较两个数，我们只需要比较高位，高位相同的再比较低位。而且每一位的数据范围不能太大，因为基数排序算法需要借助桶排序或者计数排序来完成每一个位的排序工作。适用于如单词、手机号等固定长度和范围类型数据的排序。时间复杂度可以做到 O(n)。

**图解：**

![radix_sort](/img/in-post/post-algo/radix_sort.png)

**Java 代码实现：**

```java
public class RadixSort {

    /**
     * 基数排序
     *
     * @param arr
     */
    public static void radixSort(int[] arr) {
        int max = arr[0];
        for (int i = 0; i < arr.length; i++) {
            if (arr[i] > max) {
                max = arr[i];
            }
        }

        // 从个位开始，对数组arr按"指数"进行排序
        for (int exp = 1; max / exp > 0; exp *= 10) {
            countingSort(arr, exp);
        }
    }

    /**
     * 计数排序-对数组按照"某个位数"进行排序
     *
     * @param arr
     * @param exp 指数
     */
    public static void countingSort(int[] arr, int exp) {
        if (arr.length <= 1) {
            return;
        }

        // 计算每个元素的个数
        int[] c = new int[10];
        for (int i = 0; i < arr.length; i++) {
            c[(arr[i] / exp) % 10]++;
        }

        // 计算排序后的位置
        for (int i = 1; i < c.length; i++) {
            c[i] += c[i - 1];
        }

        // 临时数组r，存储排序之后的结果
        int[] r = new int[arr.length];
        for (int i = arr.length - 1; i >= 0; i--) {
            r[c[(arr[i] / exp) % 10] - 1] = arr[i];
            c[(arr[i] / exp) % 10]--;
        }

        for (int i = 0; i < arr.length; i++) {
            arr[i] = r[i];
        }
    }
}
```

### 希尔排序（Shell Sort）

**原理**：插入排序的优化版。先将整个待排序记录分割成若干子序列，分别进行直接插入排序，待整个序列中的记录基本排序时，再对全体记录进行一次直接插入排序

- 数据大致有序时最快 O(n)；
- 开始时 gap 的值比较大，子序列中的元素较少，排序速度较快；
- 随着排序进展， gap 值逐渐变小，子序列中元素个数变多，但是由于前面工作的基础，大多数元素已经基本有序，所以排序速度依然很快。

**图解：**

![shell_sort](/img/in-post/post-algo/shell_sort.png)

**Java 代码实现：**

```java
public void shellSort(int[] arrays) {
        // 增量每次都/2
        for (int step = arrays.length / 2; step > 0; step /= 2) {

            // 从增量那组开始进行插入排序，直至完毕
            for (int i = step; i < arrays.length; i++) {

                int j = i;
                int temp = arrays[j];

                // j - step 就是代表与它同组隔壁的元素
                while (j - step >= 0 && arrays[j - step] > temp) {
                    arrays[j] = arrays[j - step];
                    j = j - step;
                }
                arrays[j] = temp;
            }
        }
    }
```

### 总结

![sort_categories.jpg](/img/in-post/post-algo/sort_categories.png)

### 更多

本文涉及到的所有代码都在 GitHub 仓库：[**AlgoPractice**](https://github.com/Moosphan/AlgoPractice/tree/master/src/algo/common/sort) 上面，后续的数据结构算法相关训练也会同步至该仓库。