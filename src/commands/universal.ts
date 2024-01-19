import {QuickPickItem, ThemeIcon, commands, env, l10n, window} from 'vscode';
import {registerCommand} from '../utils';
import {resolveUniversalController} from '../bootstrap';
import {
  UniversalBookmarkMeta,
  UniversalBookmarkType,
} from '@/controllers/UniversalBookmarkController';
import {getAllColors} from '../configurations';
import gutters from '../gutter';
import {UniversalTreeItem} from '@/providers/UniversalTreeItem';

export type UniversalContext = UniversalTreeItem;

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
  copyUniversalBookmarkCommand();
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

function resolveIcon(type: string) {
  let icon = 'globe';
  switch (type) {
    case 'link':
      icon = 'globe';
      break;
    case 'code':
      icon = 'file-code';
      break;
    case 'command':
      icon = 'terminal-cmd';
      break;
    case 'file':
      icon = 'file';
      break;
  }
  return icon;
}

export function addUniversalBookmark() {
  registerCommand('addUniversalBookmark', async (ctx: any) => {
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

    newBookmark.icon = resolveIcon(newBookmark.type as string);

    if (selectedType.label !== 'file') {
      input = await window.showInputBox({
        title: '创建书签',
        placeHolder: '请输入内容',
      });

      newBookmark[newBookmark.type!] = input;
    }

    const controller = resolveUniversalController();

    controller.add(newBookmark as UniversalBookmarkMeta);
  });
}

function deleteUniversalBookmark() {
  registerCommand('deleteUniversalBookmark', async (ctx: UniversalContext) => {
    const {meta} = ctx;
    if (!meta) return;

    const controller = resolveUniversalController();
    controller.remove(meta.id);
  });
}

function clearAllUniversalBookmarks() {
  registerCommand('clearAllUniversalBookmarks', ctx => {
    const controller = resolveUniversalController();
    controller.clearAll();
  });
}

function changeUniversalBookmarkColor() {
  registerCommand(
    'changeUniversalBookmarkColor',
    async (ctx: UniversalContext) => {
      const {meta} = ctx;
      if (!meta) {
        return;
      }
      const colors = getAllColors();
      const pickItems = Object.keys(colors).map(color => {
        return {
          label: color,
          iconPath: gutters[color] || gutters['default'],
        } as QuickPickItem;
      });
      const choosedColor = await window.showQuickPick(pickItems, {
        title: l10n.t(
          "Select bookmark color. Press 'ENTER' to confirm, 'EAPSE' to cancel",
        ),
        placeHolder: l10n.t('Please select bookmark color'),
        canPickMany: false,
      });
      if (!choosedColor) return;
      const controller = resolveUniversalController();
      controller.update(meta.id, {
        color: choosedColor.label,
      });
    },
  );
}

function editUniversalBookmarkLabel() {
  registerCommand(
    'editUniversalBookmarkLabel',
    async (ctx: UniversalContext) => {
      const {meta} = ctx;
      if (!meta) return;

      const input = await window.showInputBox({
        placeHolder: l10n.t('Type a label for your bookmarks'),
        title: l10n.t(
          'Bookmark Label (Press `Enter` to confirm or press `Escape` to cancel)',
        ),
        value: meta[meta.type] || meta.label,
      });
      if (!input) {
        return;
      }
      const controller = resolveUniversalController();
      controller.update(meta.id, {
        label: input,
      });
    },
  );
}
/**
 * 复制命令
 */
function copyUniversalBookmarkCommand() {
  registerCommand('copyUniversalBookmarkContent', (ctx: UniversalContext) => {
    const {meta} = ctx;
    if (!meta) return;
    const content = meta[meta.type];
    const clipboard = env.clipboard;
    clipboard.writeText(content);
    window.showInformationMessage('Copied!');
  });
}

/**
 * 打开保存的链接
 */
function openUniversalLink() {
  registerCommand('openUniversalLink', (ctx: UniversalBookmarkMeta) => {
    const {meta} = ctx;
    if (!meta || meta.type !== 'link') return;
    const link = meta[meta.type];
  });
}
