const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const WebpackBar = require('webpackbar');
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin');

module.exports = (env, arg) => {
  const isDev = arg.mode === 'development'
  return {
    mode: arg.mode,
    experiments: {
      topLevelAwait: true
    },
    stats: {
      assets: false
    },
    devtool: arg.mode === 'development' ? 'inline-source-map' : false,
    entry: {
      newtab: './src/js/newtab.js',
      options: './src/js/options.js',
      background: './src/js/background.js',
    },
    output: {
      path: path.resolve(__dirname, 'extension'),
      filename(pathData) {
        return pathData.chunk.name === 'background' ? '[name].js' : 'js/[name].js';
      },
      chunkFilename: 'js/[name].js'
    },
    resolve: {
      modules: ['node_modules']
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          include: path.resolve(__dirname, 'src/js/components'),
          use: {
            loader: 'html-loader',
            options: {
              minimize: true,
              sources: false
            }
          }
        },
        {
          test: /\.js$/,
          exclude: [/node_modules/],
          // include: path.resolve(__dirname, 'src/js/components'),
          use: [{
            loader: 'babel-loader',
            options: { presets: ['@babel/env'] }
          }]
        },
        {
          // ccs-loader for web-components
          test: /vb-.*\/*\.css$/,
          exclude: [/node_modules/],
          use: [
            {
              loader: 'css-loader',
              options: {
                url: false
              }
            },
            'postcss-loader'
          ]
        },
        {
          test: /(newtab|options)\.css$/,
          exclude: [/node_modules/],
          use: [
            MiniCssExtractPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                url: false
              }
            },
            'postcss-loader'
          ]
        }
      ]
    },
    optimization: {
      // splitChunks: {
      //   cacheGroups: {
      //     // defaultVendors: {
      //     //   test: /[\\/]node_modules[\\/]/,
      //     //   priority: -10,
      //     //   chunks: 'initial',
      //     // }
      //     // vbComponents: {
      //     //     test: /[\\/]src[\\/]js[\\/]components[\\/]vb-[a-z]+[\\/]/,
      //     //     test: path.resolve(__dirname, 'src/js/components/vb-popup'),
      //     //     name: 'vb-components',
      //     //     chunks: 'all',
      //     //     minSize: 10000,
      //     //     reuseExistingChunk: true,
      //     // }
      //   }
      // },
      minimizer: [
        new TerserPlugin({
          // do not extract to separate file
          extractComments: false,
          terserOptions: {
            output: { comments: /@?license/i, },
            compress: { passes: 1 }
          }
        })
      ]
    },
    plugins: [
      new WebpackBar(),
      new CleanWebpackPlugin({
        verbose: false,
        cleanStaleWebpackAssets: false
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'static',
            transform(content, path) {
              if (path.includes('manifest.json') && arg.mode === 'development') {
                const manifest = JSON.parse(content.toString());
                manifest.content_security_policy = {
                  extension_pages: `script-src 'self'; object-src 'self'`,
                }
                return JSON.stringify(manifest, null, 2);
              }
              return content
            }
          }
        ]
      }),
      new SVGSpritemapPlugin(`./src/icons/**/*.svg`, {
        output: {
          filename: 'img/symbol.svg',
          svgo: {
            plugins: [
              'removeStyleElement',
              {
                name: 'removeAttrs',
                params: {
                  attrs: 'class|style'
                }
              }
            ]
          }
        },
        sprite: {
          prefix: false
        }
      }),
      new MiniCssExtractPlugin({
        filename: 'css/[name].css'
      }),
      ...['newtab', 'options'].map(name => {
        return new HtmlWebpackPlugin({
          template: `./src/${name}.html`,
          filename: `${name}.html`,
          scriptLoading: 'blocking',
          minify: {
            collapseWhitespace: true,
            removeComments: true,
            removeScriptTypeAttributes: true
          },
          chunks: [name]
        })
      })
    ]
  }
};
