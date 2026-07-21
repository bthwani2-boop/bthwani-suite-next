import type { ReactNode } from "react";
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
    numberOfLines?: number;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "decimal-pad";
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
    onChangeText?: (value: string) => void;
};
export declare function TextField({ label, hint, error, leading, trailing, id, ...props }: TextFieldProps): import("react").JSX.Element;
//# sourceMappingURL=TextField.d.ts.map
