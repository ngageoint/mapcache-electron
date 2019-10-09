import VectorLayer from './VectorLayer'
import gdal from 'gdal'
import path from 'path'

export default class GDALVectorLayer extends VectorLayer {
  _dataset
  _layer
  _features
  _extent

  async initialize () {
    this.openGdalFile()
    if (this._layer.name.startsWith('OGR')) {
      this.name = path.basename(this.filePath, path.extname(this.filePath))
    } else {
      this.name = this._layer.name
    }
    this.removeMultiFeatures()
    this._features = this.getFeaturesInLayer()
    this._extent = this._configuration.extent || this.extent
    await super.initialize()
    return this
  }

  openGdalFile () {
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    this._dataset = gdal.open(this.filePath)
    this._layer = this._dataset.layers.get(this.sourceLayerName)
  }

  get extent () {
    if (!this._extent) {
      let wgs84 = gdal.SpatialReference.fromEPSG(4326)
      let toNative = new gdal.CoordinateTransformation(this._layer.srs, wgs84)
      let extentPoly = this._layer.getExtent().toPolygon()
      extentPoly.transform(toNative)
      let currentEnvelope = extentPoly.getEnvelope()
      this._extent = [currentEnvelope.minX, currentEnvelope.minY, currentEnvelope.maxX, currentEnvelope.maxY]
    }
    return this._extent
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
    let toNative = new gdal.CoordinateTransformation(this._layer.srs, wgs84)

    return this._layer.features.map((feature) => {
      try {
        let geom = feature.getGeometry().clone()
        if (!this._layer.srs.isSame(wgs84)) {
          geom.transform(toNative)
        }
        return {
          type: 'Feature',
          id: feature.fid,
          properties: feature.fields.toObject(),
          geometry: geom.toObject()
        }
      } catch (e) {
        console.log(e)
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
    gdal.config.set('OGR_ENABLE_PARTIAL_REPROJECTION', 'YES')
    let newDataset = gdal.open(fullFile, 'w', 'GeoJSON')
    let newLayer = newDataset.layers.create(this.sourceLayerName, this._layer.srs, gdal.wkbPolygon)
    this._layer.features.forEach((feature) => {
      let geom = feature.getGeometry()
      let props = feature.fields.toObject()
      let propKeys = Object.keys(props)
      if (geom.name.toUpperCase() === 'MULTIPOLYGON' || geom.name.toUpperCase() === 'MULTILINESTRING') {
        let children = geom.children
        let count = children.count()
        if (count > 0) {
          expanded = true
        }
        for (let i = 0; i < count; i++) {
          const child = children.get(i)
          let newFeature = new gdal.Feature(this._layer)
          newFeature.setGeometry(child)
          propKeys.forEach((prop) => {
            newFeature.fields.set(prop, props[prop])
          })
          newLayer.features.add(newFeature)
        }
      } else {
        newLayer.features.add(feature)
      }
    })
    newDataset.close()
    if (expanded) {
      this._dataset.close()
      this.filePath = fullFile
      this.openGdalFile()
    } else {
      this.cacheFolder.dir(this.id).remove()
    }
  }

  iterateFeaturesInBounds (bounds, buffer) {
    let wgs84 = gdal.SpatialReference.fromEPSG(4326)
    let fromNative = new gdal.CoordinateTransformation(wgs84, this._layer.srs)
    let toNative = new gdal.CoordinateTransformation(this._layer.srs, wgs84)
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
    if (!this._layer.srs.isSame(wgs84)) {
      filter.transform(fromNative)
    }
    this._layer.setSpatialFilter(filter)
    let featureMap = this._layer.features.map((feature) => {
      try {
        let projected = feature.clone()
        let geom = projected.getGeometry()
        if (!this._layer.srs.isSame(wgs84)) {
          geom.transform(toNative)
        }
        if (envelope.toPolygon().within(geom)) {
          return
        }
        geom.intersection(envelope.toPolygon().buffer(bufferDistance))
        let geojson = geom.toObject()

        return {
          type: 'Feature',
          id: feature.fid,
          properties: feature.fields.toObject(),
          geometry: geojson
        }
      } catch (e) {

      }
    }).filter(feature => feature !== undefined)
    this._layer.setSpatialFilter(null)

    return featureMap
  }
}
