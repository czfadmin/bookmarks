import {eq, and} from 'drizzle-orm';
import {BaseService} from './BaseService';
import {ServiceManager} from './ServiceManager';
import {createDatabase, BookmarkDatabase} from '../database';
import {
  bookmarksTable,
  bookmarkGroupsTable,
  storeMetaTable,
  groupInfoTable,
} from '../database/schema';
import {IBookmarkStoreInfo} from '../types';
import {BookmarkGroupInfoType} from '../stores';

/**
 * @zh 数据库服务, 负责书签数据的持久化存储 (SQLite via Drizzle ORM)
 */
export class DatabaseService extends BaseService {
  private _db: BookmarkDatabase | undefined;

  constructor(sm: ServiceManager) {
    super(DatabaseService.name, sm);
  }

  /**
   * @zh 获取数据库实例, 如果还未初始化则先初始化
   */
  get db(): BookmarkDatabase {
    if (!this._db) {
      this._db = createDatabase(this.sm.fileService.dbPath);
    }
    return this._db;
  }

  /**
   * @zh 将书签存储信息保存到 SQLite 数据库中
   * @param workspaceName 工作区间名称
   * @param storeInfo 书签存储信息
   */
  save(workspaceName: string, storeInfo: IBookmarkStoreInfo): void {
    const db = this.db;

    // 使用事务批量写入以保证原子性
    db.transaction((tx) => {
      // 1. 更新或插入元数据
      tx.insert(storeMetaTable)
        .values({
          workspace: workspaceName,
          version: storeInfo.version || '',
          viewType: storeInfo.viewType || 'tree',
          groupView: storeInfo.groupView || 'file',
          sortedType: storeInfo.sortedType || 'linenumber',
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: storeMetaTable.workspace,
          set: {
            version: storeInfo.version || '',
            viewType: storeInfo.viewType || 'tree',
            groupView: storeInfo.groupView || 'file',
            sortedType: storeInfo.sortedType || 'linenumber',
            updatedAt: new Date(),
          },
        })
        .run();

      // 2. 删除当前工作区间的书签并重新插入
      tx.delete(bookmarksTable)
        .where(eq(bookmarksTable.workspace, workspaceName))
        .run();

      if (storeInfo.bookmarks && storeInfo.bookmarks.length) {
        for (const bookmark of storeInfo.bookmarks) {
          tx.insert(bookmarksTable)
            .values({
              id: bookmark.id,
              label: bookmark.label || '',
              description: bookmark.description || '',
              color: bookmark.color || 'default',
              fileUriPath: bookmark.fileUri?.fsPath || '',
              type: bookmark.type || 'line',
              selectionContent: bookmark.selectionContent || '',
              languageId: bookmark.languageId || 'javascript',
              workspaceFolderName: bookmark.workspaceFolder?.name || '',
              workspaceFolderIndex: bookmark.workspaceFolder?.index ?? 0,
              rangesOrOptions: JSON.stringify(bookmark.rangesOrOptions || {}),
              createdAt: bookmark.createdAt
                ? new Date(bookmark.createdAt as any)
                : new Date(),
              groupId: bookmark.groupId || '-999999',
              sortedInfo: JSON.stringify(bookmark.sortedInfo || {}),
              icon: bookmark.icon || '',
              tag: JSON.stringify((bookmark as any).tag || {name: 'default', sortedIndex: -1}),
              workspace: workspaceName,
            })
            .run();
        }
      }

      // 3. 删除当前工作区间的分组并重新插入
      tx.delete(bookmarkGroupsTable)
        .where(eq(bookmarkGroupsTable.workspace, workspaceName))
        .run();

      if (storeInfo.groups && storeInfo.groups.length) {
        for (const group of storeInfo.groups) {
          tx.insert(bookmarkGroupsTable)
            .values({
              id: group.id,
              label: group.label,
              sortedIndex: group.sortedIndex ?? 0,
              color: (group as any).color || '',
              activeStatus: group.activeStatus ?? false,
              workspace: workspaceName,
            })
            .run();
        }
      }

      // 4. 删除当前工作区间的分组信息并重新插入
      tx.delete(groupInfoTable)
        .where(eq(groupInfoTable.workspace, workspaceName))
        .run();

      if (storeInfo.groupInfo && storeInfo.groupInfo.length) {
        for (const info of storeInfo.groupInfo) {
          if (!info.data || !info.data.length) {
            continue;
          }
          for (const item of info.data) {
            tx.insert(groupInfoTable)
              .values({
                workspace: workspaceName,
                groupName: info.name,
                itemId: item.id,
                sortedIndex: item.sortedIndex ?? -1,
              })
              .run();
          }
        }
      }
    });
  }

  /**
   * @zh 从 SQLite 数据库中加载书签存储信息
   * @param workspaceName 工作区间名称
   * @returns 书签存储信息, 若不存在则返回 null
   */
  load(workspaceName: string): IBookmarkStoreInfo | null {
    const db = this.db;

    const meta = db
      .select()
      .from(storeMetaTable)
      .where(eq(storeMetaTable.workspace, workspaceName))
      .get();

    if (!meta) {
      return null;
    }

    const bookmarkRows = db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.workspace, workspaceName))
      .all();

    const groupRows = db
      .select()
      .from(bookmarkGroupsTable)
      .where(eq(bookmarkGroupsTable.workspace, workspaceName))
      .all();

    const groupInfoRows = db
      .select()
      .from(groupInfoTable)
      .where(eq(groupInfoTable.workspace, workspaceName))
      .all();

    const bookmarks = bookmarkRows.map(row => ({
      id: row.id,
      label: row.label,
      description: row.description,
      color: row.color,
      fileUri: {fsPath: row.fileUriPath},
      type: row.type as any,
      selectionContent: row.selectionContent,
      languageId: row.languageId,
      workspaceFolder: {
        name: row.workspaceFolderName,
        index: row.workspaceFolderIndex,
      },
      rangesOrOptions: this._safeParseJSON(row.rangesOrOptions, {}),
      createdAt: row.createdAt,
      groupId: row.groupId,
      sortedInfo: this._safeParseJSON(row.sortedInfo, {
        color: -1,
        custom: -1,
        default: -1,
        file: -1,
        workspace: -1,
        icon: -1,
      }),
      icon: row.icon,
      tag: this._safeParseJSON(row.tag, {name: 'default', sortedIndex: -1}),
    })) as any[];

    const groups = groupRows.map(row => ({
      id: row.id,
      label: row.label,
      sortedIndex: row.sortedIndex,
      color: row.color,
      activeStatus: row.activeStatus,
      workspace: row.workspace,
    }));

    // 重建 groupInfo 数组
    const groupInfoMap = new Map<string, {name: string; data: {id: string; sortedIndex: number}[]}>();
    for (const row of groupInfoRows) {
      if (!groupInfoMap.has(row.groupName)) {
        groupInfoMap.set(row.groupName, {name: row.groupName, data: []});
      }
      groupInfoMap.get(row.groupName)!.data.push({
        id: row.itemId,
        sortedIndex: row.sortedIndex,
      });
    }
    const groupInfo = Array.from(groupInfoMap.values()) as BookmarkGroupInfoType[];

    return {
      version: meta.version,
      workspace: workspaceName,
      updatedDate: meta.updatedAt ? new Date(meta.updatedAt).toLocaleString() : '',
      updatedDateTimespan: meta.updatedAt ? new Date(meta.updatedAt).getTime() : 0,
      viewType: meta.viewType,
      groupView: meta.groupView,
      sortedType: meta.sortedType,
      bookmarks,
      groups,
      groupInfo,
    };
  }

  /**
   * @zh 检查指定工作区间是否已有存储数据
   * @param workspaceName 工作区间名称
   */
  has(workspaceName: string): boolean {
    const db = this.db;
    const meta = db
      .select()
      .from(storeMetaTable)
      .where(eq(storeMetaTable.workspace, workspaceName))
      .get();
    return !!meta;
  }

  /**
   * @zh 删除指定工作区间的所有存储数据
   * @param workspaceName 工作区间名称
   */
  delete(workspaceName: string): void {
    const db = this.db;
    db.transaction((tx) => {
      tx.delete(bookmarksTable)
        .where(eq(bookmarksTable.workspace, workspaceName))
        .run();
      tx.delete(bookmarkGroupsTable)
        .where(eq(bookmarkGroupsTable.workspace, workspaceName))
        .run();
      tx.delete(storeMetaTable)
        .where(eq(storeMetaTable.workspace, workspaceName))
        .run();
      tx.delete(groupInfoTable)
        .where(eq(groupInfoTable.workspace, workspaceName))
        .run();
    });
  }

  private _safeParseJSON<T>(str: string, fallback: T): T {
    try {
      return JSON.parse(str) as T;
    } catch {
      return fallback;
    }
  }

  initial(): void {}

  dispose(): void {
    super.dispose();
  }
}
