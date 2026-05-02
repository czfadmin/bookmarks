import Database from 'better-sqlite3';
import {drizzle, BetterSQLite3Database} from 'drizzle-orm/better-sqlite3';
import path from 'node:path';
import * as schema from './schema';
import {sql} from 'drizzle-orm';

export type BookmarkDatabase = BetterSQLite3Database<typeof schema>;

/**
 * @zh 创建并初始化 SQLite 数据库连接, 同时确保所有表已创建
 * @param dbPath SQLite 数据库文件路径
 */
export function createDatabase(dbPath: string): BookmarkDatabase {
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, {schema});
  runMigrations(db);
  return db;
}

/**
 * @zh 运行数据库迁移, 创建所有需要的表
 */
function runMigrations(db: BookmarkDatabase) {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'default',
      file_uri_path TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'line',
      selection_content TEXT NOT NULL DEFAULT '',
      language_id TEXT NOT NULL DEFAULT 'javascript',
      workspace_folder_name TEXT NOT NULL,
      workspace_folder_index INTEGER NOT NULL DEFAULT 0,
      ranges_or_options TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      group_id TEXT NOT NULL DEFAULT '-999999',
      sorted_info TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      tag TEXT NOT NULL DEFAULT '{"name":"default","sortedIndex":-1}',
      workspace TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS bookmark_groups (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      sorted_index INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '',
      active_status INTEGER NOT NULL DEFAULT 0,
      workspace TEXT NOT NULL DEFAULT ''
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS store_meta (
      workspace TEXT PRIMARY KEY,
      version TEXT NOT NULL DEFAULT '',
      view_type TEXT NOT NULL DEFAULT 'tree',
      group_view TEXT NOT NULL DEFAULT 'file',
      sorted_type TEXT NOT NULL DEFAULT 'linenumber',
      updated_at INTEGER NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS group_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace TEXT NOT NULL,
      group_name TEXT NOT NULL,
      item_id TEXT NOT NULL,
      sorted_index INTEGER NOT NULL DEFAULT -1
    )
  `);
}
