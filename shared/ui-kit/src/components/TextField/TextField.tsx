import type { ReactNode } from "react";
import { Block, StyledInput } from "../_shared";
import { Text } from "../Text";

export type TextFieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  multiline?: boolean;
  onChangeText?: (value: string) => void;
};

export function TextField({ label, hint, error, leading, trailing, id, ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <Block gap="$2" width="100%">
      {label ? <Text role="label" {...(fieldId ? { htmlFor: fieldId } : {})}>{label}</Text> : null}
      <Block position="relative">
        <StyledInput
          id={fieldId}
          aria-invalid={Boolean(error)}
          borderColor={error ? "$danger" : undefined}
          paddingStart={leading ? "$10" : undefined}
          paddingEnd={trailing ? "$10" : undefined}
          {...props}
        />
        {leading ? <Block position="absolute" insetInlineStart="$3" top={0} bottom={0} justifyContent="center">{leading}</Block> : null}
        {trailing ? <Block position="absolute" insetInlineEnd="$3" top={0} bottom={0} justifyContent="center">{trailing}</Block> : null}
      </Block>
      {error ? <Text role="caption" tone="danger">{error}</Text> : hint ? <Text role="caption" tone="muted">{hint}</Text> : null}
    </Block>
  );
}
