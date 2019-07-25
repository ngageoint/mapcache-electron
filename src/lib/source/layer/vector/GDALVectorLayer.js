import VectorLayer from './VectorLayer'
import gdal from 'gdal'
import path from 'path'

export default class GDALVectorLayer extends VectorLayer {
  _features

  async initialize () {
    this.openGdalFile()
    if (this.layer.name.startsWith('OGR')) {
      this.name = path.basename(this.filePath, path.extname(this.filePath))
    } else {
      this.name = this.layer.name
    }
    this.removeMultiFeatures()
    this._features = this.getFeaturesInLayer()
    await super.initialize()
    return this
  }

  openGdalFile () {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this.dataset = gdal.open(this.filePath)
    this.layer = this.dataset.layers.get(this.sourceLayerName)
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'GDALVector'
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._features
    }
  }

  getFeaturesInLayer () {
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let toNative = new gdal.CoordinateTransformation(this.layer.srs, wgs84)
    return this.layer.features.map((feature) => {
      try {
        let projected = feature.clone()
        let geom = projected.getGeometry()
        if (!this.layer.srs.isSame(wgs84)) {
          geom.transform(toNative)
        }
        let geojson = geom.toObject()
        return {
          type: 'Feature',
          properties: feature.fields.toObject(),
          geometry: geojson
        }
      } catch (e) {
      }
    }).filter(feature => feature !== undefined)
  }

  removeMultiFeatures () {
    let expanded = false
    let fileName = this.name + '.geojson'
    let filePath = this.cacheFolder.dir(this.id).file(fileName).path()
    let fullFile = path.join(filePath, fileName)
    if (fullFile === this.filePath) {
      return
    }
    let outds = gdal.open(fullFile, 'w', 'GeoJSON')
    let outLayer = outds.layers.create(this.sourceLayerName, this.layer.srs, gdal.wkbPolygon)
    this.layer.features.forEach(feature => {
      let geom = feature.getGeometry()
      if (geom.name === 'MULTIPOLYGON' || geom.name === 'MULTILINESTRING') {
        let children = geom.children
        children.forEach((child, i) => {
          let newFeature = feature.clone()
          newFeature.setGeometry(child)
          outLayer.features.add(newFeature)
          expanded = true
        })
      } else {
        outLayer.features.add(feature)
      }
    })
    outds.close()
    if (expanded) {
      this.filePath = fullFile
      this.openGdalFile()
    } else {
      this.cacheFolder.dir(this.id).remove()
    }
  }

  iterateFeaturesInBounds (bounds, buffer) {
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let fromNative = new gdal.CoordinateTransformation(wgs84, this.layer.srs)
    let toNative = new gdal.CoordinateTransformation(this.layer.srs, wgs84)
    let envelope = new gdal.Envelope({
      minX: bounds[0][1],
      maxX: bounds[1][1],
      minY: bounds[0][0],
      maxY: bounds[1][0]
    })

    let bufferDistance = 0
    if (buffer) {
      bufferDistance = ((bounds[1][1] - bounds[0][1]) / 256) * 32
    }
    let filter = envelope.toPolygon().buffer(bufferDistance, 0).getEnvelope().toPolygon()
    if (!this.layer.srs.isSame(wgs84)) {
      filter.transform(fromNative)
    }
    this.layer.setSpatialFilter(filter)
    let featureMap = this.layer.features.map((feature) => {
      try {
        let projected = feature.clone()
        let geom = projected.getGeometry()
        if (!this.layer.srs.isSame(wgs84)) {
          geom.transform(toNative)
        }
        if (envelope.toPolygon().within(geom)) {
          return
        }
        geom.intersection(envelope.toPolygon().buffer(bufferDistance))
        let geojson = geom.toObject()

        return {
          type: 'Feature',
          properties: feature.fields.toObject(),
          geometry: geojson
        }
      } catch (e) {

      }
    }).filter(feature => feature !== undefined)
    this.layer.setSpatialFilter(null)

    return featureMap
  }
}
