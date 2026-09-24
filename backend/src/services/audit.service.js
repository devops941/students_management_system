import { prisma } from '../config/prisma.js';

/** Append-only audit trail for tamper resistance. Never throws to callers. */
export async function recordAudit({ action, entity, entityId, meta, ip, userId }) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        meta: meta ? JSON.stringify(meta) : null,
        ip: ip || null,
        userId: userId || null,
      },
    });
  } catch (err) {
    // Audit failures must not break the request path.
    console.error('[audit] failed:', err.message);
  }
}

export default { recordAudit };
