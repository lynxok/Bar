import { db, SystemLog, AuditLog } from '../db/database';

export class LoggerService {
  /**
   * Registra un error en el sistema
   */
  static async error(message: string, context?: string) {
    const log: SystemLog = {
      level: 'error',
      message,
      context,
      timestamp: new Date().toISOString()
    };
    await db.systemLogs.add(log);
    console.error(`[SYSTEM_ERROR] ${message}`, context);
  }

  /**
   * Registra una advertencia
   */
  static async warn(message: string, context?: string) {
    const log: SystemLog = {
      level: 'warning',
      message,
      context,
      timestamp: new Date().toISOString()
    };
    await db.systemLogs.add(log);
  }

  /**
   * Registra un evento de auditoría (cambios realizados por usuarios)
   */
  static async audit(action: string, module: string, details: string, userId: string = 'system', userName: string = 'Sistema') {
    const log: AuditLog = {
      userId,
      userName,
      action,
      module,
      details,
      timestamp: new Date().toISOString()
    };
    await db.auditLogs.add(log);
    console.log(`[AUDIT] ${action} in ${module}: ${details}`);
  }

  /**
   * Limpia los logs antiguos (opcional, para mantenimiento)
   */
  static async clearOldLogs(days: number = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const isoCutoff = cutoff.toISOString();
    
    await db.systemLogs.where('timestamp').below(isoCutoff).delete();
    await db.auditLogs.where('timestamp').below(isoCutoff).delete();
  }
}
