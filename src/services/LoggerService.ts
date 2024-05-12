import {
  LogOutputChannel,
  window,
  env,
  TelemetryLogger,
  Disposable,
  LogLevel,
  workspace,
} from 'vscode';
import {EXTENSION_ID, EXTENSION_NAME} from '../constants';

export interface LoggerType extends Disposable {
  output: LogOutputChannel;
  telemetry: TelemetryLogger;
}

let logger: LoggerType;

/**
 * 创建Telemetry和Logger工具
 */
export function registerTelemetryLogger() {
  const outputChannel = window.createOutputChannel(EXTENSION_NAME, {
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

workspace.onDidChangeConfiguration(e => {
  const logLevelId = `${EXTENSION_ID}.logLevel`;
  if (e.affectsConfiguration(logLevelId)) {
    LoggerService.logLevel =
      LogLevel[
        // @ts-ignore
        workspace.getConfiguration(EXTENSION_ID).get('logLevel') || 'Warning'
      ] || LogLevel.Warning;
  }
});

export class LoggerService {
  readonly prefix: string;

  static logLevel: LogLevel = LogLevel.Info;

  constructor(private contextName: string) {
    this.prefix = `- [${this.contextName}] >`;
    LoggerService.logLevel =
      LogLevel[
        // @ts-ignore
        workspace.getConfiguration(EXTENSION_ID).get('logLevel') || 'Warning'
      ] || LogLevel.Warning;
  }

  info(...msg: any[]) {
    if (LoggerService.logLevel > LogLevel.Info) {
      return;
    }
    logger.output.info(this.prefix, ...msg);
    logger.telemetry.logUsage('info', {
      info: msg,
    });
  }

  log(...msg: any[]) {
    if (LoggerService.logLevel > LogLevel.Info) {
      return;
    }
    logger.output.info(this.prefix, ...msg);
    logger.telemetry.logUsage('log', {
      info: msg,
    });
  }

  warn(...msg: any[]) {
    if (LoggerService.logLevel > LogLevel.Warning) {
      return;
    }
    logger.output.warn(this.prefix, ...msg);
    logger.telemetry.logUsage('warn', {
      info: msg,
    });
  }

  trace(...msg: any[]) {
    if (LoggerService.logLevel > LogLevel.Trace) {
      return;
    }
    logger.output.warn(this.prefix, ...msg);
    logger.telemetry.logUsage('warn', {
      info: msg,
    });
  }

  debug(...msg: any[]) {
    if (LoggerService.logLevel > LogLevel.Debug) {
      return;
    }
    logger.output.debug(this.prefix, ...msg);
    logger.telemetry.logUsage('debug', {
      info: msg,
    });
  }

  error(...msg: any[]) {
    logger.output.error(this.prefix, ...msg);
    logger.telemetry.logError('error', {
      info: msg,
    });
  }
}
