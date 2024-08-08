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
      theme: './src/js/theme.js',
    },
    output: {
      path: path.join(__dirname, process.env.BROWSER === 'firefox' ? '/extension_firefox' : '/extension_chrome'),
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
              if (process.env.BROWSER === 'firefox' && path.includes('manifest.json')) {
                const manifest = JSON.parse(content.toString());

                delete manifest.background.service_worker
                delete manifest.browser_action;
                delete manifest.options_page;

                manifest.background.scripts = ['background.js'];
                manifest.permissions = manifest.permissions.filter(p => p !== 'background');

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
      }),
      new webpack.EnvironmentPlugin({
        BROWSER: 'chrome'
      }),
      process.env.BROWSER !== 'firefox' && new webpack.BannerPlugin({
        banner: 'if (typeof browser === "undefined") { browser = chrome; }',
        raw: true,
        entryOnly: false
      })
    ]
  }
};
