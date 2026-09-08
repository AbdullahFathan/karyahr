export type IPasswordHasher = {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

export type IAccessTokenSigner = {
  sign(input: { readonly userId: string; readonly employeeId: string }): Promise<string>;
};

export type IssuedRefreshToken = {
  readonly raw: string;
  readonly hash: string;
};

export type IRefreshTokenIssuer = {
  issue(): IssuedRefreshToken;
  hash(raw: string): string;
};
