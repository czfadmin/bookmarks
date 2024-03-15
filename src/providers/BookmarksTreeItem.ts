import {
  MarkdownString,
  ThemeIcon,
  TreeItemCollapsibleState,
  Uri,
  l10n,
  workspace,
} from 'vscode';

import BaseTreeItem from './BaseTreeItem';
import {BookmarkStoreType} from '../types';
import {getLineInfoStrFromBookmark} from '../utils';
import {CMD_GO_TO_SOURCE_LOCATION} from '../constants';
import {ServiceManager} from '../services/ServiceManager';
import {
  GroupedByColorType,
  GroupedByWorkspaceType,
  IBookmark,
} from '../stores/bookmark';

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
      | IBookmark
      | BookmarkStoreType
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
      const meta = this.meta as GroupedByWorkspaceType;
      this.label = label;
      this.iconPath = ThemeIcon.Folder;
      if (workspace.workspaceFolders) {
        this.resourceUri = meta.workspace.uri;
      }
    } else if (this.contextValue === 'file') {
      const _meta = this.meta as BookmarkStoreType;
      this._resolveFileOverview();

      this.label = _meta.fileName;
      this.description = workspace.asRelativePath(_meta.fileId);
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
      const meta = this.meta as BookmarkStoreType;
      this.iconPath = ThemeIcon.File;
      this.resourceUri = Uri.parse(meta.fileName);
    } else if (this.contextValue === 'color') {
      const _meta = this.meta as GroupedByColorType;
      this.iconPath = (gutters[_meta.color] || gutters['default']).iconPath;
    } else if (this.contextValue === 'bookmark') {
      const meta = this.meta as IBookmark;
      const color = meta.color || meta.customColor.name;
      this.iconPath = meta.label
        ? (tagGutters[color] || tagGutters['default']).iconPath
        : (gutters[color] || gutters['default']).iconPath;
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
