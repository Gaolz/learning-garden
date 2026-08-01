---
tags: [computer-science, algorithm, search, ruby, rust]
---
# 每日算法：二分查找 (Binary Search)

> **一句话总结：** 每次猜中间，不对就砍掉一半——像翻字典一样，你从不逐页翻，而是直接翻到中间，看目标词在前半本还是后半本。

---

### 1. 🎯 解决的核心问题

- **现实痛点：** 在 100 万条已排序的用户记录里找一条。线性扫描最坏要 100 万次比较；二分查找只需约 20 次。
- **应用场景：**
  - 数据库 B+Tree 索引的页内查找
  - `git bisect` 定位引入 bug 的 commit（在 commit 历史中二分）
  - 操作系统内存分配器查找合适的空闲块（buddy system）
  - 标准库：Ruby 的 `Array#bsearch`，Rust 的 `slice::binary_search`

---

### 2. 📊 复杂度与优缺点

| 维度 | 指标 / 特性 | 补充说明 |
| :--- | :--- | :--- |
| **时间复杂度（平均）** | $O(\log n)$ | 每次比较后搜索空间减半 |
| **时间复杂度（最坏）** | $O(\log n)$ | 即使目标不存在，也是对数级 |
| **空间复杂度** | $O(1)$ | 迭代版只维护三个指针，原地操作 |
| **稳定性** | N/A | 查找算法不涉及元素交换，此概念不适用 |

- **优点：**
  - 对数级复杂度，数据量越大优势越明显
  - 实现简单，边界清晰（虽然容易写错）
  - 思想可迁移：不只是数组，任何"单调性"的问题都能二分
- **缺点：**
  - 要求数据**有序**，排序本身的成本可能更高
  - 必须支持**随机访问**——链表等数据结构不适用
  - 重复元素场景需明确变体（找第一个 / 找最后一个 / 找插入位置）

---

### 3. 🎨 算法示意图 (Diagram)

> 在有序数组 `[2, 5, 8, 12, 16, 23, 38, 56, 72, 91]` 中查找 `target = 23`

```
初始状态:     left = 0, right = 9
              ┌──────────────────────────────────────────────┐
              │ 2   5   8   12  16  23  38  56  72  91 │
              └──────────────────────────────────────────────┘
              ▲                   ▲                        ▲
             left              mid=4                     right

Step 1:  arr[4] = 16 < 23 → 目标在右边，left = mid + 1 = 5
              ┌──────────────────────────────────────────────┐
              │ ·   ·   ·   ·   ·  │ 23  38  56  72  91 │
              └──────────────────────────────────────────────┘
                                   ▲        ▲            ▲
                                  left    mid=7        right

Step 2:  arr[7] = 56 > 23 → 目标在左边，right = mid - 1 = 6
              ┌──────────────────────────────────────────────┐
              │ ·   ·   ·   ·   ·  │ 23  38 │ ·   ·   ·  │
              └──────────────────────────────────────────────┘
                                   ▲  ▲
                                left  right
                                  mid=5

Step 3:  arr[5] = 23 == target → 找到！返回索引 5 ✅
```

**逻辑推演步骤：**
1. **Step 1:** 初始化 `left = 0`，`right = len - 1`，循环条件 `left <= right`
2. **Step 2:** 计算 `mid = left + (right - left) / 2`（防溢出），拿到中间值
3. **Step 3:** 中间值与目标比较——等于则返回；小于则往右半边缩（`left = mid + 1`）；大于则往左半边缩（`right = mid - 1`）
4. **Step 4:** 循环结束未返回 → 目标不存在，返回 `-1` 或 `Err`

---

### 4. 💻 代码实现 (Ruby & Rust)

#### 💎 Ruby 实现（注重表达力与优雅）

```ruby
# ============================================================
# 方式一：标准库一行流（实际生产中首选）
# ============================================================
arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
arr.bsearch { |x| x >= 23 }  # => 23 （find-minimum 模式）
arr.bsearch_index { |x| x >= 23 }  # => 5

# ============================================================
# 方式二：手写迭代版（经典教学版）
# ============================================================
def binary_search(arr, target)
  left = 0
  right = arr.length - 1

  while left <= right                        # 注意是 <=，不是 <
    mid = left + (right - left) / 2          # 防整数溢出

    if arr[mid] == target
      return mid                             # 命中，直接返回索引
    elsif arr[mid] < target
      left = mid + 1                         # 目标在右边，收缩左边界
    else
      right = mid - 1                        # 目标在左边，收缩右边界
    end
  end

  nil  # Ruby 惯例：找不到返回 nil 而非 -1
end

# ============================================================
# 方式三：递归版（Ruby 的优雅表达能力）
# ============================================================
def binary_search_rec(arr, target, left = 0, right = arr.length - 1)
  return nil if left > right                 # 递归基：搜索区间为空

  mid = left + (right - left) / 2

  case arr[mid] <=> target                   # Ruby 宇宙飞船操作符
  when 0  then mid
  when -1 then binary_search_rec(arr, target, mid + 1, right)
  when 1  then binary_search_rec(arr, target, left, mid - 1)
  end
end

# ============================================================
# 变体：查找"第一个 >= target"的位置（lower_bound）
# ============================================================
def lower_bound(arr, target)
  left, right = 0, arr.length  # 注意 right 初始化为 length，不是 length-1

  while left < right
    mid = left + (right - left) / 2
    if arr[mid] < target
      left = mid + 1
    else
      right = mid               # 不收缩，保留可能为目标的位置
    end
  end

  left  # 返回插入点
end
```

#### 🦀 Rust 实现（注重所有权、类型安全与内存效率)

```rust
/// 经典二分查找，返回 `Result<usize, usize>` ——
/// Ok(idx) 表示找到，Err(idx) 表示应插入的位置（保持有序）
fn binary_search<T: Ord>(arr: &[T], target: &T) -> Result<usize, usize> {
    let mut left = 0;
    let mut right = arr.len(); // 半开区间 [left, right)，和标准库一致

    while left < right {
        let mid = left + (right - left) / 2;

        match arr[mid].cmp(target) {
            std::cmp::Ordering::Equal   => return Ok(mid),
            std::cmp::Ordering::Less    => left = mid + 1,
            std::cmp::Ordering::Greater => right = mid,
        }
    }

    Err(left) // 没找到，返回插入位置
}

/// 查找第一个等于 target 的索引（处理重复元素）
fn lower_bound<T: Ord>(arr: &[T], target: &T) -> usize {
    let mut left = 0;
    let mut right = arr.len();

    while left < right {
        let mid = left + (right - left) / 2;
        if &arr[mid] < target {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    left
}

/// 查找最后一个等于 target 的索引（处理重复元素）
fn upper_bound<T: Ord>(arr: &[T], target: &T) -> usize {
    let mut left = 0;
    let mut right = arr.len();

    while left < right {
        let mid = left + (right - left) / 2;
        if &arr[mid] <= target {
            left = mid + 1;
        } else {
            right = mid;
        }
    }

    left // 指向第一个 > target 的位置，即最后一个等于 target 的位置 + 1
}

/// 在有序 slice 上查找目标值存在的区间 [lower, upper)
fn equal_range<T: Ord>(arr: &[T], target: &T) -> std::ops::Range<usize> {
    lower_bound(arr, target)..upper_bound(arr, target)
}

fn main() {
    let arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];

    // 标准库一行搞定
    assert_eq!(arr.binary_search(&23), Ok(5));
    assert_eq!(arr.binary_search(&42), Err(7)); // 插入位置 7

    // 手写版
    assert_eq!(binary_search(&arr, &23), Ok(5));
    assert_eq!(binary_search(&arr, &42), Err(7));

    // 重复元素查找
    let dup = [1, 2, 2, 2, 3, 4];
    assert_eq!(equal_range(&dup, &2), 1..4); // 三个 2 在索引 1,2,3
}
```

#### 🔬 Rust `Result` 内存结构图解

`Result<usize, usize>` 是枚举，`Ok(5)` 和 `Err(7)` 在内存中长这样：

```
定义:  enum Result<T, E> { Ok(T), Err(E) }
类型:  Result<usize, usize>
平台:  64-bit

内存布局（每个 usize 占 8 字节）：

                            discriminant (8B)     payload (8B)
                            ──────────────       ────────────
   Ok(5)   →    [          0           ][             5       ]
                └─ 0 = "我是 Ok 变体"    └─ 成功时携带的索引值

   Err(7)  →    [          1           ][             7       ]
                └─ 1 = "我是 Err 变体"    └─ 失败时携带的插入位置


对比其他语言的做法：
                                                   ┌─ "5 本身就是结果"
  Ruby:    返回 5  或  nil                          │
           返回 -1 或  3  (C 风格)                 │   └─ 需要额外约定区分"索引0"
                                                   │      和"没找到"，容易出 bug
  ─────────────────────────────────────────────────│──────────────────────────────
  Rust:    Ok(5)     Err(7)                        │   一眼区分"找到/未找到"
           └─ T:5     └─ E:7                       │   compiler 强制处理所有分支
                                                   │

调用方视角（必须用 match 拆封）：

         arr.binary_search(&23) ──→ Ok(5)
                                        │
        match result {                  ▼
            Ok(idx)  → println!("找到！索引是 {idx}"),  // idx = 5
            Err(pos) → println!("不在，应插入位置 {pos}"), // 不执行
        }

         arr.binary_search(&42) ──→ Err(7)
                                        │
        match result {                  ▼
            Ok(idx)  → println!("找到！索引是 {idx}"),   // 不执行
            Err(pos) → println!("不在，应插入位置 {pos}"), // pos = 7
        }
```

关键点：
- `discriminant` 是编译器自动插入的标签，区分当前是哪个变体，对程序员透明。
- `payload` 只存当前变体的值，`Ok` 不占用 `E` 的空间，`Err` 不占用 `T` 的空间。
- `match` 同时拆解 discriminant + payload，编译器静态保证你不会漏掉 `Err` 分支。

---

### 5. 💡 Ruby vs Rust 编程体会

**Ruby 视角的思考：**
Ruby 的 `Array#bsearch` 和 `#bsearch_index` 让二分查找变成一行代码。手写时，Ruby 的灵活区间语法和 `<=>`（宇宙飞船操作符）配合 `case/when` 让比较逻辑一目了然。递归版尤其适合展示分治思想的本质——代码几乎就是伪代码的直接翻译。Ruby 倾向于返回 `nil` 而非 `-1`，这是 Ruby"一切皆对象"哲学的自然延伸：用类型（NilClass vs Integer）区分"没找到"和"找到索引 0"，避免魔法数字。

**Rust 视角的思考：**
Rust 的 `binary_search` 返回 `Result<usize, usize>` ——这是个极好的 API 设计。`Ok` 是找到的索引，`Err` 是插入位置，一个返回类型同时回答了"在不在"和"该插哪"两个问题，避免了两次查找或额外状态。泛型约束 `T: Ord` 在编译期保证只有可比较的类型才能二分。`&[T]` 切片参数不获取所有权，调用者可以继续使用原数组。Rust 让你明确区间语义——是 `[left, right]` 闭区间还是 `[left, right)` 半开区间——这个选择直接影响循环条件和指针更新逻辑。

**思维范式碰撞：**
Ruby 关心的是"算法怎么想"——用最接近人类思考的方式表达分治过程。Rust 关心的是"算法怎么跑"——每一步的区间语义、所有权和溢出保护都必须滴水不漏。Ruby 让你 3 分钟写出能跑的二分；Rust 让你在编译期就把所有边界条件想清楚——而这才真正学会了二分查找。
