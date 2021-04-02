const webpack = require('webpack')
module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
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
        mainPreload: 'src/preload/mainPreload.js',
        projectPreload: 'src/preload/projectPreload.js',
        workerPreload: 'src/preload/workerPreload.js',
        // mapcacheThread: 'src/threads/mapcacheThread.js',
        // geotiffThread: 'src/threads/geotiffThread.js'
      },
      nodeIntegration: true,
      nodeIntegrationInWorker: true,
      chainWebpackMainProcess: config => {
        config
          .entry('geotiff')
          .add('./src/threads/geotiffThread.js')
          .end()
          .entry('mapcache')
          .add('./src/threads/mapcacheThread.js')
          .end()
          .output
          .filename((pathData) => {
            if (pathData.chunk.name === 'geotiff') {
              return '[name]Thread.js'
            } else if (pathData.chunk.name === 'mapcache') {
              return '[name]Thread.js'
            } else {
              return '[name].js'
            }
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
        asarUnpack: [
          "**/node_modules/imagemin-pngquant/**/*",
          "**/node_modules/pngquant-bin/**/*",
          "**/node_modules/bin-wrapper/**/*",
          "**/geotiffThread.js",
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
