import { ApiError, asyncHandler, ok, paginate } from '../utils/helpers.js';
import { prisma } from '../config/prisma.js';
import { recordAudit } from '../services/audit.service.js';

/**
 * Builds a standard REST controller for a Prisma model. Keeps the academic
 * structure endpoints (departments/courses/classes/subjects) consistent.
 */
export function crudController({
  model,
  entityName,
  searchFields = [],
  orderBy = { createdAt: 'desc' },
  include = undefined,
  validateCreate,
  validateUpdate,
}) {
  const delegate = prisma[model];

  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = paginate(req.query);
    const where = {};
    if (req.query.q && searchFields.length) {
      where.OR = searchFields.map((f) => ({
        [f]: { contains: req.query.q, mode: 'insensitive' },
      }));
    }
    for (const key of Object.keys(req.query)) {
      if (['page', 'limit', 'q', 'sort', 'order'].includes(key)) continue;
      if (key.endsWith('Id')) where[key] = req.query[key];
    }
    const [items, total] = await Promise.all([
      delegate.findMany({ where, include, orderBy, skip, take: limit }),
      delegate.count({ where }),
    ]);
    return ok(res, { items, total, page, limit, pages: Math.ceil(total / limit) });
  });

  const getOne = asyncHandler(async (req, res) => {
    const item = await delegate.findUnique({ where: { id: req.params.id }, include });
    if (!item) throw new ApiError(404, `${entityName} not found`);
    return ok(res, item);
  });

  const create = asyncHandler(async (req, res) => {
    validateCreate?.(req.body);
    const item = await delegate.create({ data: req.body, include });
    await recordAudit({
      action: 'CREATE',
      entity: entityName,
      entityId: item.id,
      meta: req.body,
      userId: req.user?.id,
      ip: req.ip,
    });
    return ok(res, item, 201);
  });

  const update = asyncHandler(async (req, res) => {
    const exists = await delegate.findUnique({ where: { id: req.params.id } });
    if (!exists) throw new ApiError(404, `${entityName} not found`);
    validateUpdate?.(req.body);
    const item = await delegate.update({
      where: { id: req.params.id },
      data: req.body,
      include,
    });
    await recordAudit({
      action: 'UPDATE',
      entity: entityName,
      entityId: item.id,
      meta: req.body,
      userId: req.user?.id,
      ip: req.ip,
    });
    return ok(res, item);
  });

  const remove = asyncHandler(async (req, res) => {
    const exists = await delegate.findUnique({ where: { id: req.params.id } });
    if (!exists) throw new ApiError(404, `${entityName} not found`);
    await delegate.delete({ where: { id: req.params.id } });
    await recordAudit({
      action: 'DELETE',
      entity: entityName,
      entityId: req.params.id,
      userId: req.user?.id,
      ip: req.ip,
    });
    return ok(res, { message: `${entityName} deleted` });
  });

  return { list, getOne, create, update, remove };
}

export default crudController;
