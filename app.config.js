// Deploy-time overrides on top of app.json.
// EXPO_BASE_URL lets CI export for sub-path hosting (e.g. GitHub Pages
// project sites at /RangeDay) without changing local dev.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
