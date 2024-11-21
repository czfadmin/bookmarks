import {ServiceManager} from './ServiceManager';
import {ofetch} from 'ofetch';
import {
  iconfiy_public_url,
  iconify_collection_endpoint,
} from '../constants/icons';
import {IconifyIconsType} from '../types/icon';
import {BaseService} from './BaseService';
import {applySnapshot, IDisposer, onSnapshot} from 'mobx-state-tree';
import {Uri, window, workspace} from 'vscode';
import {escapeColor} from '../utils';
import {EXTENSION_ID} from '../constants';

/**
 * @zh 装饰器和树上的图标服务类
 */
export class IconsService extends BaseService {
  private _snapshotDisposer: IDisposer;

  private _snapshotDisposer2: IDisposer;

  private _downloadingIcons: string[];

  public get icons() {
    return this.store.icons;
  }

  constructor(sm: ServiceManager) {
    super(IconsService.name, sm);
    this._downloadingIcons = [];
    this._snapshotDisposer = onSnapshot(this.sm.icons, snapshot => {
      console.log(this.store.icons);
      this.saveToDisk(this.sm.fileService.iconsPath, this.sm.icons);
    });

    // 监听插件的的`icons`的变化, 更新存储
    this._snapshotDisposer2 = onSnapshot(
      this.configure.configure.icons,
      snapshot => {
        // if (!this.configure.configure.icons.size) {
        //   const {icons} = this.configure.configure;
        //   const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
        //     this.configure.configure;

        //   const iconsValue: string[] = [];
        //   for (let item of icons.values()) {
        //     iconsValue.push(item);
        //   }

        //   // 删除之前配置的且现在不在配置中多余的图标
        //   const tobeDeleted = this.store.icons.filter(
        //     it =>
        //       it.id != defaultBookmarkIcon &&
        //       it.id != defaultLabeledBookmarkIcon &&
        //       !iconsValue.includes(it.id),
        //   );

        //   this.store.removeIcons(tobeDeleted.map(it => it.id));
        // }

        this.configure.configure.icons.forEach((value, key) => {
          if (
            !this.store.icons.find(it => it.id === value) &&
            !this._downloadingIcons.find(it => it === value)
          ) {
            this._downloadingIcons.push(value);
            this.downloadIcon(value).then(() => {
              this._downloadingIcons = this._downloadingIcons.filter(
                it => it !== value,
              );
            });
          }
        });
      },
    );
    // 监听配置中的默认图标配置

    workspace.onDidChangeConfiguration(ev => {
      if (
        ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIcon`) ||
        ev.affectsConfiguration(`${EXTENSION_ID}.defaultLabeledBookmarkIcon`)
      ) {
        const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
          this.configure.configure;
        if (!this.store.icons.find(it => it.id === defaultBookmarkIcon)) {
          this.downloadIcon(defaultBookmarkIcon);
        }
        if (
          !this.store.icons.find(it => it.id === defaultLabeledBookmarkIcon)
        ) {
          this.downloadIcon(defaultLabeledBookmarkIcon);
        }
      }
    });

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

    if (this._downloadingIcons.find(it => it === prefixWithName)) {
      return;
    }

    this._downloadingIcons.push(prefixWithName);

    if (!this.store.icons.find(it => it.id === prefixWithName)) {
      window.showInformationMessage('Downloading icon ....');
      const response = await this.download(
        `${iconfiy_public_url}/${prefix}.json?icons=${name}`,
      );
      window.showInformationMessage('Icon downloaded successfully!');

      const svgBody = (response as IconifyIconsType).icons[name].body;
      this.store.addNewIcon(prefix, name, svgBody);

      this._downloadingIcons = this._downloadingIcons.filter(
        it => it !== prefixWithName,
      );
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
        applySnapshot(this.sm.store.icons, obj);

        const {defaultBookmarkIcon, defaultLabeledBookmarkIcon} =
          this.configure.configure;

        if (!obj.find(it => it.id === defaultBookmarkIcon)) {
          await this.downloadIcon(defaultBookmarkIcon);
        }

        if (!obj.find(it => it.id === defaultLabeledBookmarkIcon)) {
          await this.downloadIcon(defaultLabeledBookmarkIcon);
        }
        return;
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

  async getIconUri(name: string, colorLabel: string = 'default') {
    let icon = this.store.icons.find(it => it.id === name);

    if (!icon) {
      await this.downloadIcon(name);
      icon = this.store.icons.find(it => it.id === name);
    }

    let color =
      this.store.colors.find(it => it.label === colorLabel)?.value ||
      this.configure.configure.defaultBookmarkIconColor;

    color = color.startsWith('#') ? escapeColor(color) : color;

    const body = icon?.body.replace(/fill="(\w.*?)"/gi, `fill="${color}"`);

    return Uri.parse(
      `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24">${body}</svg>`,
    );
  }

  async getDotIcon(colorLabel: string) {
    return this.getIconUri(
      this.configure.configure.defaultBookmarkIcon,
      colorLabel,
    );
  }

  dispose(): void {
    this._snapshotDisposer();
    this._snapshotDisposer2();
  }
}
