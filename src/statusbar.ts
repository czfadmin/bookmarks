import {StatusBarAlignment, StatusBarItem, window} from 'vscode';
import {EXTENSION_ID, EXTENSION_NAME} from './constants';
import {BookmarksController} from './controllers/BookmarksController';

let statusbarItem: StatusBarItem | undefined;

/**
 * 创建statusbar
 */
export async function createStatusBarItem() {
  const _createStatusbarItem = () => {
    statusbarItem?.dispose();
    statusbarItem = window.createStatusBarItem(
      `${EXTENSION_ID}`,
      StatusBarAlignment.Left,
    );
    const totalNum = BookmarksController.instance.totalBookmarksNum;
    statusbarItem.name = EXTENSION_NAME;
    statusbarItem.text = `$(bookmark) ${totalNum}`;
    statusbarItem.command = {
      title: 'Focus',
      command: 'bookmark-manager.focus',
    };
    statusbarItem.show();
  };
  _createStatusbarItem();
  BookmarksController.instance.onDidChangeEvent(() => {
    _createStatusbarItem();
  });
}
