import {
  Disposable,
  MarkdownString,
  StatusBarAlignment,
  StatusBarItem,
  window,
} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {EXTENSION_ID, EXTENSION_NAME} from '../constants';

export default class StatusbarService implements Disposable {
  private _serviceManager: ServiceManager;

  private statusbarItem: StatusBarItem | undefined;
  constructor(sm: ServiceManager) {
    this._serviceManager = sm;
    this.updateStatusBarItem();
    this._serviceManager.configService.onDidChangeConfiguration(() => {
      this.updateStatusBarItem();
    });
  }

  resolveStatusBarItem(controller: BookmarksController) {
    this.statusbarItem?.dispose();
    this.statusbarItem = window.createStatusBarItem(
      `${EXTENSION_ID}`,
      StatusBarAlignment.Left,
    );
    const total = controller.totalCount;
    const labeled = controller.labeledCount;
    this.statusbarItem.name = EXTENSION_NAME;
    this.statusbarItem.text = `$(bookmark) ${total} $(tag-add) ${labeled}`;
    this.statusbarItem.command = {
      title: 'Focus',
      command: 'bookmark-manager.focus',
    };
    this.statusbarItem.tooltip = this.resolveBookmarkTooltip({
      total,
      labeled,
    });
    this.statusbarItem.show();
  }

  updateStatusBarItem() {
    const controller = resolveBookmarkController();
    this.resolveStatusBarItem(controller);
    controller.onDidChangeEvent(() => {
      this.resolveStatusBarItem(controller);
    });
  }

  resolveBookmarkTooltip({total, labeled}: any): MarkdownString {
    const tooltip = new MarkdownString('', true);
    tooltip.supportHtml = true;
    tooltip.supportThemeIcons = true;
    tooltip.appendMarkdown('$(bookmark) Bookmark Manager\n');
    tooltip.appendMarkdown(`\n\nTotal: ${total}`);
    tooltip.appendMarkdown(`\n\nLabled: ${labeled}`);

    return tooltip;
  }
  dispose() {}
}
