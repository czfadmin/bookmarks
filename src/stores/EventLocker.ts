import {types} from 'mobx-state-tree';
import {workspace} from 'vscode';

export const DidCreateModel = types
  .model('DidCreateModel', {
    bookmarks: types.array(types.string),
    fileId: types.string,
    fromFileId: types.string,
    fromStart: types.number,
    fromEnd: types.number,
  })
  .views(self => {
    return {};
  });

export const Locker = types
  .model('locker', {
    didCreate: types.maybeNull(DidCreateModel),
  })
  .actions(self => {
    return {
      updateDidCreate(fileId: string, fromFileId: string, bookmarks: string[]) {
        self.didCreate = DidCreateModel.create({
          fileId,
          fromFileId,
          bookmarks,
          fromStart: 0,
          fromEnd: 0,
        });
      },
      removeDidCreate() {
        self.didCreate = null;
      },
    };
  });
