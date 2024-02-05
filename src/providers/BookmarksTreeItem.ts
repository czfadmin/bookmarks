import {
  MarkdownString,
  ThemeIcon,
  TreeItemCollapsibleState,
  l10n,
} from 'vscode';
import BaseTreeItem from './BaseTreeItem';
import {BookmarkMeta, BookmarkStoreType} from '../types';
import gutters, {getTagGutters} from '../gutter';
import {getLineInfoStrFromBookmark} from '../utils';
import {CMD_GO_TO_SOURCE_LOCATION} from '../constants';
import {GroupedByColorType} from '../controllers/BookmarksController';
import ConfigService from '../services/ConfigService';

export default class BookmarksTreeItem extends BaseTreeItem {
  public meta: BookmarkStoreType | BookmarkMeta | GroupedByColorType;

  private _configService: ConfigService;

  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: string,
    meta: BookmarkStoreType | BookmarkMeta | GroupedByColorType,
    configService: ConfigService,
  ) {
    super(label, collapsibleState, contextValue);
    this.meta = meta;
    this._configService = configService;

    if (this.contextValue === 'color') {
      this.label = label;
    } else if (this.contextValue === 'file') {
      const _meta = this.meta as BookmarkMeta;
      this._resolveFileOverview();
      const filenameArr = _meta.fileName.split('\\');
      this.label = filenameArr[filenameArr.length - 1];
      this.description = label;
    } else {
      if (this._configService.configuration.enableClick) {
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
    const tagGutters = getTagGutters();
    if (this.contextValue === 'file') {
      this.iconPath = ThemeIcon.File;
      this.resourceUri = (this.meta as BookmarkStoreType).fileUri;
    } else if (this.contextValue === 'color') {
      const _meta = this.meta as GroupedByColorType;
      this.iconPath = gutters[_meta.color] || gutters['default'];
    } else if (this.contextValue === 'bookmark') {
      const meta = this.meta as BookmarkMeta;

      this.iconPath = meta.label
        ? tagGutters[meta.color] || tagGutters['default']
        : gutters[meta.color] || gutters['default'];
    }
  }

  /**
   * 为书签创建 提示信息
   */
  private _createTooltips() {
    const meta = this.meta as BookmarkMeta;
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
