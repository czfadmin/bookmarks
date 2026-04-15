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
  /**
   * @zh 获取插件的目录
   */
  get homeDir() {
    const _path = path.join(
      os.homedir(),
      os.platform() === 'win32'
        ? '.bookmark-manager'
        : './.config/bookmark-manager',
    );
    this.checkDirIsExists(_path);
    return _path;
  }

  /**
   * @zh 图像资源保存的路径
   */
  get iconsPath() {
    return path.join(this.homeDir, './icons.json');
  }

  get colorsPath() {
    return path.join(this.homeDir, './colors.json');
  }

  /**
   * @zh 文件配置路径
   */
  get configPath() {
    return path.join(this.homeDir, 'config.json');
  }

  constructor(sm: ServiceManager) {
    super(FileService.name, sm);
  }

  /**
   * @zh 检查输入的文件夹的目录是否存在, 如果不存在创建对应的文件夹
   */
  checkDirIsExists(p: string) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p);
    }
  }

  exists(file: string) {
    return fs.existsSync(file);
  }

  readFileSync(p: string) {
    return fs.readFileSync(p).toString();
  }

  saveToDisk(p: string, data: any) {
    fs.writeFileSync(p, JSON.stringify(data));
  }
  initial(): void {}

  dispose(): void {}
}
