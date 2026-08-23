const path = require('path');
const webpack = require('webpack');
const { getManifest } = require('./manifest.config.js');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const lightningcss = require('lightningcss');
const browserslist = require('browserslist');
const WebpackBar = require('webpackbar');
const SVGSpritemapPlugin = require('svg-spritemap-webpack-plugin');

const BROWSER = process.env.BROWSER || 'chrome';

module.exports = (env, arg) => {
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
      theme: './src/js/theme.js'
    },
    output: {
      path: path.join(__dirname, BROWSER === 'firefox' ? '/extension_firefox' : '/extension_chrome'),
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
          loader: 'esbuild-loader',
          options: { target: 'chrome105' }
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
            }
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
            }
          ]
        }
      ]
    },
    optimization: {
      splitChunks: {
        chunks: 'async',
        minSize: 0,
        name: 'shared'
      },
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
            output: { comments: /@?license/i },
            compress: { passes: 1 }
          }
        }),
        new CssMinimizerPlugin({
          minify: CssMinimizerPlugin.lightningCssMinify,
          minimizerOptions: {
            targets: lightningcss.browserslistToTargets(browserslist('chrome >= 105 or firefox >= 128'))
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
      {
        apply(compiler) {
          compiler.hooks.thisCompilation.tap('GenerateManifestPlugin', (compilation) => {
            compilation.hooks.processAssets.tap(
              {
                name: 'GenerateManifestPlugin',
                // stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
              },
              () => {
                const manifest = getManifest(BROWSER);
                const json = JSON.stringify(manifest, null, 2);
                compilation.emitAsset('manifest.json', new webpack.sources.RawSource(json));
              }
            );
          });
        }
      },
      new CopyWebpackPlugin({
        patterns: [{ from: 'static' }]
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
      new MiniCssExtractPlugin({ filename: 'css/[name].css' }),
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
        });
      }),
      new webpack.EnvironmentPlugin({ BROWSER: 'chrome' }),
      BROWSER !== 'firefox' && new webpack.BannerPlugin({
        banner: 'if (typeof browser === "undefined") { browser = chrome; }',
        raw: true,
        entryOnly: false,
        test: /\.js$/
      })
    ]
  };
};
