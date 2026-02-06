import { z, ZodTypeAny } from 'zod';
import type { JsonSchemaProperty, InputSchema } from './types.js';

/**
 * Convert a single JSON Schema property to a Zod type.
 */
export function convertJsonSchemaToZod(prop: JsonSchemaProperty): ZodTypeAny {
  let schema: ZodTypeAny;

  switch (prop.type) {
    case 'string': {
      if (prop.enum && prop.enum.length > 0) {
        schema = z.enum(prop.enum as [string, ...string[]]);
        break;
      }
      let s = z.string();
      if (prop.pattern) {
        s = s.regex(new RegExp(prop.pattern));
      }
      if (prop.minLength !== undefined) {
        s = s.min(prop.minLength);
      }
      if (prop.maxLength !== undefined) {
        s = s.max(prop.maxLength);
      }
      schema = s;
      break;
    }

    case 'number': {
      if (prop.enum && prop.enum.length > 0) {
        schema = z.union(
          prop.enum.map((v) => z.literal(v)) as [
            ReturnType<typeof z.literal>,
            ReturnType<typeof z.literal>,
            ...ReturnType<typeof z.literal>[],
          ],
        );
        break;
      }
      let n = z.number();
      if (prop.minimum !== undefined) {
        n = n.min(prop.minimum);
      }
      if (prop.maximum !== undefined) {
        n = n.max(prop.maximum);
      }
      schema = n;
      break;
    }

    case 'integer': {
      if (prop.enum && prop.enum.length > 0) {
        schema = z.union(
          prop.enum.map((v) => z.literal(v)) as [
            ReturnType<typeof z.literal>,
            ReturnType<typeof z.literal>,
            ...ReturnType<typeof z.literal>[],
          ],
        );
        break;
      }
      let i = z.number().int();
      if (prop.minimum !== undefined) {
        i = i.min(prop.minimum);
      }
      if (prop.maximum !== undefined) {
        i = i.max(prop.maximum);
      }
      schema = i;
      break;
    }

    case 'boolean': {
      schema = z.boolean();
      break;
    }

    case 'array': {
      const itemSchema = prop.items
        ? convertJsonSchemaToZod(prop.items)
        : z.any();
      let a = z.array(itemSchema);
      if (prop.minItems !== undefined) {
        a = a.min(prop.minItems);
      }
      if (prop.maxItems !== undefined) {
        a = a.max(prop.maxItems);
      }
      schema = a;
      break;
    }

    case 'object': {
      if (prop.properties) {
        const shape: Record<string, ZodTypeAny> = {};
        const required = new Set(prop.required || []);
        for (const [key, childProp] of Object.entries(prop.properties)) {
          let childSchema = convertJsonSchemaToZod(childProp);
          if (!required.has(key)) {
            childSchema = childSchema.optional();
          }
          shape[key] = childSchema;
        }
        schema = z.object(shape);
      } else {
        schema = z.record(z.any());
      }
      break;
    }

    default: {
      schema = z.any();
      break;
    }
  }

  if (prop.description) {
    schema = schema.describe(prop.description);
  }

  return schema;
}

/**
 * Convert a plugin's inputSchema to a flat Record<string, ZodTypeAny>.
 * This is what McpServer.registerTool() expects for its shape parameter.
 */
export function convertInputSchema(
  schema: InputSchema,
): Record<string, ZodTypeAny> {
  const result: Record<string, ZodTypeAny> = {};
  const required = new Set(schema.required || []);

  for (const [key, prop] of Object.entries(schema.properties)) {
    let zodType = convertJsonSchemaToZod(prop);
    if (!required.has(key)) {
      zodType = zodType.optional();
    }
    result[key] = zodType;
  }

  return result;
}
