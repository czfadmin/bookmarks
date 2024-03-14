import {
  MarkdownString,
  ThemeIcon,
  TreeItemCollapsibleState,
  l10n,
} from 'vscode';

import BaseTreeItem from './BaseTreeItem';
import {BookmarkStoreType} from '../types';
import {getLineInfoStrFromBookmark} from '../utils';
import {CMD_GO_TO_SOURCE_LOCATION} from '../constants';
import {
  GroupedByColorType,
  GroupedByWorkspaceType,
} from '../controllers/BookmarksController';
import {ServiceManager} from '../services/ServiceManager';
import {IBookmark} from '../stores/bookmark';

export default class BookmarkTreeItem extends BaseTreeItem {
  public meta:
    | BookmarkStoreType
    | IBookmark
    | GroupedByColorType
    | GroupedByWorkspaceType;

  private _sm: ServiceManager;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: string,
    meta:
      | BookmarkStoreType
      | IBookmark
      | GroupedByColorType
      | GroupedByWorkspaceType,
    sm: ServiceManager,
  ) {
    super(label, collapsibleState, contextValue);
    this.meta = meta;
    this._sm = sm;

    if (this.contextValue === 'color') {
      this.label = label;
    } else if (this.contextValue === 'workspace') {
      this.label = label;
      this.iconPath = ThemeIcon.Folder;
      this.resourceUri = (this.meta as GroupedByWorkspaceType).workspace.uri;
    } else if (this.contextValue === 'file') {
      const _meta = this.meta as IBookmark;
      this._resolveFileOverview();
      const filenameArr = _meta.fileName.split('\\');
      this.label = filenameArr[filenameArr.length - 1];
      this.description = label;
    } else {
      if (this._sm.configService.configuration.enableClick) {
        this.command = {
          title: l10n.t('Jump to bookmark position'),
          command: `bookmark-manager.${CMD_GO_TO_SOURCE_LOCATION}`,
          arguments: [this.meta],
        };
      }
      this._createTooltips();
    }
    this._resolveIconPath();
  }

  private _resolveIconPath() {
    const tagGutters = this._sm.gutterService.tagGutters;
    const gutters = this._sm.gutterService.gutters;
    if (this.contextValue === 'file') {
      this.iconPath = ThemeIcon.File;
      this.resourceUri = (this.meta as BookmarkStoreType).fileUri;
    } else if (this.contextValue === 'color') {
      const _meta = this.meta as GroupedByColorType;
      this.iconPath = (gutters[_meta.color] || gutters['default']).iconPath;
    } else if (this.contextValue === 'bookmark') {
      const meta = this.meta as IBookmark;
      this.iconPath = meta.label
        ? (tagGutters[meta.color] || tagGutters['default']).iconPath
        : (gutters[meta.color] || gutters['default']).iconPath;
    }
  }

  /**
   * 为书签创建 提示信息
   */
  private _createTooltips() {
    const meta = this.meta as IBookmark;
    const hoverMessage = meta.rangesOrOptions.hoverMessage as
      | MarkdownString
      | MarkdownString[]
      | string;
    this.tooltip = Array.isArray(hoverMessage)
      ? hoverMessage.join('\n')
      : hoverMessage;
    this.description = getLineInfoStrFromBookmark(meta);
  }

  /**
   * 对书签所在的文件进行书签预览大纲
   */
  private _resolveFileOverview() {
    const hoverMessage = new MarkdownString(`### ${this.label}`, true);
    hoverMessage.supportHtml = true;
    hoverMessage.supportThemeIcons = true;
    const {bookmarks} = this.meta as BookmarkStoreType;
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
