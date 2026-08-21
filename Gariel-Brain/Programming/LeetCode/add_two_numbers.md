---
creation date: 2026-08-14
type: leetcode-note
tags:
  - computer-science
  - leetcode
  - linked-list
  - ruby
source_url: "https://leetcode.com/problems/add-two-numbers/"
---

# 📌 LeetCode #2：Add Two Numbers（两数相加）

> **💡 一句话总结 (TL;DR)**：两个按**逆序**存储数字的链表，像小学加法一样**从个位开始逐位相加**，用 `% 10` 写当前位、`/ 10` 传递进位，最后用 **dummy head** 技巧构建结果链表。

---

## 📐 核心架构 / 流程图示 (Architecture & Flow)

```
输入: l1 = [2,4,3] (代表 342), l2 = [5,6,4] (代表 465)

   l1:  2 → 4 → 3        (个位在前：2 是个位，4 是十位，3 是百位)
   l2:  5 → 6 → 4        (5 个位，6 十位，4 百位)

   竖式加法（逆序存储让链表天然对齐"从个位开始"）：

     个位: 2 + 5 + carry(0) = 7  → 写 7,  carry = 0
     十位: 4 + 6 + carry(0) = 10 → 写 0,  carry = 1
     百位: 3 + 4 + carry(1) = 8  → 写 8,  carry = 0

   dummy → 7 → 0 → 8   (返回 dummy.next, 即 807 ✅)
```

---

## 1. 🎯 解决的核心问题 (Why)

- **现实痛点：** 两个超长整数相加——超过 64 位整数上限（`2^63 - 1`）时，语言内置整数类型直接溢出。用链表按位存储，长度只受内存限制。
- **为什么"逆序"存储？** 这是本题最巧的设计：加法从最低位（个位）开始，而链表只能从 head 正向遍历。逆序存储 = 个位在 head = **遍历方向天然匹配计算方向**，不需要反转链表或额外栈。
- **替代成本：** 如果按正常顺序存储（高位在 head），你得先把整个链表反转（O(n)）才能从个位开始加，加完还要反转回来——两次多余遍历。

---

## 2. 🧠 核心机制 (Core Mechanism)

### 2.1 逐位相加 + 进位传播

```ruby
sum = carry          # 先带上一位的进位
sum += l1.val if l1  # l1 还有节点就加上
sum += l2.val if l2  # l2 还有节点就加上

carry = sum / 10            # 进位：14 / 10 = 1
current.next = ListNode.new(sum % 10)  # 当前位：14 % 10 = 4
```

**为什么 `% 10` 和 `/ 10`？** 十进制每一位只保留 0-9（`% 10` 取余数），超过 9 的部分整体进位到下一列（`/ 10` 整除）。`9+9+1=19` → 写 9 进位 1，正好是竖式加法的代码化。

### 2.2 一个循环条件覆盖三种场景

```ruby
while l1 || l2 || carry > 0
```

| 场景 | 例子 | 循环如何兜住 |
|------|------|------------|
| 正常（等长） | 342 + 465 | 两个列表同时走完 |
| **不等长** | 99 + 1 → 100 | `l1` 走完了，`l2` 还在 → `l1.val` 被 `if l1` 跳过后当作 0 继续加 |
| **残留进位（幽灵进位）** | 999 + 1 → 1000 | 两个列表都空，`carry > 0` 让循环多跑一次，多产出一个节点 `[1]` |

> ⚠️ **最常见的 bug 就是忘掉第三个条件 `carry > 0`**：999 + 1 会返回 `[0,0,0]`（999 而不是 1000），因为最高位的进位被吞了。

### 2.3 dummy head —— 消除"第一个节点"特判

```ruby
dummy = ListNode.new(0)   # 哑节点，值无所谓
current = dummy
# ... 循环里统一 current.next = ... ; current = current.next ...
dummy.next                # 跳过哑节点返回真 head
```

**为什么需要它？** 循环里每个新节点都是"`current.next = new_node`"。但第一个节点没有"前一个节点"可挂——如果没有 dummy，就得写 `if result.nil?` 特判。dummy 让**所有节点用同一套代码**，没有分支。这正是 httparty `Basement` 模式的思想：用一个壳对象消除特判。

---

## 3. 📊 复杂度与权衡 (Trade-offs)

| 维度 | 值 | 说明 |
| :--- | :--- | :--- |
| 时间复杂度 | **O(max(m, n))** | 每个节点恰好访问一次，m、n 为两链表长度 |
| 空间复杂度 | **O(max(m, n))** | 结果链表的节点数 = 最长长度 + 可能的 1 个进位节点 |
| 原地？ | 否 | 必须新建结果链表（LeetCode 允许修改输入，但新建更清晰） |

- **优点：** 单次遍历、线性时间，无额外数据结构（不需要反转、不需要栈），代码极短。
- **边界：** 面试中常追问 "如果链表按正序存储怎么办" → 答案是用栈反转顺序，或先反转链表——空间变 O(n)，这正是逆序存储设计的价值所在。

---

## 4. 🛝 Mental Sandbox（边界推演）

- **`[0] + [0]`** → 结果为 `[0]`，不是空链表！两个列表都不空，dummy 后面至少挂一个 0 节点。
- **`[5] + [5]`** → `[0, 1]`：单次相加就触发进位，且进位必须再产出一个节点。
- **`[9,9,9,9,9,9,9,9,9,9] + [1]`** → 连续进位 9 次，最后一位进位产生第 11 个节点——验证 `carry > 0` 兜底。
- **不等长 + 进位同时出现**：`[9,9] + [9]` → `8,0,1`，两种"特殊"叠加，循环条件同时覆盖。
- **负数/空输入？** LeetCode 保证非空且非负——真实场景若允许空链表，需加 nil 检查。

---

## 5. 💻 完整代码（Ruby，含测试）

```ruby
class ListNode
  attr_accessor :val, :next
  def initialize(val = 0, _next = nil)
    @val = val
    @next = _next
  end
end

def add_two_numbers(l1, l2)
  dummy = ListNode.new(0)
  current = dummy
  carry = 0

  while l1 || l2 || carry > 0
    sum = carry
    sum += l1.val if l1
    sum += l2.val if l2
    carry = sum / 10
    current.next = ListNode.new(sum % 10)
    current = current.next
    l1 = l1.next if l1
    l2 = l2.next if l2
  end

  dummy.next
end
```

```ruby
# 测试（本地环境需自建 ListNode，LeetCode 平台自带）
require "minitest/autorun"

def build_list(vals)
  dummy = ListNode.new
  cur = dummy
  vals.each { |v| cur = cur.next = ListNode.new(v) }
  dummy.next
end

def list_to_a(head)
  a = []
  while head
    a << head.val
    head = head.next
  end
  a
end

class TestAddTwoNumbers < Minitest::Test
  def test_basic
    assert_equal [7, 0, 8], list_to_a(add_two_numbers(build_list([2, 4, 3]), build_list([5, 6, 4])))
  end

  def test_uneven_lengths
    assert_equal [0, 0, 1], list_to_a(add_two_numbers(build_list([9, 9]), build_list([1])))
  end

  def test_phantom_carry
    assert_equal [0, 0, 0, 1], list_to_a(add_two_numbers(build_list([9, 9, 9]), build_list([1])))
  end

  def test_single_digits
    assert_equal [0], list_to_a(add_two_numbers(build_list([0]), build_list([0])))
  end

  def test_carry_chain
    assert_equal [0, 1], list_to_a(add_two_numbers(build_list([5]), build_list([5])))
  end
end
```

---

## 6. 💡 记住这一句

> **逆序存储 + dummy head + `%10`/`/10` 进位 = 竖式加法的一行代码版。** 忘了 `carry > 0` 就丢最高位；忘了 dummy 就写特判。链表题先问：遍历方向 = 计算方向吗？

---

## 7. 📚 延伸阅读

- [[Linked-List]] — 链表数据结构完整笔记（Node、prepend/append、设计模式）
- LeetCode #445 Add Two Numbers II（正序版——体会逆序设计的价值）
- LeetCode #206 Reverse Linked List（指针重排基本功）
- httparty 系列笔记中的 `Basement` 模式（dummy head 的"壳对象消除特判"思想同源）
