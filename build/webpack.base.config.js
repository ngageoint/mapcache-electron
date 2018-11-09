const path = require("path");
const nodeExternals = require("webpack-node-externals");
const FriendlyErrorsWebpackPlugin = require("friendly-errors-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


const translateEnvToMode = (env) => {
  if (env === "production") {
    return "production";
  }
  return "development";
};

module.exports = env => {
  return {
    target: "electron-renderer",
    mode: translateEnvToMode(env),
    node: {
      __dirname: false,
      __filename: false
    },
    externals: [nodeExternals({
      whitelist: [/\.(png|svg|ico|jpg|gif)$/]
    })],
    resolve: {
      alias: {
        env: path.resolve(__dirname, `../config/env_${env}.json`)
      }
    },
    devtool: "source-map",
    module: {
      rules: [{
        test: /\.html/,
        loader: 'file-loader?name=[name].[ext]!extract-loader!html-loader',
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {}
          },
          'css-loader'
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.mustache$/,
        use: [{
          loader: 'mustache-loader',
          options: {
            name:'[name]_[hash:7].[ext]',
            publicPath: './views/',
            outputPath: 'views/',
            noShortcut: true
          }
        }]
      },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file-loader?name=fonts/[name].[ext]'
      },
      {
        test: /\.(png|svg|ico|jpg|gif)$/,
        use: [{
          loader: 'file-loader',
          options: {
            name:'[name]_[hash:7].[ext]',
            publicPath: './images/',
            outputPath: 'images/'
          }
        }]
      },
      {
        test: /xel\/images/,
        use: [{
          loader: 'file-loader',
          options: {
            name:'[path]/[name].[ext]',
          }
        }]
      }]
    },
    plugins: [
      new FriendlyErrorsWebpackPlugin({ clearConsole: env === "development" })
      , new MiniCssExtractPlugin()
    ]
  };
};
