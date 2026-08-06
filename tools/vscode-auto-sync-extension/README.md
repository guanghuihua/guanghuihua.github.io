# Guanghui Auto Sync on Close

这个本地 VS Code 扩展仅在工作区设置了以下选项时启用：

```json
{
  "guanghuiAutoSync.enabled": true
}
```

扩展启动后会在状态栏显示“关闭时自动同步”。关闭窗口或停用扩展时，它会启动独立后台进程并调用仓库中的：

```bash
scripts/vscode-auto-sync.sh --sync-only
```

命令面板还提供：

- `Auto Sync on Close: Sync Now`
- `Auto Sync on Close: Show Log`

同步日志保存在仓库的 `.git/vscode-auto-sync.log`，不会被提交。
