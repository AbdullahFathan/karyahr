import { Router } from "express";
import { ping } from "../controllers/system.controller";

/**
 * Registers system module HTTP routes.
 */
export function createSystemRouter(): Router {
  const router = Router();
  router.get("/ping", ping);
  return router;
}
