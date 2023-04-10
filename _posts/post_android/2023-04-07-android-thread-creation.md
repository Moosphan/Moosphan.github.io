---
layout: post
title: "Android系统中线程的创建过程"
date: 2023-04-07 13:15:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- 线程
- 源码分析
- native
categories: 
- Android
---

我们都知道，Android 中线程创建过程需要追溯到 Native 层面，最终是委托给一个 Linux 标准线程 pthread 来执行的，所以 Android 中线程状态本质上是 Native 线程的一种映射。Android 中运行的线程可以分为两种：一种是 attach 到虚拟机的，即虚拟机线程；另一种是没有 attach 到虚拟机的。今天我们就分别从源码层面来看看 Android 系统中 Java 和 Native 层线程的创建过程。

> *以下分析基于 [Android 13 最新源码](https://cs.android.com)。*

### Java 线程创建过程

首先，我们需要知道的是：当我们通过 `new` 关键字创建一个 Thread 时其实并没有真正创建一个线程，只有调用 `start` 方法后才会去创建线程。先来看下 `start` 方法内部实现：

```java

    public synchronized void start() {
        /**
         * This method is not invoked for the main method thread or "system"
         * group threads created/set up by the VM. Any new functionality added
         * to this method in the future may have to also be added to the VM.
         *
         * A zero status value corresponds to state "NEW".
         */
        // Android-changed: Replace unused threadStatus field with started field.
        // The threadStatus field is unused on Android.
        if (started)
            throw new IllegalThreadStateException();

        /* Notify the group that this thread is about to be started
         * so that it can be added to the group's list of threads
         * and the group's unstarted count can be decremented. */
        group.add(this);

        // Android-changed: Use field instead of local variable.
        // It is necessary to remember the state of this across calls to this method so that it
        // can throw an IllegalThreadStateException if this method is called on an already
        // started thread.
        started = false;
        try {
            // Android-changed: Use Android specific nativeCreate() method to create/start thread.
            // start0();
            nativeCreate(this, stackSize, daemon);
            started = true;
        } finally {
            try {
                if (!started) {
                    group.threadStartFailed(this);
                }
            } catch (Throwable ignore) {
                /* do nothing. If start0 threw a Throwable then
                  it will be passed up the call stack */
            }
        }
    }
```

可以看到，最终线程的创建和执行是在 `nativeCreate` 方法中，而它是个 native 方法，对应的实现在 */art/runtime/native/java_lang_Thread.cc* 文件中，代码如下：

```c
static void Thread_nativeCreate(JNIEnv* env, jclass, jobject java_thread, jlong stack_size,
                                jboolean daemon) {
  // There are sections in the zygote that forbid thread creation.
  Runtime* runtime = Runtime::Current();
  if (runtime->IsZygote() && runtime->IsZygoteNoThreadSection()) {
    jclass internal_error = env->FindClass("java/lang/InternalError");
    CHECK(internal_error != nullptr);
    env->ThrowNew(internal_error, "Cannot create threads in zygote");
    return;
  }

  Thread::CreateNativeThread(env, java_thread, stack_size, daemon == JNI_TRUE);
}
```

继续跟踪到 */art/runtime/thread.cc*：

```c
void Thread::CreateNativeThread(JNIEnv* env, jobject java_peer, size_t stack_size, bool is_daemon) {
  CHECK(java_peer != nullptr);
  Thread* self = static_cast<JNIEnvExt*>(env)->GetSelf();

  ......

  int pthread_create_result = 0;
  if (child_jni_env_ext.get() != nullptr) {
    pthread_t new_pthread;
    pthread_attr_t attr;
    child_thread->tlsPtr_.tmp_jni_env = child_jni_env_ext.get();
    CHECK_PTHREAD_CALL(pthread_attr_init, (&attr), "new thread");
    CHECK_PTHREAD_CALL(pthread_attr_setdetachstate, (&attr, PTHREAD_CREATE_DETACHED),
                       "PTHREAD_CREATE_DETACHED");
    CHECK_PTHREAD_CALL(pthread_attr_setstacksize, (&attr, stack_size), stack_size);
    pthread_create_result = pthread_create(&new_pthread,
                                           &attr,
                                           gUseUserfaultfd ? Thread::CreateCallbackWithUffdGc
                                                           : Thread::CreateCallback,
                                           child_thread);
    CHECK_PTHREAD_CALL(pthread_attr_destroy, (&attr), "new thread");

    if (pthread_create_result == 0) {
      // pthread_create started the new thread. The child is now responsible for managing the
      // JNIEnvExt we created.
      // Note: we can't check for tmp_jni_env == nullptr, as that would require synchronization
      //       between the threads.
      child_jni_env_ext.release();  // NOLINT pthreads API.
      return;
    }
  }

  ......
}
```

`Thread::CreateNativeThread`  方法实现比较多，过滤了一些代码，我们重点关注下里面调用了 `pthread_create` 方法：

> *bionic/libc/bionic/pthread_create.cpp*

```c
int pthread_create(pthread_t* thread_out, pthread_attr_t const* attr,
                   void* (*start_routine)(void*), void* arg) {
  ......
}
```

POSIX 线程（POSIX threads）又简称 Pthreads 是线程的 POSIX 标准，该标准定义了创建和操纵线程的一整套 API，在类 Unix 操作系统（Unix、Linux、Mac OS X等）中都使用 Pthreads 作为操作系统的线程，Windows操作系统也有其移植版 pthreads-win32。简而言之该标准定义内部 API 创建和操纵线程， Pthreads 定义了一套 C 程序语言类型、函数与常量，它以 pthread.h 头文件和一个线程库实现，所以在 Android Studio 使用时直接在 C/C++ 文件中 *#include < pthread.h >* 引入即可。

该函数是一个线程阻塞函数，调用方将一直等待到线程结束为止，当函数返回时，被等待线程的资源被收回。如果执行成功，将返回 0，如果失败则返回一个错误码。

该函数参数释义如下：

- *thread_out*：线程标识符的指针，pthread_t 类型，即线程 ID（线程创建成功后会将分配的线程 ID 赋值给 thread_out）
- *attr*：它是一个结构体类型，用于表示创建线程的相关属性信息，如线程优先级、调度策略等等
- *start_routine*：表示线程运行函数的地址
- *arg*：代表线程运行函数的参数

看到这里，基本代表 Java 层面的线程创建路径分析完成了，想更多了解关于 pthread 内容可自行查阅资料。此外，Android 中还有一种 native 线程，即 C/C++ 平台的 Thread 特供版。

### Native 线程创建

刚刚我们分析了 Java 层面的 Thread 创建流程，下面来简单看下 Android Native 层中的 Thread 是如何创建的。首先我们需要关注一下 *system/core/libutils/Threads.cpp* 这个文件，里面是针对 Android 平台的 native 层如何创建一个线程的相关封装。

```c
status_t Thread::run(const char* name, int32_t priority, size_t stack)
{
    Mutex::Autolock _l(mLock);
    if (mRunning) {
      	// thread already started
        return INVALID_OPERATION;
    }
    ...
    mRunning = true;

    bool res;

    if (mCanCallJava) {
        // 创建能调用Java代码的Native线程
        res = createThreadEtc(_threadLoop,
                this, name, priority, stack, &mThread);
    } else {
        // 创建只能调用C/C++代码的Native线程
        res = androidCreateRawThreadEtc(_threadLoop,
                this, name, priority, stack, &mThread);
    }

    if (res == false) {
        return UNKNOWN_ERROR;
    }
    return NO_ERROR;
}

```

`mCanCallJava` 是在 Thread 对象创建时的构造参数，在构造函数中默认设置值为 `true`。

- 当 mCanCallJava 为 true 时，则代表创建的是不仅能调用 C/C++ 代码，还能调用 Java 代码的 Native 线程。
- 当 mCanCallJava 为 false 时，则代表创建的是只能调用 C/C++ 代码的 Native 线程。

有关两种创建线程模式的方法实现分别在 createThreadEtc 和 androidCreateRawThreadEtc 中，下面来简单分析一下它们的实现链路。

##### androidCreateRawThreadEtc

本方法用于创建仅允许调用 C/C++ 代码的线程。

> *[Threads.cpp#androidCreateRawThreadEtc](https://cs.android.com/android/platform/superproject/+/refs/heads/master:system/core/libutils/Threads.cpp;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1;l=117?q=Threads.cpp&ss=android%2Fplatform%2Fsuperproject&gsn=androidCreateRawThreadEtc&gs=KYTHE%3A%2F%2Fkythe%3A%2F%2Fandroid.googlesource.com%2Fplatform%2Fsuperproject%3Flang%3Dc%252B%252B%3Fpath%3Dsystem%2Fcore%2Flibutils%2FThreads.cpp%2326cI-R-PypD1DZioBVZ2i29KWl0Nhu4SxPFXreBRDGI)*

```c
int androidCreateRawThreadEtc(android_thread_func_t entryFunction,
                               void *userData,
                               const char* threadName __android_unused,
                               int32_t threadPriority,
                               size_t threadStackSize,
                               android_thread_id_t *threadId)
{
    pthread_attr_t attr;
    pthread_attr_init(&attr);
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);

#if defined(__ANDROID__)  /* valgrind is rejecting RT-priority create reqs */
    if (threadPriority != PRIORITY_DEFAULT || threadName != NULL) {
        // Now that the pthread_t has a method to find the associated
        // android_thread_id_t (pid) from pthread_t, it would be possible to avoid
        // this trampoline in some cases as the parent could set the properties
        // for the child.  However, there would be a race condition because the
        // child becomes ready immediately, and it doesn't work for the name.
        // prctl(PR_SET_NAME) only works for self; prctl(PR_SET_THREAD_NAME) was
        // proposed but not yet accepted.
        thread_data_t* t = new thread_data_t;
        t->priority = threadPriority;
        t->threadName = threadName ? strdup(threadName) : NULL;
        t->entryFunction = entryFunction;
        t->userData = userData;
        entryFunction = (android_thread_func_t)&thread_data_t::trampoline;
        userData = t;
    }
#endif

    if (threadStackSize) {
        pthread_attr_setstacksize(&attr, threadStackSize);
    }

    errno = 0;
    pthread_t thread;
    int result = pthread_create(&thread, &attr,
                    (android_pthread_entry)entryFunction, userData);
    pthread_attr_destroy(&attr);
    if (result != 0) {
        ALOGE("androidCreateRawThreadEtc failed (entry=%p, res=%d, %s)\n"
             "(android threadPriority=%d)",
            entryFunction, result, strerror(errno), threadPriority);
        return 0;
    }

    // Note that *threadID is directly available to the parent only, as it is
    // assigned after the child starts.  Use memory barrier / lock if the child
    // or other threads also need access.
    if (threadId != nullptr) {
        *threadId = (android_thread_id_t)thread; // XXX: this is not portable
    }
    return 1;
}
```

可以看到，上面代码首先做了一些线程对象的属性赋值，然后分配线程的栈空间，接着是通过 pthread 来创建一个线程，线程创建成功则返回 1。值得注意的是，这里的 `entryFunction` 其实就是之前代码中传进来的 `_threadLoop` 函数：

```c
int Thread::_threadLoop(void* user)
{
    Thread* const self = static_cast<Thread*>(user);

    sp<Thread> strong(self->mHoldSelf);
    wp<Thread> weak(strong);
    self->mHoldSelf.clear();

#if defined(__ANDROID__)
    // this is very useful for debugging with gdb
    self->mTid = gettid();
#endif

    bool first = true;

    do {
        bool result;
        if (first) {
            first = false;
            self->mStatus = self->readyToRun();
            result = (self->mStatus == OK);

            if (result && !self->exitPending()) {
                // Binder threads (and maybe others) rely on threadLoop
                // running at least once after a successful ::readyToRun()
                // (unless, of course, the thread has already been asked to exit
                // at that point).
                // This is because threads are essentially used like this:
                //   (new ThreadSubclass())->run();
                // The caller therefore does not retain a strong reference to
                // the thread and the thread would simply disappear after the
                // successful ::readyToRun() call instead of entering the
                // threadLoop at least once.
                result = self->threadLoop();
            }
        } else {
            result = self->threadLoop();
        }

        // establish a scope for mLock
        {
        Mutex::Autolock _l(self->mLock);
        if (result == false || self->mExitPending) {
            self->mExitPending = true;
            self->mRunning = false;
            // clear thread ID so that requestExitAndWait() does not exit if
            // called by a new thread using the same thread ID as this one.
            self->mThread = thread_id_t(-1);
            // note that interested observers blocked in requestExitAndWait are
            // awoken by broadcast, but blocked on mLock until break exits scope
            self->mThreadExitedCondition.broadcast();
            break;
        }
        }

        // Release our strong reference, to let a chance to the thread
        // to die a peaceful death.
        strong.clear();
        // And immediately, re-acquire a strong reference for the next loop
        strong = weak.promote();
    } while(strong != nullptr);

    return 0;
}
```

通过上述代码不难发现：_threadLoop 内部会循环调用 Thread 对象的成员方法 `threadLoop`，该成员方法一般由派生类来自行实现。该线程将会在下面几种情况退出循环：

- 线程状态错误，即 mStatus != OK
- 线程即将退出，调用 Thread::requestExit() 时会触发 
- 线程的强引用被释放，无法继续将弱引用提升为强引用

##### createThreadEtc

本方法用于创建允许调用 C/C++ 和 Java 代码的线程。

> *[system/core/libutils/include/utils/AndroidThreads.h#createThreadEtc](https://cs.android.com/android/platform/superproject/+/refs/heads/master:system/core/libutils/include/utils/AndroidThreads.h;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1;l=104?gsn=createThreadEtc&gs=KYTHE%3A%2F%2Fkythe%3A%2F%2Fandroid.googlesource.com%2Fplatform%2Fsuperproject%3Flang%3Dc%252B%252B%3Fpath%3Dsystem%2Fcore%2Flibutils%2Finclude%2Futils%2FAndroidThreads.h%23tT-K0gHAowaJ7f3TSwiqGCfDqOT3WNg0_49y9_WYVp0)*

```c
// Create thread with lots of parameters
inline bool createThreadEtc(thread_func_t entryFunction,
                            void *userData,
                            const char* threadName = "android:unnamed_thread",
                            int32_t threadPriority = PRIORITY_DEFAULT,
                            size_t threadStackSize = 0,
                            thread_id_t *threadId = nullptr)
{
    return androidCreateThreadEtc(entryFunction, userData, threadName,
        threadPriority, threadStackSize, threadId) ? true : false;
}
```

继续跟踪 `androidCreateThreadEtc` 函数：

```c
static android_create_thread_fn gCreateThreadFn = androidCreateRawThreadEtc;

int androidCreateThreadEtc(android_thread_func_t entryFunction,
                            void *userData,
                            const char* threadName,
                            int32_t threadPriority,
                            size_t threadStackSize,
                            android_thread_id_t *threadId)
{
    return gCreateThreadFn(entryFunction, userData, threadName,
        threadPriority, threadStackSize, threadId);
}

void androidSetCreateThreadFunc(android_create_thread_fn func)
{
    gCreateThreadFn = func;
}
```

看到这里可以发现继续调用了 `gCreateThreadFn` 函数，而该函数会被调用方在其他地方赋值代理掉，所以我们需要找到调用 `androidSetCreateThreadFunc` 函数的地方，最终锁定在了 *[frameworks/base/core/jni/AndroidRuntime.cpp](https://cs.android.com/android/platform/superproject/+/refs/heads/master:frameworks/base/core/jni/AndroidRuntime.cpp;l=1685;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1)* 这个文件：

```c
/*
 * Register android native functions with the VM.
 */
/*static*/ int AndroidRuntime::startReg(JNIEnv* env)
{
    ATRACE_NAME("RegisterAndroidNatives");
    /*
     * This hook causes all future threads created in this process to be
     * attached to the JavaVM.  (This needs to go away in favor of JNI
     * Attach calls.)
     */
    androidSetCreateThreadFunc((android_create_thread_fn) javaCreateThreadEtc);

    ALOGV("--- registering native functions ---\n");

    /*
     * Every "register" function calls one or more things that return
     * a local reference (e.g. FindClass).  Because we haven't really
     * started the VM yet, they're all getting stored in the base frame
     * and never released.  Use Push/Pop to manage the storage.
     */
    env->PushLocalFrame(200);

    if (register_jni_procs(gRegJNI, NELEM(gRegJNI), env) < 0) {
        env->PopLocalFrame(NULL);
        return -1;
    }
    env->PopLocalFrame(NULL);

    //createJavaThread("fubar", quickTest, (void*) "hello");

    return 0;
}
```

由此看来，Android 系统会在向虚拟机中注册 native 方法时将 gCreateThreadFn 指定向 `javaCreateThreadEtc` 这个函数。那么我们就来看下 *javaCreateThreadEtc* 内部实现如何：

> *[frameworks/base/core/jni/AndroidRuntime.cpp#javaCreateThreadEtc](https://cs.android.com/android/platform/superproject/+/refs/heads/master:frameworks/base/core/jni/AndroidRuntime.cpp;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1;l=1442?gsn=javaCreateThreadEtc&gs=KYTHE%3A%2F%2Fkythe%3A%2F%2Fandroid.googlesource.com%2Fplatform%2Fsuperproject%3Flang%3Dc%252B%252B%3Fpath%3Dframeworks%2Fbase%2Fcore%2Fjni%2FAndroidRuntime.cpp%23Hu_OOm1g4JDVMfzDHU98HuMryIeU8hbMIVcQhf8k4vY)*

```c
/*
 * This is invoked from androidCreateThreadEtc() via the callback
 * set with androidSetCreateThreadFunc().
 *
 * We need to create the new thread in such a way that it gets hooked
 * into the VM before it really starts executing.
 */
/*static*/ int AndroidRuntime::javaCreateThreadEtc(
                                android_thread_func_t entryFunction,
                                void* userData,
                                const char* threadName,
                                int32_t threadPriority,
                                size_t threadStackSize,
                                android_thread_id_t* threadId)
{
    void** args = (void**) malloc(3 * sizeof(void*));   // javaThreadShell must free
    int result;

    LOG_ALWAYS_FATAL_IF(threadName == nullptr, "threadName not provided to javaCreateThreadEtc");

    args[0] = (void*) entryFunction;
    args[1] = userData;
    args[2] = (void*) strdup(threadName);   // javaThreadShell must free

    result = androidCreateRawThreadEtc(AndroidRuntime::javaThreadShell, args,
        threadName, threadPriority, threadStackSize, threadId);
    return result;
}
```

根据官方给出的注释可以知道：`javaCreateThreadEtc` 函数从 `androidCreateThreadEtc` 中通过 `androidSetCreateThreadFunc` 设置的回调来进行调用的，即在线程真正开始执行之前被 Hook 到虚拟机中。我们接着来看下真正实现的 androidCreateRawThreadEtc 函数：

```c
int androidCreateRawThreadEtc(android_thread_func_t entryFunction,
                               void *userData,
                               const char* threadName __android_unused,
                               int32_t threadPriority,
                               size_t threadStackSize,
                               android_thread_id_t *threadId)
{
    pthread_attr_t attr;
    pthread_attr_init(&attr);
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);

#if defined(__ANDROID__)  /* valgrind is rejecting RT-priority create reqs */
    if (threadPriority != PRIORITY_DEFAULT || threadName != NULL) {
        // Now that the pthread_t has a method to find the associated
        // android_thread_id_t (pid) from pthread_t, it would be possible to avoid
        // this trampoline in some cases as the parent could set the properties
        // for the child.  However, there would be a race condition because the
        // child becomes ready immediately, and it doesn't work for the name.
        // prctl(PR_SET_NAME) only works for self; prctl(PR_SET_THREAD_NAME) was
        // proposed but not yet accepted.
        thread_data_t* t = new thread_data_t;
        t->priority = threadPriority;
        t->threadName = threadName ? strdup(threadName) : NULL;
        t->entryFunction = entryFunction;
        t->userData = userData;
        entryFunction = (android_thread_func_t)&thread_data_t::trampoline;
        userData = t;
    }
#endif

    if (threadStackSize) {
        pthread_attr_setstacksize(&attr, threadStackSize);
    }

    errno = 0;
    pthread_t thread;
    int result = pthread_create(&thread, &attr,
                    (android_pthread_entry)entryFunction, userData);
    pthread_attr_destroy(&attr);
    if (result != 0) {
        ALOGE("androidCreateRawThreadEtc failed (entry=%p, res=%d, %s)\n"
             "(android threadPriority=%d)",
            entryFunction, result, strerror(errno), threadPriority);
        return 0;
    }

    // Note that *threadID is directly available to the parent only, as it is
    // assigned after the child starts.  Use memory barrier / lock if the child
    // or other threads also need access.
    if (threadId != nullptr) {
        *threadId = (android_thread_id_t)thread; // XXX: this is not portable
    }
    return 1;
}
```

该函数实现在 androidCreateRawThreadEtc 章节就已经分析过了，只不过这里的 `entryFunction` 传过来的是 *AndroidRuntime::javaThreadShell*，我们来看下它内部如何实现的：

> *[frameworks/base/core/jni/AndroidRuntime.cpp](https://cs.android.com/android/platform/superproject/+/refs/heads/master:frameworks/base/core/jni/AndroidRuntime.cpp;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1;l=1413?gsn=javaThreadShell&gs=KYTHE%3A%2F%2Fkythe%3A%2F%2Fandroid.googlesource.com%2Fplatform%2Fsuperproject%3Flang%3Dc%252B%252B%3Fpath%3Dframeworks%2Fbase%2Fcore%2Fjni%2FAndroidRuntime.cpp%232dRQv8aW1yl_ahrbBQXwWUKL7oGOgfdloD9ALdX35aU)*

```c
/*
 * When starting a native thread that will be visible from the VM, we
 * bounce through this to get the right attach/detach action.
 * Note that this function calls free(args)
 */
/*static*/ int AndroidRuntime::javaThreadShell(void* args) {
    void* start = ((void**)args)[0];
    void* userData = ((void **)args)[1];
    char* name = (char*) ((void **)args)[2];        // we own this storage
    free(args);
    JNIEnv* env;
    int result;

    /* hook us into the VM */
    if (javaAttachThread(name, &env) != JNI_OK)
        return -1;

    /* start the thread running */
    result = (*(android_thread_func_t)start)(userData);

    /* unhook us */
    javaDetachThread();
    free(name);

    return result;
}
```

*javaThreadShell* 函数比较重要，综合上下文不难发现，代码中的局部变量 `start` 代表的是 _threadLoop，`userData` 代表 Thread 对象，而 `name` 指向线程的名称。接着继续调用了 `javaAttachThread` 函数，用于将线程 hook 到当前进程的虚拟机中，进而执行 Java 代码。紧接着继续执行线程自身的逻辑，即调用成员函数 `threadLoop`；线程执行完毕后调用了 `javaDetachThread` 函数用于将线程从虚拟机中剥离。下面重点看下 javaAttachThread 内部是如何将线程 hook 至虚拟机的：

```c
/*
 * Makes the current thread visible to the VM.
 *
 * The JNIEnv pointer returned is only valid for the current thread, and
 * thus must be tucked into thread-local storage.
 */
static int javaAttachThread(const char* threadName, JNIEnv** pEnv)
{
    JavaVMAttachArgs args;
    JavaVM* vm;
    jint result;

    vm = AndroidRuntime::getJavaVM();
    assert(vm != NULL);

    args.version = JNI_VERSION_1_4;
    args.name = (char*) threadName;
    args.group = NULL;

    result = vm->AttachCurrentThread(pEnv, (void*) &args);
    if (result != JNI_OK)
        ALOGI("NOTE: attach of thread '%s' failed\n", threadName);

    return result;
}
```

可以看见 javaAttachThread 中又调用了 AttachCurrentThread 函数，该函数可以将 native 线程附加到进程的 VM 中，详细参见官方 JNI  文档：[JNI 提示](https://developer.android.com/training/articles/perf-jni?hl=zh-cn#threads)

接着可以在 runtime 中找到 CheckAttachThread 实现：

```c
// Check whether the current thread is attached. This is usually required
// to be the first check, as ScopedCheck needs a ScopedObjectAccess for
// checking heap values (and that will fail with unattached threads).
bool CheckAttachedThread(const char* function_name) {
  Thread* self = Thread::Current();
  if (UNLIKELY(self == nullptr)) {
    // Need to attach this thread for a proper abort to work. We prefer this
    // to get reasonable stacks and environment, rather than relying on
    // tombstoned.
    JNIEnv* env;
    Runtime::Current()->GetJavaVM()->AttachCurrentThread(&env, /* thr_args= */ nullptr);

    std::string tmp = android::base::StringPrintf(
        "a thread (tid %" PRId64 " is making JNI calls without being attached",
        static_cast<int64_t>(GetTid()));
    Runtime::Current()->GetJavaVM()->JniAbort(function_name, tmp.c_str());

    CHECK_NE(Runtime::Current()->GetJavaVM()->DetachCurrentThread(), JNI_ERR);
    return false;
  }
  return true;
}
```

好吧，里面又调用了 GetJavaVM()-> AttachCurrentThread，看来我们还得继续跟下去，不过为了节省中间若干个类文件跳转环节，这里直接指出最终目的地在 `Runtime::AttachCurrentThread` 函数里面：

> *[art/runtime/runtime.cc](https://cs.android.com/android/platform/superproject/+/refs/heads/master:art/runtime/runtime.cc;drc=7346c436e5a11ce08f6a80dcfeb8ef941ca30176;bpv=1;bpt=1;l=2428?gsn=AttachCurrentThread&gs=KYTHE%3A%2F%2Fkythe%3A%2F%2Fandroid.googlesource.com%2Fplatform%2Fsuperproject%3Flang%3Dc%252B%252B%3Fpath%3Dart%2Fruntime%2Fruntime.cc%23Q56GPTk2CWJsQUdZAdwYiLpyNr6vSrIH3nWc6hCz66k)*

```c
bool Runtime::AttachCurrentThread(const char* thread_name, bool as_daemon, jobject thread_group,
                                  bool create_peer, bool should_run_callbacks) {
  ScopedTrace trace(__FUNCTION__);
  Thread* self = Thread::Attach(thread_name,
                                as_daemon,
                                thread_group,
                                create_peer,
                                should_run_callbacks);
  // Run ThreadGroup.add to notify the group that this thread is now started.
  if (self != nullptr && create_peer && !IsAotCompiler()) {
    ScopedObjectAccess soa(self);
    self->NotifyThreadGroup(soa, thread_group);
  }
  return self != nullptr;
}
```

这里其实就是将线程在 JavaVM 层面包装成一个 VM 上的线程再返回给 self。接下来就不继续往下深究了，篇幅有限，本文先讲到这里，里面还涉及到很多 JavaVM 相关的细节及原理将在后续文章中做一个补充。

顺带提一嘴，Android SDK 中的 Thread 与 JDK 中的 java.lang.Thread 实际上是有区别的，虽然 Android 也使用 Java 语言开发，但Android 基于平台特殊性对 JDK 进行了一些删减和改造。我们都知道 Java 是具有跨平台特性的，同一套代码它完全可以在 Windows、Linux 等操作系统上正常运作，但其实内部的线程创建等细节是基于 OS 的特性进行各自实现的：

![java_thread_creation](/img/in-post/post-android/java_thread_creation.png)

> 想了解更多关于 Java 线程的启动过程可以参考[此文](https://zhuanlan.zhihu.com/p/439797698)。

### 总结

我们通过在 Java 层面创建线程的时候，VM 会包装成一个 VM 的 Thread，然后启动 pthread，再调用 run 方法，但我们通过 pthread 独立创建的线程，是没有和 VM 里面的线程对象建立关联的，VM 压根不知道它的存在。但是如果该线程想要访问 Java代码，这就得需 VM 帮忙，故而需要将 native 层自己创建的线程包装成一个 VM 层面的 Thread 对象，然后添加到 VM 的 thread 集合中去，如此一来，Android 的虚拟机就可以感知到 native 中这个线程对象的存在了。

### 相关参考

- [*runtime/native/java_lang_Thread.cc*](https://cs.android.com/android/platform/superproject/+/master:art/runtime/native/java_lang_Thread.cc)
- [*system/core/libutils/Threads.cpp*](https://cs.android.com/android/platform/superproject/+/master:system/core/libutils/Threads.cpp)
- [*system/core/libutils/include/utils/Thread.h*](https://cs.android.com/android/platform/superproject/+/refs/heads/master:system/core/libutils/include/utils/Thread.h)
- [*Android native/C++层Thread线程实现源码分析*](https://blog.csdn.net/u012430727/article/details/115239992)
- [*JNI为什么要调用AttachCurrentThread*](https://keeplooking.top/2020/05/19/Android/AttachCurrentThread/)