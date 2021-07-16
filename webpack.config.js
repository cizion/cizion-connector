const path = require("path");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  entry: path.resolve(__dirname, "src"),

  output: {
    library: "connector",
    libraryTarget: "umd",
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },

  resolve: {
    extensions: [".js", "jsx", ".ts", ".tsx", ".json"],
  },

  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        options: {
          configFile: "./.babelrc",
        },
      },
    ],
  },

  plugins: [new ForkTsCheckerWebpackPlugin()],
};
