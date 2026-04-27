// Path: ui-mobile/shared/ui/Button.tsx
// Summary: Implements Button module logic.

import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";

import { fontStyles } from "@/shared/theme/typography";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent active:bg-accent-strong",
  secondary: "border border-border bg-surface-muted active:bg-surface-sunken",
  ghost: "bg-transparent active:bg-surface-sunken",
  danger: "bg-danger active:opacity-90",
};

const textClasses: Record<ButtonVariant, string> = {
  primary: "text-white",
  secondary: "text-text",
  ghost: "text-text-muted",
  danger: "text-white",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  icon,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        "min-h-11 flex-row items-center justify-center gap-2 rounded-full px-4 py-3",
        variantClasses[variant],
        fullWidth ? "w-full" : "",
        disabled ? "opacity-50" : "",
      ].join(" ")}
    >
      {icon}
      <Text
        className={["text-sm", textClasses[variant]].join(" ")}
        style={fontStyles.uiSemibold}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton(props: Omit<Props, "variant">) {
  return <Button {...props} variant="primary" />;
}

export function SecondaryButton(props: Omit<Props, "variant">) {
  return <Button {...props} variant="secondary" />;
}
