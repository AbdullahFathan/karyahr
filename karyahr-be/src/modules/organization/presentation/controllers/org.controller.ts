import type { Request, Response } from "express";
import { asyncHandler } from "../../../../shared/middleware/async-handler";
import type {
  CreateDepartmentUseCase,
  CreatePositionUseCase,
  DeleteDepartmentUseCase,
  DeletePositionUseCase,
  GetOrgTreeUseCase,
  ListDepartmentsUseCase,
  ListPositionsUseCase,
  UpdateDepartmentUseCase,
  UpdatePositionUseCase,
} from "../../domain/usecases/Org.usecase";
import {
  createDepartmentSchema,
  createPositionSchema,
  updateDepartmentSchema,
  updatePositionSchema,
} from "../schemas/org.schema";
import { routeParam } from "../../../../shared/utils/route-param";

/**
 * HTTP handlers for organization master data.
 */
export function createOrgController(deps: {
  readonly listDepartments: ListDepartmentsUseCase;
  readonly createDepartment: CreateDepartmentUseCase;
  readonly updateDepartment: UpdateDepartmentUseCase;
  readonly deleteDepartment: DeleteDepartmentUseCase;
  readonly listPositions: ListPositionsUseCase;
  readonly createPosition: CreatePositionUseCase;
  readonly updatePosition: UpdatePositionUseCase;
  readonly deletePosition: DeletePositionUseCase;
  readonly getTree: GetOrgTreeUseCase;
}) {
  const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
    const data = await deps.listDepartments.execute();
    res.status(200).json({ data });
  });

  const createDepartment = asyncHandler(async (req: Request, res: Response) => {
    const body = createDepartmentSchema.parse(req.body);
    const department = await deps.createDepartment.execute({
      name: body.name,
      code: body.code,
      parentId: body.parentId ?? null,
    });
    res.status(201).json(department);
  });

  const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
    const body = updateDepartmentSchema.parse(req.body);
    const department = await deps.updateDepartment.execute(routeParam(req.params.id, "id"), body);
    res.status(200).json(department);
  });

  const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
    await deps.deleteDepartment.execute(routeParam(req.params.id, "id"));
    res.status(204).send();
  });

  const listPositions = asyncHandler(async (_req: Request, res: Response) => {
    const data = await deps.listPositions.execute();
    res.status(200).json({ data });
  });

  const createPosition = asyncHandler(async (req: Request, res: Response) => {
    const body = createPositionSchema.parse(req.body);
    const position = await deps.createPosition.execute({
      name: body.name,
      code: body.code,
      parentId: body.parentId ?? null,
      departmentId: body.departmentId ?? null,
    });
    res.status(201).json(position);
  });

  const updatePosition = asyncHandler(async (req: Request, res: Response) => {
    const body = updatePositionSchema.parse(req.body);
    const position = await deps.updatePosition.execute(routeParam(req.params.id, "id"), body);
    res.status(200).json(position);
  });

  const deletePosition = asyncHandler(async (req: Request, res: Response) => {
    await deps.deletePosition.execute(routeParam(req.params.id, "id"));
    res.status(204).send();
  });

  const tree = asyncHandler(async (_req: Request, res: Response) => {
    const data = await deps.getTree.execute();
    res.status(200).json({ data });
  });

  return {
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    listPositions,
    createPosition,
    updatePosition,
    deletePosition,
    tree,
  };
}
