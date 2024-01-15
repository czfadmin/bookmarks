import {QuickPickItem, ThemeIcon, commands, window} from 'vscode';
import {registerCommand} from '../utils';
import {resolveUniversalController} from '../bootstrap';
import {
  UniversalBookmarkMeta,
  UniversalBookmarkType,
} from '@/controllers/UniversalBookmarkController';
import {getAllColors} from '../configurations';

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

const universalTypePickItems: QuickPickItem[] = [
  {
    label: 'link',
    iconPath: new ThemeIcon('globe'),
  },
  // {
  //   label: 'file',
  //   iconPath: new ThemeIcon('file'),
  // },
  {
    label: 'code',
    iconPath: new ThemeIcon('file-code'),
  },
  {
    label: 'command',
    iconPath: new ThemeIcon('terminal-cmd'),
  },
];

export function addUniversalBookmark() {
  registerCommand('addUniversalBookmark', async ctx => {
    const selectedType = await window.showQuickPick(universalTypePickItems, {
      title: '请选择类型',
      canPickMany: false,
      ignoreFocusOut: false,
    });

    if (!selectedType) {
      return;
    }
    let input: string | undefined = '';
    let newBookmark: Partial<UniversalBookmarkMeta> = {
      label: input || '',
      type: selectedType.label as UniversalBookmarkType,
      color: getAllColors()['default'],
    } as UniversalBookmarkMeta;
    if (selectedType.label == 'file') {
      input = await window.showInputBox({
        title: '创建书签',
        placeHolder: '请输入内容',
      });

      switch (newBookmark.type) {
        case 'code':
          newBookmark.code = input;
          break;
        case 'command':
          newBookmark.command = input;
          break;
        case 'link':
          newBookmark.link = input;
          break;
      }
    } else {
      if (!input) {
        return;
      }
    }

    const controller = resolveUniversalController();

    controller.add(newBookmark as UniversalBookmarkMeta);
  });
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
