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
import {BaseService} from './BaseService';

export default class StatusbarService extends BaseService {
  private _controller: BookmarksController;
  private statusbarItem: StatusBarItem | undefined;
  constructor(sm: ServiceManager) {
    super(StatusbarService.name, sm);
    this._controller = resolveBookmarkController();
    this.updateStatusBarItem();
    this.sm.configService.onDidChangeConfiguration(() => {
      this.updateStatusBarItem();
    });
    this._controller.onDidChangeEvent(() => {
      this.updateStatusBarItem();
    });
  }

  resolveStatusBarItem() {
    this.statusbarItem?.dispose();
    this.statusbarItem = window.createStatusBarItem(
      `${EXTENSION_ID}`,
      StatusBarAlignment.Left,
    );
    const total = this._controller.totalCount;
    const labeled = this._controller.labeledCount;
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
    this.resolveStatusBarItem();
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
  initial(): void {}
  dispose() {}
}
