---
layout: post
title: "关于 StateFlow 使用的一次车祸现场"
date: 2021-08-08 15:40:21
author:     "Dorck"
catalog: false
header-style: text
tags: 
- Kotlin
- 协程
- 集合
- Java
categories: Android
---



最近了解了一下 Kotlin 中的协程，这两天得闲就想着把 Flow 拿来练练手，没想到车祸现场立马就来了。

关于[流](https://developer.android.google.cn/kotlin/flow/stateflow-and-sharedflow)的概念官方说的也比较多，提供了很多参考文章，此处就不细说了，直奔主题。在 Android 里，考虑到生命周期和之前 LiveData 的兼容性，官方推出了 StateFlow 来供我们使用。于是，就有了下面这一段代码：

```kotlin
class GoodsListViewModel: ViewModel() {
    private val _goodList = MutableStateFlow<List<SimplePostItem>>(emptyList())

    val goodList: StateFlow<List<SimplePostItem>> = _goodList

    private val repository: GoodListRepository = GoodListRepository()

    init {
        viewModelScope.launch {
            repository.fetchGoodList().collect {
                _goodList.emit(it)
            }
        }
    }

    fun onGoodTypeChange(id: String, type: String) {
        val updateList = _goodList.value.toMutableList()
        updateList.find { id == it.id }?.let {
            it.type = type
        }
        _goodList.value = updateList
    }
}
```

为了方便大家理解，这里简化了原本的代码。可以看到，我们有一个商品列表数据来自云端或本地数据库，属于异步操作。然而，我们也需要有修改 UI 层数据源的场景，考虑到“数据驱动UI”的理念，这里需要对外暴露一个方法提供修改数据的能力，所以，我们声明了一个 **MutableStateFlow** 类型的数据流，方便对数据直接进行获取并修改。UI 层的使用也很简单，这里仅贴一下代码方便前后联想：

```kotlin
class GoodsListActivity : AbsDataTrackActivity() {
    private val viewModel: GoodsListViewModel by viewModels()
    private val mAdapter: SimpleListAdapter by lazy {
        SimpleListAdapter()
    }
   
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_goods_list)
        initView()
        lifecycleScope.launchWhenStarted {
            viewModel.goodIList.collect {
                Log.w(TAG, "refresh good list: $it")
                mAdapter.loadData(it)
            }
        }
    }

    private fun initView() {
        val recyclerView = findViewById<RecyclerView>(R.id.goodsRecyclerView)
        recyclerView.layoutManager = GridLayoutManager(this, 2)
        recyclerView.adapter = mAdapter
        mAdapter.bindItemClickListener {
            val newType = obtainEntityType()
            viewModel.onGoodChange(it.id, newType)
        }
    }
```

交互流程为：进入商品列表并点击某一个商品修改它的商品类型，然后刷新列表。没错，功能很简单，但是实际运行会发现列表并没有成功被刷新。明眼人想必也已经看出问题所在了，没错，问题就出在 **GoodsListViewModel** 的 `onGoodTypeChange` 方法里。在此之前先简单说一下 StateFlow 中的数据订阅的去重机制：StateFlow 会自动针对重复数据不做任何处理，至于判断的机制还是依赖于 **Any?.equals()** 方法。`SimplePostItem` 作为一个数据类(data class)，系统会默认为其生成 equals、toString 等方法的实现，内部通过 `Instrinsics.areEqual` 方法来判断**值相等性**，可以理解为等同于 `Any?.equals`。

回到一开始的话题，既然列表没有刷新，说明 StateFlow 认为新数据与老数据**内容**完全一致，没有发生变化。如此一想，出问题的点只能在 List 的 `toMutableList` 方法中了，我们进去看一下内部实现：

```kotlin
/**
 * Returns a new [MutableList] filled with all elements of this collection.
 */
public fun <T> Collection<T>.toMutableList(): MutableList<T> {
    return ArrayList(this)
}
```

可以看到，kotlin 实现里面返回了一个新的 ArrayList，再进去看下 ArrayList 的实现：

```kotlin
expect class ArrayList<E> : MutableList<E>, RandomAccess {
    constructor()
    constructor(initialCapacity: Int)
    constructor(elements: Collection<E>)

    fun trimToSize()
    fun ensureCapacity(minCapacity: Int)
    ......
}
```

发现里面已经空空如也了，只有一层接口，实际上它们真正的实现在 Java 层。Kotlin 定义一些集合类作为集合的通用层（使用 expect 定义预期声明），并将现有的 Java 集合类的别名作为实际声明，从而实现在 JVM 上直接使用Java的集合类。所以，我们直接去 Java 的 ArrayList 类中看一下：

```java
public class ArrayList<E> extends AbstractList<E> implements List<E>, RandomAccess, Cloneable, Serializable {
    public ArrayList(int var1) {
        if (var1 > 0) {
            this.elementData = new Object[var1];
        } else {
            if (var1 != 0) {
                throw new IllegalArgumentException("Illegal Capacity: " + var1);
            }

            this.elementData = EMPTY_ELEMENTDATA;
        }

    }

    public ArrayList() {
        this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
    }

    public ArrayList(Collection<? extends E> var1) {
        this.elementData = var1.toArray();
        if ((this.size = this.elementData.length) != 0) {
            if (this.elementData.getClass() != Object[].class) {
                this.elementData = Arrays.copyOf(this.elementData, this.size, Object[].class);
            }
        } else {
            this.elementData = EMPTY_ELEMENTDATA;
        }

    }
}
```

终于，我们找到了最终的“幕后人”，真正的实现是在 **`Arrays.copyOf()`** 方法里面，这方法很显然是**浅拷贝**，只是将对象的映射地址从一个容器转移到另一个而已，实际上对象并未发生任何改变。所以，不论我们如何更改集合中的数据，另外一个集合对应的“那个数据”也会一并同步，因为它们是同一个引用。

那么，问题原因我们找到了，应该如何解决呢？如果我们只是希望传递给 StateFlow 的新数据是一个全新的集合，不和老数据有任何关联，那么我们可以借助于**深拷贝**实现数据变更：

```kotlin
fun onGoodChange(id: String, type: String) {
    val updateList = deepCopyList(_goodList.value).toMutableList()
    updateList.find { id == it.id }?.let {
        it.type = type
    }
    _goodList.value = updateList
}

private fun deepCopyList(source: List<SimplePostItem>): List<SimplePostItem> {
    val outputList = mutableListOf<SimplePostItem>()
    source.forEach {
        outputList.add(it.copy())
    }
    return outputList
}
```

如此一来，商品列表未刷新的问题就迎刃而解了。开发过程中还是要一步步脚踏实地，问题虽简单，但如果不立足于水手的身份去征服船帆，那么再微不足道的海浪都有可能推翻这最后的“海上乐园”。



> 古今多少事，都付笑谈中。