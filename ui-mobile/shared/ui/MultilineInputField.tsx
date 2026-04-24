import type { TextInputProps } from "react-native";

import { TextInputField } from "./TextInputField";

type Props = Omit<TextInputProps, "multiline"> & {
  label: string;
  hint?: string;
  error?: string | null;
};

export function MultilineInputField(props: Props) {
  return <TextInputField {...props} multiline textAlignVertical="top" />;
}
