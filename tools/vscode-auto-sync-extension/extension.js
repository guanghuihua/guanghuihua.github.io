'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const vscode = require('vscode');

let runtime = { enabled: false, repoRoot: undefined };
let outputChannel;

function findRepositoryRoot() {
  const folders = vscode.workspace.workspaceFolders || [];
  return folders
    .map((folder) => folder.uri.fsPath)
    .find((folderPath) => fs.existsSync(path.join(folderPath, '.git')));
}

function refreshRuntime() {
  const repoRoot = findRepositoryRoot();
  if (!repoRoot) {
    runtime = { enabled: false, repoRoot: undefined };
    return;
  }

  const configuration = vscode.workspace.getConfiguration(
    'guanghuiAutoSync',
    vscode.Uri.file(repoRoot)
  );
  runtime = {
    enabled: configuration.get('enabled', false),
    repoRoot
  };
}

function getSyncScript(repoRoot) {
  return path.join(repoRoot, 'scripts', 'vscode-auto-sync.sh');
}

function appendLog(logPath, message) {
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
}

function startDetachedSync() {
  const { enabled, repoRoot } = runtime;
  if (!enabled || !repoRoot) {
    return;
  }

  const scriptPath = getSyncScript(repoRoot);
  if (!fs.existsSync(scriptPath)) {
    return;
  }

  const logPath = path.join(repoRoot, '.git', 'vscode-auto-sync.log');
  let logDescriptor;

  try {
    appendLog(logPath, 'VS Code 正在关闭，启动后台自动同步。');
    logDescriptor = fs.openSync(logPath, 'a');
    const child = childProcess.spawn(
      '/usr/bin/env',
      ['bash', scriptPath, '--sync-only'],
      {
        cwd: repoRoot,
        detached: true,
        env: process.env,
        stdio: ['ignore', logDescriptor, logDescriptor]
      }
    );
    child.unref();
  } catch (error) {
    try {
      appendLog(logPath, `无法启动后台同步：${error.message}`);
    } catch (_) {
      // VS Code 正在退出，此处不能再显示错误。
    }
  } finally {
    if (logDescriptor !== undefined) {
      fs.closeSync(logDescriptor);
    }
  }
}

function runSyncNow() {
  refreshRuntime();
  const { enabled, repoRoot } = runtime;
  if (!enabled || !repoRoot) {
    vscode.window.showWarningMessage('当前工作区没有启用关闭时自动同步。');
    return;
  }

  const scriptPath = getSyncScript(repoRoot);
  if (!fs.existsSync(scriptPath)) {
    vscode.window.showErrorMessage(`找不到同步脚本：${scriptPath}`);
    return;
  }

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine('开始同步……');

  const child = childProcess.spawn('bash', [scriptPath, '--sync-only'], {
    cwd: repoRoot,
    env: process.env
  });

  child.stdout.on('data', (data) => outputChannel.append(data.toString()));
  child.stderr.on('data', (data) => outputChannel.append(data.toString()));
  child.on('error', (error) => {
    outputChannel.appendLine(`无法启动同步：${error.message}`);
  });
  child.on('close', (code) => {
    const message = code === 0 ? '同步完成。' : `同步失败，退出码：${code}`;
    outputChannel.appendLine(message);
    if (code === 0) {
      vscode.window.showInformationMessage(message);
    } else {
      vscode.window.showErrorMessage(`${message} 请查看 Auto Sync on Close 输出。`);
    }
  });
}

function activate(context) {
  outputChannel = vscode.window.createOutputChannel('Auto Sync on Close');
  refreshRuntime();

  const statusItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10
  );
  statusItem.command = 'guanghuiAutoSync.syncNow';
  statusItem.text = '$(sync) 关闭时自动同步';
  statusItem.tooltip = '点击立即同步；关闭窗口时也会自动同步。';
  if (runtime.enabled) {
    statusItem.show();
  }

  context.subscriptions.push(
    outputChannel,
    statusItem,
    vscode.commands.registerCommand('guanghuiAutoSync.syncNow', runSyncNow),
    vscode.commands.registerCommand('guanghuiAutoSync.showLog', () => {
      const repoRoot = runtime.repoRoot;
      if (!repoRoot) {
        vscode.window.showWarningMessage('当前窗口没有 Git 工作区。');
        return;
      }
      const logPath = path.join(repoRoot, '.git', 'vscode-auto-sync.log');
      vscode.workspace.openTextDocument(logPath).then(
        (document) => vscode.window.showTextDocument(document),
        () => vscode.window.showInformationMessage('尚未生成自动同步日志。')
      );
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('guanghuiAutoSync.enabled')) {
        return;
      }
      refreshRuntime();
      if (runtime.enabled) {
        statusItem.show();
      } else {
        statusItem.hide();
      }
    })
  );
}

function deactivate() {
  startDetachedSync();
}

module.exports = { activate, deactivate };
