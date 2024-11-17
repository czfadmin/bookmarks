import {FileSystemProvider} from 'vscode';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ServiceManager } from './ServiceManager';
/**
 * @zh 文件操作相关的服务
 */
export class FileService {

  private _sm:ServiceManager
  constructor(sm: ServiceManager) {
    this._sm = sm
  }
  exist(file: string) {
    return fs.existsSync(file);
  }

  /**
   * @zh 获取插件的目录
   */
  get homeDir() {
    return path.join(
      os.homedir(),
      os.platform() === 'win32'
        ? '.bookmark-manager'
        : './config/.bookmark-manager',
    );
  }


  


}
