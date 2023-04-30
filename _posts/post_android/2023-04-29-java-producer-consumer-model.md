---
layout: post
title: "回顾Java中经典的生产/消费者模型"
date: 2023-04-29 11:00:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 多线程
- BlockingQueue
catrgories: Java

---

### 概述

生产者-消费者模型是 Java 并发编程中比较常见的加锁应用场景之一，以下是维基百科的对于该名词的定义：

> **生产者消费者问题**（Producer-consumer problem），也称**有限缓冲问题**（Bounded-buffer problem），是一个[多进程](https://zh.wikipedia.org/wiki/多进程)[同步](https://zh.wikipedia.org/wiki/同步)问题的经典案例。该问题描述了共享固定大小[缓冲区](https://zh.wikipedia.org/wiki/缓冲区)的两个进程——即所谓的“生产者”和“消费者”——在实际运行时会发生的问题。生产者的主要作用是生成一定量的数据放到缓冲区中，然后重复此过程。与此同时，消费者也在缓冲区消耗这些数据。该问题的关键就是要保证生产者不会在缓冲区满时加入数据，消费者也不会在缓冲区中空时消耗数据。

### 问题分析

![java_producer_consumer](/img/in-post/post-android/java_producer_consumer.png)

结合上图及定义我们可以提取出该模型具有以下特点：

- 生产者和消费者可以同时并发运作
- 缓冲区满则阻塞等待消费者消费数据
- 缓冲区空则阻塞等待生产者生产数据

我们知道，生产者和消费者可以同时运作，并且二者执行效率和规模也很有可能出现严重的不对等性。那么为了保证生产和消费操作的**原子性**和共享数据的**可见性**，我们需要借助一种**同步机制**来保障该模型的正常运行。

### 实现方式

以下来介绍几种常见的生产-消费模型的实现方式。

##### 1. synchorized + wait/notify

```java
public class GoodsStorageDispatcher {
    // 仓库容纳上限
    private static final int MAX_SIZE = 100;
    // 仓库容纳的货物集合
    private LinkedList<Good> list = new LinkedList();


    public void produce(Good good) {
        synchronized (list) {
            while (list.size() == MAX_SIZE) {
                System.out.println("仓库已满 >> 生产暂停，等待消费");
                try {
                    list.wait();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            list.add(good);
            System.out.println("生产了一个新产品，现库存为：" + list.size());
            list.notifyAll();
        }
    }
    public void consume() {
        synchronized (list) {
            while (list.size() == 0) {
                System.out.println("库存已清仓 >> 消费暂停，等待生产");
                try {
                    list.wait();
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
            list.remove();
            System.out.println("消费了一个产品，现库存为：" + list.size());
            list.notifyAll();
        }
    }

}
```

可以看到，我们采用对象锁以及等待/唤醒的方式来实现生产和消费的同步机制。这里的 wait 和 notifyAll 在示例中含义如下：

- wait：在缓冲区**满/空**的情况下先挂起**生产/消费**线程并释放锁，进入等待状态，让其他线程执行
- notify：当生产/消费一个商品时，通知其他等待的线程继续执行并释放锁，进入等待状态

值得注意的是，produce 和 consume 方法中都使用了 while 循环来判断缓冲区的存储状态（空/满），这样处理的原因是什么呢，为何不直接用 if 呢？

其实这里用 while 是为了**防止虚假唤醒**，我们结合一个例子更好理解一些：

<img src="/img/in-post/post-android/fake_notify.png" alt="fake_notify" style="zoom: 67%;" />

如上图所示，假设我们现在有 1 个生产者，3 个消费者在执行生产和消费任务，而目前缓冲区（Warehouse）仅有一个数据：A。

如果当 Consumer-1 消费了 A 后，缓冲区就为空了，Consumer-2 和 Consumer-3 从缓冲区取数据消费时就会陷入等待状态（因为 Consumer-2 消费时缓冲区为空会执行 wait 方法并释放锁，Consumer-3也会重蹈覆辙）。而此时又有一个生产者 Producer-2 生产了数据 B 并加入缓冲区，通过 notifyAll 去唤醒所有等待的消费者，假设消费者 Consumer-2 优先抢到了使用权将 B 消费后缓冲区又恢复到空空如也的状态。接下来的情况就值得注意了：消费者 Consumer-3 想终于可以消费了，然而由于使用的是 if，所以唤醒后继续执行到 `list.remove()`，毫无疑问的抛出了 IndexOutOfBoundsException，因为此时 list 为空了，这就是所谓的“**虚假唤醒**”。其实这里我们不能直接消费数据，而是要继续等待。因此这里使用 while 循环判断，当唤醒继续执行代码时重新进入 while 内判断缓冲区数据是否为空。

##### 2. Lock + Condition

```java
public class GoodsStorageDispatcher {
    // 仓库容纳上限
    private static final int MAX_SIZE = 100;
    // 仓库容纳的货物集合
    private LinkedList<Good> list = new LinkedList();
    // 锁
    final Lock lock = new ReentrantLock();
    // 用于等待或唤醒线程（仓库满后需要等待被消费，成功消费后需要唤醒线程继续生产）
    final Condition notFull = lock.newCondition();
    // 用于等待或唤醒线程（仓库清仓后需要等待生产，生产成功后需要唤醒线程继续消费）
    final Condition notEmpty = lock.newCondition();


    public void produce(Good good) throws InterruptedException {
        lock.lock();
        try {
            while (list.size() == MAX_SIZE)  { //防止虚假唤醒，Condition的await调用一般会放在一个循环判断中
                System.out.println("仓库已满 >> 生产暂停，等待消费");
                notFull.await();
            }
            list.add(good);
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }
    public void consume() throws InterruptedException {
        lock.lock();
        try {
            while (list.size() == 0) {
                System.out.println("库存已清仓 >> 消费暂停，等待生产");
                notEmpty.await();
            }
            list.remove();
            notFull.signal();
        } finally {
            lock.unlock();
        }
    }

}
```

通过 ReentrantLock + Condition 来替代实现上面的等待/唤醒，但无疑它的功能性更加齐全和灵活（有限等待、公平锁、读写锁分离等）。

##### 3. BlockingQueue

```java
public class GoodsStorageDispatcher {
    // 仓库容纳上限
    private static final int MAX_SIZE = 100;
    // 仓库容纳的货物集合
    private LinkedBlockingQueue<Good> list = new LinkedBlockingQueue<>(MAX_SIZE);
  

    public void produce(Good good) {
        if (list.size() == MAX_SIZE) {
            System.out.println("仓库已满 >> 生产暂停，等待消费");
        }
        try {
            list.put(good);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    public void consume() {
        if (list.size() == 0) {
            System.out.println("库存已清仓 >> 消费暂停，等待生产");
        }
        try {
            list.take();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
    

}
```

`BlockingQueue` 其实就是阻塞队列，是基于阻塞机制实现的线程安全的队列。而阻塞机制的实现是通过在入队和出队时加锁的方式避免并发操作。我们可以理解它内部其实已经实现了上述的加锁和等待/唤醒这一套流程，只不过帮我们封装好了这一切。



### 应用场景

我们所熟知的线程池，它的内部其实就是构建了一个生产者-消费者模型用于将**任务管理**和**线程管理**两部分工作解耦，很大程度上提高了可扩展性。

![threadpool_running_process](/img/in-post/post-android/threadpool_running_process.png)

平时业务中也会有生产消费模型的用武之地，比如多固件更新过程就符合生产-消费模型，用户通过手动操作选中特定设备的固件包加入升级队列，随后由 UpdateDispatcher 根据具体设备类型进行不同策略的分发消费。

### 相关参考

- [*wait()方法为什么要放在while循环里面-虚假唤醒*](https://blog.csdn.net/thetimelyrain/article/details/107209101)
- [*深入理解 BlockingQueue*](https://juejin.cn/post/6999798721269465102)