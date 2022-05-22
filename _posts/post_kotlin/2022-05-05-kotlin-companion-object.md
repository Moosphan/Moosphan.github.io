---
layout: post
title: "揭开 Kotlin 中的 companion object 的奥秘"
date: 2022-05-05 20:30:10
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Kotlin
categories: Kotlin
---

Kotlin 中有个所谓的伴生对象（companion object），一般使用过程中我们会将它作为 Java 静态成员使用方式的替代品：

```kotlin
class LoginActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
    }
    
    companion object {
        fun startLogin(context: Context, args: Bundle?) {
            val intent = Intent(context, LoginActivity::class.java).apply { 
                args?.let { 
                    putExtras(it)
                }
            }
            context.startActivity(intent)
        }
    }
}
```

接下来，我们来通过 Android studio 的 Tools -> kotlin -> show kotlin bytecodes 并查看反编译后的Java代码：

```java
public final class LoginActivity extends AppCompatActivity {
   @NotNull
   public static final LoginActivity.Companion Companion = new LoginActivity.Companion((DefaultConstructorMarker)null);
   private HashMap _$_findViewCache;

   protected void onCreate(@Nullable Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
      this.setContentView(1300025);
   }

   public View _$_findCachedViewById(int var1) {
      if (this._$_findViewCache == null) {
         this._$_findViewCache = new HashMap();
      }

      View var2 = (View)this._$_findViewCache.get(var1);
      if (var2 == null) {
         var2 = this.findViewById(var1);
         this._$_findViewCache.put(var1, var2);
      }

      return var2;
   }

   public void _$_clearFindViewByIdCache() {
      if (this._$_findViewCache != null) {
         this._$_findViewCache.clear();
      }

   }

  
   public static final class Companion {
      public final void startLogin(@NotNull Context context, @Nullable Bundle args) {
         Intrinsics.checkNotNullParameter(context, "context");
         Intent var4 = new Intent(context, LoginActivity.class);
         int var6 = false;
         if (args != null) {
            int var9 = false;
            var4.putExtras(args);
         }

         context.startActivity(var4);
      }

      private Companion() {
      }

      // $FF: synthetic method
      public Companion(DefaultConstructorMarker $constructor_marker) {
         this();
      }
   }
}
```

通过查看源码发现：伴生对象无非是在目标类中额外创建了一个 Companion 的静态内部类，而调用 `startLogin(Context,Bundle)` 实际上是调用：

```java
LoginActivity.Companion.startLogin((Context)this, (Bundle)null);
```

这么看倒是有点委托机制的意思，实际上外部类中调用 startLogin 是通过 `LoginActivity` 的静态内部类 `Companion` 来真正实现的。那么问题来了：上面这种 Java 中调用方式对于代码的可读性还是降低很多，一般我们希望通过 `LoginActivity.startLogin` 静态方法的方式来访问，那么可以给它加上以下注解：

```kotlin
companion object {
				@JvmStatic
        fun startLogin(context: Context, args: Bundle?) {
            val intent = Intent(context, LoginActivity::class.java).apply { 
                args?.let { 
                    putExtras(it)
                }
            }
            context.startActivity(intent)
        }
    }
```

再次反编译看下 Java 代码：

```java
public final class LoginActivity extends AppCompatActivity {
   @NotNull
   public static final LoginActivity.Companion Companion = new LoginActivity.Companion((DefaultConstructorMarker)null);
   ...

   @JvmStatic
   public static final void startLogin(@NotNull Context context, @Nullable Bundle args) {
      Companion.startLogin(context, args);
   }

   public static final class Companion {
      @JvmStatic
      public final void startLogin(@NotNull Context context, @Nullable Bundle args) {
         Intrinsics.checkNotNullParameter(context, "context");
         Intent var4 = new Intent(context, LoginActivity.class);
         int var6 = false;
         if (args != null) {
            int var9 = false;
            var4.putExtras(args);
         }

         context.startActivity(var4);
      }

      private Companion() {
      }

      // $FF: synthetic method
      public Companion(DefaultConstructorMarker $constructor_marker) {
         this();
      }
   }
}

```

可以发现，加上 `@JvmStatic` 注解后 `LoginActivity` 才真正生成了静态方法，外部可以直接通过 `LoginActivity.startLogin` 来访问，而其内部实现也是委托给静态内部类 `Companion` 来完成的。看到这里，我们就摸清了 companion object 内部的奥秘了，索性一不做二不休，来顺便看下 `object` 关键字修饰的类做了些什么吧。

```kotlin
object TrackConstant {
    const val KEY_PAGE_NAME = "page_name"
    const val KEY_AREA_NAME = "area_name"
    const val KEY_POST_ID = "post_id"
    const val KEY_POST_TYPE = "post_type"

    val COMMON_HIRED_MAPPING = mapOf<String, String>(
        KEY_PAGE_NAME to "from_Page",
        KEY_AREA_NAME to "from_area"
    )
}
```

反编译成 Java 代码看下：

```java
public final class TrackConstant {
   @NotNull
   public static final String KEY_PAGE_NAME = "page_name";
   @NotNull
   public static final String KEY_AREA_NAME = "area_name";
   @NotNull
   public static final String KEY_POST_ID = "post_id";
   @NotNull
   public static final String KEY_POST_TYPE = "post_type";
   @NotNull
   private static final Map COMMON_HIRED_MAPPING;
   @NotNull
   public static final TrackConstant INSTANCE;

   @NotNull
   public final Map getCOMMON_HIRED_MAPPING() {
      return COMMON_HIRED_MAPPING;
   }

   private TrackConstant() {
   }

   static {
      TrackConstant var0 = new TrackConstant();
      INSTANCE = var0;
      COMMON_HIRED_MAPPING = MapsKt.mapOf(new Pair[]{TuplesKt.to("page_name", "from_Page"), TuplesKt.to("area_name", "from_area")});
   }
}
```

原来如此，这分明就是一个饿汉式单例类嘛，所以平时一些需要 App 生命周期内维护的一些属性、操作等都可以在这里面完成，但也要切忌滥用，否则会出现很多内存泄漏的事故。