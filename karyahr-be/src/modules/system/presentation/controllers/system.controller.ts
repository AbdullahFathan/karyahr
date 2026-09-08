import type { Request, Response } from "express";
import { PingUseCase } from "../../domain/usecases/Ping.usecase";
import { pingQuerySchema } from "../schemas/ping.schema";
import type { PingResponseDto } from "../dtos/PingResponse.dto";

const pingUseCase = new PingUseCase();

/**
 * Handles GET /system/ping.
 */
export function ping(_req: Request, res: Response): void {
  pingQuerySchema.parse(_req.query);
  const status = pingUseCase.execute();
  const body: PingResponseDto = status;
  res.status(200).json(body);
}
