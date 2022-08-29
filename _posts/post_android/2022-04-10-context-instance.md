---
layout:     post
title: "如何维护一个全局 Context"
date: 2022-04-10 07:48:22
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Android
- Context
categories: Android
---

一般来说，App 在运行的时候，势必存在一个 Application 对象，而日常开发中我们离不开 Context，获取资源、启动组件等等都需要这位“管家”的帮助。那么，平时我们是怎么获取 Context 的？

### 最常见的方式

先来看以下代码：

```java
// First usage
class ContextUsage {
    private final Context mContext;
    public ContextUsage(Context context) {
        this.mContext = context;
    }

    public void registerWifiChangeReceiver() {
        ...
        mContext.registerReceiver(mWifiReceiver, intent);
    }
}

// Second usage
interface IContextUsage {

    void registerWifiChangeReceiver(Context context);
}
```

上面是两种常见用法，第一种是依赖注入的方式提供给一个类使用，第二种是在接口方法中提供 Context 实例。一般情况下肯定没有什么问题，然而，这两种方式都需要在类或接口中显式依赖 Context，并在调用处传入 Context 实例，这样的话，我们在设计接口 API 时就得考虑依赖 Context 了。如此一来，我们可能衍生了下面第二种方式来获取 Context 对象。

### 获取全局 Context

既然不能通过依赖注入的方式来获取 Context，那么我们或许可以通过下面的方式来获取全局 Context：

```java
public static class SampleApplication extends Application {

    private static sContext;

    public  SampleApplication() {
        sContext = this;
    }

    public static Context getContext() {
        return sContext;
    }
}
```

虽然理论上来说，Application 实例在应用运行时都会在一直存在，维护一个静态 Context 看似没什么问题，但是这样的话就会污染我们的 Application 类。一般来说，`SampleApplication` 可能在 `app` 模块下，可一旦其他模块（如 `library`）想要调用，那么就不得不反向依赖 `app` 了。你可能说，为什么不额外在 library 中创建一个 Application 基类 `BaseApplication`，将获取 Context 逻辑移植其中，然后让 `SampleApplication` 继承自 `BaseApplication` 即可。这么看来好像没什么问题，但是倘若我们的 Application 需要继承自其他外部 Application，这里就显得捉襟见肘了，单纯为了获取 Context 而额外创建一个 Application 也多少有些鸡肋。

### 反射方式获取

以上谈到的，都是以前我们在获取 Context 实例的时候遇到的一些麻烦：

1. 类 API 设计需要依赖 Context
2. 持有静态的 Context 实例容易引发的内存泄露问题；
3. 需要提前注册/释放 Context 实例；
4. 污染程序的 Application 类；

试问下，我们能够在系统创建这个 Application 的时候，获取这个应用实例，是不是就可以全局获取 Context 实例了呢？通过研究 Application 启动源码可以初见端倪：

```java
public final class ActivityThread {
    public final void bindApplication(String processName, ApplicationInfo appInfo,
                List<ProviderInfo> providers, ComponentName instrumentationName,
                ProfilerInfo profilerInfo, Bundle instrumentationArgs,
                IInstrumentationWatcher instrumentationWatcher,
                IUiAutomationConnection instrumentationUiConnection, int debugMode,
                boolean enableBinderTracking, boolean trackAllocation,
                boolean isRestrictedBackupMode, boolean persistent, Configuration config,
                CompatibilityInfo compatInfo, Map<String, IBinder> services, Bundle coreSettings) {
            ...
            sendMessage(H.BIND_APPLICATION, data);
    }

    private class H extends Handler {
            public void handleMessage(Message msg) {
            switch (msg.what) {
                ...
                case BIND_APPLICATION:
                    Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "bindApplication");
                    AppBindData data = (AppBindData)msg.obj;
                    handleBindApplication(data);
                    Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                    break;
                case EXIT_APPLICATION:
                    if (mInitialApplication != null) {
                        mInitialApplication.onTerminate();
                    }
                    Looper.myLooper().quit();
                    break;
                ...
            }
        }
    }
    
    private void handleBindApplication(AppBindData data) {
        ...
        try {
            // If the app is being launched for full backup or restore, bring it up in
            // a restricted environment with the base application class.
            app = data.info.makeApplication(data.restrictedBackupMode, null);
            // Propagate autofill compat state
            app.setAutofillOptions(data.autofillOptions);
            // Propagate Content Capture options
            app.setContentCaptureOptions(data.contentCaptureOptions);
            sendMessage(H.SET_CONTENT_CAPTURE_OPTIONS_CALLBACK, data.appInfo.packageName);
            mInitialApplication = app;
            final boolean updateHttpProxy;
            synchronized (this) {
                updateHttpProxy = mUpdateHttpProxyOnBind;
                // This synchronized block ensures that any subsequent call to updateHttpProxy()
                // will see a non-null mInitialApplication.
            }
            if (updateHttpProxy) {
                ActivityThread.updateHttpProxy(app);
            }
            // don't bring up providers in restricted mode; they may depend on the
            // app's custom Application class
            if (!data.restrictedBackupMode) {
                if (!ArrayUtils.isEmpty(data.providers)) {
                    installContentProviders(app, data.providers);
                }
            }
            // Do this after providers, since instrumentation tests generally start their
            // test thread at this point, and we don't want that racing.
            try {
                mInstrumentation.onCreate(data.instrumentationArgs);
            }
            catch (Exception e) {
                throw new RuntimeException(
                    "Exception thrown in onCreate() of "
                    + data.instrumentationName + ": " + e.toString(), e);
            }
            try {
                mInstrumentation.callApplicationOnCreate(app);
            } catch (Exception e) {
                if (!mInstrumentation.onException(app, e)) {
                    throw new RuntimeException(
                      "Unable to create application " + app.getClass().getName()
                      + ": " + e.toString(), e);
                }
            }
        } finally {
            // If the app targets < O-MR1, or doesn't change the thread policy
            // during startup, clobber the policy to maintain behavior of b/36951662
            if (data.appInfo.targetSdkVersion < Build.VERSION_CODES.O_MR1
                    || StrictMode.getThreadPolicy().equals(writesAllowedPolicy)) {
                StrictMode.setThreadPolicy(savedPolicy);
            }
        }
    }
}
```

这里只附上最终关键代码，调用链路有感兴趣的可自行研究，大概流程是：系统创建 Base Context 实例、Application 实例，以及把 Base Context 实例 attach 到 Application 内部的流程大致可以归纳为以下调用顺序：

> ActivityThread#bindApplication –> ActivityThread#handleBindApplication –> LoadedApk#makeApplication –> Instrumentation#newApplication –> Application#attach –> ContextWrapper#attachBaseContext

至此可见，`ActivityThread#mInitialApplication` 确实就是我们需要找的 Application 实例。那么我们可以通过下面反射方式获取运行时 Application 实例了：

```java
import android.annotation.SuppressLint;
import android.app.Application;
import android.util.Log;
import androidx.annotation.NonNull;
import java.lang.reflect.Method;

class ContextGetter {
    @NonNull
    public static Application context() {
        return CURRENT;
    }

    @SuppressLint("StaticFieldLeak")
    private static final Application CURRENT;

    static {
        try {
            Object activityThread = getActivityThread();
            Object app = activityThread.getClass().getMethod("getApplication").invoke(activityThread);
            CURRENT = (Application) app;
        } catch (Throwable e) {
            throw new IllegalStateException("Can not access Application context reflection", e);
        }
    }

    private static Object getActivityThread() {
        Object activityThread = null;
        try {
            @SuppressLint("PrivateApi") Method method = Class.forName("android.app.ActivityThread").getMethod("currentActivityThread");
            method.setAccessible(true);
            activityThread = method.invoke(null);
        } catch (final Exception e) {
            Log.w("ContextGetter", e);
        }
        return activityThread;
    }
}
```

至此，我们就可以通过这种方式拿到全局 Context 了。