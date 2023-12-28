import {StatusBarAlignment, StatusBarItem, window} from 'vscode';
import {EXTENSION_ID, EXTENSION_NAME} from './constants';
import {BookmarksController} from './controllers/BookmarksController';

let statusbarItem: StatusBarItem | undefined;

function resolveStatusBarItem() {
  statusbarItem?.dispose();
  statusbarItem = window.createStatusBarItem(
    `${EXTENSION_ID}`,
    StatusBarAlignment.Left,
  );
  const totalNum = BookmarksController.instance.totalBookmarksNum;
  statusbarItem.name = EXTENSION_NAME;
  // TODO: 对书签进行分类, 比如带有标签和未带有标签
  statusbarItem.text = `$(bookmark) ${totalNum}`;
  statusbarItem.command = {
    title: 'Focus',
    command: 'bookmark-manager.focus',
  };
  statusbarItem.show();
}
/**
 * 创建statusbar
 */
export async function updateStatusBarItem() {
  resolveStatusBarItem();
  BookmarksController.instance.onDidChangeEvent(() => {
    resolveStatusBarItem();
  });
}
