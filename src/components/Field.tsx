import { forwardRef, type ReactNode } from 'react';
import { Checkbox, Field as ChakraField, NativeSelect, Switch } from '@chakra-ui/react';

export interface FieldProps extends Omit<ChakraField.RootProps, 'label'> {
  label?: ReactNode;
  helperText?: ReactNode;
  /** Shown (and the field marked invalid) when set. */
  errorText?: ReactNode;
  /** Shown after the label when the field is not required, e.g. "(optional)". */
  optionalText?: ReactNode;
}

/**
 * Label, control, help and error in one block. `required`, `invalid`, `disabled` and
 * `readOnly` flow into the Chakra input inside through field context.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, helperText, errorText, optionalText, invalid, children, ...rest },
  ref,
) {
  return (
    <ChakraField.Root ref={ref} invalid={invalid ?? Boolean(errorText)} {...rest}>
      {label != null && (
        <ChakraField.Label>
          {label}
          <ChakraField.RequiredIndicator fallback={optionalText} />
        </ChakraField.Label>
      )}
      {children}
      {helperText != null && <ChakraField.HelperText>{helperText}</ChakraField.HelperText>}
      {errorText != null && <ChakraField.ErrorText>{errorText}</ChakraField.ErrorText>}
    </ChakraField.Root>
  );
});

/** Alias kept for readability in forms. */
export const FormField = Field;

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps extends Omit<NativeSelect.FieldProps, 'children' | 'size'> {
  options: SelectOption[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** Width of the control (token or "auto"); defaults to full width. */
  width?: NativeSelect.RootProps['width'];
  disabled?: boolean;
}

/** A native <select>: fast, accessible and correct on every platform. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { options, size = 'md', width, disabled, ...rest },
  ref,
) {
  return (
    <NativeSelect.Root size={size} width={width} disabled={disabled}>
      <NativeSelect.Field ref={ref} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  );
});

export interface CheckboxFieldProps extends Omit<Checkbox.RootProps, 'onCheckedChange' | 'checked' | 'label'> {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onCheckedChange, ...rest }: CheckboxFieldProps) {
  return (
    <Checkbox.Root checked={checked} onCheckedChange={(e) => onCheckedChange(e.checked === true)} {...rest}>
      <Checkbox.HiddenInput />
      <Checkbox.Control />
      <Checkbox.Label>{label}</Checkbox.Label>
    </Checkbox.Root>
  );
}

export interface SwitchFieldProps extends Omit<Switch.RootProps, 'onCheckedChange' | 'checked' | 'label'> {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SwitchField({ label, checked, onCheckedChange, ...rest }: SwitchFieldProps) {
  return (
    <Switch.Root checked={checked} onCheckedChange={(e) => onCheckedChange(e.checked)} {...rest}>
      <Switch.HiddenInput />
      <Switch.Control>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>{label}</Switch.Label>
    </Switch.Root>
  );
}
