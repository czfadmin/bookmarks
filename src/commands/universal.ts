import {registerCommand} from '../utils';

/**
 * 注册通用的书签命令
 * @param context
 */
export function registerUniversalCommands() {
  addUniversalBookmark();
  deleteUniversalBookmark();
  clearAllUniversalBookmarks();
  changeUniversalBookmarkColor();
  editUniversalBookmarkLabel();
}

export function addUniversalBookmark() {
  registerCommand('addUniversalBookmark', ctx => {});
}

function deleteUniversalBookmark() {
  registerCommand('deleteUniversalBookmark', ctx => {});
}

function clearAllUniversalBookmarks() {
  registerCommand('clearAllUniversalBookmarks', ctx => {});
}

function changeUniversalBookmarkColor() {
  registerCommand('changeUniversalBookmarkColor', ctx => {});
}

function editUniversalBookmarkLabel() {
  registerCommand('editUniversalBookmarkLabel', ctx => {});
}
