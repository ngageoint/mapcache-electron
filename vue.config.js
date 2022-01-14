const { IgnorePlugin } = require('webpack')
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
module.exports = {
  configureWebpack: {
    plugins: [
      new IgnorePlugin(/^\.\/locale$/, /moment$/),
    ]
  },
  css: {
    extract: { ignoreOrder: true },
  },
  transpileDependencies: ['vuetify'],
  pluginOptions: {
    electronBuilder: {
      externals: ['better-sqlite3', 'bindings'],
      customFileProtocol: 'mapcache://./',
      preload: {
        mainPreload: 'src/lib/preload/mainPreload.js',
        projectPreload: 'src/lib/preload/projectPreload.js',
        workerPreload: 'src/lib/preload/workerPreload.js',
        featureTablePreload: 'src/lib/preload/featureTablePreload.js'
      },
      chainWebpackMainProcess: config => {
        // config.plugin('analyse').use(
        //   BundleAnalyzerPlugin,
        //   [{
        //     analyzerMode: 'static'
        //   }]
        // )
        config.plugin('ignore-moment-locales').use(
          IgnorePlugin,
          [{
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
          }]
        )
        config.module.noParse(/node_modules\/rtree-sql\.js\/dist\/sql-wasm\.js$/)
        config
          .entry('mapcacheThread')
          .add('./src/lib/threads/mapcacheThread.js')
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
        // needed to update mainFields for electron-renderer target to look at browser last, for geopackage-js
        config.resolve.mainFields.clear().add('module').add('main').add('browser')
      },
      chainWebpackRendererProcess: config => {
        config.plugin('ignore-moment-locales').use(
          IgnorePlugin,
          [{
            resourceRegExp: /^\.\/locale$/,
            contextRegExp: /moment$/
          }]
        )
        config.module.noParse(/node_modules\/rtree-sql\.js\/dist\/sql-wasm\.js$/)
        // config.plugin('threads-plugin').use(ThreadsPlugin, [{target: 'electron-node-worker'}])
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
        // needed to update mainFields for electron-renderer target to look at browser last, for geopackage-js
        config.resolve.mainFields.clear().add('module').add('main').add('browser')
      },
      builderOptions: {
        productName: "MapCache",
        appId: "mil.nga.mapcache",
        copyright: "Copyright © 2020 National Geospatial-Intelligence Agency",
        npmRebuild: false,
        extraResources: ["./extraResources/**", {
          from: "./node_modules/@ngageoint/geopackage/dist/canvaskit/canvaskit.wasm",
          to: "canvaskit/canvaskit.wasm",
        }],
        protocols: [
          {
            name: "MapCache",
            role: "Editor",
            schemes: ["mapcache"]
          }
        ],
        asarUnpack: [
          "**/node_modules/bin-wrapper/**/*",
          "**/node_modules/imagemin-pngquant/**/*",
          "**/node_modules/pngquant-bin/**/*",
          "**/node_modules/better-sqlite3/**/*",
          "**/node_modules/mime/**/*",
          "**/node_modules/conf/**/*",
          "**/node_modules/ajv-formats/**/*",
          "**/node_modules/bindings/**/*",
          "**/node_modules/file-uri-to-path/**/*",
          "**/mapcacheThread.js",
          "**/0.js",
          "**/3.js",
          "**/4.js",
          "**/5.js",
          "**/6.js",
          "**/7.js",
          "**/8.js",
          "**/9.js",
          "**/10+.js",
          "**/11.js"
        ],
        directories: {
          buildResources: "buildResources"
        },
        buildDependenciesFromSource: true,
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
          fileAssociations: [
            {
              ext: 'gpkg',
              name: 'GeoPackage File',
              role: 'Editor',
              icon: 'gpkg_doc.icns'
            }
          ],
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
        mas: {
          category: "public.app-category.productivity",
          fileAssociations: [
            {
              ext: 'gpkg',
              name: 'GeoPackage File',
              role: 'Editor',
              icon: 'gpkg_doc.icns'
            }
          ],
          target: [
            "dmg",
            "pkg"
          ],
          icon: "buildResources/icon.icns",
          hardenedRuntime : true,
          gatekeeperAssess: false,
          entitlements: "buildResources/entitlements.mas.plist",
          entitlementsInherit: "buildResources/entitlements.mas.plist"
        },
        win: {
          fileAssociations: [
            {
              ext: 'gpkg',
              name: 'GeoPackage File',
              icon: 'gpkg_doc.ico'
            }
          ],
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
