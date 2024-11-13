import {QuickPickItem, ThemeIcon, env, l10n, window} from 'vscode';
import {registerCommand} from '../utils';
import {resolveUniversalController} from '../bootstrap';
import {
  UniversalBookmarkMeta,
  UniversalBookmarkType,
} from '../controllers/UniversalBookmarkController';
import {UniversalTreeItem} from '../providers/UniversalTreeItem';
import resolveServiceManager from '../services/ServiceManager';

export type UniversalContext = UniversalTreeItem;

const universalTypePickItems: QuickPickItem[] = [
  {
    label: 'link',
    iconPath: new ThemeIcon('globe'),
  },
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

export async function addUniversalBookmark(ctx: UniversalContext) {
  const sm = resolveServiceManager();
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
    color: sm.configService.colors['default'],
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
}

export function deleteUniversalBookmark(ctx: UniversalContext) {
  const {meta} = ctx;
  if (!meta) {
    return;
  }

  const controller = resolveUniversalController();
  controller.remove(meta.id);
}

export function clearAllUniversalBookmarks(ctx: UniversalContext) {
  const controller = resolveUniversalController();
  controller.clearAll();
}

export async function changeUniversalBookmarkColor(ctx: UniversalContext) {
  const sm = resolveServiceManager();
  const {meta} = ctx;
  if (!meta) {
    return;
  }
  const colors = sm.configService.colors;
  const gutters = sm.gutterService.gutters;
  const pickItems = Object.keys(colors).map(color => {
    return {
      label: color,
      iconPath: (gutters[color] || gutters['default']).iconPath,
    } as QuickPickItem;
  });
  const chosenColor = await window.showQuickPick(pickItems, {
    title: l10n.t(
      "Select bookmark color. Press 'Enter' to confirm, 'Escape' to cancel",
    ),
    placeHolder: l10n.t('Please select bookmark color'),
    canPickMany: false,
  });
  if (!chosenColor) {
    return;
  }
  const controller = resolveUniversalController();
  controller.update(meta.id, {
    color: chosenColor.label,
  });
}

export async function editUniversalBookmarkLabel(ctx: UniversalContext) {
  const {meta} = ctx;
  if (!meta) {
    return;
  }

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
}

/**
 * 复制命令
 */
export function copyUniversalBookmarkContent(ctx: UniversalContext) {
  const {meta} = ctx;
  if (!meta) {
    return;
  }
  const content = meta[meta.type];
  const clipboard = env.clipboard;
  clipboard.writeText(content);
  window.showInformationMessage('Copied!');
}

/**
 * 打开保存的链接
 */
// export function openUniversalLink() {
//   registerCommand('openUniversalLink', (ctx: UniversalBookmarkMeta) => {
//     const {meta} = ctx;
//     if (!meta || meta.type !== 'link') {
//       return;
//     }
//     const link = meta[meta.type];
//   });
// }
