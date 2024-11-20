import {ServiceManager} from './ServiceManager';
import {EXTENSION_ID} from '../constants';
import {BaseService} from './BaseService';
import {applySnapshot, IDisposer, onSnapshot} from 'mobx-state-tree';

/**
 * @zh 书签颜色的一个管理服务类, 间接操作对应的store
 */
export default class ColorsService extends BaseService {
  // private _snapshotDisposer: IDisposer;

  constructor(sm: ServiceManager) {
    super(ColorsService.name, sm);

    // this._snapshotDisposer = onSnapshot(this.sm.store.colors, snapshot => {
    //   this.saveToDisk(this.sm.fileService.colorsPath, snapshot);
    // });

    // this.initial();

    // onSnapshot(this.configure.configure.colors, snapshot => {
    //   if(this.configure.configure.colors){

    //   }
    // })
    // this.sm.configService.onDidChangeConfiguration(ev => {
    //   if (
    //     ev.affectsConfiguration(`${EXTENSION_ID}.defaultBookmarkIconColor`) ||
    //     ev.affectsConfiguration(`${EXTENSION_ID}.colors`) ||
    //     ev.affectsConfiguration(`${EXTENSION_ID}.useBuiltInColors`)
    //   ) {
    //   }
    // });
  }

  initial() {
    // this.sm.colors.forEach((value, key) => {
    //   this.store.addNewColor(String(key), value);
    // });
  }

  dispose(): void {
    // this._snapshotDisposer();
  }
}
