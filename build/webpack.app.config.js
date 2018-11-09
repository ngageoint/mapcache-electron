const path = require("path");
const merge = require("webpack-merge");
const base = require("./webpack.base.config");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = env => {
  return merge(base(env), {
    entry: {
      appHtml: './src/app.html',
      projectHtml: './src/project.html',
      images: './src/images/index.js',
      vendor: './src/vendor/index.js',
      background: "./src/background.js",
      app: "./src/app.js",
      project: "./src/project.js"
    },
    output: {
      filename: "[name].js",
      path: path.resolve(__dirname, "../app"),
      publicPath: '/'
    }
  });
};
