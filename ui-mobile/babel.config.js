// Path: ui-mobile/babel.config.js
// Summary: Implements babel.config module logic.

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    plugins: [],
  };
};
