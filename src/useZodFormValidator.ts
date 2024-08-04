import type { ComputedRef, Ref } from 'vue';
import { type ZodSchema, z } from 'zod';

type UseZodFormValidatorReturn = {
  errors: Ref<Record<string, boolean | string>>;
  isValid: ComputedRef<boolean>;
  clear: () => void;
  handleInputBlur: (e: Event | string) => void;
  overrideFieldError: (name: string, errorValue: boolean | string) => void;
  validate: () => { isValid: boolean; sanitizedValues: Record<string, unknown> };
  getSanitizedValues: () => Record<string, unknown>;
};

export default function (
  values: Ref<Record<string, unknown>>,
  validationSchema: ZodSchema,
  options: { mode: 'onBlur' | 'onChange' } = { mode: 'onBlur' },
): UseZodFormValidatorReturn {
  if (!(validationSchema instanceof z.ZodObject)) {
    throw new Error('validationSchema needs to be Zod schema, use z.object{...}');
  }

  const schema = validationSchema.shape ? validationSchema.shape : validationSchema;
  const errors = ref<Record<string, boolean | string>>({});
  const isValid = computed(
    () => Object.values(errors.value).findIndex((value) => typeof value === 'string' || value === true) === -1,
  );

  const handleInputBlur = (e: Event | string) => {
    let value: unknown;
    let name: string;
    if (e && typeof e === 'string') {
      name = e;
      value = values.value[name];
    } else if (e && typeof e === 'object' && e.target) {
      const target = e.target as HTMLInputElement;
      if (!target?.name) {
        throw new Error('handleInputBlur must be used with an input that has a name attribute');
      }
      name = target.name;
      value = target.name in values ? values.value[target.name] : target.value;
    } else {
      throw new Error('handleInputBlur got wrong event type');
    }
    if (name && name in schema && schema[name]) {
      const result = schema[name]?.safeParse(value);
      errors.value[name] = !result.success && result.error ? result.error.issues[0].message : false;
    }
  };

  const validateProperty = (name: string, value: unknown) => {
    const { success, error } = toValue(schema)[name].safeParse(value);
    errors.value[name] = !success && error ? error.issues[0].message : false;
    return errors.value[name];
  };

  const overrideFieldError = (name: string, errorValue: boolean | string) => {
    errors.value[name] = errorValue;
  };

  const validate = (): { isValid: boolean; sanitizedValues: Record<string, unknown> } => {
    errors.value = {};
    const { success, data, error } = validationSchema.safeParse(values.value);
    if (!success && error) {
      for (const issue of error.issues) {
        errors.value[issue.path.join('.')] = issue.message;
      }
    }
    return {
      isValid: Object.values(errors.value).findIndex((value) => typeof value === 'string' || value) === -1,
      sanitizedValues: success ? data : {},
    };
  };

  const getSanitizedValues = () => {
    const { success, data } = z.object(toValue(schema)).safeParse(values.value);
    return success ? data : {};
  };

  const clear = () => {
    errors.value = {};
  };

  const diffKeys = (obj1: Record<string, unknown>, obj2: Record<string, unknown>): string[] => {
    const keys = [];
    for (const key of Object.keys(obj1)) {
      if (obj1[key] !== obj2[key]) {
        keys.push(key);
      }
    }
    return keys;
  };

  if (options.mode === 'onChange') {
    watch(values, (newValues, oldValues) => {
      const propertiesThatChanged = diffKeys(newValues, oldValues);
      if (propertiesThatChanged.length > 1) {
        for (const propertyThatChanged of propertiesThatChanged) {
          validateProperty(propertyThatChanged, newValues[propertyThatChanged]);
        }
      }
    });
  }

  return {
    errors,
    isValid,
    clear,
    handleInputBlur,
    overrideFieldError,
    validate,
    getSanitizedValues,
  };
}
