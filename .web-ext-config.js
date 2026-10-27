module.exports = {
  sourceDir: "./",
  artifactsDir: "./web-ext-artifacts",
  ignoreFiles: [
    ".agents",
    "skills-lock.json",
    ".web-ext-config.js",
    "README.md",
    "scripts",
  ],
  build: {
    overwriteDest: true,
  },
  run: {
    startUrl: "https://www.youtube.com/",
  },
};
