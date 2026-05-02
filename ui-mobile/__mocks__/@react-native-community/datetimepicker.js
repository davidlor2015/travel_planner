const React = require("react");

const DateTimePickerAndroid = {
  open: jest.fn(),
};

function DateTimePicker({ accessibilityLabel, onChange, testID }) {
  return React.createElement("DateTimePicker", {
    accessibilityLabel,
    accessibilityRole: "adjustable",
    onPress: () => onChange?.({ type: "set" }, new Date(2000, 0, 1, 14, 30)),
    testID,
  });
}

module.exports = {
  __esModule: true,
  default: DateTimePicker,
  DateTimePickerAndroid,
};
