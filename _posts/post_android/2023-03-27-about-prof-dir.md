---
layout: post
title: "Android系统中关于/proc目录的点滴"
date: 2023-03-27 20:23:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Linux
- APM
- 性能分析
- ANR
- proc
categories: 
- Android
---

Android 系统有着这么一个神奇的“文件“目录存放着 CPU 及设备所运行进程的相关数据，这对于我们从事 APM 应用性能监控有着莫大的帮助。当然这种监控应用及手机系统信息的方式并非无中生有，早在 Android Framework 中就已经涉及它的踪迹，比如 ANR 发生时，系统会去 dump 及上报打印相关 CPU、进程、线程等信息到 log 中。而这些信息是借助 [ProcessCpuTracker](https://android.googlesource.com/platform/frameworks/base/+/refs/tags/android-13.0.0_r36/core/java/com/android/internal/os/ProcessCpuTracker.java) 这个类来实现获取的，该类内部正是通过读取系统 /proc/ 目录的相关“文件”来提取和转化的。本文的重点当然不是去分析 ANR 如何产生，主要来看下 **proc/** 的庐山真面目。

电脑连接上真机/模拟器后进入 adb shell 下，查看 /proc 目录中都有哪些文件：

```shell
OnePlus7T:/ $ ls /proc
1      1513   245    3099   440   551   752   965
10     1515   24501  31     441   552   753   969
100    1519   2456   310    442   553   754   97
1001   152    2457   311    444   554   755   974
1002   1522   246    31161  446   555   756   976
1003   1524   24638  3117   448   556   76    9777
10031  153    24640  312    45    558   7624  978
1006   1531   24658  31226  450   559   766   98
1008   15420  24680  313    451   56    767   9802
1009   1545   24695  314    452   560   768   981
101    1546   247    315    453   5610  769   983
1010   15537  24723  3151   454   57    77    9842
1011   1555   24755  317    455   571   770   985
1013   1556   24783  3175   456   572   771   988
1014   1558   248    3184   457   573   7712  9891
1019   15608  2488   319    458   574   772   99
102    15756  249    32     4581  575   773   990
1026   15821  2495   3224   459   576   774   991
103    16     24956  3237   4592  577   775   9915
1033   16005  2497   325    46    578   776   992
1036   1602   2499   326    460   579   777   993
104    16167  25     329    461   58    778   994
1040   1659   250    33     462   580   779   995
1045   1665   2500   330    4626  581   78    996
1046   1671   2502   331    463   582   780   997
1047   16726  2504   332    464   583   7801  OIS
105    1676   251    3331   465   584   7802  adj_chain_stat
1050   1682   2511   34     466   585   7803  adj_chain_verify
1051   1695   2512   340    4660  586   7806  asound
1054   17     2513   342    467   5860  781   ath_pktlog
1056   17180  2514   343    468   587   782   battery_exist
106    17181  25163  344    469   588   783   bootloader_log
1064   17230  252    345    47    589   784   brightness_for_sensor
1065   1727   2520   346    4703  59    785   buddyinfo
1068   1759   25203  347    4736  590   786   bus
1073   18     25248  348    4758  591   787   cc_ctl
1076   18153  253    349    476   592   788   cgroups
108    18220  254    35     477   593   789   cld
1084   1859   25401  350    4781  594   790   cmdline
1085   1860   2542   351    479   595   7903  config.gz
1086   18641  25478  352    48    596   791   consoles
1087   19     25479  353    480   597   792   cpuinfo
1089   190    25480  354    4801  598   793   crypto
109    191    25481  355    481   599   794   dash_3800_4p45_exit
1090   192    25483  356    482   600   795   dc_for_sensor
11     193    25484  357    4821  601   796   debugdriver
1104   194    25497  358    483   602   797   device-tree
1114   19440  25498  359    484   603   798   devices
1115   195    25499  360    485   604   799   diskstats
1116   196    255    361    4851  605   7998  driver
1117   19639  25500  362    486   606   8     enhance_dash
1120   197    25509  363    487   607   800   execdomains
1123   19725  2554   364    4899  608   8001  fb
1127   19760  25559  365    49    609   801   fg_info
1146   19761  256    366    490   61    8010  filesystems
1147   19763  25630  367    491   610   802   fresh_rate_for_sensor
1148   19764  257    368    4912  611   803   fs
1150   198    258    369    492   612   8038  fsc_allow_list
1153   19822  25933  37     493   613   804   fsc_dump
1156   19844  26     370    494   614   805   ht_group
1159   19845  260    371    495   615   806   ht_report
1160   199    26113  372    4954  617   807   interrupts
1162   19915  26114  373    496   618   808   iolimit_enable
12     2      26121  374    497   62    809   iomem
1206   200    26126  375    498   620   8113  ioports
1208   201    26131  376    499   623   8118  irq
12280  202    262    3769   5     63    8131  kallsyms
12348  203    26233  377    50    634   8133  key-users
1241   204    26246  3771   500   635   8146  keys
1243   205    26256  3773   501   636   8160  kmsg
1250   206    26277  3777   502   637   82    kpagecgroup
1251   20607  2635   378    5024  638   821   kpagecount
1254   2064   264    379    503   639   822   kpageflags
1258   2065   26440  38     504   64    8263  loadavg
1259   2066   266    380    5043  640   828   locks
12624  2067   26639  381    505   641   829   meminfo
1269   208    26765  382    506   642   83    misc
1290   209    26862  384    507   643   830   modules
1292   21     269    385    508   644   831   mounts
1297   211    27     386    509   645   84    net
13     21169  270    387    51    646   85    oneplus_healthinfo
1300   212    27066  388    510   647   859   pagetypeinfo
1301   21259  27088  389    511   65    86    partitions
1302   213    271    39     512   653   868   power
1303   214    27115  390    513   654   87    pressure
1307   215    27196  391    514   66    8720  qti_haptic
1311   216    272    392    515   664   876   qti_haptic_rf
13150  217    27220  393    516   665   877   restart_level_all
1316   218    27221  394    517   666   878   rf_cable_config
13174  219    27222  395    518   667   879   rf_factory_mode
1321   22     27237  396    519   668   88    sched_debug
1322   220    27278  397    520   6698  8880  schedstat
1324   221    273    398    521   67    89    scsi
1329   22175  274    399    522   69    9     self
1335   222    275    40     523   6915  90    ship_mode
1337   22277  27515  400    524   699   91    slabinfo
1345   223    276    401    525   7     915   softirqs
1346   22335  27657  403    528   70    917   stat
1348   224    277    404    529   700   919   swaps
1349   225    2771   405    53    701   92    sys
13500  226    278    406    530   71    920   sysrq-trigger
1358   227    279    407    531   714   925   thread-self
13583  228    280    408    532   718   927   timer_list
13601  22824  281    409    5321  719   929   touchpanel
13626  2286   2815   41     533   72    93    tty
1364   2287   282    410    534   720   932   tzdbg
13784  229    283    411    535   721   935   uid
13836  23     284    4177   536   722   9356  uid_concurrent_active_time
14     230    28433  42     537   7235  937   uid_concurrent_policy_time
14002  231    285    421    538   724   939   uid_cputime
14003  232    28504  422    539   725   940   uid_io
1412   233    286    423    54    726   942   uid_lru_info
1422   234    2873   424    540   727   945   uid_procstat
14327  23498  29     426    541   728   946   uid_time_in_state
1443   235    2935   427    542   729   948   ultrasound
1463   236    3      428    5429  73    949   uptime
1468   23695  30     43     543   732   95    version
1478   237    30111  430    544   733   951   vmallocinfo
14828  238    30175  431    545   734   952   vmstat
14851  239    30176  432    5456  735   953   warp_chg_exit
1493   24     30178  433    546   736   954   zoneinfo
1498   240    30180  434    5464  738   955
15     24056  30181  435    547   74    956
150    241    3035   436    548   740   958
1501   242    3084   437    549   743   96
151    243    309    438    55    744   962
1510   244    3095   439    550   75    963
```

下面来介绍以上各文件的作用，不重要的部分一笔带过。

### /proc/cpuinfo

在Linux中，/proc/cpuinfo 是一个特殊的文件（虚拟文件系统），它提供了有关计算机处理器（CPU）的详细信息。通过读取 /proc/cpuinfo，可以访问关于 CPU 的诸多信息，包括CPU类型、内核版本、处理器数量、缓存大小、每秒钟取样数(MHz)等。

```
OnePlus7T:/ $ cat /proc/cpuinfo
Processor	: AArch64 Processor rev 14 (aarch64)
processor	: 0
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x805
CPU revision	: 14

processor	: 1
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x805
CPU revision	: 14

processor	: 2
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x805
CPU revision	: 14

processor	: 3
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x805
CPU revision	: 14

processor	: 4
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x804
CPU revision	: 14

processor	: 5
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x804
CPU revision	: 14

processor	: 6
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x804
CPU revision	: 14

processor	: 7
BogoMIPS	: 38.40
Features	: fp asimd evtstrm aes pmull sha1 sha2 crc32 atomics fphp asimdhp cpuid asimdrdm lrcpc dcpop asimddp
CPU implementer	: 0x51
CPU architecture: 8
CPU variant	: 0xd
CPU part	: 0x804
CPU revision	: 14

Hardware	: Qualcomm Technologies, Inc SM8150
```

这里列出部分字段的解释：

- physical id：指的是物理封装的处理器的 id。
- cpu cores：位于相同物理封装的处理器中的内核数量。
- core id：每个内核的 id。
- siblings：位于相同物理封装的处理器中的逻辑处理器的数量。
- processor：逻辑处理器的 id。

### /proc/stat

`/proc/stat` 文件包含了所有 CPU 活动信息，该文件中的所有数据都是从系统启动开始累计到当前时刻。控制台通过 cat 命令将 `/proc/stat` 文件内容输出，其格式如下：

```shell
OnePlus7T:/ $ cat /proc/stat
cpu  25196598 1781900 22637410 42674331 57257 3187041 1268642 0 0 0
cpu0 3045634 384571 4278540 42644750 57213 791586 332762 0 0 0
cpu1 3040754 313257 4314010 3642 7 685228 300228 0 0 0
cpu2 2977001 292313 4281154 3652 8 652591 300217 0 0 0
cpu3 2942390 291336 4235718 3600 11 685009 270543 0 0 0
cpu4 4104628 125478 1744377 4560 2 120407 20116 0 0 0
cpu5 4019170 135445 1764951 4600 3 122060 19895 0 0 0
cpu6 3965905 128302 1770572 4566 8 121797 19330 0 0 0
cpu7 1101112 111194 248083 4959 1 8360 5548 0 0 0
intr 2542250650 0 0 0 0 393590413 0 17705983 0 34065007 0 0 0 0 445 591 0 164 0 2 0 1085 0 2 0 2 236 4 0 2 622 0 0 4013553 3744782 0 589966 0 0 0 0 0 0 0 0 0 0 0 135 0 0 0 0 210 0 0 0 0 252 0 0 0 41144 0 0 0 0 0 0 1575043 0 90 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 20281 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 22222933 13 2 71516113 230460 0 0 25 0 0 0 0 0 0 0 1872 637 11 11 0 43 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 176 4850 264 20441484 10090896 483505 0 0 0 0 0 8973265 6918507 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 4 0 0 0 0 0 0 0 0 0 0 0 6954 0 15 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 98 0 7564 0 0 0 3 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 239 0 0 0 2 0 0 0 0 0 0 0 4626736 0 2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 6 4 5991 4 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 67030 455905 231 0 0 114153 8800628 444 56578741 0 0 0 6801531 0 23 0 0 19240988 0 0 0 0 0 0 0 0 0 0 0 0 996 1 0 1 0 0 1 0 1 0 0 1 0 1 0 1 0 1 0 0 0 2916 191126 0 10172 0 0 6803 4771 28 11 35 16 0 0 1891 0 0 0 0 0 0 0 0 1024007 0 0 0 402 0 0 0 0 0 0 0 0 0 0 0 1968 0 0 0 0 0 0 0 1292 141 144 2 104 0 52 2116 0 0 0 0 0 0 0 0 0 106 0 0 104 0 0 32514 16248 0 11857 2469 0 0 0 301093 43292230 18085331 9583240 2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 95751 0 0 887447
ctxt 3608255233
btime 1676699925
processes 4168399
procs_running 1
procs_blocked 0
softirq 384813624 71797252 88382100 284662 37341924 21544982 0 10713335 82903892 0 71845477
```

第一行表示 CPU 总的使用情况，可以看到一共有 10 项数据，单位为 jiffies，它是内核中的一个全局变量，用来记录系统启动以来产生的节拍数，在 Linux 中，一个节拍大致可以理解为操作系统进程调度的最小时间片，不同的 Linux 系统内核这个值可能不同，通常在 1ms 到 10ms 之间。Linux 官方文档是这么解释的：

> *时间量，以 `USER_HZ` 为单位测量的（在大多数架构上为 1/100 秒，使用 `sysconf(_SC_CLK_TCK)` 获取正确的值），用于表示系统在各种状态下所花费的时间。*

下面一一解读各项数据含义（字段解释以第一行数据为例）。

| CPU  | user     | nice    | system   | idle     | iowait | irq     | softirq | steal | guest | guest_nice |
| ---- | -------- | ------- | -------- | -------- | ------ | ------- | ------- | ----- | ----- | ---------- |
| cpu  | 25196598 | 1781900 | 22637410 | 42674331 | 57257  | 3187041 | 1268642 | 0     | 0     | 0          |
| cpu0 | 3045634  | 384571  | 4278540  | 42644750 | 57213  | 791586  | 332762  | 0     | 0     | 0          |
| cpu1 | 3040754  | 313257  | 4314010  | 3642     | 7      | 685228  | 300228  | 0     | 0     | 0          |

- **user** [25196598]：从系统启动开始累积到当前时刻，处于用户态的运行时间，不包含 nice 值为负的进程。
- **nice** [1781900]：从系统启动开始累积到当前时刻，CPU 上 nice 值不大于 0 的用户态任务的运行时间，即代表低优先级进程的运行时间。
- **system** [22637410]：从系统启动开始累积到当前时刻，处于内核态的运行时间。主要包括用户态任务系统调用、异常等陷入内核消耗时间，也包括内核线程消耗的时间， 但不包含中断和软中断的执行时间。
- **idle** [42674331]：从系统启动开始累积到当前时刻，处于 idle 任务的时间，即除 IO 阻塞等待时间以外的其他等待时间。
- **iowait** [57257]：从系统启动开始累积到当前时刻，由于 CPU 上 IO 阻塞等待导致 CPU 无可运行任务、处于 idle 的时间。需要强调的是， iowait 是在 CPU 处于 idle 状态下的一种特殊情况的时间，与上面的 idle 数据互补构成了 CPU 上真正处于 idle 的时间。
- **irq** [3187041]：系统启动开始累积到当前时刻，硬中断时间。
- **softirq** [1268642]：系统启动开始累积到当前时刻，CPU处理软中断的时间，包括 softirqd 中处理软中断的时间。
- steal [0]：被盗时间，即在其他操作系统上的虚拟化环境中运行时花费的时间。
- guest [0]：在 Linux 内核的控制下为客户操作系统运行虚拟 CPU 所花费的时间。
- guest_nice [0]：同上，不做了解。

基于以上数据，可以得到 CPU 总运行时间为：

> **totalCPUTime = `user` + `nice` + `system` + `idle` + `iowait` + `irq` + `softirq` + `stealstolen` + `guest`**

关于其他数据字段的解释：

- **intr**：各个中断在所有 CPU 上发生的次数总和。
- **ctxt**：对各个 CPU 进行遍历，将各个 CPU 上 `cpu_rq(cpu) -> nr_switches` 字段进行累加，即每个 CPU 上任务切换的次数总和。
- **btime**：从 Epoch (自1970零时) 开始到系统启动所经过的时长，在内核中由 `boottime.tv_sec` 这个变量表示，单位秒。
- **processes**：系统启动以来成功 `fork()` 的次数，由 `total_forks` 变量记录。
- **procs_running**：系统中各个 CPU 上处于就绪/运行状态任务数量的总和，每个 CPU 上处于就绪/运行状态任务个数由 `cpu_rq(cpu)->nr_running` 表示。
- **procs_blocked**：系统中各个 CPU 上处于 iowait 状态任务数量的总和，每个 CPU 上处于 iowait 状态的任务数量由 `cpu_rq(cpu)->nr_iowait` 记录。
- **softirq**：与 intr 字段类似，表示各个软中断发生的总次数。

### /proc/[pid]/stat

这个格式与上面的 /proc/stat 类似，猜测可能与具体进程的 CPU 信息有关，不多说，直接终端 cat 下看看具体的数据格式：

```shell
OnePlus7T:/ $ cat /proc/969/stat
969 (nfc@1.2-service) S 1 969 0 0 -1 1077952768 1080 0 27 0 1 9 0 0 20 0 1 0 3056 12650360832 346 18446744073709551615 1 1 0 0 0 0 0 0 1073775864 0 0 0 17 4 0 0 0 0 0 0 0 0 0 0 0 0 0
```

可以看到这个文件中涉及到的字段比较多，根据 [man-pages-proc](https://man7.org/linux/man-pages/man5/proc.5.html) 可以查到这个文件用于记录进程的运行状态信息，具体字段含义如下：

- pid [969]：即进程的 ID。
- comm [(nfc@1.2-service)]：可执行文件的文件名，被包含在小括号中。即应用程序或命令的名字。
- state [S]：表示任务的状态。目前已知的主要状态有：
  - R：即 Running，表示运行中。
  - S：即 Sleeping，表示休眠状态（在可中断的等待中）。
  - D：即等待不间断磁盘睡眠。
  - T：即 Stopped，表示任务停止。
  - X：即 Dead，任务消亡。
  - 其他的诸如 t（Tracing stop）、W（Waking）、K（Wake kill）、P（Parked）等可以参考官方文档说明。
- ppid [1]：父进程 ID。
- pgrp [969]：进程的组 ID。
- session [0]：进程的会话 ID。
- tty_nr [0]：当前进程控制tty终端设备号。
- tpgid [-1]：进程控制终端的前台进程组 ID。
- flags [1077952768]：进程的内核标志字。 位含义参见Linux内核源文件 `include/linux/sched.h` 中的 `PF_*` 定义。
- minflt [1080]：该任务不需要从硬盘拷数据而发生的缺页（次缺页）的次数。
- cminflt [0]：当前进程等待子进程的次级缺页数。
- majflt [27]：主缺页中断的次数，需要从磁盘加载内存页，比如map文件。
- cmajflt [0]：当前进程等待子进程的主缺页次数。
- utime [1]：该进程处于用户态的时间，单位 jiffies。
- stime [9]：该进程处于内核态的运行时间，单位 jiffies。
- cutime [0]：该进程等待子进程已在用户模式下运行的时间，单位 jiffies。
- cstime [0]：该进程等待子进程已在内核态下运行的时间，单位 jiffies。
- priority [20]：进程的动态优先级。
- nice [0]：进程的静态优先级。取值范围：[-20, 19]。
- num_threads [1]：表示进程正在运行的线程数。它包括主线程和任何附加线程。
- itrealvalue [0]：每次用户空间进程被计划运行时，虚拟电量都会减少一个jiffy。当虚拟时钟计数减少到0时，内核会向进程发送一个定时器信号，用于执行计时器回调函数或执行某些其他操作。这个字段通常在实时应用程序和计时器相关的应用程序中使用，以确保任务按时完成。
- starttime [3056]：指进程启动时刻的系统启动时间（开机时间）以来的时钟周期数。该字段单位为jiffies，因此需要除以系统的时钟频率才能转换为秒。可以使用 `sysconf(_SC_CLK_TCK)` 函数获取系统时钟频率。通常，`starttime` 和 `/proc/uptime` 文件中的当前系统启动时间（以秒为单位）一起使用，以确定进程启动时间。
- vsize [12650360832]：指的是进程的虚拟内存大小，单位是字节。它表示了进程使用的虚拟地址空间的大小，包括进程使用的代码、库、堆、栈等空间。与进程的实际物理内存使用量（即`RSS`或Resident Set Size）不同，`vsize` 表示的是进程可以访问的地址空间的大小，而不是实际分配的内存空间，因此它往往会比进程的`RSS`大得多。`vsize` 字段可以帮助开发者和系统管理员监控和调整进程在虚拟内存和内存使用方面的性能优化。
- rss [346]：指进程使用的物理内存大小，单位是页面数。它表示了进程当前实际使用的物理内存大小，通常会比进程的虚拟内存大小（即 `vsize` ）小得多。
- rsslim [18446744073709551615]：指进程的物理内存使用限制，以KB为单位。该值是通过使用 `setrlimit()` 函数或其等效方法设置的，以确保进程不会超出指定的内存使用限制。
- startcode [1]：指进程的代码段开始位置的虚拟地址。它代表了代码段在进程虚拟地址空间中的起始位置，也就是代码段在进程内存地址映射的第一个字节的虚拟地址。
- endcode [1]：即代码段在进程内存地址映射的最后一个字节的虚拟地址。
- startstack [0]：指进程的栈的开始地址的虚拟地址。它代表了进程栈的起始位置，在进程的虚拟地址空间中的位置。栈是用于存储函数调用和本地变量的一种内存结构，它在进程内存地址映射中是一个单独的片段。
- kstkesp [0]：`kstkesp` 字段保存了当前的内核栈指针位置，用于跟踪进程在内核中的执行状态和堆栈使用情况。
- signal [0 0]：这列包含了两个数字。第一个数字表示进程挂起的当前信号编号。第二个数字表示进程挂起的自述信号计数器，即自进程启动以来，进程接受到的信号数量。 如果没有挂起任何信号，则此列为零。
- blocked [0]：表示当前进程被阻塞的信号掩码。这个值是一个等于或大于零的整数。如果某个信号比特位被设置为1，则表示该信号被阻塞。 如果该位置为0，则表示该信号没有被阻塞。
- ......

通过以下公式可以求出进程占用 CPU 的时间：

> **processCPUTime = utime + stime + cutime + cstime**

### /proc/[pid]/task/[tid]/stat

在Linux中，`/proc/[pid]/task/[tid]/stat ` 文件用于查询线程的状态信息。在这个路径中，`pid` 表示进程ID，`tid `表示线程ID。

该文件的内容格式与 `/proc/[pid]/stat` 类似，但是显示的是针对特定线程的系统状态信息，包括：

- pid：线程的进程ID
- tcomm：线程命令名（包括命令行参数，用括号包括）
- state：线程状态
- ppid：线程的父进程ID
- pgid：线程所在进程组的ID
- sid：线程所在会话的ID
- tty_nr：线程所在的终端设备的ID
- tpgid：线程组ID（通常等于进程ID）
- flags：线程标志（以数字形式表示的位掩码）
- minflt：为了分配未映射页的次数（分页错误次数，在内存分配时）
- cminflt：作为子任务时分配未映射页的次数
- majflt：为了分配映射页的次数（缺页错误次数，在内存分配和交换中）
- cmajflt：作为子任务时分配映射页的次数
- utime：以时钟周期为单位的用户态运行时间
- stime：以时钟周期为单位的内核态运行时间
- cutime：作为子任务的用户态运行时间总和
- cstime：作为子任务的内核态运行时间总和
- priority：线程当前调度优先级
- nice：线程的nice值(优先级的偏移量)
- num_threads：同属于同一进程的任务数量
- itrealvalue：剩余时间片量。当进程超过了它的时间片，它会在一个固定的时间间隔之后被调度并获得新的时间片。这个值是一个到下一次调度为止剩余的时间
- starttime：从系统启动到当前线程启动的时间
- vsize：进程虚拟内存大小
- rss：常驻内存集大小（以页面为单位）
- rsslim：常驻内存集大小的限制，以字节为单位

线程的 CPU 使用时间可以用下面公式来计算：

> **threadCPUTime = utime + stime**

### /proc/loadavg

/proc/loadavg 是一个特殊的文件（虚拟文件系统），它提供了有关系统平均负载的信息。该文件中包含了关于最近1分钟、5分钟和15分钟内系统中运行的平均进程数量，以及正在运行的、等待CPU资源的和被阻止的进程数目。

/proc/loadavg 的文件的格式如下：

```
Copy code
0.09 0.20 0.22 1/136 10206
```

其中，前三个数字分别是最近1分钟、5分钟和15分钟内系统的平均负载。接下来的“1/136”表示当前运行进程/系统总进程数，最后一个数字是最近进程ID。

使用 /proc/loadavg 可以帮助管理员了解系统的负载情况，并通过相应的调整提高系统的性能。如果系统的平均负载太高，可能需要检查哪些进程或程序占用了 CPU 或内存资源，或者是否需要考虑增加硬件资源。

### /proc/[pid]/sched

该“文件”提供了关于指定进程的调度器统计信息。 "/proc/[pid]/sched" 文件可以被用来监视和调整 Linux 进程的各种行为。它提供了关于进程调度器相关的信息，其中包括进程的状态、运行时间、调度策略以及调度优先级等数据。具体来说，该文件中包含以下信息：

- se.exec_start：进程实际开始执行时的时间戳
- se.sum_exec_runtime：进程的累计执行时间统计值（单位为纳秒）
- se.statistics.wait_start：进程等待调度的开始时间戳
- se.statistics.wait_max：进程等待调度的最长时间（单位为纳秒）
- se.statistics.wait_count：进程等待次数
- se.nr_migrations：进程移动到另一个 CPU 上的次数
- se.nr_voluntary_switches：进程主动放弃 CPU 执行权的次数
- se.nr_involuntary_switches：进程被迫放弃 CPU 执行权的次数

通过读取 `/proc/[pid]/sched` 文件中的信息，可以精确地了解指定进程的调度器相关行为信息，帮助开发者调试进程问题和运维人员监控系统性能，以优化系统行为。需要注意的是，`/proc/[pid]/sched` 文件只能被root用户访问。

### 其他常见文件

在 Linux 系统中，/proc/ 目录下还有很多其他的特殊文件，这些文件可以提供关于系统内核及各进程运行时的详细信息。以下是一些常见的文件及其作用：

- /proc/meminfo：获取内存使用情况
- /proc/mounts：获取当前正在使用的文件系统
- /proc/net/dev：获取网络设备的状态信息
- /proc/net/tcp：获取 TCP/IP 协议统计信息
- /proc/net/udp：获取 UDP 协议统计信息
- /proc/version：获取内核版本信息和系统架构信息
- /proc/sys/kernel/hostname：获取主机名
- /proc/sys/kernel/sem：获取当前的 IPC 信息
- /proc/sys/fs/file-nr：获取文件描述符状态信息
- /proc/sys/fs/nr_open：获取打开文件的最大数目

这些文件可以作为系统管理员和开发者了解系统运行状态和调优的有力工具，也可以被用来分析和诊断一些问题。同时，需要注意的是访问这些文件可能需要具有相应权限，且在使用时应特别小心，防止误操作。

### 版本兼容问题

值得注意的是，Android 8.0 开始，Google 开始限制应用访问 /proc/stat 等文件，只有系统应用方可访问，当前应用访问时会提示权限错误，具体参考 Google 的 issue tracker 描述：https://issuetracker.google.com/issues/37140047。针对 Android 8.0 开始的版本，如果想获取 CPU 运行数据可以参考 */sys/devices/system/cpu/* 目录下的信息，它提供了CPU的一些详细配置及活动信息，如 CPU 最小、最大频率、CPU 各频率活动时间、CPU Idle累计时间等。

### 参考

- [*Linux Man Paegs Of proc*](https://man7.org/linux/man-pages/man5/proc.5.html)
- [Android 高版本采集系统CPU使用率的方式](https://mp.weixin.qq.com/s/8r5jzV7sqgy7ZynUg5V7mA)

### Thanks

- Microsoft ChatGpt
