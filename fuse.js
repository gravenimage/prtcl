const { FuseBox, WebIndexPlugin, CSSPlugin } = require("fuse-box");
const fuse = FuseBox.init({
  homeDir: "src",
  target: "browser@es6",
  output: "dist/$name.js",
    plugins: [
        CSSPlugin(),
        WebIndexPlugin({
            template: "src/index.html"
        })],
});
fuse.dev(); // launch http server
fuse
  .bundle("app")
  .instructions(" > index.ts")
  .hmr()
  .watch();
fuse.run();

