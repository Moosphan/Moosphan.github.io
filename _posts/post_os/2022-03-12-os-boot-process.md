---
layout:     post
title: "操作系统的启动过程"
date: 2022-03-12 16:02:13
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 操作系统
- Operation system
- 计算机基础
categories: computer
---



### 操作系统启动过程

![operation_sys_startup](/img/in-post/post-computer-science/operation_sys_startup.png)

操作系统的启动与 BIOS 息息相关，具体流程参考：https://www.cnblogs.com/tyong/articles/10141205.html

### BIOS

<img src="/img/in-post/post-computer-science/bios_distribution.jpeg" alt="bios_distribution" style="zoom:67%;" />

内存中一部分存储是 ROM（Read-Only Memory），启动程序的代码存在 ROM 中。计算机加电之后，首先**读取**（或许因此叫基本输入输出系统 Basic Input/Output System）并运行这部分程序。这部分程序叫 **BIOS 启动固件**，是一种固化到主板上的重要系统程序。

##### BIOS 启动过程

- 通电：CPU初始化，并执行BIOS程序。
- 自检：BIOS程序启动开始POST自检（此阶段无法屏幕显示，只能通过主板蜂鸣器报警），进行更完整的硬件（检查CPU/RAM/键盘/鼠标等）检测。
- 其他初始化：初始化显卡和其他设备并显示到屏幕。
- 加载 MBR：BIOS 提供中断服务，读取 CMOS 设置，读取第一个启动磁盘的 MBR 到内存让 CPU 执行，然后由 MBR 引导代码启动操作系统。

### 主引导记录（MBR）

MBR：全称 Master Boot Record，即主引导记录，分区结构如下：

![mbr_distribution](/img/in-post/post-computer-science/mbr_distribution.png)

根据“启动顺序”，BIOS 把控制器交给位于首位的存储设备，即根据用户指定的启动顺序从软盘、硬盘或光驱读取启动设备的引导记录（MBR）。如果没有找到，表明设备不能用于启动，控制权于是被转交给”启动顺序”中的下一个设备，如果找到引导记录，就会把电脑的控制权转给引导记录。

简单来说，MBR 的功能如下：

1. 扫描分区表查找活动分区
2. 寻找活动分区的起始扇区
3. 将活动分区的引导扇区读到内存
4. 执行引导扇区的运行代码（即启动操作系统）

磁盘的存储是以扇区为基本单位的，我们的系统信息，包括系统启动引导代码，都存储在这些扇区中，其中硬盘的 0 柱面、0 磁头、1 扇区称为主引导扇区，也叫主引导记录 MBR。这一部分共有 512 个字节，简单来说，就是硬盘最前面的 512 个字节。**这512个字节就称为主引导记录（MBR）**，它不属于任何一个操作系统，也不能用操作系统提供的磁盘操作命令来读取它。

### 加载操作系统

启动加载器（Boot Loader）就是在操作系统内核运行之前运行的一段小程序。通过这段小程序，我们可以初始化硬件设备、建立内存空间的映射图，从而将系统的软硬件环境带到一个合适的状 态，以便为最终调用操作系统内核做好一切准备。通常，Boot Loader 是严重地依赖于硬件而实现的，不同体系结构的系统存在着不同的 Boot Loader。Linux 的引导扇区内容是采用汇编语言编写的程序，其源代码在 `arch/i386/boot` 中（不同体系的 CPU 有其各自的 boot 目录），有 4 个程序文件:

- bootsect.S：引导扇区的主程序，汇编后的代码不超过512字节，即一个扇区的大小

- setup.S： 引导辅助程序

- edd.S：辅助程序的一部分，用于支持BIOS增强磁盘设备服务

- video.S：辅助程序的另一部分，用于引导时的屏幕显示

Boot Loader 有若干种，其中 Grub、Lilo 和 spfdisk 是常见的 loader，这里以 Grub 为例来讲解吧。系统读取内存中的 grub 配置信息（一般为 `menu.lst` 或 `grub.lst`），并依照此配置信息来启动不同的操作系统。

### 启动实例

以 Linux 系统为例，先载入 /boot 目录下面的 kernel。内核加载成功后，第一个运行的程序是 /sbin/init。它根据配置文件（Debian系统是 /etc/initab）产生 init 进程。这是 Linux 启动后的第一个进程，pid 进程编号为 1，其他进程都是它的后代。然后，init 线程加载系统的各个模块，比如窗口程序和网络程序，直至执行 /bin/login 程序，跳出登录界面，等待用户输入用户名和密码。



### 操作系统的中断、异常和系统调用

内核是被信任的第三方，只有内核才可以执行特权指令（比如 Win 中的 Admin，Linux 中的 root 和 sudo）。CPU 执行操作系统代码时，CPU 处于内核态（又称管态）。以下三种机制都是在内核态下运行的：

- **中断**：处理**外设回调**类的事件，比如键盘按键，负责有序提供服务
- **异常**：非法指令或者其他原因导致当前**指令执行失败**。需要防止应用程序处理**意外情况**，保证内核安全。
- **系统调用**：系统调用和功能调用（函数接口）

好处：安全-功能权衡。既要隔离 kernel 保障安全，又要让**用户态**的应用程序得到系统服务。

##### 三种机制对比

**源头：**

- 中断：外设
- 异常：应用程序意想不到的行为
- 系统调用：应用程序请求提供服务

**响应方式：**

- 中断：异步
- 异常：同步
- 系统调用：异步或同步

**处理机制：**

- 中断：持续，对用户态不可见
- 异常：kill 或 re-execute 意外指令
- 系统调用：等待或持续

> CS/IP 寄存器介绍：https://zhuanlan.zhihu.com/p/258863021

### 相关参考

- [清华大学操作系统原理课程](https://wiki.deepin.org/wiki/%E7%B3%BB%E7%BB%9F%E5%90%AF%E5%8A%A8%E6%B5%81%E7%A8%8B)
- https://www.jianshu.com/p/26e184605952
- [操作系统启动过程笔记](https://437436999.github.io/2020/02/15/%E6%93%8D%E4%BD%9C%E7%B3%BB%E7%BB%9F%E5%90%AF%E5%8A%A8%E8%BF%87%E7%A8%8B/)