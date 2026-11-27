import { forwardRef, type ReactNode } from 'react';
import { chakra, Checkbox, Field as ChakraField, NativeSelect, Switch } from '@chakra-ui/react';
import { useLoading } from '../skeleton/loading';
import { ghostCss } from '../skeleton/bones';

export interface FieldProps extends Omit<ChakraField.RootProps, 'label'> {
  label?: ReactNode;
  helperText?: ReactNode;
  /** Shown (and the field marked invalid) when set. */
  errorText?: ReactNode;
  /** Shown after the label when the field is not required, e.g. "(optional)". */
  optionalText?: ReactNode;
  /** Its value is coming (ADR 0061): the control is drawn as its own ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/**
 * Label, control, help and error in one block. `required`, `invalid`, `disabled` and
 * `readOnly` flow into the Chakra input inside through field context.
 */
export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { label, helperText, errorText, optionalText, invalid, loading: own, children, ...rest },
  ref,
) {
  const loading = useLoading(own);
  return (
    <ChakraField.Root ref={ref} invalid={invalid ?? Boolean(errorText)} {...rest}>
      {label != null && (
        <ChakraField.Label>
          {label}
          {/* "Optional" reads apart from the label: a space before it, quieter, not bold. */}
          <ChakraField.RequiredIndicator
            fallback={optionalText != null ? <chakra.span ms="1.5" color="fg.muted" fontWeight="normal" textStyle="caption">{optionalText}</chakra.span> : undefined}
          />
        </ChakraField.Label>
      )}
      {loading ? (
        <chakra.div width="full" borderRadius="l2" aria-hidden="true" css={ghostCss}>
          {children}
        </chakra.div>
      ) : (
        children
      )}
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
  /** Its value is coming (ADR 0061): drawn as its own ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

/** A native <select>: fast, accessible and correct on every platform. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { options, size = 'md', width, disabled, loading: own, ...rest },
  ref,
) {
  const loading = useLoading(own);
  return (
    <NativeSelect.Root size={size} width={width} disabled={disabled} borderRadius="l2" aria-hidden={loading || undefined} css={loading ? ghostCss : undefined}>
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
  /** Whether it's checked is coming (ADR 0061): the box is drawn as its own ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

export function CheckboxField({ label, checked, onCheckedChange, loading: own, ...rest }: CheckboxFieldProps) {
  const loading = useLoading(own);
  return (
    <Checkbox.Root checked={checked} onCheckedChange={(e) => onCheckedChange(e.checked === true)} {...rest}>
      <Checkbox.HiddenInput />
      <Checkbox.Control css={loading ? ghostCss : undefined} />
      <Checkbox.Label>{label}</Checkbox.Label>
    </Checkbox.Root>
  );
}

export interface SwitchFieldProps extends Omit<Switch.RootProps, 'onCheckedChange' | 'checked' | 'label'> {
  label: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Whether it's on is coming (ADR 0061): the switch is drawn as its own ghost. The nearest `Loading` scope's when not given. */
  loading?: boolean;
}

export function SwitchField({ label, checked, onCheckedChange, loading: own, ...rest }: SwitchFieldProps) {
  const loading = useLoading(own);
  return (
    <Switch.Root checked={checked} onCheckedChange={(e) => onCheckedChange(e.checked)} {...rest}>
      <Switch.HiddenInput />
      <Switch.Control css={loading ? ghostCss : undefined}>
        <Switch.Thumb />
      </Switch.Control>
      <Switch.Label>{label}</Switch.Label>
    </Switch.Root>
  );
}
