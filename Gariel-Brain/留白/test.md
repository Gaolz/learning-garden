检查完成。这台 Mac 的情况是：

- 机型：MacBook Pro (13-inch, Early 2015)，识别为 `MacBookPro12,1`
- 系统：macOS 14.8.4（Sonoma），是通过 OpenCore Legacy Patcher 2.4.1 非官方安装的
- 蓝牙：能发现附近的 `iPad (3)`，但当前没有连接
- Wi-Fi：已连接，IP 是 `192.168.4.134`
- 已安装的应用里没有 Duet、Luna、Spacedesk 这类第三方投屏软件
- 当前探测不到可用的 AirPlay/Sidecar 目标

**先说结论**

macOS 菜单里的 “Screen Mirroring” 是 AirPlay 输出，一般用来投到 Apple TV 或支持 AirPlay 的电视/显示器。iPad 默认不能作为 Mac 的 AirPlay 接收端。

如果你想要的是“把 Mac 画面显示到 iPad 上”，正确功能其实是 **Sidecar**，不是 Screen Mirroring。但这台 2015 款 MacBook Pro 不在 Apple 官方 Sidecar 支持机型列表里，所以原生设置里很可能根本没有“添加到 iPad”的选项。

**可以这样试一次**

1. 在 iPad 上确认：设置 → 通用 → 关于本机，确认 iPadOS 是 13 或更高版本。如果它是很老的 iPad 3 代（2012 年款），最高只能到 iOS 9，无法使用 Sidecar。
2. iPad 和 Mac 登录同一个 Apple ID，并开启双重认证。
3. 两边都打开 Wi-Fi 和蓝牙，最好连同一个网络。
4. 在 Mac 上打开：系统设置 → 显示器，看底部有没有 **添加显示器**。
5. 或者点菜单栏右上角 Control Center，再点“显示器”，看列表里有没有 `iPad (3)`。
6. 如果出现了 iPad，选中它；随后在“显示器”设置里可以选“镜像内建视网膜显示器”或“作为单独显示器”。

如果这几步里看不到 iPad，那就是这台 2015 款 Mac 没有解锁 Sidecar，不是设置漏了什么。这台机器是 OCLP 跑起来的 Sonoma，Sidecar 属于 Apple 限制的硬件功能，官方不支持，第三方工具才比较实际。

**反过来也说明一下**

如果你想做的是“把 iPad 画面投到 Mac”，这台机器也不理想：macOS 的 Screen Mirroring App 需要 macOS Sequoia 15 以上，而且 2015 款 Mac 也不在 AirPlay 接收端支持列表里。

目前最可靠的方案是安装第三方显示软件，比如 Duet Display、Luna Display、Air Display 或 Splashtop Wired XDisplay，让 iPad 变成 Mac 的扩展/镜像屏幕。你可以先看一下 iPad 的型号和 iPadOS 版本，再告诉我你实际想要的方向，我可以继续帮你选并配置一个能跑的方案。

