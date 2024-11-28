import {
  MarkdownString,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  l10n,
  workspace,
} from 'vscode';

import BaseTreeItem from './BaseTreeItem';
import {
  BookmarksGroupedByFileType,
  BookmarksGroupedByCustomType,
  BookmarkTreeItemCtxValueEnum,
} from '../types';
import {ServiceManager} from '../services/ServiceManager';
import {
  BookmarksGroupedByColorType,
  BookmarksGroupedByIconType,
  BookmarksGroupedByWorkspaceType,
  IBookmark,
} from '../stores';

export default class BookmarkTreeItem extends BaseTreeItem {
  public meta:
    | IBookmark
    | BookmarksGroupedByFileType
    | BookmarksGroupedByColorType
    | BookmarksGroupedByWorkspaceType
    | BookmarksGroupedByCustomType
    | BookmarksGroupedByIconType;

  private _sm: ServiceManager;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: BookmarkTreeItemCtxValueEnum,
    meta:
      | IBookmark
      | BookmarksGroupedByFileType
      | BookmarksGroupedByColorType
      | BookmarksGroupedByWorkspaceType
      | BookmarksGroupedByCustomType
      | BookmarksGroupedByIconType,
    sm: ServiceManager,
  ) {
    super(label, collapsibleState, contextValue);
    this.meta = meta;
    this._sm = sm;

    if (this.contextValue === BookmarkTreeItemCtxValueEnum.COLOR) {
      this.label = label;
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.WORKSPACE) {
      const meta = this.meta as BookmarksGroupedByWorkspaceType;
      this.label = label;
      this.iconPath = ThemeIcon.Folder;
      if (workspace.workspaceFolders) {
        this.resourceUri = meta.workspace.uri;
      }
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.FILE) {
      const _meta = this.meta as BookmarksGroupedByFileType;
      this._resolveFileOverview();
      this.label = _meta.fileName;
      this.description = workspace.asRelativePath(_meta.fileId);
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.CUSTOM) {
      this.label = label;
      const meta = this.meta as BookmarksGroupedByCustomType;
      this.iconPath = ThemeIcon.Folder;
      if (meta && meta.group.activeStatus) {
        this.iconPath = new ThemeIcon('folder-active');
      }
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK) {
      this.command = {
        title: l10n.t('Jump to bookmark position'),
        command: `bookmark-manager.gotoSourceLocation`,
        arguments: [this.meta],
      };
      this._createTooltips();
    }
    this._resolveIconPath();
  }

  private async _resolveIconPath() {
    if (this.contextValue === BookmarkTreeItemCtxValueEnum.FILE) {
      const meta = this.meta as BookmarksGroupedByFileType;
      this.iconPath = ThemeIcon.File;
      this.resourceUri = Uri.parse(meta.fileName);
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.COLOR) {
      const _meta = this.meta as BookmarksGroupedByColorType;
      this.iconPath = await this._sm.iconsService.getDotIcon(_meta.color);
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.BOOKMARK) {
      const meta = this.meta as IBookmark;
      this.iconPath = meta.iconPath;
    } else if (this.contextValue === BookmarkTreeItemCtxValueEnum.ICON) {
      this.iconPath = ServiceManager.instance.icons
        .find(it => it.id === (this.meta as BookmarksGroupedByIconType).icon)
        ?.iconPath();
    }
  }

  /**
   * 为书签创建 提示信息
   */
  private _createTooltips() {
    const meta = this.meta as IBookmark;
    const hoverMessage = meta.prettierRangesOrOptions.hoverMessage as
      | MarkdownString
      | MarkdownString[]
      | string;
    this.tooltip = Array.isArray(hoverMessage)
      ? hoverMessage.join('\n')
      : hoverMessage;
    this.description = meta.lineInfoString;
  }

  /**
   * 对书签所在的文件进行书签预览大纲
   */
  private _resolveFileOverview() {
    const hoverMessage = new MarkdownString(`### ${this.label}`, true);
    hoverMessage.supportHtml = true;
    hoverMessage.supportThemeIcons = true;
    const {bookmarks} = this.meta as BookmarksGroupedByFileType;
    let item, markdownStr;
    let idx = 0;
    for (item of bookmarks) {
      idx += 1;
      markdownStr = `\n ${idx}. ${item.label || item.selectionContent}\n`;
      hoverMessage.appendMarkdown(markdownStr);
    }
    hoverMessage.isTrusted = true;
    this.tooltip = hoverMessage;
  }
}
