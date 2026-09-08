import type { SystemStatus } from "../entities/SystemStatus";

/**
 * Returns process liveness status without touching infrastructure.
 */
export class PingUseCase {
  execute(): SystemStatus {
    return { ok: true, service: "karyahr-be" };
  }
}
