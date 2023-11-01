import {EXTENSION_ID} from '../constants';

function info(...msg: any[]) {
  console.log(
    `%c[${EXTENSION_ID}]%c(info)%c: `,
    `background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff`,
    'background: green; padding: 1px; border-radius:0 3px 3px 0;  color: #fff',
    'background:unset',
    ...msg,
  );
}

function warn(...msg: any[]) {
  console.warn(
    `%c[${EXTENSION_ID}]%c(warn)%c: `,
    `background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff`,
    'background: orange; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
    'background:unset',
    ...msg,
  );
}

function error(...msg: any[]) {
  console.warn(
    `%c[${EXTENSION_ID}]%c(error)%c: `,
    `background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff`,
    'background: red; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff',
    'background:unset',
    ...msg,
  );
}

function log(...msg: any[]) {
  console.log(
    `%c[${EXTENSION_ID}]%c(log)%c: `,
    `background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff`,
    'background: blue; padding: 1px; border-radius:0 3px 3px 0;  color: #fff',
    'background:unset',
    ...msg,
  );
}

export default {
  info,
  warn,
  error,
  log,
};
