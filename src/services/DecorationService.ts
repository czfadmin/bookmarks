import {TextEditor, window} from 'vscode';
import {ServiceManager} from './ServiceManager';
import {resolveBookmarkController} from '../bootstrap';
import BookmarksController from '../controllers/BookmarksController';
import {IBookmark} from '../stores/bookmark';
import {BaseService} from './BaseService';

/**
 * 装饰器服务类
 */
export default class DecorationService extends BaseService {
  constructor(sm: ServiceManager) {
    super(DecorationService.name, sm);
  }

  setupAllDecorations() {
    this.restoreAllDecorations();
    this.sm.configService.onDidChangeConfiguration(() => {
      this.restoreAllDecorations();
      this.updateActiveEditorAllDecorations();
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
    },
  ) {
    try {
      options.bookmarks.forEach(it => {
        editor?.setDecorations(it.textDecoration, [it.prettierRangesOrOptions]);
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
      bookmarks: clear ? [] : bookmarks,
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
    const controller = resolveBookmarkController() as BookmarksController;
    if (!controller) {
      return;
    }
    controller.disposeAllBookmarkTextDecorations();
  }

  dispose(): void {
    this.disposeAllDecorations();
  }
}
