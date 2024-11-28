import {
  DecorationRangeBehavior,
  l10n,
  OverviewRulerLane,
  TextEditor,
  TextEditorDecorationType,
  window,
} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {Bookmark, IBookmark} from '../stores/bookmark';
import {BaseService} from './BaseService';
import {DEFAULT_BOOKMARK_COLOR} from '../constants';
import {Instance} from 'mobx-state-tree';

/**
 * 装饰器服务类
 */
export default class DecorationService extends BaseService {
  private _decorations: Map<string, TextEditorDecorationType>;
  constructor(sm: ServiceManager) {
    super(DecorationService.name, sm);
    this._decorations = new Map();
    this.sm.configService.onDidChangeConfiguration(() => {
      this.updateActiveEditorAllDecorations(true);
    });
  }

  restoreAllDecorations() {
    this.disposeAllDecorations();
  }

  /**
   * 创建`rangeOrOptions`
   * @param bookmarks
   * @returns
   */
  getBookmarkRangeOrOptions(bookmarks: IBookmark[]) {
    return bookmarks.map(bookmark => bookmark.prettierRangesOrOptions);
  }

  /**
   * 更新指定的 editor 中的文本装饰器
   * @param editor
   * @param options
   */
  updateDecoration(
    editor: TextEditor,
    options: {
      bookmarks: IBookmark[];
      clear: boolean;
    },
  ) {
    try {
      options.bookmarks.forEach(it => {
        editor.setDecorations(this.getTextDecoration(it, options.clear), [
          it.prettierRangesOrOptions,
        ]);
      });
    } catch (error) {
      this._logger.error(error);
    }
  }

  /**
   * 更新给定的编辑器中的`decorations`
   * @param editor {TextEditor}
   * @returns
   */
  updateDecorationsByEditor(editor: TextEditor, clear: boolean = false) {
    if (!editor) {
      return;
    }
    const controller = resolveBookmarkController() as BookmarksController;
    if (!controller) {
      return;
    }
    const bookmarks = controller.getBookmarkStoreByFileUri(editor.document.uri);

    this.updateDecoration(editor, {
      bookmarks,
      clear,
    });
  }

  /**
   * 更新激活的编辑器的所有的`Decorations`
   * @param clear 是否要清除`bookmarks`
   * @returns
   */
  updateActiveEditorAllDecorations(clear: boolean = false) {
    const editors = window.visibleTextEditors;
    if (!editors.length) {
      return;
    }
    for (const editor of editors) {
      this.updateDecorationsByEditor(editor, clear);
    }
  }

  /**
   * dispose 所有的装饰器
   */
  disposeAllDecorations() {
    this._decorations.forEach(it => it.dispose());
  }

  createTextDecoration(bookmark: IBookmark) {
    let color = bookmark.plainColor || DEFAULT_BOOKMARK_COLOR;

    const {
      fontWeight,
      showTextDecoration,
      showGutterIcon,
      showGutterInOverviewRuler,
      alwaysUseDefaultColor,
      wholeLine,
      textDecorationLine,
      textDecorationStyle,
      textDecorationThickness,
      highlightBackground,
      showBorder,
      border,
      showOutline,
      outline,
    } = this.configure.decoration;

    let overviewRulerColor;
    let overviewRulerLane: OverviewRulerLane | undefined = undefined;
    if (showGutterInOverviewRuler) {
      overviewRulerColor = bookmark.plainColor;
      overviewRulerLane = OverviewRulerLane.Center;
    } else {
      overviewRulerColor = undefined;
    }

    let _showGutterIcon = showGutterIcon;

    if (!(showGutterIcon || showGutterInOverviewRuler || showTextDecoration)) {
      window.showInformationMessage(
        l10n.t(
          `'showGutterIcon', 'showGutterInOverviewRuler', 'showTextDecoration' not available at the same time this is only 'false'`,
        ),
      );
      _showGutterIcon = true;
    }

    if (alwaysUseDefaultColor) {
      color =
        this.store.colors.find(it => it.label === 'default')?.value ||
        DEFAULT_BOOKMARK_COLOR;
    }

    let rangeBehavior = DecorationRangeBehavior.ClosedClosed;

    const decoration = window.createTextEditorDecorationType({
      isWholeLine: wholeLine,
      borderRadius: '2px',
      borderColor: color,
      outlineColor: color,
      fontWeight,
      overviewRulerLane,
      overviewRulerColor,
      rangeBehavior,
      gutterIconPath: bookmark.iconPath,
      gutterIconSize: 'auto',
      border: showBorder ? border : '',
      outline: showOutline ? outline : '',
      backgroundColor: highlightBackground ? color : '',
      textDecoration: showTextDecoration
        ? `${textDecorationLine} ${textDecorationStyle} ${textDecorationThickness} ${color}`
        : '',
    });

    this._decorations.set(bookmark.id, decoration);

    return decoration;
  }

  updateTextDecoration(bookmark: Instance<typeof Bookmark>) {
    const editor = window.visibleTextEditors.find(
      it => it.document.uri.fsPath === bookmark.fileId,
    );
    if (!editor) {
      return;
    }
    const prevTextDecoration = this._decorations.get(bookmark.id);
    if (prevTextDecoration) {
      editor.setDecorations(prevTextDecoration, []);
      prevTextDecoration.dispose();
      this._decorations.delete(bookmark.id);
    }
    const newTextDecoration = this.getTextDecoration(bookmark, true);
    return newTextDecoration;
  }

  getTextDecoration(bookmark: IBookmark, clear: boolean = false) {
    const textDecoration = this._decorations.get(bookmark.id);
    if (!textDecoration) {
      return this.createTextDecoration(bookmark);
    } else if (clear) {
      return this.updateTextDecoration(bookmark);
    }
    return textDecoration;
  }

  removeTextDecoration(bookmark: IBookmark) {
    const textDecoration = this._decorations.get(bookmark.id);
    if (!textDecoration) {
      return;
    }
    const editor = window.visibleTextEditors.find(
      it => it.document.uri.fsPath === bookmark.fileId,
    );
    if (editor) {
      editor.setDecorations(textDecoration, []);
    }

    this._decorations.delete(bookmark.id);
    textDecoration.dispose();
  }
  dispose(): void {
    this.disposeAllDecorations();
  }
}
