const intro = `
const BUILD_TIME = "${process.env.BUILD_TIME}";
const BUILD_VERSION = "${process.env.BUILD_VERSION}";`;

const config = {
  input: "build/compiled/workers/crawl_worker.js",
  output: {
    file: "build/bundles/crawl_worker.js",
    format: "es",
    intro: intro,
  },
  plugins: [],
  treeshake: {
    moduleSideEffects: "no-external",
  },
};
export default config;
