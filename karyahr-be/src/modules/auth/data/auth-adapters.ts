import {
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  verifyPassword,
} from "../../../shared/auth/crypto";
import { signAccessToken } from "../../../shared/auth/jwt";
import type {
  IAccessTokenSigner,
  IPasswordHasher,
  IRefreshTokenIssuer,
} from "../domain/ports/AuthPorts";

export const bunPasswordHasher: IPasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};

export const joseAccessTokenSigner: IAccessTokenSigner = {
  sign: signAccessToken,
};

export const cryptoRefreshTokenIssuer: IRefreshTokenIssuer = {
  issue: generateRefreshToken,
  hash: hashRefreshToken,
};
