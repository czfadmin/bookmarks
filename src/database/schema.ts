import {integer, sqliteTable, text} from 'drizzle-orm/sqlite-core';

/**
 * @zh 书签表
 */
export const bookmarksTable = sqliteTable('bookmarks', {
  id: text('id').primaryKey(),
  label: text('label').notNull().default(''),
  description: text('description').notNull().default(''),
  color: text('color').notNull().default('default'),
  /**
   * @zh 书签所在文件的相对路径
   */
  fileUriPath: text('file_uri_path').notNull(),
  type: text('type').notNull().default('line'),
  selectionContent: text('selection_content').notNull().default(''),
  languageId: text('language_id').notNull().default('javascript'),
  /**
   * @zh 工作区间名称
   */
  workspaceFolderName: text('workspace_folder_name').notNull(),
  /**
   * @zh 工作区间索引
   */
  workspaceFolderIndex: integer('workspace_folder_index').notNull().default(0),
  /**
   * @zh 装饰器范围信息 (JSON 序列化)
   */
  rangesOrOptions: text('ranges_or_options').notNull(),
  createdAt: integer('created_at', {mode: 'timestamp_ms'})
    .notNull()
    .$defaultFn(() => new Date()),
  groupId: text('group_id').notNull().default('-999999'),
  /**
   * @zh 各个分组情况下的排序信息 (JSON 序列化)
   */
  sortedInfo: text('sorted_info').notNull(),
  icon: text('icon').notNull().default(''),
  /**
   * @zh 标签信息 (JSON 序列化)
   */
  tag: text('tag').notNull().default('{"name":"default","sortedIndex":-1}'),
  /**
   * @zh 所属工作区间名称 (用于多工作区间区分)
   */
  workspace: text('workspace').notNull(),
});

/**
 * @zh 书签分组表
 */
export const bookmarkGroupsTable = sqliteTable('bookmark_groups', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  sortedIndex: integer('sorted_index').notNull().default(0),
  color: text('color').notNull().default(''),
  activeStatus: integer('active_status', {mode: 'boolean'})
    .notNull()
    .default(false),
  workspace: text('workspace').notNull().default(''),
});

/**
 * @zh 存储元数据表 (每个工作区间一条记录)
 */
export const storeMetaTable = sqliteTable('store_meta', {
  workspace: text('workspace').primaryKey(),
  version: text('version').notNull().default(''),
  viewType: text('view_type').notNull().default('tree'),
  groupView: text('group_view').notNull().default('file'),
  sortedType: text('sorted_type').notNull().default('linenumber'),
  updatedAt: integer('updated_at', {mode: 'timestamp_ms'})
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * @zh 分组视图信息表 (groupInfo)
 */
export const groupInfoTable = sqliteTable('group_info', {
  id: integer('id').primaryKey({autoIncrement: true}),
  workspace: text('workspace').notNull(),
  groupName: text('group_name').notNull(),
  itemId: text('item_id').notNull(),
  sortedIndex: integer('sorted_index').notNull().default(-1),
});

export type BookmarkRow = typeof bookmarksTable.$inferSelect;
export type NewBookmarkRow = typeof bookmarksTable.$inferInsert;
export type BookmarkGroupRow = typeof bookmarkGroupsTable.$inferSelect;
export type NewBookmarkGroupRow = typeof bookmarkGroupsTable.$inferInsert;
export type StoreMetaRow = typeof storeMetaTable.$inferSelect;
export type GroupInfoRow = typeof groupInfoTable.$inferSelect;
