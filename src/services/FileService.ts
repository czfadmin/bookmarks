import {FileSystemProvider} from 'vscode';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ServiceManager} from './ServiceManager';
import {BaseService} from './BaseService';
/**
 * @zh 文件操作相关的服务
 */
export class FileService extends BaseService {
  constructor(sm: ServiceManager) {
    super(FileService.name, sm);
  }
  exist(file: string) {
    return fs.existsSync(file);
  }

  /**
   * @zh 获取插件的目录
   */
  get homeDir() {
    const _path = path.join(
      os.homedir(),
      os.platform() === 'win32'
        ? '.bookmark-manager'
        : './config/.bookmark-manager',
    );
    if (!fs.existsSync(_path)) {
      fs.mkdirSync(_path);
    }
    return _path;
  }

  get iconsDir() {
    const _path = path.join(this.homeDir, './icons');
    if (!fs.existsSync(_path)) {
      fs.mkdirSync(_path);
    }
    return _path;
  }
}
