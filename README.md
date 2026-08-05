# 光辉的日记

这是一个使用 GitHub Pages 和 Jekyll 搭建的个人日记网站。

## 写一篇新日记

1. 在 `_posts` 文件夹中新建 Markdown 文件。
2. 文件名使用 `年-月-日-英文标题.md`，例如 `2026-07-15-a-good-day.md`。
3. 复制下面的格式并开始写作：

```markdown
---
title: "日记标题"
date: 2026-07-15 21:00:00 +0800
tags: [日记, 学习]
excerpt: "用一句话概括今天。"
---

今天发生了……

## 今天的感悟

我想到……
```

也可以直接复制 `_drafts/diary-template.md`。写完提交到 GitHub 后，GitHub Pages 会自动更新网站。

> 提醒：这个仓库及网站是公开的，请不要在日记中写入住址、电话号码、账号密码等隐私信息。

## 关闭 VS Code 后自动同步

本仓库配有本地 VS Code 扩展。扩展安装并重新加载窗口后，会在状态栏显示“关闭时自动同步”。以后使用普通方式打开本仓库即可；关闭窗口时，扩展会在后台依次执行：

1. `git add -A`
2. 使用当前时间创建提交
3. `git pull --rebase`
4. `git push`

命令面板中的 `Auto Sync on Close: Sync Now` 可以立即同步，`Auto Sync on Close: Show Log` 可以查看最近一次后台同步日志。

脚本会提交仓库中的所有改动，包括新文件。关闭窗口前请确认没有密码、令牌或其他隐私文件。
