import {
  LogOutputChannel,
  window,
  env,
  TelemetryLogger,
  Disposable,
} from 'vscode';

export interface LoggerType extends Disposable {
  output: LogOutputChannel;
  telemetry: TelemetryLogger;
}

let logger: LoggerType;

/**
 * 创建Telemetry和Logger工具
 */
export function registerTelemetryLogger() {
  const outputChannel = window.createOutputChannel('Bookmark Manager', {
    log: true,
  });
  // TODO: 暂时无效果
  const telementry = env.createTelemetryLogger(
    {
      flush() {
        return;
      },
      sendEventData: function (
        eventName: string,
        data?: Record<string, any> | undefined,
      ): void {
        logger.output.trace(eventName, data);
      },
      sendErrorData: function (
        error: Error,
        data?: Record<string, any> | undefined,
      ): void {
        logger.output.error(error, data);
      },
    },
    {
      ignoreBuiltInCommonProperties: false,
      ignoreUnhandledErrors: false,
    },
  );
  logger = {
    output: outputChannel,
    telemetry: telementry,
    dispose() {
      this.output.dispose();
      this.telemetry.dispose();
    },
  };
  return logger;
}

/**
 * 返回封装好的日志记录器
 */
export function resolveLoggerChannel() {
  return logger;
}

export function info(msg: any) {
  logger.output.info('>', msg);
  logger.telemetry.logUsage('info', {
    info: msg,
  });
}

export function warn(msg: any) {
  logger.output.warn('>', msg);
  logger.telemetry.logUsage('warn', {
    info: msg,
  });
}

export function error(msg: any) {
  logger.output.error('>', msg);
  logger.telemetry.logError('error', {
    info: msg,
  });
}

export function log(msg: any) {
  logger.output.info('>', msg);
  logger.telemetry.logUsage('log', {
    info: msg,
  });
}

export function debug(msg: string) {
  logger.output.debug('> ', msg);
  logger.telemetry.logUsage('debug', {
    info: msg,
  });
}

export default {
  info,
  warn,
  error,
  log,
  debug,
};
