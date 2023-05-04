---
layout: post
title: "Launcher进程启动过程剖析"
date: 2023-05-04 19:15:00
author:     "Dorck"
catalog: false
header-style: text
tags: 
- APP启动过程
- 源码分析
- Launcher
catrgories: Android

---

上一篇[文章](https://dorck.cn/2023/04/22/android-initialization/)我们对 Android 系统启动过程做了一定了解，本文将继续分析 Launcher 进程的启动流程。

> 本文基于 Android 13 最新代码来进行源码分析。

### Launcher 进程启动

上文中，我们最终谈到了 `system_server` 进程的创建过程，并且该进程主要负责：

- 创建系统服务管理器——SystemServiceManager
- 启动各种服务（AMS、PMS等）
- 开启 Looper 循环，等待其他线程发送消息并处理

我们看一下 AMS 服务创建及配置这块实现：

> *frameworks/base/services/java/com/android/server/SystemServer.java*

```java
// Activity manager runs the show.
        t.traceBegin("StartActivityManager");
        // TODO: Might need to move after migration to WM.
        ActivityTaskManagerService atm = mSystemServiceManager.startService(
                ActivityTaskManagerService.Lifecycle.class).getService();
        mActivityManagerService = ActivityManagerService.Lifecycle.startService(
                mSystemServiceManager, atm);
        mActivityManagerService.setSystemServiceManager(mSystemServiceManager);
        mActivityManagerService.setInstaller(installer);
......

// We now tell the activity manager it is okay to run third party
        // code.  It will call back into us once it has gotten to the state
        // where third party code can really run (but before it has actually
        // started launching the initial applications), for us to complete our
        // initialization.
        mActivityManagerService.systemReady(() -> {
            Slog.i(TAG, "Making services ready");
            t.traceBegin("StartActivityManagerReadyPhase");
            mSystemServiceManager.startBootPhase(t, SystemService.PHASE_ACTIVITY_MANAGER_READY);
            t.traceEnd();
            t.traceBegin("StartObservingNativeCrashes");
            try {
                mActivityManagerService.startObservingNativeCrashes();
            } catch (Throwable e) {
                reportWtf("observing native crashes", e);
            }
          	......
        }, t);
```

下面重点关注一下 `ActivityManagerService.systemReady` 方法，通过注释可以简单了解到 Launcher 应用貌似就是在这里启动的，来找一下代码实现：

> *frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java*

```java
public ActivityManagerService(Context systemContext, ActivityTaskManagerService atm) {
  ...
  mAtmInternal = LocalServices.getService(ActivityTaskManagerInternal.class);
  ...
}

/**
 * Ready. Set. Go!
 */
public void systemReady(final Runnable goingCallback, @NonNull TimingsTraceAndSlog t) {
    t.traceBegin("PhaseActivityManagerReady");
    mSystemServiceManager.preSystemReady();
    ...
    // Some systems - like automotive - will explicitly unlock system user then switch
    // to a secondary user.
    // TODO(b/242195409): this workaround shouldn't be necessary once we move
    // the headless-user start logic to UserManager-land.
    if (isBootingSystemUser && !UserManager.isHeadlessSystemUserMode()) {
        t.traceBegin("startHomeOnAllDisplays");
        mAtmInternal.startHomeOnAllDisplays(currentUserId, "systemReady");
        t.traceEnd();
    }
}
```

启动 Launcher 应用是在 `ActivityTaskManagerInternal#startHomeOnAllDisplays` 方法中，我们需要找一下 ActivityTaskManagerInternal 的实现类，但发现它是通过 `LocalServices.getService` 方法获取的：

> *frameworks/base/core/java/com/android/server/LocalServices.java*

```java
public final class LocalServices {
    private LocalServices() {}

    private static final ArrayMap<Class<?>, Object> sLocalServiceObjects =
            new ArrayMap<Class<?>, Object>();

    /**
     * Returns a local service instance that implements the specified interface.
     *
     * @param type The type of service.
     * @return The service object.
     */
    @SuppressWarnings("unchecked")
    public static <T> T getService(Class<T> type) {
        synchronized (sLocalServiceObjects) {
            return (T) sLocalServiceObjects.get(type);
        }
    }

    /**
     * Adds a service instance of the specified interface to the global registry of local services.
     */
    public static <T> void addService(Class<T> type, T service) {
        synchronized (sLocalServiceObjects) {
            if (sLocalServiceObjects.containsKey(type)) {
                throw new IllegalStateException("Overriding service registration");
            }
            sLocalServiceObjects.put(type, service);
        }
    }

    /**
     * Remove a service instance, must be only used in tests.
     */
    @VisibleForTesting
    public static <T> void removeServiceForTest(Class<T> type) {
        synchronized (sLocalServiceObjects) {
            sLocalServiceObjects.remove(type);
        }
    }
}
```

不难发现，LocalServices 其实就是个容器类，用于存储各项服务，既然可以通过 getService 获取服务实现，那么添加服务应该就是通过 addService 实现的，我们查找一下调用该方法的地方，并指定 class 为 `ActivityTaskManagerInternal`，最终发现实现层在 `ActivityTaskManagerService#LocalService` 中：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityTaskManagerService.java*

```java
public class ActivityTaskManagerService extends IActivityTaskManager.Stub {
  public ActivityTaskManagerService(Context context) {
        mContext = context;
        ...
        mInternal = new LocalService();
        ...
    }
  ...
  private void start() {
    LocalServices.addService(ActivityTaskManagerInternal.class, mInternal);
	}
	...
	final class LocalService extends ActivityTaskManagerInternal {
    ...
    @Override
        public boolean startHomeOnAllDisplays(int userId, String reason) {
            synchronized (mGlobalLock) {
                return mRootWindowContainer.startHomeOnAllDisplays(userId, reason);
            }
        }
    ...
	}
  ...
}
```

继续追溯到 `WindowManagerService#mRoot` 并查找实现：

> *frameworks/base/services/core/java/com/android/server/wm/RootWindowContainer.java*

```java
 boolean startHomeOnDisplay(int userId, String reason, int displayId, boolean allowInstrumenting,
            boolean fromHomeKey) {
        // Fallback to top focused display or default display if the displayId is invalid.
        if (displayId == INVALID_DISPLAY) {
            final Task rootTask = getTopDisplayFocusedRootTask();
            displayId = rootTask != null ? rootTask.getDisplayId() : DEFAULT_DISPLAY;
        }

        final DisplayContent display = getDisplayContent(displayId);
        return display.reduceOnAllTaskDisplayAreas((taskDisplayArea, result) ->
                        result | startHomeOnTaskDisplayArea(userId, reason, taskDisplayArea,
                                allowInstrumenting, fromHomeKey),
                false /* initValue */);
    }

```

继续再跟进到该类的 `startHomeOnTaskDisplayArea` 中：

```java
/**
     * This starts home activity on display areas that can have system decorations based on
     * displayId - default display area always uses primary home component.
     * For secondary display areas, the home activity must have category SECONDARY_HOME and then
     * resolves according to the priorities listed below.
     * - If default home is not set, always use the secondary home defined in the config.
     * - Use currently selected primary home activity.
     * - Use the activity in the same package as currently selected primary home activity.
     * If there are multiple activities matched, use first one.
     * - Use the secondary home defined in the config.
     */
    boolean startHomeOnTaskDisplayArea(int userId, String reason, TaskDisplayArea taskDisplayArea,
            boolean allowInstrumenting, boolean fromHomeKey) {
        // Fallback to top focused display area if the provided one is invalid.
        if (taskDisplayArea == null) {
            final Task rootTask = getTopDisplayFocusedRootTask();
            taskDisplayArea = rootTask != null ? rootTask.getDisplayArea()
                    : getDefaultTaskDisplayArea();
        }

        Intent homeIntent = null;
        ActivityInfo aInfo = null;
        if (taskDisplayArea == getDefaultTaskDisplayArea()) {
            homeIntent = mService.getHomeIntent();
            aInfo = resolveHomeActivity(userId, homeIntent);
        } else if (shouldPlaceSecondaryHomeOnDisplayArea(taskDisplayArea)) {
            Pair<ActivityInfo, Intent> info = resolveSecondaryHomeActivity(userId, taskDisplayArea);
            aInfo = info.first;
            homeIntent = info.second;
        }
        if (aInfo == null || homeIntent == null) {
            return false;
        }

        if (!canStartHomeOnDisplayArea(aInfo, taskDisplayArea, allowInstrumenting)) {
            return false;
        }

        // Updates the home component of the intent.
        homeIntent.setComponent(new ComponentName(aInfo.applicationInfo.packageName, aInfo.name));
        homeIntent.setFlags(homeIntent.getFlags() | FLAG_ACTIVITY_NEW_TASK);
        // Updates the extra information of the intent.
        if (fromHomeKey) {
            homeIntent.putExtra(WindowManagerPolicy.EXTRA_FROM_HOME_KEY, true);
            if (mWindowManager.getRecentsAnimationController() != null) {
                mWindowManager.getRecentsAnimationController().cancelAnimationForHomeStart();
            }
        }
        homeIntent.putExtra(WindowManagerPolicy.EXTRA_START_REASON, reason);

        // Update the reason for ANR debugging to verify if the user activity is the one that
        // actually launched.
        final String myReason = reason + ":" + userId + ":" + UserHandle.getUserId(
                aInfo.applicationInfo.uid) + ":" + taskDisplayArea.getDisplayId();
        mService.getActivityStartController().startHomeActivity(homeIntent, aInfo, myReason,
                taskDisplayArea);
        return true;
    }

```

定位到这里就知道我们离最终启动 Launcher 进程的地方不远了，因为我们发现了 Intent 的踪迹，这个方法内构建了一个 `homeIntent` 用于启动 Launcher 的 Activity。于是继续跟进：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityStartController.java*

```java
void startHomeActivity(Intent intent, ActivityInfo aInfo, String reason,
            TaskDisplayArea taskDisplayArea) {
        final ActivityOptions options = ActivityOptions.makeBasic();
        options.setLaunchWindowingMode(WINDOWING_MODE_FULLSCREEN);
        if (!ActivityRecord.isResolverActivity(aInfo.name)) {
            // The resolver activity shouldn't be put in root home task because when the
            // foreground is standard type activity, the resolver activity should be put on the
            // top of current foreground instead of bring root home task to front.
            options.setLaunchActivityType(ACTIVITY_TYPE_HOME);
        }
        final int displayId = taskDisplayArea.getDisplayId();
        options.setLaunchDisplayId(displayId);
        options.setLaunchTaskDisplayArea(taskDisplayArea.mRemoteToken
                .toWindowContainerToken());

        // The home activity will be started later, defer resuming to avoid unnecessary operations
        // (e.g. start home recursively) when creating root home task.
        mSupervisor.beginDeferResume();
        final Task rootHomeTask;
        try {
            // Make sure root home task exists on display area.
            rootHomeTask = taskDisplayArea.getOrCreateRootHomeTask(ON_TOP);
        } finally {
            mSupervisor.endDeferResume();
        }

        mLastHomeActivityStartResult = obtainStarter(intent, "startHomeActivity: " + reason)
                .setOutActivity(tmpOutRecord)
                .setCallingUid(0)
                .setActivityInfo(aInfo)
                .setActivityOptions(options.toBundle())
                .execute();
        mLastHomeActivityStartRecord = tmpOutRecord[0];
        if (rootHomeTask.mInResumeTopActivity) {
            // If we are in resume section already, home activity will be initialized, but not
            // resumed (to avoid recursive resume) and will stay that way until something pokes it
            // again. We need to schedule another resume.
            mSupervisor.scheduleResumeTopActivities();
        }
    }
```

接着发现启动 Launcher 是通过 obtainStarter 获取 ActivityStarter 并内部调用 execute 方法来实现的，而这里的 mLastHomeActivityStartResult 则是启动结果。我们具体来看下 ActivityStarter 的 execute 是如何实现的：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityStarter.java*

```java
/**
     * Resolve necessary information according the request parameters provided earlier, and execute
     * the request which begin the journey of starting an activity.
     * @return The starter result.
     */
    int execute() {
        try {
            onExecutionStarted();

            // Refuse possible leaked file descriptors
            if (mRequest.intent != null && mRequest.intent.hasFileDescriptors()) {
                throw new IllegalArgumentException("File descriptors passed in Intent");
            }

            final LaunchingState launchingState;
            synchronized (mService.mGlobalLock) {
                final ActivityRecord caller = ActivityRecord.forTokenLocked(mRequest.resultTo);
                final int callingUid = mRequest.realCallingUid == Request.DEFAULT_REAL_CALLING_UID
                        ?  Binder.getCallingUid() : mRequest.realCallingUid;
                launchingState = mSupervisor.getActivityMetricsLogger().notifyActivityLaunching(
                        mRequest.intent, caller, callingUid);
            }

            // If the caller hasn't already resolved the activity, we're willing
            // to do so here. If the caller is already holding the WM lock here,
            // and we need to check dynamic Uri permissions, then we're forced
            // to assume those permissions are denied to avoid deadlocking.
            if (mRequest.activityInfo == null) {
                mRequest.resolveActivity(mSupervisor);
            }

            // Add checkpoint for this shutdown or reboot attempt, so we can record the original
            // intent action and package name.
            if (mRequest.intent != null) {
                String intentAction = mRequest.intent.getAction();
                String callingPackage = mRequest.callingPackage;
                if (intentAction != null && callingPackage != null
                        && (Intent.ACTION_REQUEST_SHUTDOWN.equals(intentAction)
                                || Intent.ACTION_SHUTDOWN.equals(intentAction)
                                || Intent.ACTION_REBOOT.equals(intentAction))) {
                    ShutdownCheckPoints.recordCheckPoint(intentAction, callingPackage, null);
                }
            }

            int res;
            synchronized (mService.mGlobalLock) {
                final boolean globalConfigWillChange = mRequest.globalConfig != null
                        && mService.getGlobalConfiguration().diff(mRequest.globalConfig) != 0;
                final Task rootTask = mRootWindowContainer.getTopDisplayFocusedRootTask();
                if (rootTask != null) {
                    rootTask.mConfigWillChange = globalConfigWillChange;
                }
                ProtoLog.v(WM_DEBUG_CONFIGURATION, "Starting activity when config "
                        + "will change = %b", globalConfigWillChange);

                final long origId = Binder.clearCallingIdentity();

                res = resolveToHeavyWeightSwitcherIfNeeded();
                if (res != START_SUCCESS) {
                    return res;
                }
                res = executeRequest(mRequest);

                Binder.restoreCallingIdentity(origId);

                if (globalConfigWillChange) {
                    // If the caller also wants to switch to a new configuration, do so now.
                    // This allows a clean switch, as we are waiting for the current activity
                    // to pause (so we will not destroy it), and have not yet started the
                    // next activity.
                    mService.mAmInternal.enforceCallingPermission(
                            android.Manifest.permission.CHANGE_CONFIGURATION,
                            "updateConfiguration()");
                    if (rootTask != null) {
                        rootTask.mConfigWillChange = false;
                    }
                    ProtoLog.v(WM_DEBUG_CONFIGURATION,
                                "Updating to new configuration after starting activity.");

                    mService.updateConfigurationLocked(mRequest.globalConfig, null, false);
                }

                // The original options may have additional info about metrics. The mOptions is not
                // used here because it may be cleared in setTargetRootTaskIfNeeded.
                final ActivityOptions originalOptions = mRequest.activityOptions != null
                        ? mRequest.activityOptions.getOriginalOptions() : null;
                // If the new record is the one that started, a new activity has created.
                final boolean newActivityCreated = mStartActivity == mLastStartActivityRecord;
                // Notify ActivityMetricsLogger that the activity has launched.
                // ActivityMetricsLogger will then wait for the windows to be drawn and populate
                // WaitResult.
                mSupervisor.getActivityMetricsLogger().notifyActivityLaunched(launchingState, res,
                        newActivityCreated, mLastStartActivityRecord, originalOptions);
                if (mRequest.waitResult != null) {
                    mRequest.waitResult.result = res;
                    res = waitResultIfNeeded(mRequest.waitResult, mLastStartActivityRecord,
                            launchingState);
                }
                return getExternalResult(res);
            }
        } finally {
            onExecutionComplete();
        }
    }
```

这里主要做一些 Activity 启动相关细节参数的校验，验证通过后继续执行 `executeRequest` 方法：

```java
 /**
     * Executing activity start request and starts the journey of starting an activity. Here
     * begins with performing several preliminary checks. The normally activity launch flow will
     * go through {@link #startActivityUnchecked} to {@link #startActivityInner}.
     */
    private int executeRequest(Request request) {
      ...
      final ActivityRecord r = new ActivityRecord.Builder(mService)
                .setCaller(callerApp)
                .setLaunchedFromPid(callingPid)
                .setLaunchedFromUid(callingUid)
                .setLaunchedFromPackage(callingPackage)
                .setLaunchedFromFeature(callingFeatureId)
                .setIntent(intent)
                .setResolvedType(resolvedType)
                .setActivityInfo(aInfo)
                .setConfiguration(mService.getGlobalConfiguration())
                .setResultTo(resultRecord)
                .setResultWho(resultWho)
                .setRequestCode(requestCode)
                .setComponentSpecified(request.componentSpecified)
                .setRootVoiceInteraction(voiceSession != null)
                .setActivityOptions(checkedOptions)
                .setSourceRecord(sourceRecord)
                .build();

        mLastStartActivityRecord = r;
      	...
        mLastStartActivityResult = startActivityUnchecked(r, sourceRecord, voiceSession,
                request.voiceInteractor, startFlags, true /* doResume */, checkedOptions,
                inTask, inTaskFragment, restrictedBgActivity, intentGrants);

        if (request.outActivity != null) {
            request.outActivity[0] = mLastStartActivityRecord;
        }

        return mLastStartActivityResult;
    }
```

首先构建了一个 ActivityRecord 用于记录 Activity 相关信息（如包名、进程名、启动模式、task 信息等），接着调用 `startActivityUnchecked`：

```java
/**
     * Start an activity while most of preliminary checks has been done and caller has been
     * confirmed that holds necessary permissions to do so.
     * Here also ensures that the starting activity is removed if the start wasn't successful.
     */
    private int startActivityUnchecked(final ActivityRecord r, ActivityRecord sourceRecord,
            IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
            int startFlags, boolean doResume, ActivityOptions options, Task inTask,
            TaskFragment inTaskFragment, boolean restrictedBgActivity,
            NeededUriGrants intentGrants) {
        int result = START_CANCELED;
        final Task startedActivityRootTask;

        // Create a transition now to record the original intent of actions taken within
        // startActivityInner. Otherwise, logic in startActivityInner could start a different
        // transition based on a sub-action.
        // Only do the create here (and defer requestStart) since startActivityInner might abort.
        final TransitionController transitionController = r.mTransitionController;
        Transition newTransition = (!transitionController.isCollecting()
                && transitionController.getTransitionPlayer() != null)
                ? transitionController.createTransition(TRANSIT_OPEN) : null;
        RemoteTransition remoteTransition = r.takeRemoteTransition();
        try {
            mService.deferWindowLayout();
            transitionController.collect(r);
            try {
                Trace.traceBegin(Trace.TRACE_TAG_WINDOW_MANAGER, "startActivityInner");
                result = startActivityInner(r, sourceRecord, voiceSession, voiceInteractor,
                        startFlags, doResume, options, inTask, inTaskFragment, restrictedBgActivity,
                        intentGrants);
            } finally {
                Trace.traceEnd(Trace.TRACE_TAG_WINDOW_MANAGER);
                startedActivityRootTask = handleStartResult(r, options, result, newTransition,
                        remoteTransition);
            }
        } finally {
            mService.continueWindowLayout();
        }
        postStartActivityProcessing(r, result, startedActivityRootTask);

        return result;
    }
```

继续追踪到 `startActivityInner` 方法中：

```java
int startActivityInner(final ActivityRecord r, ActivityRecord sourceRecord,
            IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
            int startFlags, boolean doResume, ActivityOptions options, Task inTask,
            TaskFragment inTaskFragment, boolean restrictedBgActivity,
            NeededUriGrants intentGrants) {
  	...
    if (mDoResume) {
      final ActivityRecord topTaskActivity = startedTask.topRunningActivityLocked();
      if (!mTargetRootTask.isTopActivityFocusable()
          || (topTaskActivity != null && topTaskActivity.isTaskOverlay()
              && mStartActivity != topTaskActivity)) {
        
        mTargetRootTask.ensureActivitiesVisible(null /* starting */,
                                                0 /* configChanges */, !PRESERVE_WINDOWS);
        mTargetRootTask.mDisplayContent.executeAppTransition();
      } else {
        // If the target root-task was not previously focusable (previous top running
        // activity on that root-task was not visible) then any prior calls to move the
        // root-task to the will not update the focused root-task.  If starting the new
        // activity now allows the task root-task to be focusable, then ensure that we
        // now update the focused root-task accordingly.
        if (mTargetRootTask.isTopActivityFocusable()
            && !mRootWindowContainer.isTopDisplayFocusedRootTask(mTargetRootTask)) {
          mTargetRootTask.moveToFront("startActivityInner");
        }
        mRootWindowContainer.resumeFocusedTasksTopActivities(
          mTargetRootTask, mStartActivity, mOptions, mTransientLaunch);
      }
    }
   mRootWindowContainer.updateUserRootTask(mStartActivity.mUserId, mTargetRootTask);
  ...
}
```

发现最终又调用回了 RootWindowContainer：

```java
boolean resumeFocusedTasksTopActivities(
            Task targetRootTask, ActivityRecord target, ActivityOptions targetOptions,
            boolean deferPause) {
        if (!mTaskSupervisor.readyToResume()) {
            return false;
        }

        boolean result = false;
  			// 如果是栈顶 Activity 则调用 resumeTopActivityUncheckedLocked
        if (targetRootTask != null && (targetRootTask.isTopRootTaskInDisplayArea()
                || getTopDisplayFocusedRootTask() == targetRootTask)) {
            result = targetRootTask.resumeTopActivityUncheckedLocked(target, targetOptions,
                    deferPause);
        }

        for (int displayNdx = getChildCount() - 1; displayNdx >= 0; --displayNdx) {
            final DisplayContent display = getChildAt(displayNdx);
            final boolean curResult = result;
            boolean[] resumedOnDisplay = new boolean[1];
            display.forAllRootTasks(rootTask -> {
                final ActivityRecord topRunningActivity = rootTask.topRunningActivity();
                if (!rootTask.isFocusableAndVisible() || topRunningActivity == null) {
                    return;
                }
                if (rootTask == targetRootTask) {
                    // Simply update the result for targetRootTask because the targetRootTask
                    // had already resumed in above. We don't want to resume it again,
                    // especially in some cases, it would cause a second launch failure
                    // if app process was dead.
                    resumedOnDisplay[0] |= curResult;
                    return;
                }
                if (rootTask.getDisplayArea().isTopRootTask(rootTask)
                        && topRunningActivity.isState(RESUMED)) {
                    // Kick off any lingering app transitions from the MoveTaskToFront
                    // operation, but only consider the top task and root-task on that
                    // display.
                    rootTask.executeAppTransition(targetOptions);
                } else {
                    resumedOnDisplay[0] |= topRunningActivity.makeActiveIfNeeded(target);
                }
            });
            result |= resumedOnDisplay[0];
            if (!resumedOnDisplay[0]) {
                // In cases when there are no valid activities (e.g. device just booted or launcher
                // crashed) it's possible that nothing was resumed on a display. Requesting resume
                // of top activity in focused root task explicitly will make sure that at least home
                // activity is started and resumed, and no recursion occurs.
                final Task focusedRoot = display.getFocusedRootTask();
                if (focusedRoot != null) {
                    result |= focusedRoot.resumeTopActivityUncheckedLocked(target, targetOptions);
                } else if (targetRootTask == null) {
                    result |= resumeHomeActivity(null /* prev */, "no-focusable-task",
                            display.getDefaultTaskDisplayArea());
                }
            }
        }

        return result;
    }
```

第一次正常启动 Launcher 会执行到 `resumeTopActivityUncheckedLocked`：

> *frameworks/base/services/core/java/com/android/server/wm/Task.java*

```java
/**
     * Ensure that the top activity in the root task is resumed.
     *
     * @param prev The previously resumed activity, for when in the process
     * of pausing; can be null to call from elsewhere.
     * @param options Activity options.
     * @param deferPause When {@code true}, this will not pause back tasks.
     *
     * @return Returns true if something is being resumed, or false if
     * nothing happened.
     *
     * NOTE: It is not safe to call this method directly as it can cause an activity in a
     *       non-focused root task to be resumed.
     *       Use {@link RootWindowContainer#resumeFocusedTasksTopActivities} to resume the
     *       right activity for the current system state.
     */
    @GuardedBy("mService")
    boolean resumeTopActivityUncheckedLocked(ActivityRecord prev, ActivityOptions options,
            boolean deferPause) {
        if (mInResumeTopActivity) {
            // Don't even start recursing.
            return false;
        }

        boolean someActivityResumed = false;
        try {
            // Protect against recursion.
            mInResumeTopActivity = true;

            if (isLeafTask()) {
                if (isFocusableAndVisible()) {
                    someActivityResumed = resumeTopActivityInnerLocked(prev, options, deferPause);
                }
            } else {
                int idx = mChildren.size() - 1;
                while (idx >= 0) {
                    final Task child = (Task) getChildAt(idx--);
                    if (!child.isTopActivityFocusable()) {
                        continue;
                    }
                    if (child.getVisibility(null /* starting */)
                            != TASK_FRAGMENT_VISIBILITY_VISIBLE) {
                        if (child.topRunningActivity() == null) {
                            // Skip the task if no running activity and continue resuming next task.
                            continue;
                        }
                        // Otherwise, assuming everything behind this task should also be invisible.
                        break;
                    }

                    someActivityResumed |= child.resumeTopActivityUncheckedLocked(prev, options,
                            deferPause);
                    // Doing so in order to prevent IndexOOB since hierarchy might changes while
                    // resuming activities, for example dismissing split-screen while starting
                    // non-resizeable activity.
                    if (idx >= mChildren.size()) {
                        idx = mChildren.size() - 1;
                    }
                }
            }

            // When resuming the top activity, it may be necessary to pause the top activity (for
            // example, returning to the lock screen. We suppress the normal pause logic in
            // {@link #resumeTopActivityUncheckedLocked}, since the top activity is resumed at the
            // end. We call the {@link ActivityTaskSupervisor#checkReadyForSleepLocked} again here
            // to ensure any necessary pause logic occurs. In the case where the Activity will be
            // shown regardless of the lock screen, the call to
            // {@link ActivityTaskSupervisor#checkReadyForSleepLocked} is skipped.
            final ActivityRecord next = topRunningActivity(true /* focusableOnly */);
            if (next == null || !next.canTurnScreenOn()) {
                checkReadyForSleep();
            }
        } finally {
            mInResumeTopActivity = false;
        }

        return someActivityResumed;
    }
```

最终会跟进到 `TaskFragment` 当中：

> *frameworks/base/services/core/java/com/android/server/wm/TaskFragment.java*

```java
final boolean resumeTopActivity(ActivityRecord prev, ActivityOptions options,
            boolean deferPause) {
  ...
  if (next.attachedToProcess()) {
    ...
  } else {
    // Whoops, need to restart this activity!
    if (!next.hasBeenLaunched) {
        next.hasBeenLaunched = true;
    } else {
        if (SHOW_APP_STARTING_PREVIEW) {
            next.showStartingWindow(false /* taskSwich */);
        }
        if (DEBUG_SWITCH) Slog.v(TAG_SWITCH, "Restarting: " + next);
    }
    ProtoLog.d(WM_DEBUG_STATES, "resumeTopActivity: Restarting %s", next);
    mTaskSupervisor.startSpecificActivity(next, true, true);
  }
}
```

重点看下 `ActivityTaskSupervisor#startSpecificActivity`：

```java
void startSpecificActivity(ActivityRecord r, boolean andResume, boolean checkConfig) {
        // Is this activity's application already running?
        final WindowProcessController wpc =
                mService.getProcessController(r.processName, r.info.applicationInfo.uid);

        boolean knownToBeDead = false;
        if (wpc != null && wpc.hasThread()) {
            try {
                realStartActivityLocked(r, wpc, andResume, checkConfig);
                return;
            } catch (RemoteException e) {
                Slog.w(TAG, "Exception when starting activity "
                        + r.intent.getComponent().flattenToShortString(), e);
            }

            // If a dead object exception was thrown -- fall through to
            // restart the application.
            knownToBeDead = true;
            // Remove the process record so it won't be considered as alive.
            mService.mProcessNames.remove(wpc.mName, wpc.mUid);
            mService.mProcessMap.remove(wpc.getPid());
        }

        r.notifyUnknownVisibilityLaunchedForKeyguardTransition();

        final boolean isTop = andResume && r.isTopRunningActivity();
        mService.startProcessAsync(r, knownToBeDead, isTop,
                isTop ? HostingRecord.HOSTING_TYPE_TOP_ACTIVITY
                        : HostingRecord.HOSTING_TYPE_ACTIVITY);
    }
```

跟踪了方法调用栈这么久终于找到“罪魁祸首”了，startSpecificActivity 方法做了两件事：

- 如果 Activity 的进程已经启动，则直接执行 `realStartActivityLocked` 来启动 Activity（通常是启动一般已运行进程的 Activity）；
- 如果 Activity 的进程尚未启动，那么需要先执行 `ActivityTaskManagerService#startProcessAsync` 创建进程（通常是进程尚未启动的情况，例如初次打开 APP）。

上面的 Activity 在本场景下指代 Launcher 进程的首个 Activity，由于是第一次启动该 Activity，所以进程肯定还没有创建，我们先去看下 startProcessAsync 中是如何创建 Launcher 进程的：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityTaskManagerService.java*

```java
void startProcessAsync(ActivityRecord activity, boolean knownToBeDead, boolean isTop,
            String hostingType) {
        try {
            if (Trace.isTagEnabled(TRACE_TAG_WINDOW_MANAGER)) {
                Trace.traceBegin(TRACE_TAG_WINDOW_MANAGER, "dispatchingStartProcess:"
                        + activity.processName);
            }
            // Post message to start process to avoid possible deadlock of calling into AMS with the
            // ATMS lock held.
            final Message m = PooledLambda.obtainMessage(ActivityManagerInternal::startProcess,
                    mAmInternal, activity.processName, activity.info.applicationInfo, knownToBeDead,
                    isTop, hostingType, activity.intent.getComponent());
            mH.sendMessage(m);
        } finally {
            Trace.traceEnd(TRACE_TAG_WINDOW_MANAGER);
        }
    }
```

由此可见，这里通过 Message-Handler 来发送创建进程的消息，消息接收处理是通过设置的 Callback，最终回调给 `ActivityManagerInternal::startProcess`：

> *frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java*

```java
@Override
public void startProcess(String processName, ApplicationInfo info, boolean knownToBeDead,
        boolean isTop, String hostingType, ComponentName hostingName) {
    try {
        if (Trace.isTagEnabled(Trace.TRACE_TAG_ACTIVITY_MANAGER)) {
            Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "startProcess:"
                    + processName);
        }
        synchronized (ActivityManagerService.this) {
            // If the process is known as top app, set a hint so when the process is
            // started, the top priority can be applied immediately to avoid cpu being
            // preempted by other processes before attaching the process of top app.
            startProcessLocked(processName, info, knownToBeDead, 0 /* intentFlags */,
                    new HostingRecord(hostingType, hostingName, isTop),
                    ZYGOTE_POLICY_FLAG_LATENCY_SENSITIVE, false /* allowWhileBooting */,
                    false /* isolated */);
        }
    } finally {
        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
    }
}

@GuardedBy("this")
final ProcessRecord startProcessLocked(String processName,
        ApplicationInfo info, boolean knownToBeDead, int intentFlags,
        HostingRecord hostingRecord, int zygotePolicyFlags, boolean allowWhileBooting,
        boolean isolated) {
    return mProcessList.startProcessLocked(processName, info, knownToBeDead, intentFlags,
            hostingRecord, zygotePolicyFlags, allowWhileBooting, isolated, 0 /* isolatedUid */,
            false /* isSdkSandbox */, 0 /* sdkSandboxClientAppUid */,
            null /* sdkSandboxClientAppPackage */,
            null /* ABI override */, null /* entryPoint */,
            null /* entryPointArgs */, null /* crashHandler */);
}
```

接着执行到 `ProcessList#startProcessLocked` ：

> *frameworks/base/services/core/java/com/android/server/am/ProcessList.java*

```java
ProcessRecord startProcessLocked(String processName, ApplicationInfo info,
            boolean knownToBeDead, int intentFlags, HostingRecord hostingRecord,
            int zygotePolicyFlags, boolean allowWhileBooting, boolean isolated, int isolatedUid,
            boolean isSdkSandbox, int sdkSandboxUid, String sdkSandboxClientAppPackage,
            String abiOverride, String entryPoint, String[] entryPointArgs, Runnable crashHandler) {
        long startTime = SystemClock.uptimeMillis();
        ProcessRecord app;
        if (!isolated) {
            app = getProcessRecordLocked(processName, info.uid);
            checkSlow(startTime, "startProcess: after getProcessRecord");
						...
        } else {
            // If this is an isolated process, it can't re-use an existing process.
            app = null;
        }
				...
        final boolean success =
                startProcessLocked(app, hostingRecord, zygotePolicyFlags, abiOverride);
        checkSlow(startTime, "startProcess: done starting proc!");
        return success ? app : null;
    }

/**
     * @return {@code true} if process start is successful, false otherwise.
     */
    @GuardedBy("mService")
    boolean startProcessLocked(ProcessRecord app, HostingRecord hostingRecord,
            int zygotePolicyFlags, boolean disableHiddenApiChecks, boolean disableTestApiChecks,
            String abiOverride) {
        if (app.isPendingStart()) {
            return true;
        }
        		...
            ApplicationInfo definingAppInfo;
            if (hostingRecord.getDefiningPackageName() != null) {
                definingAppInfo = new ApplicationInfo(app.info);
                definingAppInfo.packageName = hostingRecord.getDefiningPackageName();
                definingAppInfo.uid = uid;
            } else {
                definingAppInfo = app.info;
            }

            runtimeFlags |= Zygote.getMemorySafetyRuntimeFlags(
                    definingAppInfo, app.processInfo, instructionSet, mPlatformCompat);
						...
            // 进程入口函数所在类  
            final String entryPoint = "android.app.ActivityThread";  
            return startProcessLocked(hostingRecord, entryPoint, app, uid, gids,
                    runtimeFlags, zygotePolicyFlags, mountExternal, seInfo, requiredAbi,
                    instructionSet, invokeWith, startUptime, startElapsedTime);
        } catch (RuntimeException e) {
            Slog.e(ActivityManagerService.TAG, "Failure starting process " + app.processName, e);
            mService.forceStopPackageLocked(app.info.packageName, UserHandle.getAppId(app.uid),
                    false, false, true, false, false, app.userId, "start failure");
            return false;
        }
    }

boolean startProcessLocked(HostingRecord hostingRecord, String entryPoint, ProcessRecord app,
            int uid, int[] gids, int runtimeFlags, int zygotePolicyFlags, int mountExternal,
            String seInfo, String requiredAbi, String instructionSet, String invokeWith,
            long startUptime, long startElapsedTime) {
        ...

        if (mService.mConstants.FLAG_PROCESS_START_ASYNC) {
            ...
            return true;
        } else {
            try {
                final Process.ProcessStartResult startResult = startProcess(hostingRecord,
                        entryPoint, app,
                        uid, gids, runtimeFlags, zygotePolicyFlags, mountExternal, seInfo,
                        requiredAbi, instructionSet, invokeWith, startUptime);
                handleProcessStartedLocked(app, startResult.pid, startResult.usingWrapper,
                        startSeq, false);
            } catch (RuntimeException e) {
                ...
            }
            return app.getPid() > 0;
        }
    }

/**
     * Main handler routine to start the given process from the ProcStartHandler.
     *
     * <p>Note: this function doesn't hold the global AM lock intentionally.</p>
     */
    private void handleProcessStart(final ProcessRecord app, final String entryPoint,
            final int[] gids, final int runtimeFlags, int zygotePolicyFlags,
            final int mountExternal, final String requiredAbi, final String instructionSet,
            final String invokeWith, final long startSeq) {
        final Runnable startRunnable = () -> {
            try {
                final Process.ProcessStartResult startResult = startProcess(app.getHostingRecord(),
                        entryPoint, app, app.getStartUid(), gids, runtimeFlags, zygotePolicyFlags,
                        mountExternal, app.getSeInfo(), requiredAbi, instructionSet, invokeWith,
                        app.getStartTime());

                synchronized (mService) {
                    handleProcessStartedLocked(app, startResult, startSeq);
                }
            } catch (RuntimeException e) {
                ...
            }
        };
        // Use local reference since we are not using locks here
        final ProcessRecord predecessor = app.mPredecessor;
        if (predecessor != null && predecessor.getDyingPid() > 0) {
            handleProcessStartWithPredecessor(predecessor, startRunnable);
        } else {
            // Kick off the process start for real.
            startRunnable.run();
        }
    }

    private Process.ProcessStartResult startProcess(HostingRecord hostingRecord, String entryPoint,
            ProcessRecord app, int uid, int[] gids, int runtimeFlags, int zygotePolicyFlags,
            int mountExternal, String seInfo, String requiredAbi, String instructionSet,
            String invokeWith, long startTime) {
        try {
            Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "Start proc: " +
                    app.processName);
            ...
            final Process.ProcessStartResult startResult;
            boolean regularZygote = false;
            if (hostingRecord.usesWebviewZygote()) {
                ...
            } else if (hostingRecord.usesAppZygote()) {
                final AppZygote appZygote = createAppZygoteForProcessIfNeeded(app);

                // We can't isolate app data and storage data as parent zygote already did that.
                startResult = appZygote.getProcess().start(entryPoint,
                        app.processName, uid, uid, gids, runtimeFlags, mountExternal,
                        app.info.targetSdkVersion, seInfo, requiredAbi, instructionSet,
                        app.info.dataDir, null, app.info.packageName,
                        /*zygotePolicyFlags=*/ ZYGOTE_POLICY_FLAG_EMPTY, isTopApp,
                        app.getDisabledCompatChanges(), pkgDataInfoMap, allowlistedAppDataInfoMap,
                        false, false,
                        new String[]{PROC_START_SEQ_IDENT + app.getStartSeq()});
            } else {
                regularZygote = true;
                startResult = Process.start(entryPoint,
                        app.processName, uid, uid, gids, runtimeFlags, mountExternal,
                        app.info.targetSdkVersion, seInfo, requiredAbi, instructionSet,
                        app.info.dataDir, invokeWith, app.info.packageName, zygotePolicyFlags,
                        isTopApp, app.getDisabledCompatChanges(), pkgDataInfoMap,
                        allowlistedAppDataInfoMap, bindMountAppsData, bindMountAppStorageDirs,
                        new String[]{PROC_START_SEQ_IDENT + app.getStartSeq()});
            }

            ...
            return startResult;
        } finally {
            Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
        }
    }
```

经过重重方法调用，最终抵达了进程创建的目的地，它的前置方法 `startProcessLocked` 主要用于包装进程启动相关参数信息及合并状态信息。值得注意的是，参数中的 entryPoint 这里特指 `android.app.ActivityThread`，表示后续在创建进程时的入口类。我们主要关注一下上面的 `startProcess` 方法，它内部涉及到两个不同的创建新进程的分支，分别为：

- appZygote：AppZygote 进程来孵化新进程，与常规 zygote 创建的应用相比受到更多限制；
- regularZygote：常规的 zygote32/zygote64 进程，是所有 Android 应用的父进程。

我们这里着重关注 regularZygote 的分支，具体看下内部通过 `Process.start` 创建进程的实现：

> *frameworks/base/core/java/android/os/Process.java*

````java
/**
 * State associated with the zygote process.
 * @hide
 */
public static final ZygoteProcess ZYGOTE_PROCESS = new ZygoteProcess();

public static ProcessStartResult start(@NonNull final String processClass,
                                           @Nullable final String niceName,
                                           int uid, int gid, @Nullable int[] gids,
                                           int runtimeFlags,
                                           int mountExternal,
                                           int targetSdkVersion,
                                           @Nullable String seInfo,
                                           @NonNull String abi,
                                           @Nullable String instructionSet,
                                           @Nullable String appDataDir,
                                           @Nullable String invokeWith,
                                           @Nullable String packageName,
                                           int zygotePolicyFlags,
                                           boolean isTopApp,
                                           @Nullable long[] disabledCompatChanges,
                                           @Nullable Map<String, Pair<String, Long>>
                                                   pkgDataInfoMap,
                                           @Nullable Map<String, Pair<String, Long>>
                                                   whitelistedDataInfoMap,
                                           boolean bindMountAppsData,
                                           boolean bindMountAppStorageDirs,
                                           @Nullable String[] zygoteArgs) {
        return ZYGOTE_PROCESS.start(processClass, niceName, uid, gid, gids,
                    runtimeFlags, mountExternal, targetSdkVersion, seInfo,
                    abi, instructionSet, appDataDir, invokeWith, packageName,
                    zygotePolicyFlags, isTopApp, disabledCompatChanges,
                    pkgDataInfoMap, whitelistedDataInfoMap, bindMountAppsData,
                    bindMountAppStorageDirs, zygoteArgs);
    }
````

可以看到，`Process.start` 最终调用的是 `ZygoteProcess#start` 方法：

> *frameworks/base/core/java/android/os/ZygoteProcess.java*

```java
public final Process.ProcessStartResult start(@NonNull final String processClass,
                                                  final String niceName,
                                                  int uid, int gid, @Nullable int[] gids,
                                                  int runtimeFlags, int mountExternal,
                                                  int targetSdkVersion,
                                                  @Nullable String seInfo,
                                                  @NonNull String abi,
                                                  @Nullable String instructionSet,
                                                  @Nullable String appDataDir,
                                                  @Nullable String invokeWith,
                                                  @Nullable String packageName,
                                                  int zygotePolicyFlags,
                                                  boolean isTopApp,
                                                  @Nullable long[] disabledCompatChanges,
                                                  @Nullable Map<String, Pair<String, Long>>
                                                          pkgDataInfoMap,
                                                  @Nullable Map<String, Pair<String, Long>>
                                                          allowlistedDataInfoList,
                                                  boolean bindMountAppsData,
                                                  boolean bindMountAppStorageDirs,
                                                  @Nullable String[] zygoteArgs) {
        // TODO (chriswailes): Is there a better place to check this value?
        if (fetchUsapPoolEnabledPropWithMinInterval()) {
            informZygotesOfUsapPoolStatus();
        }

        try {
            return startViaZygote(processClass, niceName, uid, gid, gids,
                    runtimeFlags, mountExternal, targetSdkVersion, seInfo,
                    abi, instructionSet, appDataDir, invokeWith, /*startChildZygote=*/ false,
                    packageName, zygotePolicyFlags, isTopApp, disabledCompatChanges,
                    pkgDataInfoMap, allowlistedDataInfoList, bindMountAppsData,
                    bindMountAppStorageDirs, zygoteArgs);
        } catch (ZygoteStartFailedEx ex) {
            Log.e(LOG_TAG,
                    "Starting VM process through Zygote failed");
            throw new RuntimeException(
                    "Starting VM process through Zygote failed", ex);
        }
    }
private Process.ProcessStartResult startViaZygote(@NonNull final String processClass,
                                                      @Nullable final String niceName,
                                                      final int uid, final int gid,
                                                      @Nullable final int[] gids,
                                                      int runtimeFlags, int mountExternal,
                                                      int targetSdkVersion,
                                                      @Nullable String seInfo,
                                                      @NonNull String abi,
                                                      @Nullable String instructionSet,
                                                      @Nullable String appDataDir,
                                                      @Nullable String invokeWith,
                                                      boolean startChildZygote,
                                                      @Nullable String packageName,
                                                      int zygotePolicyFlags,
                                                      boolean isTopApp,
                                                      @Nullable long[] disabledCompatChanges,
                                                      @Nullable Map<String, Pair<String, Long>>
                                                              pkgDataInfoMap,
                                                      @Nullable Map<String, Pair<String, Long>>
                                                              allowlistedDataInfoList,
                                                      boolean bindMountAppsData,
                                                      boolean bindMountAppStorageDirs,
                                                      @Nullable String[] extraArgs)
                                                      throws ZygoteStartFailedEx {
        ArrayList<String> argsForZygote = new ArrayList<>();

        ...

        argsForZygote.add(processClass);

        if (extraArgs != null) {
            Collections.addAll(argsForZygote, extraArgs);
        }

        synchronized(mLock) {
            // The USAP pool can not be used if the application will not use the systems graphics
            // driver.  If that driver is requested use the Zygote application start path.
            return zygoteSendArgsAndGetResult(openZygoteSocketIfNeeded(abi),
                                              zygotePolicyFlags,
                                              argsForZygote);
        }
    }


private Process.ProcessStartResult zygoteSendArgsAndGetResult(
            ZygoteState zygoteState, int zygotePolicyFlags, @NonNull ArrayList<String> args)
            throws ZygoteStartFailedEx {
        ...

        return attemptZygoteSendArgsAndGetResult(zygoteState, msgStr);
    }

    private Process.ProcessStartResult attemptZygoteSendArgsAndGetResult(
            ZygoteState zygoteState, String msgStr) throws ZygoteStartFailedEx {
        try {
            final BufferedWriter zygoteWriter = zygoteState.mZygoteOutputWriter;
            final DataInputStream zygoteInputStream = zygoteState.mZygoteInputStream;

            zygoteWriter.write(msgStr);
            zygoteWriter.flush();

            // Always read the entire result from the input stream to avoid leaving
            // bytes in the stream for future process starts to accidentally stumble
            // upon.
            Process.ProcessStartResult result = new Process.ProcessStartResult();
            result.pid = zygoteInputStream.readInt();
            result.usingWrapper = zygoteInputStream.readBoolean();

            if (result.pid < 0) {
                throw new ZygoteStartFailedEx("fork() failed");
            }

            return result;
        } catch (IOException ex) {
            zygoteState.close();
            Log.e(LOG_TAG, "IO Exception while communicating with Zygote - "
                    + ex.toString());
            throw new ZygoteStartFailedEx(ex);
        }
    }
```

总的来说，上面就是 zygote 孵化进程的过程。主要分为以下几个步骤：

- 启动进程的参数封装
- 打开 Socket 套接字，并与 zygote 进程建立连接（详见 `openZygoteSocketIfNeeded`）
- 将进程的参数信息写入 `BufferedWriter`，并传输给 zygote 进程；通过 `DataInputStream` 来接收 zygote 进程返回的结果

打开套接字并与 ZygoteServer 建立连接是在 openZygoteSocketIfNeeded 中完成的：

```java
/**
 * Tries to open a session socket to a Zygote process with a compatible ABI if one is not
 * already open. If a compatible session socket is already open that session socket is returned.
 * This function may block and may have to try connecting to multiple Zygotes to find the
 * appropriate one.  Requires that mLock be held.
 */
private ZygoteState openZygoteSocketIfNeeded(String abi) throws ZygoteStartFailedEx {
     try {
         attemptConnectionToPrimaryZygote();

         if (primaryZygoteState.matches(abi)) {
             return primaryZygoteState;
         }

         if (mZygoteSecondarySocketAddress != null) {
             // The primary zygote didn't match. Try the secondary.
             attemptConnectionToSecondaryZygote();

             if (secondaryZygoteState.matches(abi)) {
                 return secondaryZygoteState;
             }
         }
     } catch (IOException ioe) {
         throw new ZygoteStartFailedEx("Error connecting to zygote", ioe);
     }

     throw new ZygoteStartFailedEx("Unsupported zygote ABI: " + abi);
 }
private void attemptConnectionToPrimaryZygote() throws IOException {
    if (primaryZygoteState == null || primaryZygoteState.isClosed()) {
        primaryZygoteState =
                ZygoteState.connect(mZygoteSocketAddress, mUsapPoolSocketAddress);

        maybeSetApiDenylistExemptions(primaryZygoteState, false);
        maybeSetHiddenApiAccessLogSampleRate(primaryZygoteState);
    }
}
```

如果没有打开 zygote 进程的套接字，则尝试开启并建立连接。下面看下 `ZygoteState` 类的静态方法 `connect`。

> *frameworks/base/core/java/android/os/ZygoteProcess.java*

```java
/**
  * Create a new ZygoteState object by connecting to the given Zygote socket and saving the
  * given USAP socket address.
  *
  * @param zygoteSocketAddress  Zygote socket to connect to
  * @param usapSocketAddress  USAP socket address to save for later
  * @return  A new ZygoteState object containing a session socket for the given Zygote socket
  * address
  * @throws IOException
  */
 static ZygoteState connect(@NonNull LocalSocketAddress zygoteSocketAddress,
         @Nullable LocalSocketAddress usapSocketAddress)
         throws IOException {

     DataInputStream zygoteInputStream;
     BufferedWriter zygoteOutputWriter;
     final LocalSocket zygoteSessionSocket = new LocalSocket();

     if (zygoteSocketAddress == null) {
         throw new IllegalArgumentException("zygoteSocketAddress can't be null");
     }

     try {
         zygoteSessionSocket.connect(zygoteSocketAddress);
         zygoteInputStream = new DataInputStream(zygoteSessionSocket.getInputStream());
         zygoteOutputWriter =
                 new BufferedWriter(
                         new OutputStreamWriter(zygoteSessionSocket.getOutputStream()),
                         Zygote.SOCKET_BUFFER_SIZE);
     } catch (IOException ex) {
         try {
         zygoteSessionSocket.close();
     } catch (IOException ignore) { }

         throw ex;
     }

     return new ZygoteState(zygoteSocketAddress, usapSocketAddress,
                               zygoteSessionSocket, zygoteInputStream, zygoteOutputWriter,
                               getAbiList(zygoteOutputWriter, zygoteInputStream));
 }
```

`ZygoteState` 类哟用于表示与 Zygote 进程通信的状态。假如传递给 connect 方法的实参是 `ZYGOTE_SOCKET`（即"zygote"），这代表要连接的远程地址。该方法中首先创建一个 `LocalSocket` 对象，接着调用其 `connect` 方法，连接成功之后，就可以得到套接字的输入和输出流，并将输入流其封装成 `DataInputStream` 对象，然后将输出流封装成 `BufferedWriter` 对象。接着就可以通过 `DataInputStream` 对象获得 Zygote 进程发送过来的消息，而通过 `BufferedWriter` 对象发送消息给 Zygote 进程。

那么问题来了，我们只知道了 socket 通信的一端，另外一端如何找到呢？其实上一篇关于[Android系统启动过程](https://dorck.cn/2023/04/22/android-initialization/)的文章中在分析到 zygote 进程启动过程时已经提过一笔了：

> *com.android.internal.os.ZygoteInit*

```java
public static void main(String[] argv) {
        ZygoteServer zygoteServer = null;

        Runnable caller;
        try {
          	String zygoteSocketName = "zygote";
           	...

            Log.i(TAG, "Accepting command socket connections");

            // The select loop returns early in the child process after a fork and
            // loops forever in the zygote.
            caller = zygoteServer.runSelectLoop(abiList);
        } catch (Throwable ex) {
            Log.e(TAG, "System zygote died with fatal exception", ex);
            throw ex;
        } finally {
            if (zygoteServer != null) {
                zygoteServer.closeServerSocket();
            }
        }

        // We're in the child process and have exited the select loop. Proceed to execute the
        // command.
        if (caller != null) {
            caller.run();
        }
    }
```

zygote 进程通过 `ZygoteServer#runSelectLoop` 来循环监听其他进程的 Socket 连接：

```java
 Runnable runSelectLoop(String abiList) {
        ArrayList<FileDescriptor> socketFDs = new ArrayList<>();
        ArrayList<ZygoteConnection> peers = new ArrayList<>();
				// sServerSocket是socket通信中的服务端，即zygote进程，保存到fds[0]
        socketFDs.add(mZygoteSocket.getFileDescriptor());
        peers.add(null);

        mUsapPoolRefillTriggerTimestamp = INVALID_TIMESTAMP;

        while (true) {
            ...
            StructPollfd[] pollFDs;

            // Allocate enough space for the poll structs, taking into account
            // the state of the USAP pool for this Zygote (could be a
            // regular Zygote, a WebView Zygote, or an AppZygote).
            if (mUsapPoolEnabled) {
                usapPipeFDs = Zygote.getUsapPipeFDs();
                pollFDs = new StructPollfd[socketFDs.size() + 1 + usapPipeFDs.length];
            } else {
                pollFDs = new StructPollfd[socketFDs.size()];
            }

            /*
             * For reasons of correctness the USAP pool pipe and event FDs
             * must be processed before the session and server sockets.  This
             * is to ensure that the USAP pool accounting information is
             * accurate when handling other requests like API deny list
             * exemptions.
             */

            int pollIndex = 0;
            for (FileDescriptor socketFD : socketFDs) {
                pollFDs[pollIndex] = new StructPollfd();
                pollFDs[pollIndex].fd = socketFD;
                pollFDs[pollIndex].events = (short) POLLIN;
                ++pollIndex;
            }

            final int usapPoolEventFDIndex = pollIndex;

            if (mUsapPoolEnabled) {
                pollFDs[pollIndex] = new StructPollfd();
                pollFDs[pollIndex].fd = mUsapPoolEventFD;
                pollFDs[pollIndex].events = (short) POLLIN;
                ++pollIndex;

                // The usapPipeFDs array will always be filled in if the USAP Pool is enabled.
                assert usapPipeFDs != null;
                for (int usapPipeFD : usapPipeFDs) {
                    FileDescriptor managedFd = new FileDescriptor();
                    managedFd.setInt$(usapPipeFD);

                    pollFDs[pollIndex] = new StructPollfd();
                    pollFDs[pollIndex].fd = managedFd;
                    pollFDs[pollIndex].events = (short) POLLIN;
                    ++pollIndex;
                }
            }

            int pollTimeoutMs;

            ...

            int pollReturnValue;
            try {
              	// 处理轮询状态，当pollFds有事件到来则往下执行，否则阻塞在这里
                pollReturnValue = Os.poll(pollFDs, pollTimeoutMs);
            } catch (ErrnoException ex) {
                throw new RuntimeException("poll failed", ex);
            }

            if (pollReturnValue == 0) {
                // The poll returned zero results either when the timeout value has been exceeded
                // or when a non-blocking poll is issued and no FDs are ready.  In either case it
                // is time to refill the pool.  This will result in a duplicate assignment when
                // the non-blocking poll returns zero results, but it avoids an additional
                // conditional in the else branch.
                mUsapPoolRefillTriggerTimestamp = INVALID_TIMESTAMP;
                mUsapPoolRefillAction = UsapPoolRefillAction.DELAYED;

            } else {
                boolean usapPoolFDRead = false;

                while (--pollIndex >= 0) {
                  // 采用I/O多路复用机制，当接收到客户端发出连接请求或者数据处理请求到来，则往下执行；
            			// 否则进入continue，跳出本次循环。
                    if ((pollFDs[pollIndex].revents & POLLIN) == 0) {
                        continue;
                    }

                    if (pollIndex == 0) {
                        // 即fds[0]，代表的是sServerSocket，则意味着有客户端连接请求；
                				// 则创建ZygoteConnection对象,并添加到fds。
                        ZygoteConnection newPeer = acceptCommandPeer(abiList);
                        peers.add(newPeer);
                        socketFDs.add(newPeer.getFileDescriptor());
                    } else if (pollIndex < usapPoolEventFDIndex) {
                        // 从Zygote服务器套接字接受会话套接字

                        try {
                            ZygoteConnection connection = peers.get(pollIndex);
                            boolean multipleForksOK = !isUsapPoolEnabled()
                                    && ZygoteHooks.isIndefiniteThreadSuspensionSafe();
                            final Runnable command =
                                    connection.processCommand(this, multipleForksOK);

                            ...
                        } catch (Exception e) {
                            ...
                        } finally {
                            // Reset the child flag, in the event that the child process is a child-
                            // zygote. The flag will not be consulted this loop pass after the
                            // Runnable is returned.
                            mIsForkChild = false;
                        }

                    } else {
                        ...
                    }
                }

                ...
            }

            ...
        }
    }
```

`mUsapPoolEnabled` 标识是否开启 USAP 机制。从Android Q(10)开始，Google 引入了一种新的机制：USAP(Unspecialized App Process)。通过 prefork 的方式提前创建好一批进程，当有应用启动时，直接将已经创建好的进程分配给它，从而省去了 fork 的动作，因此可以提升性能。后面将会有专门篇幅来研究 USAP 机制的运行原理，本文暂不做详细介绍。

其实，最终 ZygoteServer 会接收到来自 system_server 进程 AMS 创建新应用进程的消息，并通过 `ZygoteConnection#processCommand` 来处理并创建新进程：

> *frameworks/base/core/java/com/android/internal/os/ZygoteConnection.java*

```java
/**
     * Reads a command from the command socket. If a child is successfully forked, a
     * {@code Runnable} that calls the childs main method (or equivalent) is returned in the child
     * process. {@code null} is always returned in the parent process (the zygote).
     * If multipleOK is set, we may keep processing additional fork commands before returning.
     *
     * If the client closes the socket, an {@code EOF} condition is set, which callers can test
     * for by calling {@code ZygoteConnection.isClosedByPeer}.
     */
    Runnable processCommand(ZygoteServer zygoteServer, boolean multipleOK) {
        ZygoteArguments parsedArgs;

        try (ZygoteCommandBuffer argBuffer = new ZygoteCommandBuffer(mSocket)) {
            while (true) {
                ...

                int pid;
                FileDescriptor childPipeFd = null;
                FileDescriptor serverPipeFd = null;

                ...
                if (canPreloadApp() && parsedArgs.mPreloadApp != null) {
                    byte[] rawParcelData = Base64.getDecoder().decode(parsedArgs.mPreloadApp);
                    Parcel appInfoParcel = Parcel.obtain();
                    appInfoParcel.unmarshall(rawParcelData, 0, rawParcelData.length);
                    appInfoParcel.setDataPosition(0);
                    ApplicationInfo appInfo =
                            ApplicationInfo.CREATOR.createFromParcel(appInfoParcel);
                    appInfoParcel.recycle();
                    if (appInfo != null) {
                        handlePreloadApp(appInfo);
                    } else {
                        throw new IllegalArgumentException("Failed to deserialize --preload-app");
                    }
                    return null;
                }
								...

                if (parsedArgs.mInvokeWith != null || parsedArgs.mStartChildZygote
                        || !multipleOK || peer.getUid() != Process.SYSTEM_UID) {
                    // Continue using old code for now. TODO: Handle these cases in the other path.
                    pid = Zygote.forkAndSpecialize(parsedArgs.mUid, parsedArgs.mGid,
                            parsedArgs.mGids, parsedArgs.mRuntimeFlags, rlimits,
                            parsedArgs.mMountExternal, parsedArgs.mSeInfo, parsedArgs.mNiceName,
                            fdsToClose, fdsToIgnore, parsedArgs.mStartChildZygote,
                            parsedArgs.mInstructionSet, parsedArgs.mAppDataDir,
                            parsedArgs.mIsTopApp, parsedArgs.mPkgDataInfoList,
                            parsedArgs.mAllowlistedDataInfoList, parsedArgs.mBindMountAppDataDirs,
                            parsedArgs.mBindMountAppStorageDirs);

                    try {
                        if (pid == 0) {
                            // in child
                            zygoteServer.setForkChild();

                            zygoteServer.closeServerSocket();
                            IoUtils.closeQuietly(serverPipeFd);
                            serverPipeFd = null;

                            return handleChildProc(parsedArgs, childPipeFd,
                                    parsedArgs.mStartChildZygote);
                        } else {
                            // In the parent. A pid < 0 indicates a failure and will be handled in
                            // handleParentProc.
                            IoUtils.closeQuietly(childPipeFd);
                            childPipeFd = null;
                            handleParentProc(pid, serverPipeFd);
                            return null;
                        }
                    } finally {
                        IoUtils.closeQuietly(childPipeFd);
                        IoUtils.closeQuietly(serverPipeFd);
                    }
                } else {
                    ZygoteHooks.preFork();
                    Runnable result = Zygote.forkSimpleApps(argBuffer,
                            zygoteServer.getZygoteSocketFileDescriptor(),
                            peer.getUid(), Zygote.minChildUid(peer), parsedArgs.mNiceName);
                    if (result == null) {
                        // parent; we finished some number of forks. Result is Boolean.
                        // We already did the equivalent of handleParentProc().
                        ZygoteHooks.postForkCommon();
                        // argBuffer contains a command not understood by forksimpleApps.
                        continue;
                    } else {
                        // child; result is a Runnable.
                        zygoteServer.setForkChild();
                        Zygote.setAppProcessName(parsedArgs, TAG);  // ??? Necessary?
                        return result;
                    }
                }
            }
        }
        ...
    }
```

首先调用 ZygoteArguments 得到客户端发来的启动进程参数，接着进行权限检查，然后调用 `forkAndSpecialize` 创建新进程（native 层通过 fork() 来克隆出新进程，此时 native 层的进程其实相当于已经生成了），返回 pid 若为 0，则开始调用 `handleChildProc` 来处理子进程；如果返回 pid > 0，则开始调用 `handleParentProc` 来处理父进程。注意，这里并不是简单的 if-else 关系，调用 forkAndSpecialize 之后其实会返回两次，一次返回到父进程，另一次返回到新启动的子进程。至于为什么会返回两次，这里先埋下一个**彩蛋**，后续文章会填坑。接下来我们来继续看下如果返回的 pid 是 0，即在子进程返回的情况下，handleChildProc 做了些什么：

```java
private Runnable handleChildProc(ZygoteArguments parsedArgs,
            FileDescriptor pipeFd, boolean isZygote) {
        /*
         * By the time we get here, the native code has closed the two actual Zygote
         * socket connections, and substituted /dev/null in their place.  The LocalSocket
         * objects still need to be closed properly.
         */

        closeSocket();

        Zygote.setAppProcessName(parsedArgs, TAG);

        // End of the postFork event.
        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
        if (parsedArgs.mInvokeWith != null) {
            WrapperInit.execApplication(parsedArgs.mInvokeWith,
                    parsedArgs.mNiceName, parsedArgs.mTargetSdkVersion,
                    VMRuntime.getCurrentInstructionSet(),
                    pipeFd, parsedArgs.mRemainingArgs);

            // Should not get here.
            throw new IllegalStateException("WrapperInit.execApplication unexpectedly returned");
        } else {
            if (!isZygote) {
                return ZygoteInit.zygoteInit(parsedArgs.mTargetSdkVersion,
                        parsedArgs.mDisabledCompatChanges,
                        parsedArgs.mRemainingArgs, null /* classLoader */);
            } else {
                return ZygoteInit.childZygoteInit(
                        parsedArgs.mRemainingArgs  /* classLoader */);
            }
        }
    }
```

由于我们创建的是应用进程，所以上方代码显然会执行到 `ZygoteInit.childZygoteInit`：

```java
/**
     * The main function called when starting a child zygote process. This is used as an alternative
     * to zygoteInit(), which skips calling into initialization routines that start the Binder
     * threadpool.
     */
    static Runnable childZygoteInit(String[] argv) {
        RuntimeInit.Arguments args = new RuntimeInit.Arguments(argv);
        return RuntimeInit.findStaticMain(args.startClass, args.startArgs, /* classLoader= */null);
    }

/**
     * Invokes a static "main(argv[]) method on class "className".
     * Converts various failing exceptions into RuntimeExceptions, with
     * the assumption that they will then cause the VM instance to exit.
     *
     * @param className Fully-qualified class name
     * @param argv Argument vector for main()
     * @param classLoader the classLoader to load {@className} with
     */
    protected static Runnable findStaticMain(String className, String[] argv,
            ClassLoader classLoader) {
        Class<?> cl;

        try {
            cl = Class.forName(className, true, classLoader);
        } catch (ClassNotFoundException ex) {
            throw new RuntimeException(
                    "Missing class when invoking static main " + className,
                    ex);
        }

        Method m;
        try {
            m = cl.getMethod("main", new Class[] { String[].class });
        } catch (NoSuchMethodException ex) {
            throw new RuntimeException(
                    "Missing static main on " + className, ex);
        } catch (SecurityException ex) {
            throw new RuntimeException(
                    "Problem getting static main on " + className, ex);
        }

        int modifiers = m.getModifiers();
        if (! (Modifier.isStatic(modifiers) && Modifier.isPublic(modifiers))) {
            throw new RuntimeException(
                    "Main method is not public and static on " + className);
        }

        /*
         * This throw gets caught in ZygoteInit.main(), which responds
         * by invoking the exception's run() method. This arrangement
         * clears up all the stack frames that were required in setting
         * up the process.
         */
        return new MethodAndArgsCaller(m, argv);
    }
```

由上述代码可知，最终会通过反射的方式来为之前传递进来的 `processClass` 创建实例对象，根据上面流程的分析，这里的 processClass 显然是 `android.app.ActivityThread` 这个类，接着调用该类的 `main` 方法：

> *frameworks/base/core/java/android/app/ActivityThread.java*

```java
public static void main(String[] args) {
        Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "ActivityThreadMain");

        // Install selective syscall interception
        AndroidOs.install();

        ...

        Looper.prepareMainLooper();
				...
        ActivityThread thread = new ActivityThread();
        thread.attach(false, startSeq);

        if (sMainThreadHandler == null) {
            sMainThreadHandler = thread.getHandler();
        }
        // End of event ActivityThreadMain.
        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
        Looper.loop();

        throw new RuntimeException("Main thread loop unexpectedly exited");
    }
```

ActivityThread 的 `main` 中准备一个主线程的 Looper 并初始化消息队列，并创建一个 ActivityThread 实例，执行 `attach` 方法创建 Application 和绑定生命周期，最后开启主线程的消息循环。我们重点看下 attach 方法：

```java
private void attach(boolean system, long startSeq) {
        sCurrentActivityThread = this;
        mConfigurationController = new ConfigurationController(this);
        mSystemThread = system;
  			// 此处 system 为 false
        if (!system) {
            android.ddm.DdmHandleAppName.setAppName("<pre-initialized>",
                                                    UserHandle.myUserId());
            RuntimeInit.setApplicationObject(mAppThread.asBinder());
            final IActivityManager mgr = ActivityManager.getService();
            try {
                mgr.attachApplication(mAppThread, startSeq);
            } catch (RemoteException ex) {
                throw ex.rethrowFromSystemServer();
            }
            ...
        } else {
            ...
        }

        ...
    }
```

attach 中执行了 IActivityManager 的 `attachApplication` 方法，而 IActivityManager 其实是一个 Binder 接口，这里通过 ActivityManager.getService 获取它的代理服务 AMS，进而调用 `attachApplication` 来将 ActivityThread 内部类 ApplicationThread 绑定到 AMS，这样就可以通过 Binder IPC 间接控制应用进程了：

> *frameworks/base/services/core/java/com/android/server/am/ActivityManagerService.java*

```java
@Override
    public final void attachApplication(IApplicationThread thread, long startSeq) {
        if (thread == null) {
            throw new SecurityException("Invalid application interface");
        }
        synchronized (this) {
            int callingPid = Binder.getCallingPid();
            final int callingUid = Binder.getCallingUid();
            final long origId = Binder.clearCallingIdentity();
            attachApplicationLocked(thread, callingPid, callingUid, startSeq);
            Binder.restoreCallingIdentity(origId);
        }
    }
private boolean attachApplicationLocked(@NonNull IApplicationThread thread,
            int pid, int callingUid, long startSeq) {

        // Find the application record that is being attached...  either via
        // the pid if we are running in multiple processes, or just pull the
        // next app record if we are emulating process with anonymous threads.
        ProcessRecord app;
        long startTime = SystemClock.uptimeMillis();
        long bindApplicationTimeMillis;
        if (pid != MY_PID && pid >= 0) {
            synchronized (mPidsSelfLocked) {
                app = mPidsSelfLocked.get(pid);
            }
            if (app != null && (app.getStartUid() != callingUid || app.getStartSeq() != startSeq)) {
                ...
                // If there is already an app occupying that pid that hasn't been cleaned up
                cleanUpApplicationRecordLocked(app, pid, false, false, -1,
                        true /*replacingPid*/, false /* fromBinderDied */);
                removePidLocked(pid, app);
                app = null;
            }
        } else {
            app = null;
        }
  			...

        
        try {
            ...
            ApplicationInfo appInfo = instr != null ? instr.mTargetInfo : app.info;
            app.setCompat(compatibilityInfoForPackage(appInfo));

            
            if (app.getIsolatedEntryPoint() != null) {
                // This is an isolated process which should just call an entry point instead of
                // being bound to an application.
                thread.runIsolatedEntryPoint(
                        app.getIsolatedEntryPoint(), app.getIsolatedEntryPointArgs());
            } else if (instr2 != null) {
                ...
            } else {
                thread.bindApplication(processName, appInfo,
                        app.sdkSandboxClientAppVolumeUuid, app.sdkSandboxClientAppPackage,
                        providerList, null, profilerInfo, null, null, null, testMode,
                        mBinderTransactionTrackingEnabled, enableTrackAllocation,
                        isRestrictedBackupMode || !normalMode, app.isPersistent(),
                        new Configuration(app.getWindowProcessController().getConfiguration()),
                        app.getCompat(), getCommonServicesLocked(app.isolated),
                        mCoreSettingsObserver.getCoreSettingsLocked(),
                        buildSerial, autofillOptions, contentCaptureOptions,
                        app.getDisabledCompatChanges(), serializedSystemFontMap,
                        app.getStartElapsedTime(), app.getStartUptime());
            }
            ...
            // Make app active after binding application or client may be running requests (e.g
            // starting activities) before it is ready.
            synchronized (mProcLock) {
                app.makeActive(thread, mProcessStats);
                checkTime(startTime, "attachApplicationLocked: immediately after bindApplication");
            }
            ...
        } catch (Exception e) {
            ...
        }

        boolean didSomething = false;

        // See if the top visible activity is waiting to run in this process...
        if (normalMode) {
            try {
                didSomething = mAtmInternal.attachApplication(app.getWindowProcessController());
            } catch (Exception e) {
                Slog.wtf(TAG, "Exception thrown launching activities in " + app, e);
                badApp = true;
            }
        }
        ...
        return true;
    }
```

ApplicationThread 作为 ActivityThread 的内部类，它是 `IApplicationThread` 这个 Binder 接口的最终实现类，即 ApplicationThread 内部实现了一套 AIDL 接口，这个接口与 Application 的创建、Activity 及 Service 等四大组件启动等息息相关。最终调用 `IApplicationThread` 的 `bindApplication` 方法：

> *frameworks/base/core/java/android/app/ActivityThread.java#ApplicationThread*

```java
@Override
        public final void bindApplication(String processName, ApplicationInfo appInfo,
                String sdkSandboxClientAppVolumeUuid, String sdkSandboxClientAppPackage,
                ProviderInfoList providerList, ComponentName instrumentationName,
                ProfilerInfo profilerInfo, Bundle instrumentationArgs,
                IInstrumentationWatcher instrumentationWatcher,
                IUiAutomationConnection instrumentationUiConnection, int debugMode,
                boolean enableBinderTracking, boolean trackAllocation,
                boolean isRestrictedBackupMode, boolean persistent, Configuration config,
                CompatibilityInfo compatInfo, Map services, Bundle coreSettings,
                String buildSerial, AutofillOptions autofillOptions,
                ContentCaptureOptions contentCaptureOptions, long[] disabledCompatChanges,
                SharedMemory serializedSystemFontMap,
                long startRequestedElapsedTime, long startRequestedUptime) {
            ...
            AppBindData data = new AppBindData();
            data.processName = processName;
            data.appInfo = appInfo;
            data.sdkSandboxClientAppVolumeUuid = sdkSandboxClientAppVolumeUuid;
            data.sdkSandboxClientAppPackage = sdkSandboxClientAppPackage;
            data.providers = providerList.getList();
            data.instrumentationName = instrumentationName;
            data.instrumentationArgs = instrumentationArgs;
            data.instrumentationWatcher = instrumentationWatcher;
            data.instrumentationUiAutomationConnection = instrumentationUiConnection;
            data.debugMode = debugMode;
            data.enableBinderTracking = enableBinderTracking;
            data.trackAllocation = trackAllocation;
            data.restrictedBackupMode = isRestrictedBackupMode;
            data.persistent = persistent;
            data.config = config;
            data.compatInfo = compatInfo;
            data.initProfilerInfo = profilerInfo;
            data.buildSerial = buildSerial;
            data.autofillOptions = autofillOptions;
            data.contentCaptureOptions = contentCaptureOptions;
            data.disabledCompatChanges = disabledCompatChanges;
            data.mSerializedSystemFontMap = serializedSystemFontMap;
            data.startRequestedElapsedTime = startRequestedElapsedTime;
            data.startRequestedUptime = startRequestedUptime;
            sendMessage(H.BIND_APPLICATION, data);
        }
```

上面代码通过一个 Handler 实例发送 `H.BIND_APPLICATION` 消息，意味着需要构建和绑定 Application 对象。这个 Handler 同样是 ActivityThread 的内部类：

> *frameworks/base/core/java/android/app/ActivityThread.java#H*

```java
class H extends Handler {
        public static final int BIND_APPLICATION        = 110;
        ...
        public void handleMessage(Message msg) {
            if (DEBUG_MESSAGES) Slog.v(TAG, ">>> handling: " + codeToString(msg.what));
            switch (msg.what) {
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
            }
            Object obj = msg.obj;
            if (obj instanceof SomeArgs) {
                ((SomeArgs) obj).recycle();
            }
            if (DEBUG_MESSAGES) Slog.v(TAG, "<<< done: " + codeToString(msg.what));
        }
    }
```

通过跨进程通信，Application 的创建和绑定最终回到了主线程：

```java
private void handleBindApplication(AppBindData data) {
        ...
        // Instrumentation info affects the class loader, so load it before
        // setting up the app context.
        final InstrumentationInfo ii;
        if (data.instrumentationName != null) {
            ii = prepareInstrumentation(data);
        } else {
            ii = null;
        }

        final ContextImpl appContext = ContextImpl.createAppContext(this, data.info);
        mConfigurationController.updateLocaleListFromAppContext(appContext);
				...
        // Continue loading instrumentation.
        if (ii != null) {
            initInstrumentation(ii, data, appContext);
        } else {
            mInstrumentation = new Instrumentation();
            mInstrumentation.basicInit(this);
        }
        // Allow disk access during application and provider setup. This could
        // block processing ordered broadcasts, but later processing would
        // probably end up doing the same disk access.
        Application app;
        final StrictMode.ThreadPolicy savedPolicy = StrictMode.allowThreadDiskWrites();
        final StrictMode.ThreadPolicy writesAllowedPolicy = StrictMode.getThreadPolicy();
        try {
            // If the app is being launched for full backup or restore, bring it up in
            // a restricted environment with the base application class.
            app = data.info.makeApplicationInner(data.restrictedBackupMode, null);
						...
            mInitialApplication = app;
            ...
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
            ...
        }
  			...
    }
```

最终通过 LoadedApk 中的 `makeApplication` 方法来尝试创建 Application 对象并执行它的 `onCreate` 生命周期方法：

> *frameworks/base/core/java/android/app/LoadedApk.java*

```java
public Application makeApplicationInner(boolean forceDefaultAppClass,
            Instrumentation instrumentation) {
        return makeApplicationInner(forceDefaultAppClass, instrumentation,
                /* allowDuplicateInstances= */ false);
    }

    private Application makeApplicationInner(boolean forceDefaultAppClass,
            Instrumentation instrumentation, boolean allowDuplicateInstances) {
        if (mApplication != null) {
            return mApplication;
        }
        Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "makeApplication");

        ...
        Application app = null;

        final String myProcessName = Process.myProcessName();
        String appClass = mApplicationInfo.getCustomApplicationClassNameForProcess(
                myProcessName);
        if (forceDefaultAppClass || (appClass == null)) {
            appClass = "android.app.Application";
        }

        try {
            ...
            ContextImpl appContext = ContextImpl.createAppContext(mActivityThread, this);
            // The network security config needs to be aware of multiple
            // applications in the same process to handle discrepancies
            NetworkSecurityConfigProvider.handleNewApplication(appContext);
            app = mActivityThread.mInstrumentation.newApplication(
                    cl, appClass, appContext);
            appContext.setOuterContext(app);
        } catch (Exception e) {
            ...
        }
        mActivityThread.mAllApplications.add(app);
        mApplication = app;
        ...
        if (instrumentation != null) {
            try {
                instrumentation.callApplicationOnCreate(app);
            } catch (Exception e) {
                ...
            }
        }

        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);

        return app;
    }
```

如果 Application 对象依然存在则直接返回当前对象，否则会通过 Instrumentation(ActivityThread中的成员变量 mInstrumentation，而非参数传递进来的) 来新建一个 Application：

> *frameworks/base/core/java/android/app/Instrumentation.java*

```java
public Application newApplication(ClassLoader cl, String className, Context context)
            throws InstantiationException, IllegalAccessException, 
            ClassNotFoundException {
        Application app = getFactory(context.getPackageName())
                .instantiateApplication(cl, className);
        app.attach(context);
        return app;
    }

public @NonNull Application instantiateApplication(@NonNull ClassLoader cl,
            @NonNull String className)
            throws InstantiationException, IllegalAccessException, ClassNotFoundException {
        return (Application) cl.loadClass(className).newInstance();
    }
```

可以看到，最终是通过反射生成一个全新的 Application 对象并返回给上层，并执行了它的 `onCreate` 方法。至此，Application 创建并启动完毕。

### 继续启动 Activity

仔细想一下，之前我们分析 Launcher 进程创建过程中的时候，它会提前创建一个 ActivityRecord 对象并置于栈顶，如果当前进程已创建，则直接执行 realStartActivityLocked 来真正启动一个 Activity；如果进程还没有创建，则先创建进程。我们上面分析了一大通不也正是研究了进程还没有创建的情况吗。既然我们后来创建了一个新的 Application，那是不是应该继续之前未完成的使命呢？也就是将先前打断的 Activity 启动的工作继续执行起来。Android 系统不可能连这个问题都考虑不到对吧，所以 Application 创建完毕后应该会继续执行启动 Activity 的逻辑！

我们回到之前的 ActivityManagerService 中查看 `attachApplicationLocked`：

```java
private boolean attachApplicationLocked(@NonNull IApplicationThread thread,
            int pid, int callingUid, long startSeq) {

        ...
        
        try {
            ...
            ApplicationInfo appInfo = instr != null ? instr.mTargetInfo : app.info;
            app.setCompat(compatibilityInfoForPackage(appInfo));

            
            if (app.getIsolatedEntryPoint() != null) {
                // This is an isolated process which should just call an entry point instead of
                // being bound to an application.
                thread.runIsolatedEntryPoint(
                        app.getIsolatedEntryPoint(), app.getIsolatedEntryPointArgs());
            } else if (instr2 != null) {
                ...
            } else {
                thread.bindApplication(processName, appInfo,
                        app.sdkSandboxClientAppVolumeUuid, app.sdkSandboxClientAppPackage,
                        providerList, null, profilerInfo, null, null, null, testMode,
                        mBinderTransactionTrackingEnabled, enableTrackAllocation,
                        isRestrictedBackupMode || !normalMode, app.isPersistent(),
                        new Configuration(app.getWindowProcessController().getConfiguration()),
                        app.getCompat(), getCommonServicesLocked(app.isolated),
                        mCoreSettingsObserver.getCoreSettingsLocked(),
                        buildSerial, autofillOptions, contentCaptureOptions,
                        app.getDisabledCompatChanges(), serializedSystemFontMap,
                        app.getStartElapsedTime(), app.getStartUptime());
            }
            ...
            // Make app active after binding application or client may be running requests (e.g
            // starting activities) before it is ready.
            synchronized (mProcLock) {
                app.makeActive(thread, mProcessStats);
                checkTime(startTime, "attachApplicationLocked: immediately after bindApplication");
            }
            ...
        } catch (Exception e) {
            ...
        }

        boolean didSomething = false;

        // See if the top visible activity is waiting to run in this process...
        if (normalMode) {
            try {
                didSomething = mAtmInternal.attachApplication(app.getWindowProcessController());
            } catch (Exception e) {
                Slog.wtf(TAG, "Exception thrown launching activities in " + app, e);
                badApp = true;
            }
        }
  			// Find any services that should be running in this process...
        if (!badApp) {
            try {
                didSomething |= mServices.attachApplicationLocked(app, processName);
                checkTime(startTime, "attachApplicationLocked: after mServices.attachApplicationLocked");
            } catch (Exception e) {
                Slog.wtf(TAG, "Exception thrown starting services in " + app, e);
                badApp = true;
            }
        }
        ...
        return true;
    }
```

可以看到，在成功创建和绑定 Application 之后，又继续执行了`ActivityTaskManagerInternal#attachApplication`，它又做了什么事情呢？：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityTaskManagerService.java*

```java
public boolean attachApplication(WindowProcessController wpc) throws RemoteException {
    synchronized (mGlobalLockWithoutBoost) {
        if (Trace.isTagEnabled(TRACE_TAG_WINDOW_MANAGER)) {
            Trace.traceBegin(TRACE_TAG_WINDOW_MANAGER, "attachApplication:" + wpc.mName);
        }
        try {
            return mRootWindowContainer.attachApplication(wpc);
        } finally {
            Trace.traceEnd(TRACE_TAG_WINDOW_MANAGER);
        }
    }
}

```

继续跟进到 `RootWindowContainer#attachApplication`：

> *frameworks/base/services/core/java/com/android/server/wm/RootWindowContainer.java*

```java
boolean attachApplication(WindowProcessController app) throws RemoteException {
    try {
        return mAttachApplicationHelper.process(app);
    } finally {
        mAttachApplicationHelper.reset();
    }
}

boolean process(WindowProcessController app) throws RemoteException {
     mApp = app;
     for (int displayNdx = getChildCount() - 1; displayNdx >= 0; --displayNdx) {
         getChildAt(displayNdx).forAllRootTasks(this);
         if (mRemoteException != null) {
             throw mRemoteException;
         }
     }
     if (!mHasActivityStarted) {
         ensureActivitiesVisible(null /* starting */, 0 /* configChanges */,
                 false /* preserveWindows */);
     }
     return mHasActivityStarted;
 }

void ensureActivitiesVisible(ActivityRecord starting, int configChanges,
            boolean preserveWindows, boolean notifyClients) {
        if (mTaskSupervisor.inActivityVisibilityUpdate()
                || mTaskSupervisor.isRootVisibilityUpdateDeferred()) {
            // Don't do recursive work.
            return;
        }

        try {
            mTaskSupervisor.beginActivityVisibilityUpdate();
            // First the front root tasks. In case any are not fullscreen and are in front of home.
            for (int displayNdx = getChildCount() - 1; displayNdx >= 0; --displayNdx) {
                final DisplayContent display = getChildAt(displayNdx);
                display.ensureActivitiesVisible(starting, configChanges, preserveWindows,
                        notifyClients);
            }
        } finally {
            mTaskSupervisor.endActivityVisibilityUpdate();
        }
    }
```

这里是查找 Activity 栈是否存在需要被启动的 Activity，继续跟进 `DisplayContent#ensureActivitiesVisible`：

> *frameworks/base/services/core/java/com/android/server/wm/DisplayContent.java*

```java
void ensureActivitiesVisible(ActivityRecord starting, int configChanges,
            boolean preserveWindows, boolean notifyClients) {
        if (mInEnsureActivitiesVisible) {
            // Don't do recursive work.
            return;
        }
        mInEnsureActivitiesVisible = true;
        mAtmService.mTaskSupervisor.beginActivityVisibilityUpdate();
        try {
            forAllRootTasks(rootTask -> {
                rootTask.ensureActivitiesVisible(starting, configChanges, preserveWindows,
                        notifyClients);
            });
            if (mTransitionController.useShellTransitionsRotation()
                    && mTransitionController.isCollecting()
                    && mWallpaperController.getWallpaperTarget() != null) {
                // Also update wallpapers so that their requestedVisibility immediately reflects
                // the changes to activity visibility.
                // TODO(b/206005136): Move visibleRequested logic up to WindowToken.
                mWallpaperController.adjustWallpaperWindows();
            }
        } finally {
            mAtmService.mTaskSupervisor.endActivityVisibilityUpdate();
            mInEnsureActivitiesVisible = false;
        }
    }
```

接着跟进 `Task#ensureActivitiesVisible`：

> *frameworks/base/services/core/java/com/android/server/wm/Task.java*

```java
/**
     * Make sure that all activities that need to be visible in the root task (that is, they
     * currently can be seen by the user) actually are and update their configuration.
     * @param starting The top most activity in the task.
     *                 The activity is either starting or resuming.
     *                 Caller should ensure starting activity is visible.
     * @param preserveWindows Flag indicating whether windows should be preserved when updating
     *                        configuration in {@link EnsureActivitiesVisibleHelper}.
     * @param configChanges Parts of the configuration that changed for this activity for evaluating
     *                      if the screen should be frozen as part of
     *                      {@link EnsureActivitiesVisibleHelper}.
     *
     */
    void ensureActivitiesVisible(@Nullable ActivityRecord starting, int configChanges,
            boolean preserveWindows) {
        ensureActivitiesVisible(starting, configChanges, preserveWindows, true /* notifyClients */);
    }

    /**
     * Ensure visibility with an option to also update the configuration of visible activities.
     * @see #ensureActivitiesVisible(ActivityRecord, int, boolean)
     * @see RootWindowContainer#ensureActivitiesVisible(ActivityRecord, int, boolean)
     * @param starting The top most activity in the task.
     *                 The activity is either starting or resuming.
     *                 Caller should ensure starting activity is visible.
     * @param notifyClients Flag indicating whether the visibility updates should be sent to the
     *                      clients in {@link EnsureActivitiesVisibleHelper}.
     * @param preserveWindows Flag indicating whether windows should be preserved when updating
     *                        configuration in {@link EnsureActivitiesVisibleHelper}.
     * @param configChanges Parts of the configuration that changed for this activity for evaluating
     *                      if the screen should be frozen as part of
     *                      {@link EnsureActivitiesVisibleHelper}.
     */
    // TODO: Should be re-worked based on the fact that each task as a root task in most cases.
    void ensureActivitiesVisible(@Nullable ActivityRecord starting, int configChanges,
            boolean preserveWindows, boolean notifyClients) {
        mTaskSupervisor.beginActivityVisibilityUpdate();
        try {
            forAllLeafTasks(task -> {
                task.updateActivityVisibilities(starting, configChanges, preserveWindows,
                        notifyClients);
            }, true /* traverseTopToBottom */);

            if (mTranslucentActivityWaiting != null &&
                    mUndrawnActivitiesBelowTopTranslucent.isEmpty()) {
                // Nothing is getting drawn or everything was already visible, don't wait for
                // timeout.
                notifyActivityDrawnLocked(null);
            }
        } finally {
            mTaskSupervisor.endActivityVisibilityUpdate();
        }
    }

final void updateActivityVisibilities(@Nullable ActivityRecord starting, int configChanges,
            boolean preserveWindows, boolean notifyClients) {
        mTaskSupervisor.beginActivityVisibilityUpdate();
        try {
            mEnsureActivitiesVisibleHelper.process(
                    starting, configChanges, preserveWindows, notifyClients);
        } finally {
            mTaskSupervisor.endActivityVisibilityUpdate();
        }
    }
```

进入 `EnsureActivityVisibilities` ：

> *frameworks/base/services/core/java/com/android/server/wm/EnsureActivitiesVisibleHelper.java*

```java
void process(@Nullable ActivityRecord starting, int configChanges, boolean preserveWindows,
            boolean notifyClients) {
        reset(starting, configChanges, preserveWindows, notifyClients);

       ...
        // We should not resume activities that being launched behind because these
        // activities are actually behind other fullscreen activities, but still required
        // to be visible (such as performing Recents animation).
        final boolean resumeTopActivity = mTopRunningActivity != null
                && !mTopRunningActivity.mLaunchTaskBehind
                && mTaskFragment.canBeResumed(starting)
                && (starting == null || !starting.isDescendantOf(mTaskFragment));

        ArrayList<TaskFragment> adjacentTaskFragments = null;
        for (int i = mTaskFragment.mChildren.size() - 1; i >= 0; --i) {
            final WindowContainer child = mTaskFragment.mChildren.get(i);
            final TaskFragment childTaskFragment = child.asTaskFragment();
            if (childTaskFragment != null
                    && childTaskFragment.getTopNonFinishingActivity() != null) {
                childTaskFragment.updateActivityVisibilities(starting, configChanges,
                        preserveWindows, notifyClients);
                ...
            } else if (child.asActivityRecord() != null) {
                setActivityVisibilityState(child.asActivityRecord(), starting, resumeTopActivity);
            }
        }
    }

private void setActivityVisibilityState(ActivityRecord r, ActivityRecord starting,
            final boolean resumeTopActivity) {
        ...

        if (reallyVisible) {
            ...

            if (!r.attachedToProcess()) {
               // 需要关联到具体的进程并启动activity
                makeVisibleAndRestartIfNeeded(mStarting, mConfigChanges, isTop,
                        resumeTopActivity && isTop, r);
            } else if (r.isVisibleRequested()) {
                // If this activity is already visible, then there is nothing to do here.
                ...
            } else {
                r.makeVisibleIfNeeded(mStarting, mNotifyClients);
            }
            // Aggregate current change flags.
            mConfigChanges |= r.configChangeFlags;
        } else {
            ...
            r.makeInvisible();
        }

        ...
    }

private void makeVisibleAndRestartIfNeeded(ActivityRecord starting, int configChanges,
            boolean isTop, boolean andResume, ActivityRecord r) {
        // We need to make sure the app is running if it's the top, or it is just made visible from
        // invisible. If the app is already visible, it must have died while it was visible. In this
        // case, we'll show the dead window but will not restart the app. Otherwise we could end up
        // thrashing.
        if (!isTop && r.isVisibleRequested() && !r.isState(INITIALIZING)) {
            return;
        }

        // This activity needs to be visible, but isn't even running...
        // get it started and resume if no other root task in this root task is resumed.
        ...
        if (r != starting) {
            mTaskFragment.mTaskSupervisor.startSpecificActivity(r, andResume,
                    true /* checkConfig */);
        }
    }
```

看到这里，我们可以大胆猜测 Activity 即使已经存在，但尚未显示，也没有关联到具体的进程。如果顶部没有其他的 Activity，我们可以尝试启动这个 Activity：

> *frameworks/base/services/core/java/com/android/server/wm/ActivityTaskSupervisor.java*

```java
void startSpecificActivity(ActivityRecord r, boolean andResume, boolean checkConfig) {
        // Is this activity's application already running?
        final WindowProcessController wpc =
                mService.getProcessController(r.processName, r.info.applicationInfo.uid);

        boolean knownToBeDead = false;
        if (wpc != null && wpc.hasThread()) {
            try {
                realStartActivityLocked(r, wpc, andResume, checkConfig);
                return;
            } catch (RemoteException e) {
                Slog.w(TAG, "Exception when starting activity "
                        + r.intent.getComponent().flattenToShortString(), e);
            }

            // If a dead object exception was thrown -- fall through to
            // restart the application.
            knownToBeDead = true;
            // Remove the process record so it won't be considered as alive.
            mService.mProcessNames.remove(wpc.mName, wpc.mUid);
            mService.mProcessMap.remove(wpc.getPid());
        }

        r.notifyUnknownVisibilityLaunchedForKeyguardTransition();

        final boolean isTop = andResume && r.isTopRunningActivity();
        mService.startProcessAsync(r, knownToBeDead, isTop,
                isTop ? HostingRecord.HOSTING_TYPE_TOP_ACTIVITY
                        : HostingRecord.HOSTING_TYPE_ACTIVITY);
    }
```

Wonderful！这代码是不是有点熟悉，没错，我们再次回到了这个分叉路口：

- 如果 Activity 的进程已经启动，则直接执行 `realStartActivityLocked` 来启动 Activity；
- 如果 Activity 的进程尚未启动，那么需要先执行 `ActivityTaskManagerService#startProcessAsync` 创建进程。

**只不过这次我们已经拥有了一个正在运行的进程，所以这一次将会执行到 realStartActivityLocked 来启动一个 Activity。**

### 总结

Android 中在 system_server 进程启动 Launcher 进程主要有以下几个步骤：

1. 准备参数信息：AMS 执行 systemReady，接着组装 homeIntent 和 ActivityRecord。
2. 判断是否需要新建进程：如果当前存在进程，则直接启动 Activity，否则先创建和启动进程。
3. 等待创建请求：Zygote 进程会在启动后等待新的应用程序进程的创建请求。
4. 接收创建请求：当有新的应用程序进程的创建请求到达时，Zygote 进程会接收该请求，并根据该请求创建一个新的进程。
5. 复制进程：为了快速创建新的进程，Zygote 进程会通过复制自身进程并清除一些状态来创建一个新的应用程序进程。这个过程是通过使用类似于 Unix 的 fork 系统调用实现的。
6. 初始化应用程序进程：新的应用程序进程会继承 Zygote 进程的一些特性，例如 Java 虚拟机实例、类和资源等。Zygote 进程会对新进程进行一些初始化工作，例如为新进程设置一些系统属性、启动主线程等。
7. 加载应用程序代码：新的应用程序进程会在启动时加载应用程序的代码，并开始执行应用程序的入口函数。
8. 启动 Launcher Activity：当进程和 Application 创建完毕后，如果存在未启动的 Activity，则前往创建执行启动。

关于 Activity 的启动过程将在下一章节来剖析，到时也会附上整个 APP 启动过程关键节点流程图。

### 相关面试题

- 应用进程的孵化过程？
- Android 创建进程时的 USAP 机制是什么？
- 为什么 Android 进程的 `fork()` 会返回两次？
- Android 系统的 Activity Task 管理机制？

### 相关参考

- https://juejin.cn/post/6978743408756162590
- https://blog.csdn.net/zhuzp_blog/article/details/120894309
- https://blog.csdn.net/qq_34512207/article/details/113725772

