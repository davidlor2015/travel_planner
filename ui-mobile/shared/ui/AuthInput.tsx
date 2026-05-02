import { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import { fontStyles } from "@/shared/theme/typography";

// Auth-screen palette — export so screens can use bg / button colors
export const AUTH_PALETTE = {
  bg: "#EFE7D6",
  input: "#E7DEC9",
  border: "#C9BCA1",
  clay: "#A87A5A",
  text: "#2A231C",
  placeholder: "#8A7E74",
} as const;

// ─── Web CSS injection ────────────────────────────────────────────────────────
// StyleSheet cannot express pseudo-selectors. On Expo Web, TextInput renders as
// <input>, so browser autofill and focus rules override RN styles unless we
// inject real CSS. The box-shadow inset trick is the only reliable way to paint
// over the browser's autofill background.
let _webStylesInjected = false;

function injectAuthInputStyles() {
  if (_webStylesInjected || typeof document === "undefined") return;
  _webStylesInjected = true;

  const el = document.createElement("style");
  el.id = "roen-auth-input-styles";
  el.textContent = `
    input.auth-input {
      appearance: none;
      -webkit-appearance: none;
      outline: none !important;
      box-shadow: none !important;
    }
    input.auth-input:focus {
      outline: none !important;
      box-shadow: none !important;
    }
    /* Autofill: 1000px inset shadow paints over the browser's yellow/blue fill */
    input.auth-input:-webkit-autofill,
    input.auth-input:-webkit-autofill:hover,
    input.auth-input:-webkit-autofill:focus,
    input.auth-input:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px #E7DEC9 inset !important;
      box-shadow: 0 0 0 1000px #E7DEC9 inset !important;
      -webkit-text-fill-color: #2A231C !important;
      caret-color: #A87A5A !important;
      /* Delay the background-color transition so the autofill fill never
         flashes through before our shadow paints */
      transition: background-color 5000s ease-in-out 0s;
    }
  `;
  document.head.appendChild(el);
}
// ─────────────────────────────────────────────────────────────────────────────

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export function AuthInput({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);

  // Inject CSS on first mount (web only)
  useEffect(() => {
    if (Platform.OS === "web") injectAuthInputStyles();
  }, []);

  return (
    <View style={s.wrap}>
      <Text style={[s.label, fontStyles.uiMedium]}>{label}</Text>
      <TextInput
        // ── iOS ──────────────────────────────────────────────────────────────
        // selectionColor controls both the caret and text-selection highlight;
        // without it, iOS renders a blue cursor regardless of background color
        selectionColor={AUTH_PALETTE.clay}
        // Prevent the dark keyboard variant from casting a gray tint onto the
        // field background when the keyboard slides up
        keyboardAppearance="light"
        // ── Android ──────────────────────────────────────────────────────────
        underlineColorAndroid="transparent"
        // ── Web ──────────────────────────────────────────────────────────────
        // className targets the injected CSS rules above.
        // autoComplete/spellCheck suppress browser suggestion UI that can also
        // trigger autofill-style tints.
        className={Platform.OS === "web" ? "auth-input" : undefined}
        // ── Shared ───────────────────────────────────────────────────────────
        placeholderTextColor={AUTH_PALETTE.placeholder}
        autoCorrect={false}
        spellCheck={false}
        style={[
          s.input,
          fontStyles.uiRegular,
          focused && s.inputFocused,
          !!error && s.inputError,
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error ? (
        <Text style={[s.error, fontStyles.uiMedium]}>{error}</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.6,
    color: AUTH_PALETTE.placeholder,
    marginBottom: 8,
  },
  input: {
    // Must be in StyleSheet, not a NativeWind class — RN Web applies inline
    // styles after browser stylesheets, so this wins except for pseudo-selectors
    // (autofill, :focus) which are handled by the injected CSS above.
    backgroundColor: AUTH_PALETTE.input,
    borderWidth: 1,
    borderColor: AUTH_PALETTE.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: AUTH_PALETTE.text,
  },
  inputFocused: {
    borderColor: AUTH_PALETTE.clay,
    borderWidth: 1.5,
    // backgroundColor deliberately absent — fill must not shift on focus
  },
  inputError: {
    borderColor: "#881337",
    borderWidth: 1,
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    color: "#881337",
  },
});
