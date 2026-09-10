export type JsonSchemaObject = Record<string, unknown>;

export type OpenApiParameter = {
  readonly name: string;
  readonly in: "query" | "path" | "header" | "cookie";
  readonly required?: boolean;
  readonly schema: JsonSchemaObject;
  readonly description?: string;
};

export type OpenApiMediaType = {
  readonly schema: JsonSchemaObject;
};

export type OpenApiRequestBody = {
  readonly required?: boolean;
  readonly content: Record<string, OpenApiMediaType>;
};

export type OpenApiResponse = {
  readonly description: string;
  readonly content?: Record<string, OpenApiMediaType>;
};

export type OpenApiOperation = {
  readonly tags: readonly string[];
  readonly summary: string;
  readonly description?: string;
  readonly security?: ReadonlyArray<Record<string, readonly string[]>>;
  readonly parameters?: readonly OpenApiParameter[];
  readonly requestBody?: OpenApiRequestBody;
  readonly responses: Record<string, OpenApiResponse>;
};

export type OpenApiPathItem = {
  readonly get?: OpenApiOperation;
  readonly post?: OpenApiOperation;
  readonly put?: OpenApiOperation;
  readonly patch?: OpenApiOperation;
  readonly delete?: OpenApiOperation;
};

export type OpenApiPaths = Record<string, OpenApiPathItem>;

export type OpenApiDocument = {
  readonly openapi: string;
  readonly info: {
    readonly title: string;
    readonly version: string;
    readonly description?: string;
  };
  readonly tags: ReadonlyArray<{ readonly name: string; readonly description?: string }>;
  readonly paths: OpenApiPaths;
  readonly components: {
    readonly securitySchemes: Record<string, JsonSchemaObject>;
    readonly schemas: Record<string, JsonSchemaObject>;
  };
};
