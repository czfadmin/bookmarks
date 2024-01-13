import {
  MarkdownString,
  ThemeIcon,
  TreeItem,
  TreeItemCollapsibleState,
  l10n,
} from 'vscode';
import {getExtensionConfiguration} from '../configurations';
import {CMD_GO_TO_SOURCE_LOCATION} from '../constants';
import gutters, {getTagGutters} from '../gutter';
import {BookmarkStoreType, BookmarkMeta} from '../types';
import {getLineInfoStrFromBookmark} from '../utils';

export default class BaseTreeItem extends TreeItem {
  constructor(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
    contextValue: string,
    public meta: BookmarkStoreType | BookmarkMeta,
  ) {
    super(label, collapsibleState);
    this.contextValue = contextValue;
    const tagGutters = getTagGutters();
    if ('color' in this.meta) {
      if ('label' in this.meta && this.meta.label) {
        this.iconPath = tagGutters[this.meta.color] || tagGutters['default'];
      } else {
        this.iconPath = gutters[this.meta.color] || gutters['default'];
      }
    } else {
      // 支持文件图标
      this.iconPath = ThemeIcon.File;
      this.resourceUri = this.meta.fileUri;
    }
    this._createTooltip();
    if (getExtensionConfiguration().enableClick) {
      this.command = {
        title: l10n.t('Jump to bookmark position'),
        command: `bookmark-manager.${CMD_GO_TO_SOURCE_LOCATION}`,
        arguments: [this.meta],
      };
    }
    // this.contextValue === 'file' && this._resolveFileOverview();
  }

  private _createTooltip() {
    // 当节点为书签情况下
    if (this.contextValue === 'bookmark' && 'color' in this.meta) {
      const hoverMessage = this.meta.rangesOrOptions.hoverMessage as
        | MarkdownString
        | MarkdownString[]
        | string;
      this.tooltip = Array.isArray(hoverMessage)
        ? hoverMessage.join('\n')
        : hoverMessage;
      this.description = getLineInfoStrFromBookmark(this.meta);
    }
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
