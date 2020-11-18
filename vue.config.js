module.exports = {
  pluginOptions: {
    electronBuilder: {
      externals: ['better-sqlite3', 'canvas', 'gdal', 'bindings'],
      nodeIntegration: true,
      chainWebpackMainProcess: config => {
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
          "node_modules/gdal/**/*"
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
          icon: "buildResources/icon.icns"
        },
        win: {
          target: [
            "portable"
          ],
          icon: "dist_electron/icon.png"
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },
        linux: {
          icon: "dist_electron/icons",
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
