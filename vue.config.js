const { IgnorePlugin } = require('webpack')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
module.exports = {
  configureWebpack: {
    plugins: [
      new IgnorePlugin(/^\.\/locale$/, /moment$/),
      new IgnorePlugin(/sql-asm-memory-growth.js$/),
    ]
  },
  css: {
    extract: { ignoreOrder: true },
  },
  transpileDependencies: ["vuetify"],
  pluginOptions: {
    electronBuilder: {
      externals: ['better-sqlite3', 'canvas', 'bindings'],
      preload: {
        mainPreload: 'src/lib/preload/mainPreload.js',
        projectPreload: 'src/lib/preload/projectPreload.js',
        workerPreload: 'src/lib/preload/workerPreload.js'
      },
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      chainWebpackMainProcess: config => {
        // config.plugin('analyse').use(
        //   BundleAnalyzerPlugin,
        //   [{
        //     analyzerHost: '0.0.0.0',
        //     analyzerPort: 'auto'
        //   }]
        // )
        config.plugin('ignore-moment-locales').use(
          IgnorePlugin,
          [{
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
          }]
        )
        config.plugin('ignore-asm-mem-growth-geopackage-js').use(
          IgnorePlugin,
          [{
            resourceRegExp: /sql-asm-memory-growth.js$/
          }]
        )
        config
          .entry('mapcacheThread')
          .add('./src/lib/threads/mapcacheThread.js')
          .end()
          .entry('tileRenderingThread')
          .add('./src/lib/threads/tileRenderingThread.js')
          .end()
          .entry('tileRenderingProcess')
          .add('./src/lib/processes/tileRenderingProcess.js')
          .end()
          .output
          .filename(() => {
            return '[name].js'
          })
        config.module
          .rule("node")
          .test(/\.node$/)
          .use("node-loader")
          .loader("node-loader")
          .end()
        config.module
          .rule("js")
          .test(/\.js$/)
          .use("babel-loader")
          .loader("babel-loader")
          .end()
      },
      chainWebpackRendererProcess: config => {
        // config.plugin('analyse').use(
        //   BundleAnalyzerPlugin,
        //   [{
        //     analyzerHost: '0.0.0.0',
        //     analyzerPort: 'auto'
        //   }]
        // )
        config.plugin('ignore-moment-locales').use(
          IgnorePlugin,
          [{
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
          }]
        )
        config.plugin('ignore-asm-mem-growth-geopackage-js').use(
          IgnorePlugin,
          [{
            resourceRegExp: /sql-asm-memory-growth.js$/
          }]
        )
        config.module
          .rule("node")
          .test(/\.node$/)
          .use("node-loader")
          .loader("node-loader")
          .end()
        config.module
          .rule("js")
          .test(/\.js$/)
          .use("babel-loader")
          .loader("babel-loader")
          .end()
      },
      builderOptions: {
        productName: "MapCache",
        appId: "mil.nga.mapcache",
        copyright: "Copyright © 2020 National Geospatial-Intelligence Agency",
        npmRebuild: false,
        extraResources: ['./extraResources/**'],
        asarUnpack: [
          "**/node_modules/bin-wrapper/**/*",
          "**/node_modules/imagemin-pngquant/**/*",
          "**/node_modules/pngquant-bin/**/*",
          "**/node_modules/better-sqlite3/**/*",
          "**/node_modules/canvas/**/*",
          "**/node_modules/mime/**/*",
          "**/node_modules/bindings/**/*",
          "**/node_modules/file-uri-to-path/**/*",
          "**/tileRenderingThread.js",
          "**/mapcacheThread.js"
        ],
        directories: {
          buildResources: "buildResources"
        },
        dmg: {
          contents: [
            {
              x: 410,
              y: 150,
              type: "link",
              path: "/Applications"
            },
            {
              x: 130,
              y: 150,
              type: "file"
            }
          ],
          sign: false
        },
        mac: {
          category: "public.app-category.productivity",
          target: [
            "dmg",
            "pkg"
          ],
          icon: "buildResources/icon.icns",
          hardenedRuntime : true,
          gatekeeperAssess: false,
          entitlements: "buildResources/entitlements.mac.plist",
          entitlementsInherit: "buildResources/entitlements.mac.plist"
        },
        win: {
          target: [
            "portable",
            "nsis"
          ],
          icon: "buildResources/icon.ico"
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          include: "buildResources/uninstaller.nsh"
        },
        linux: {
          icon: "buildResources/icons",
          target: [
            "deb",
            "rpm",
            "tar.gz"
          ]
        }
      }
    }
  }
}
