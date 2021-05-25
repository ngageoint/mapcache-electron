var { expose } = require('threads/worker')
var {
  GeoPackageAPI,
  Context,
  setSqljsWasmLocateFile
  // FeatureTiles,
  // NumberFeaturesTile
} = require('@ngageoint/geopackage/dist/geopackage.min.js')

// var featureTableFeatureTilesMap = {}
setSqljsWasmLocateFile(file => 'file:///Users/caldwell/mapcache-electron/public/' + file);
Context.setupWebWorkerContext()

let geoPackage;

const tileRenderer = {
  open (data) {
    return new Promise((resolve) => {
      GeoPackageAPI.open(data).then(gp => {
        geoPackage = gp
        resolve()
      }).catch(e => {
        resolve({
          error: e
        })
      })
    })
  },
  close () {
    try {
      geoPackage.close()
    } catch (e) {
      console.error(e)
    } finally {
      geoPackage = null
      // featureTableFeatureTilesMap = {}
    }
  },
  // renderVectorTile (data) {
  //   const {x, y, z} = data.coords
  //   const featureTiles = featureTableFeatureTilesMap[data.tableName]
  //   if (featureTiles == null) {
  //     const featureDao = geoPackage.getFeatureDao(data.tableName)
  //     const featureTiles = new FeatureTiles(featureDao, 256, 256)
  //     featureTiles.maxFeaturesPerTile = data.maxFeatures
  //     featureTiles.maxFeaturesTileDraw = new NumberFeaturesTile()
  //     featureTableFeatureTilesMap[data.tableName] = featureTiles
  //   }
  //   featureTiles.maxFeatures = data.maxFeatures
  //   try {
  //     return await featureTiles.drawTile(x, y, z)
  //   } catch (e) {
  //     return null
  //   }
  // },
  renderTile (data) {
    let {x, y, z} = data.coords
    if (geoPackage) {
      return geoPackage.xyzTile(data.tableName, x, y, z, 256, 256)
    } else {
      return null
    }
  }
}

expose(tileRenderer)
