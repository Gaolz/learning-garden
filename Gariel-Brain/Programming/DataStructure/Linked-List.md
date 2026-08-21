---
creation date: 2026-08-14
type: tech-note
tags:
  - computer-science
  - data-structure
  - linked-list
  - ruby
---

# 📌 数据结构：链表 (Linked List)

> **💡 一句话总结 (TL;DR)**：用"节点 + 指针"把数据串成链，换取 **O(1) 的任意位置插入/删除**；代价是**没有 O(1) 随机访问**——想找第 k 个元素，必须从 head 一步步走。

---

## 📐 核心架构 / 流程图示 (Architecture & Flow)

```
单向链表 (Singly Linked List) 的内存视图：

    head ──▶ ┌─────┬──────┐     ┌─────┬──────┐     ┌─────┬──────┐
             │ val │ next │ ──▶ │ val │ next │ ──▶ │ val │ next │ ──▶ nil
             └─────┴──────┘     └─────┴──────┘     └─────┴──────┘
                [A]                [B]                [C]
                 ↑                                    ↑
            头指针（列表唯一入口）              最后一个节点 next = nil

关键事实：
• 列表对象只持有 @head 一个引用
• 节点是"散落"在内存各处的（不连续）——这就是缓存局部性差的根源
• 从 head 到 C 必须依次经过 A、B，无法跳过
```

---

## 1. 🎯 解决的核心问题 (Why)

- **现实痛点：** 数组的插入/删除是 O(n)——在中间插一个元素，后面所有元素都要搬移（shift）。当你的核心操作是"频繁在任意位置插入/删除"，且不需要按下标随机访问时，数组在给不需要的性能买单。
- **替代成本：** 如果只用数组硬扛"高频中间插入"，最坏情况每次插入 O(n)，数据量大时是灾难性的。
- **链表给什么：** 只要**已经持有目标位置的节点**，插入/删除就是 O(1)（改指针即可）。典型场景：LRU 缓存（配合 Hash Map）、文件系统空闲块管理、操作系统的内存分配。

---

## 2. 📊 复杂度与优缺点 (Trade-offs)

| 操作 | 数组 (Array) | 单向链表 (Singly LL) | 说明 |
| :--- | :--- | :--- | :--- |
| 按下标访问 | **O(1)** | O(n) | 链表无索引，必须遍历 |
| 头部插入 | O(n)（全员后移） | **O(1)** | 只需改 head 指针 |
| 尾部插入（无 tail 指针） | O(1) 摊还 | O(n) | 必须走到最后一个节点 |
| 已知节点后插入 | O(n) | **O(1)** | 改两个指针 |
| 内存 | 连续、紧凑、缓存友好 | 分散、每个节点多一个指针开销 | 见下 |

- **优点：**
  - 任意位置插入/删除 O(1)（拿到节点后）
  - 天然支持动态增长，不需要预分配容量
  - 是很多复杂结构的基石：LRU、图邻接表、哈希表链地址法
- **缺点：**
  - **无随机访问**：找第 k 个元素要 O(n) 遍历
  - **缓存局部性差**：节点分散在堆里，遍历时 CPU 缓存命中率低（数组遍历快得多，实际常数差异很大）
  - **指针开销**：每节点多存一个 next 引用（64 位机器上 8 字节），小数据时内存翻倍
  - **易错**：指针重排顺序错了就丢节点（内存泄漏/悬空）

---

## 3. 🧠 核心机制 (Core Mechanism)

### 3.1 Node —— 最小的构建块

```ruby
class Node
  attr_accessor :value, :next   # 为什么是 accessor 而不是 reader？
  def initialize(value)
    @value = value
    @next  = nil                # 新节点默认指向 nil（链尾）
  end
end
```

**为什么 `attr_accessor`？** 链表的本质是"通过引用做修改"：插入时我们要**重定向** `node.next`（写操作）。`attr_reader` 只能读不能写，链表就永远无法被"接上"。

### 3.2 插入的两个方向

**头部插入 O(1) —— 顺序极其重要：**

```ruby
def prepend(value)
  new_node = Node.new(value)
  new_node.next = @head   # ① 先让新节点指向旧 head
  @head = new_node        # ② 再让 head 指向新节点
end
```

> ⚠️ **顺序不能反！** 如果先执行 `@head = new_node`，旧 head 就再也没有引用指向它——节点丢失，永远找不回来了。

**尾部插入 O(n) —— 空表是隐藏的坑：**

```ruby
def append(value)
  new_node = Node.new(value)
  if @head.nil?           # 空表：没有"最后一个节点"可走，直接当 head
    @head = new_node
    return
  end
  current = @head
  current = current.next while current.next   # 走到最后一个节点
  current.next = new_node
end
```

**设计决策：为什么不加 `@tail` 指针让 append 变 O(1)？** 加 tail 后 append 变 O(1)，但代价是引入一个必须处处维护的**不变量**：任何改变链尾的操作（prepend 空表、删除尾节点）都要记得更新 tail。忘一次就是静默的 bug。教科书实现常选择"接受 O(n) append"换简单性——**每一个设计都是"谁维护不变量"的取舍**（想想 httparty 的 `ModuleInheritableAttributes`，同一个问题）。

### 3.3 遍历 —— 链表的"唯一访问方式"

```ruby
def to_a
  result = []
  current = @head
  while current
    result << current.value
    current = current.next   # 沿着 next 指针走
  end
  result
end
```

**Mental Model:** 链表没有"索引"，只有"当前位置"。遍历就是反复执行 `current = current.next`，直到撞上 `nil`。所有 O(n) 操作的代价都来自这里。

---

## 4. 🧩 关键设计模式

| 模式 | 作用 | 类比 |
|------|------|------|
| **dummy head（哑节点）** | 建链时避免"第一个节点特殊化" | httparty 的 `Basement`：一个壳对象消除特判 |
| **快慢指针** | 找中点、判环（Floyd 判圈） | 龟兔赛跑 |
| **哨兵值 / nil 判断** | 空表边界 | 递归的 base case |

---

## 5. 🛝 Mental Sandbox（边界推演）

- **空表插入/删除**：所有操作先问"head 是 nil 吗？"
- **单节点表删除**：删除后 head 要变 nil，不能留悬空引用
- **删除中间节点需要"前驱"**：单向链表无法回头，必须边走边记住 prev —— 这是单向链表删除天然比双向链表麻烦的原因
- **`while current` vs `while current.next`**：前者能处理最后一个节点，后者停在最后一个节点——选错就漏掉尾节点
- **指针重排顺序**：先接新指针，再断旧指针（先 `new.next = old`，再 `head = new`）

---

## 6. 💻 应用实战：LeetCode #2 Add Two Numbers

> 完整笔记见 [[add_two_numbers]]。核心复用：**dummy head + 尾插 + 进位传播**。

```ruby
def add_two_numbers(l1, l2)
  dummy = ListNode.new(0)   # 哑节点：消除"第一个节点"特判
  current = dummy
  carry = 0

  while l1 || l2 || carry > 0   # 一个条件覆盖三种情况：等长/不等长/残留进位
    sum = carry
    sum += l1.val if l1         # 列表走完了就当 0（不对称场景）
    sum += l2.val if l2
    carry = sum / 10
    current.next = ListNode.new(sum % 10)
    current = current.next
    l1 = l1.next if l1
    l2 = l2.next if l2
  end

  dummy.next                    # 跳过哑节点，返回真正的 head
end
```

---

## 7. 💡 记住这一句

> **链表 = 用"指针重排"换 "O(1) 插入删除"；用"遍历"付 "O(n) 访问"的代价。** 写链表代码时永远问自己三个问题：① 空表怎么办？② 指针重排顺序对吗？③ 我维护的不变量（head/tail）有没有被破坏？

---

## 8. 📚 延伸阅读

- LeetCode #206 Reverse Linked List（指针重排练习）
- LeetCode #141 Linked List Cycle（快慢指针）
- LeetCode #146 LRU Cache（链表 + Hash Map 的工业级组合）
- [Visualgo — Linked List 可视化](https://visualgo.net/en/list)
