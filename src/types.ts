export interface JsonSchemaProperty {
  type: string;
  description?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  enum?: (string | number)[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  minItems?: number;
  maxItems?: number;
}

export interface InputSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface PayTollEndpoint {
  method: string;
  path: string;
  price: string;
  description: string;
  category: string;
  name: string;
  version: string;
  inputSchema: InputSchema;
}

export interface PayTollMeta {
  service: string;
  version: string;
  x402: {
    scheme: string;
    networks: string[];
    facilitator: string;
  };
  pluginCount: number;
  endpoints: PayTollEndpoint[];
  categories: string[];
}
