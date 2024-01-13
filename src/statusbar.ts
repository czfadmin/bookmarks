import {
  MarkdownString,
  StatusBarAlignment,
  StatusBarItem,
  window,
} from 'vscode';
import {EXTENSION_ID, EXTENSION_NAME} from './constants';
import BookmarksController from './controllers/BookmarksController';
import {resolveBookmarkController} from './bootstrap';

let statusbarItem: StatusBarItem | undefined;

function resolveStatusBarItem(controller: BookmarksController) {
  statusbarItem?.dispose();
  statusbarItem = window.createStatusBarItem(
    `${EXTENSION_ID}`,
    StatusBarAlignment.Left,
  );
  const total = controller.totalCount;
  const labeled = controller.labeledCount;
  statusbarItem.name = EXTENSION_NAME;
  statusbarItem.text = `$(bookmark) ${total} $(tag-add) ${labeled}`;
  statusbarItem.command = {
    title: 'Focus',
    command: 'bookmark-manager.focus',
  };
  statusbarItem.tooltip = resolveBookmarkTooltip({
    total,
    labeled,
  });
  statusbarItem.show();
}

/**
 * 处理`statusbar`的悬浮提示
 * @param param0
 * @returns
 */
export function resolveBookmarkTooltip({total, labeled}: any): MarkdownString {
  const tooltip = new MarkdownString('', true);
  tooltip.supportHtml = true;
  tooltip.supportThemeIcons = true;
  tooltip.appendMarkdown('$(bookmark) Bookmark Manager\n');
  tooltip.appendMarkdown(`\n\nTotal: ${total}`);
  tooltip.appendMarkdown(`\n\nLabled: ${labeled}`);

  return tooltip;
}
/**
 * 创建statusbar
 */
export async function updateStatusBarItem() {
  const controller = resolveBookmarkController();
  resolveStatusBarItem(controller);
  controller.onDidChangeEvent(() => {
    resolveStatusBarItem(controller);
  });
}
