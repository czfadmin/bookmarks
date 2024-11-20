import {
  EventEmitter,
  Uri,
  WorkspaceFoldersChangeEvent,
  workspace,
} from 'vscode';
import fs from 'node:fs';
import {ServiceManager} from './ServiceManager';
import {registerExtensionCustomContextByKey} from '../context';
import {
  EXTENSION_NAME,
  EXTENSION_STORE_FILE_NAME,
  EXTENSION_STORE_PATH,
} from '../constants';
import {BaseService} from './BaseService';

export default class WorkspaceService extends BaseService {
  private _onDidChangeWorkspaceFoldersEvent =
    new EventEmitter<WorkspaceFoldersChangeEvent>();

  onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFoldersEvent.event;

  constructor(sm: ServiceManager) {
    super(WorkspaceService.name, sm);

    this._restoreContextKey();
    const {alwaysIgnore} = this.sm.configure.configure;
    if (alwaysIgnore) {
      this._addToGitIgnore();
    }

    // 当工作区间的文件夹发生改变时, 监听文件夹中的文件是否为git仓库, 并根据配置的`alwaysAddToGitIngoreFile`,将`bookmark-manager.json`添加到.gitignore 文件中
    workspace.onDidChangeWorkspaceFolders(async ev => {
      this._restoreContextKey();
      if (ev.added) {
        if (!alwaysIgnore) {
          return;
        }
        this._addToGitIgnore();
      }

      this._onDidChangeWorkspaceFoldersEvent.fire(ev);
    });

    this.sm.configService.onDidChangeConfiguration(ev => {
      if (ev.affectsConfiguration(`${EXTENSION_NAME}.alwaysIgnore`)) {
        const {alwaysIgnore} = this.sm.configure.configure;
        if (alwaysIgnore) {
          this._addToGitIgnore();
        }
      }
    });
  }

  /**
   *
   *  向`.gitignore` 中追加的 `bookmark-manager.json`(如果不存在)
   */
  private _addToGitIgnore() {
    const folders = workspace.workspaceFolders || [];
    if (!folders.length) {
      return;
    }
    for (let ws of folders) {
      try {
        let existed = fs.existsSync(Uri.joinPath(ws.uri, '.git').fsPath);

        const ignoreFilePath = Uri.joinPath(ws.uri, '.gitignore').fsPath;

        existed = fs.existsSync(ignoreFilePath);

        if (!existed) {
          continue;
        }

        // 当`bookmark-manger.json`文件存在的时候进行后续步骤,避免多余无意义追加到`.gitignore`过程
        existed = fs.existsSync(
          Uri.joinPath(ws.uri, EXTENSION_STORE_PATH).fsPath,
        );

        if (!existed) {
          continue;
        }

        const content = fs.readFileSync(ignoreFilePath, 'utf-8');
        if (content && !content.includes(EXTENSION_STORE_FILE_NAME)) {
          fs.writeFileSync(
            ignoreFilePath,
            `${content}\n${EXTENSION_STORE_FILE_NAME}`,
          );
        }
      } catch (error) {}
    }
  }

  /**
   * 将`.gitignore` 中的 `bookmark-manager.json`的移除掉(如果存在)
   * @returns
   */
  private _removeFromGitIgnore() {
    const folders = workspace.workspaceFolders || [];
    if (!folders.length) {
      return;
    }
    for (let ws of folders) {
      try {
        let existed = fs.existsSync(Uri.joinPath(ws.uri, '.git').fsPath);

        const ignoreFilePath = Uri.joinPath(ws.uri, '.gitignore');

        if (!existed) {
          continue;
        }

        existed = fs.existsSync(ignoreFilePath.fsPath);

        if (!existed) {
          continue;
        }

        let content = fs.readFileSync(ignoreFilePath.fsPath, 'utf-8');
        if (content && content.includes(EXTENSION_STORE_FILE_NAME)) {
          content = content.replace(EXTENSION_STORE_FILE_NAME, '');
          fs.writeFileSync(ignoreFilePath.fsPath, content);
        }
      } catch (error) {}
    }
  }

  /**
   * 处理上下文自定义键
   */
  private _restoreContextKey() {
    // 当时多个工作区间的话, 设置自定义`multiRootWorkspaces`上下文为True
    registerExtensionCustomContextByKey(
      'multiRootWorkspaces',
      workspace.workspaceFolders && workspace.workspaceFolders.length > 1,
    );
  }

  initial(): void {}

  dispose() {
    this._onDidChangeWorkspaceFoldersEvent.dispose();
  }
}
