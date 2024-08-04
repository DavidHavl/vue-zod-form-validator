import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, computed, watch } from 'vue';
import { z } from 'zod';
import useZodFormValidator from './useZodFormValidator';

// Mock Vue's ref, computed, and watch functions
vi.mock('vue', () => ({
  ref: vi.fn(),
  computed: vi.fn(),
  watch: vi.fn(),
}));

describe('useZodFormValidator', () => {
  const mockRef = (initialValue: any) => {
    const r = { value: initialValue };
    (ref as any).mockReturnValue(r);
    return r;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with empty errors and valid state', () => {
    const values = mockRef({});
    const schema = z.object({});
    
    const { errors, isValid } = useZodFormValidator(values, schema);
    
    expect(errors.value).toEqual({});
    expect(isValid.value).toBe(true);
  });

  it('should throw an error if schema is not a Zod object', () => {
    const values = mockRef({});
    const schema = z.string();
    
    expect(() => useZodFormValidator(values, schema)).toThrow('validationSchema needs to be Zod schema, use z.object{...}');
  });

  it('should validate on blur', () => {
    const values = mockRef({ name: 'John' });
    const schema = z.object({ name: z.string().min(5) });
    
    const { handleInputBlur, errors } = useZodFormValidator(values, schema);
    
    handleInputBlur('name');
    expect(errors.value.name).toBe('String must contain at least 5 character(s)');
  });

  it('should handle input blur with event object', () => {
    const values = mockRef({ email: '' });
    const schema = z.object({ email: z.string().email() });
    
    const { handleInputBlur, errors } = useZodFormValidator(values, schema);
    
    const event = { target: { name: 'email', value: 'invalid-email' } };
    handleInputBlur(event as unknown as Event);
    expect(errors.value.email).toBe('Invalid email');
  });

  it('should override field error', () => {
    const values = mockRef({});
    const schema = z.object({});
    
    const { overrideFieldError, errors } = useZodFormValidator(values, schema);
    
    overrideFieldError('customField', 'Custom error message');
    expect(errors.value.customField).toBe('Custom error message');
  });

  it('should validate all fields', () => {
    const values = mockRef({ name: 'John', age: 25 });
    const schema = z.object({ name: z.string().min(5), age: z.number().min(18) });
    
    const { validate } = useZodFormValidator(values, schema);
    
    const result = validate();
    expect(result.isValid).toBe(false);
    expect(result.sanitizedValues).toEqual({});
  });

  it('should get sanitized values', () => {
    const values = mockRef({ name: 'John Doe', age: '30' });
    const schema = z.object({ name: z.string(), age: z.number() });
    
    const { getSanitizedValues } = useZodFormValidator(values, schema);
    
    const sanitizedValues = getSanitizedValues();
    expect(sanitizedValues).toEqual({ name: 'John Doe', age: 30 });
  });

  it('should clear errors', () => {
    const values = mockRef({ name: 'John' });
    const schema = z.object({ name: z.string().min(5) });
    
    const { validate, clear, errors } = useZodFormValidator(values, schema);
    
    validate();
    expect(errors.value.name).toBeTruthy();
    
    clear();
    expect(errors.value).toEqual({});
  });

  it('should validate on change when mode is onChange', () => {
    const values = mockRef({ name: 'John' });
    const schema = z.object({ name: z.string().min(5) });
    
    useZodFormValidator(values, schema, { mode: 'onChange' });
    
    expect(watch).toHaveBeenCalled();
  });
});
