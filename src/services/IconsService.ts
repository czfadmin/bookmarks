import {ServiceManager} from './ServiceManager';
import {ofetch} from 'ofetch';
import {
  iconfiy_public_url,
  iconify_collection_endpoint,
} from '../constants/icons';
import {IconifyIconsType} from '../types/icon';
import {BaseService} from './BaseService';
import {applySnapshot, IDisposer, onSnapshot} from 'mobx-state-tree';

/**
 * @zh 装饰器和树上的图标服务类
 */
export class IconsService extends BaseService {
  private _snapshotDisposer: IDisposer;

  private _snapshotDisposer2: IDisposer;

  constructor(sm: ServiceManager) {
    super(IconsService.name, sm);

    this._snapshotDisposer = onSnapshot(this.sm.store.icons, snapshot => {
      this.saveToDisk(this.sm.fileService.iconsPath, snapshot);
    });

    // 监听插件的的`icons`的变化, 更新存储
    this._snapshotDisposer2 = onSnapshot(
      this.configure.configure.icons,
      snapshot => {
        if (!this.configure.configure.icons.size) {
          const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
            this.configure.configure;

          const tobeDeleted = this.store.icons.filter(
            it =>
              it.id != defaultBookmarkIcon &&
              it.id != defaultLabeledBookmarkIcon,
          );

          this.store.removeIcons(tobeDeleted.map(it => it.id));

          return;
        }
        this.configure.configure.icons.forEach((value, key) => {
          if (!this.store.icons.find(it => it.id !== value)) {
            this.downloadIcon(value);
          }
        });
      },
    );

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

    if (
      !this.store.icons.find(it => it.prefix === prefix && it.name === name)
    ) {
      const response = await this.download(
        `${iconfiy_public_url}/${prefix}.json?icons=${name}`,
      );

      const svgBody = (response as IconifyIconsType).icons[name].body;
      this.store.addNewIcon(prefix, name, svgBody);
    }
  }

  /**
   * @zh 开始下载初始图标资源
   */
  async initial() {
    if (this.sm.fileService.exists(this.sm.fileService.iconsPath)) {
      const content = this.sm.fileService.readFileSync(
        this.sm.fileService.iconsPath,
      );

      const obj = JSON.parse(content) as {
        id: string;
        prefix: string;
        name: string;
        body: string;
      }[];

      if (!obj || !obj.length) {
        this.downloadDefaultIcons();
      } else {
        const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
          this.configure.configure;

        if (!obj.find(it => it.id === defaultBookmarkIcon)) {
          await this.downloadIcon(defaultBookmarkIcon);
        }

        if (!obj.find(it => it.id === defaultLabeledBookmarkIcon)) {
          await this.downloadIcon(defaultLabeledBookmarkIcon);
        }
      }
      applySnapshot(this.sm.store.icons, obj);
      return;
    }

    await this.downloadDefaultIcons();
  }

  async downloadDefaultIcons() {
    const configure = this.configure;
    if (!configure) {
      return;
    }
    const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
      configure.configure;

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

  dispose(): void {
    this._snapshotDisposer();
    this._snapshotDisposer2();
  }
}
