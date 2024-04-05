import {ExtensionContext} from 'vscode';
import {registerCommand} from '../utils';
import logger from '../utils/logger';

function log(name: string) {
  logger.log(`command: ${name} has registered successfully!`);
}

/**
 * 注册所需要的代码相关命令
 * 注意写法, 默认从对应的模块中导入, 然后注册自定义的命令以及回调,
 * 不要额外的进行使用`register`去注册,同意使用此方法注册命令
 *  @param context
 *
 */
function registerCodeCommands(context: ExtensionContext) {
  import('./bookmark')
    .then(modules => {
      Object.keys(modules).forEach(key => {
        // @ts-ignore
        const callback = modules[key] as any;
        if (typeof callback === 'function') {
          log(callback.name);
          registerCommand(callback.name, async args => {
            await callback(args);
          });
          return;
        }

        if (Array.isArray(callback)) {
          for (let cb of callback) {
            log(cb.name);
            registerCommand(cb.name, async args => {
              await cb.callback({command: cb, context}, args);
            });
          }
        }
      });
    })
    .catch(error => {
      logger.error(error.message);
    });
}

/**
 * 注册通用的书签命令
 * @param context
 */
function registerUniversalCommands() {
  import('./universal')
    .then(modules => {
      Object.keys(modules).forEach(key => {
        // @ts-ignore
        const callback = modules[key] as any;
        if (typeof callback === 'function') {
          log(callback.name);
          registerCommand(callback.name, async args => {
            await callback(args);
          });
          return;
        }
      });
    })
    .catch(error => {
      logger.error(error.message);
    });
}

export default function registerAllBookmarksCommands(
  context: ExtensionContext,
) {
  registerCodeCommands(context);
  registerUniversalCommands();
}
