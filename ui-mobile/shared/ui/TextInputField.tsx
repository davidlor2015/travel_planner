// Path: ui-mobile/shared/ui/TextInputField.tsx
// Summary: Implements TextInputField module logic.

import { TextInput, type TextInputProps } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

import { Field } from "./Field";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function TextInputField({
  label,
  hint,
  error,
  multiline,
  className,
  style,
  ...props
}: Props) {
  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        multiline={multiline}
        placeholderTextColor="#8A7E74"
        className={[
          "rounded-2xl border border-border bg-white px-4 py-3 text-[15px] text-text",
          multiline ? "min-h-28 pt-3" : "",
          error ? "border-danger" : "",
          className ?? "",
        ].join(" ")}
        style={[fontStyles.uiRegular, style]}
        {...props}
      />
    </Field>
  );
}
