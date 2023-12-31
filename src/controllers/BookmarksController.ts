import * as vscode from 'vscode';
import {EXTENSION_ID} from '../constants';
import {BookmarkMeta, BookmarkStoreRootType, BookmarkStoreType} from '../types';
import {generateUUID} from '../utils';
import {createHoverMessage, sortBookmarksByLineNumber} from '../utils/bookmark';

export class BookmarksController {
  private static _instance: BookmarksController;
  private _datasource: BookmarkStoreRootType;
  private _context: vscode.ExtensionContext;

  private _onDidChangeEvent = new vscode.EventEmitter<void>();

  public onDidChangeEvent: vscode.Event<void> = this._onDidChangeEvent.event;

  public get datasource(): BookmarkStoreRootType {
    return this._datasource;
  }

  public get workspaceState(): vscode.Memento {
    return this._context.workspaceState;
  }

  /**
   * 返回书签的总个数
   */
  public get totalBookmarksNum(): number {
    let count = 0;
    if (!this.datasource) return 0;
    count = this.datasource.data.reduce((a, b) => a + b.bookmarks.length, 0);
    return count;
  }

  /**
   * 获取带有标签的书签
   */
  public get labeledBookmarkCount(): number {
    if (!this.datasource) return 0;
    return this.datasource.data.reduce(
      (a, b) => a + b.bookmarks.filter(it => it.label).length,
      0,
    );
  }

  private constructor(context: vscode.ExtensionContext) {
    this._context = context;
    const _datasource =
      this.workspaceState.get<BookmarkStoreRootType>(EXTENSION_ID);
    if (!_datasource) {
      this._datasource = {
        workspace: context.storageUri?.toString() || '',
        data: [],
      };
      this.save(this._datasource);
    } else {
      const temp = _datasource.data.map(store => {
        const bookmarks = store.bookmarks.map(bookmark => ({
          ...bookmark,
          selection: new vscode.Selection(
            bookmark.selection.anchor,
            bookmark.selection.active,
          ),
          rangesOrOptions: {
            ...bookmark.rangesOrOptions,
            hoverMessage: createHoverMessage(bookmark, true),
          },
        }));
        return {
          ...store,
          bookmarks,
        };
      });
      _datasource.data = temp;
      this._datasource = _datasource;
    }
  }

  add(editor: vscode.TextEditor, bookmark: Partial<Omit<BookmarkMeta, 'id'>>) {
    const fileUri = editor.document.uri;
    const idx = this.datasource.data.findIndex(it => it.id === fileUri.fsPath);
    let bookmarkStore;
    if (idx === -1) {
      bookmarkStore = {
        id: fileUri.fsPath,
        fileUri,
        filename: editor.document.fileName,
        bookmarks: [] as BookmarkMeta[],
      };
      this.datasource.data.push(bookmarkStore);
    } else {
      bookmarkStore = this.datasource.data[idx];
    }
    // @ts-ignore
    bookmarkStore.bookmarks.push({
      ...bookmark,
      id: generateUUID(),
      fileUri: fileUri,
    });
    sortBookmarksByLineNumber(bookmarkStore.bookmarks);
    this.save();
  }
  remove(bookmark: BookmarkMeta) {
    const idx = this.datasource.data.findIndex(
      it => it.id === bookmark.fileUri.fsPath,
    );
    if (idx === -1) {
      return;
    }
    const bookmarkIdx = this.datasource.data[idx].bookmarks.findIndex(
      it => it.id === bookmark.id,
    );
    if (bookmarkIdx === -1) {
      return;
    }
    this.datasource.data[idx].bookmarks.splice(bookmarkIdx, 1);
    if (!this.datasource.data[idx].bookmarks.length) {
      this.datasource.data.splice(idx, 1);
    }
    this.save();
  }
  update(
    bookmark: BookmarkMeta,
    bookmarkDto: Partial<Omit<BookmarkMeta, 'id'>>,
  ) {
    if (!bookmark.fileUri.fsPath) {
      return;
    }

    let idx = this.datasource.data.findIndex(
      it => it.id === bookmark.fileUri.fsPath,
    );
    if (idx === -1) {
      return;
    }
    const bookmarkIdx = this.datasource.data[idx].bookmarks.findIndex(
      it => it.id === bookmark.id,
    );
    if (bookmarkIdx === -1) {
      return;
    }
    const existed = this.datasource.data[idx].bookmarks[bookmarkIdx];
    const {rangesOrOptions, ...rest} = bookmarkDto;
    this.datasource.data[idx].bookmarks[bookmarkIdx] = {
      ...existed,
      ...rest,
      rangesOrOptions: {
        ...(existed.rangesOrOptions || {}),
        ...rangesOrOptions,
      },
    } as BookmarkMeta;
    this.save();
  }
  detail(bookmark: BookmarkMeta) {
    const {id, fileUri} = bookmark;
    let idx = this.datasource.data.findIndex(it => it.id === fileUri.fsPath);
    if (idx === -1) {
      return;
    }
    return this.datasource.data[idx].bookmarks.find(it => it.id === id);
  }

  getBookmarkStoreByFileUri(
    fileUri: vscode.Uri,
  ): BookmarkStoreType | undefined {
    const idx = this.datasource.data.findIndex(it => it.id === fileUri.fsPath);
    if (idx === -1) {
      return;
    }

    return this.datasource.data[idx];
  }

  restore() {
    this.save({
      workspace: this._context.storageUri?.toString() || '',
      data: [],
    });
  }

  /**
   *
   * 清除所有标签
   */
  clearAll() {
    if (!this.datasource.data.length) {
      return;
    }
    this.restore();
  }

  /**
   * 清除指定文件上的所有的标签,并删除此文件存储信息
   * @param fileUri
   * @returns
   */
  clearAllBookmarkInFile(fileUri: vscode.Uri) {
    if (!this.datasource.data.length) {
      return;
    }
    const idx = this.datasource.data.findIndex(it => it.id === fileUri.fsPath);
    if (idx === -1) {
      return;
    }
    this.datasource.data.splice(idx, 1);
    this.save();
    this.refresh();
  }

  save(store?: BookmarkStoreRootType) {
    this._datasource = store || this.datasource;
    this.workspaceState.update(EXTENSION_ID, this._datasource).then();
    this._fire();
  }
  /**
   *
   * @param bookmark
   * @param label
   */
  editLabel(bookmark: BookmarkMeta, label: string) {
    bookmark.label = label;

    this.update(bookmark, {
      label,
      rangesOrOptions: {
        ...bookmark.rangesOrOptions,
        hoverMessage: createHoverMessage(bookmark, true, true),
      },
    });
  }

  refresh() {
    this._fire();
  }

  private _fire() {
    this._onDidChangeEvent.fire();
  }

  static getInstance(context: vscode.ExtensionContext): BookmarksController {
    if (!BookmarksController._instance) {
      BookmarksController._instance = new BookmarksController(context);
    }
    return BookmarksController._instance;
  }

  static get instance(): BookmarksController {
    return BookmarksController._instance;
  }
}
