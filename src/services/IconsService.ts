import fs from 'node:fs';
import {ServiceManager} from './ServiceManager';
import {ofetch} from 'ofetch';
import {
  iconfiy_public_url,
  iconify_collection_endpoint,
} from '../constants/icons';
import {LoggerService} from './LoggerService';
import path from 'node:path';
import {IconifyIconsType} from '../types/icon';
import {IDisposable} from '../utils';
import {BaseService} from './BaseService';

/**
 * @zh 装饰器和树上的图标服务类
 */
export class IconsService extends BaseService {
  constructor(sm: ServiceManager) {
    super(IconsService.name, sm);
    this.initial();
  }

  /**
   * @zh  下载iconfiy中的图标, 要求传递的格式是 {prefix}:{name}, vscode的装饰器图标的大小要求是16*16, 所以下载的大小默认是此尺寸
   * @param prefixWithName
   */
  async downloadIcon(prefixWithName: string) {
    const [prefix, name] = prefixWithName.split(':');

    if (!prefix || !name) {
      return;
    }

    const file = path.join(this._sm.fileService.iconsDir, `./${prefix}.json`);

    if (!fs.existsSync(file)) {
      const response = await this.download(
        `${iconfiy_public_url}/${prefix}.json?icons=${name}`,
      );
      const svgBody = (response as IconifyIconsType).icons[name].body;
      this.store.addNewIcon(prefix, name, svgBody);
      fs.writeFileSync(file, JSON.stringify(response));
    } else {
      const content = JSON.parse(
        fs.readFileSync(file).toString(),
      ) as IconifyIconsType;

      if (!content.icons[name]) {
        const response = await this.download(
          `${iconfiy_public_url}/${prefix}.json?icons=${name}`,
        );

        content.icons[name] = (response as IconifyIconsType).icons[name];
        const svgBody = (response as IconifyIconsType).icons[name].body;
        this.store.addNewIcon(prefix, name, svgBody);
        fs.writeFileSync(file, JSON.stringify(content));
      }
    }
  }

  /**
   * @zh 开始下载初始图标资源
   */
  async initial() {
    const configure = this._sm.connfigure;
    if (!configure) {
      return;
    }
    const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
      configure.configure!;

    await this.downloadIcon(defaultBookmarkIcon);
    await this.downloadIcon(defaultLabeledBookmarkIcon);
  }
  /**
   * 下载集合列表
   */
  async downloadCollectionList() {
    const response = await this.download(
      `${iconfiy_public_url}/${iconify_collection_endpoint}`,
    );
  }

  async download(url: string) {
    try {
      return await ofetch(url);
    } catch (error) {
      this._logger.error(error);
      return error;
    }
  }

  dispose(): void {}
}
