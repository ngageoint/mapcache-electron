import VectorLayer from './VectorLayer'
import GeoPackage, {BoundingBox, DataTypes} from '@ngageoint/geopackage'
import FeatureTableStyles from '@ngageoint/geopackage/lib/extension/style/featureTableStyles'
import _ from 'lodash'
import MapboxUtilities from '../../../MapboxUtilities'

export default class GeoPackageVectorLayer extends VectorLayer {
  _geopackage
  _dao
  _features

  async initialize () {
    this._geopackage = await GeoPackage.open(this.filePath)
    this._dao = this._geopackage.getFeatureDao(this.sourceLayerName)
    // check if geopackage utilize the feature style extension
    if (this._geopackage.getFeatureStyleExtension().has(this.sourceLayerName)) {
      this.editableStyle = false
      this.doNotOverwriteMbStyle = true
      let featureTableStyles = new FeatureTableStyles(this._geopackage, this.sourceLayerName)
      // update features to have the associated style hash
      this._features = (await GeoPackage.getGeoJSONFeaturesInTile(this._geopackage, this.sourceLayerName, 0, 0, 0, true)).map(f => {
        f.type = 'Feature'
        var styleRow = featureTableStyles.getStyle(f.id, f.geometry.type)
        if (!_.isNil(styleRow)) {
          f.properties.styleHash = styleRow.getId() + '-style'
        }
        if (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint') {
          var iconRow = featureTableStyles.getIcon(f.id, f.geometry.type)
          if (!_.isNil(iconRow)) {
            f.properties.styleHash = iconRow.getId() + '-symbol'
          }
        }
        return f
      })
      // a workaround to be able to style the outline of polygons
      this._featuresForTileIndex = MapboxUtilities.getMapboxFeatureCollectionForStyling(this._features).features
      this._featuresForTileIndex.forEach(f => {
        if (f.geometry.type === 'LineString') {
          if (f.properties['sub-type'] === 2) {
            f.properties.styleHash = f.properties.styleHash + '-fill-line'
          }
        }
      })
      // generate the style
      let style = await this.generateMbStyleForFeatureTable(this.sourceLayerName, this._geopackage)
      this.mbStyle = style.mbStyle
      this.images = style.images
    } else {
      // style can remain editable
      this._features = (await GeoPackage.getGeoJSONFeaturesInTile(this._geopackage, this.sourceLayerName, 0, 0, 0, true)).map(f => {
        // feature's type not set, workaround
        f.type = 'Feature'
        return f
      })
      this._featuresForTileIndex = MapboxUtilities.getMapboxFeatureCollectionForStyling(this._features).features
    }
    await super.initialize()
    return this
  }

  /**
   * Generates style layers for a style row.
   * @param layers
   * @param name
   * @param styleRow
   * @param geometryType
   * @param featureId
   * @returns {Array}
   */
  static getStyleLayersForStyleRow (layers, name, styleRow, geometryType = null, featureId = null) {
    let addFillLayer = geometryType === null || geometryType === 'Polygon' || geometryType === 'MultiPolygon'
    let addCircleLayer = geometryType === null || geometryType === 'Point' || geometryType === 'MultiPoint'
    let addLineLayer = geometryType === null || geometryType === 'LineString' || geometryType === 'MultiLineString'
    if (addFillLayer && _.isNil(layers[styleRow.getId() + '-fill'])) {
      layers[styleRow.getId() + '-fill'] = {
        'id': styleRow.getId() + '-fill',
        'type': 'fill',
        'source': name,
        'source-layer': name,
        'paint': {
          'fill-color': styleRow.hasFillColor() ? styleRow.getFillHexColor() : '#000000',
          'fill-opacity': parseFloat(styleRow.getFillOpacityOrDefault() + ''),
          'fill-outline-color': 'rgba(0, 0, 0, 0)'
        },
        'filter': ['match',
          ['get', 'styleHash'],
          styleRow.getId() + '-style',
          true, false]
      }
      // this is a special layer for the polygon dupes needed to style lines
      layers[styleRow.getId() + '-fill-line'] = {
        'id': styleRow.getId() + '-fill-line',
        'type': 'line',
        'source': name,
        'source-layer': name,
        'paint': {
          'line-width': parseFloat(styleRow.getWidthOrDefault() + ''),
          'line-color': styleRow.hasColor() ? styleRow.getHexColor() : '#000000',
          'line-opacity': parseFloat(styleRow.getOpacityOrDefault() + '')
        },
        'filter': ['match',
          ['get', 'styleHash'],
          styleRow.getId() + '-style-fill-line',
          true, false],
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        }
      }
    }
    if (addCircleLayer && _.isNil(layers[styleRow.getId() + '-circle'])) {
      layers[styleRow.getId() + '-circle'] = {
        'id': styleRow.getId() + '-circle',
        'type': 'circle',
        'source': name,
        'source-layer': name,
        'paint': {
          'circle-color': styleRow.hasFillColor() ? styleRow.getFillHexColor() : '#000000',
          'circle-opacity': parseFloat(styleRow.getFillOpacityOrDefault() + ''),
          'circle-stroke-color': styleRow.hasColor() ? styleRow.getHexColor() : '#000000',
          'circle-stroke-opacity': parseFloat(styleRow.getOpacityOrDefault() + ''),
          'circle-stroke-width': 1.0,
          'circle-radius': parseFloat(styleRow.getWidthOrDefault() + '')
        },
        'filter': ['match',
          ['get', 'styleHash'],
          styleRow.getId() + '-style',
          true, false]
      }
    }
    if (addLineLayer && _.isNil(layers[styleRow.getId() + '-line'])) {
      layers[styleRow.getId() + '-line'] = {
        'id': styleRow.getId() + '-line',
        'type': 'line',
        'source': name,
        'source-layer': name,
        'paint': {
          'line-width': parseFloat(styleRow.getWidthOrDefault() + ''),
          'line-color': styleRow.hasColor() ? styleRow.getHexColor() : '#000000',
          'line-opacity': parseFloat(styleRow.getOpacityOrDefault() + '')
        },
        'filter': ['match',
          ['get', 'styleHash'],
          styleRow.getId() + '-style',
          true, false],
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        }
      }
    }
    return layers
  }

  /**
   * Get Mapbox Style for Icon Row
   * @param layers
   * @param name
   * @param iconRow
   * @returns {Object}
   */
  static getMbStyleForIconRow (layers, name, iconRow) {
    var xOffset = iconRow.getAnchorUOrDefault() * iconRow.getWidth()
    var yOffset = (1.0 - iconRow.getAnchorVOrDefault()) * iconRow.getHeight()
    if (_.isNil(layers[iconRow.getId() + '-symbol'])) {
      layers[iconRow.getId() + '-symbol'] = {
        'id': iconRow.getId() + '-symbol',
        'type': 'symbol',
        'source': name,
        'source-layer': name,
        'filter': ['match',
          ['get', 'styleHash'],
          iconRow.getId() + '-symbol',
          true, false],
        'layout': {
          'icon-image': iconRow.getId() + '-symbol',
          'icon-allow-overlap': true,
          'icon-anchor': 'bottom-right',
          'icon-offset': [xOffset, yOffset]
        }
      }
    }
  }

  async generateMbStyleForFeatureTable (featureTableName, gp) {
    let images = []
    let layers = {}
    let mbStyle = {}
    // feature table has styling
    if (gp.getFeatureStyleExtension().has(featureTableName)) {
      const name = featureTableName
      let styleSources = {}
      styleSources[name] = {
        'type': 'vector',
        'maxzoom': 18,
        'tiles': [
          '{z}-{x}-{y}'
        ]
      }
      mbStyle = {
        'version': 8,
        'name': 'Empty',
        'sources': styleSources,
        'layers': []
      }

      let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
      let featureStyles = featureTableStyles.getTableFeatureStyles()
      let tableStyles = featureStyles.getStyles()
      if (!_.isNil(tableStyles) && !tableStyles.isEmpty()) {
        let defaultTableStyle = tableStyles.getDefault()
        if (defaultTableStyle !== null) {
          GeoPackageVectorLayer.getStyleLayersForStyleRow(layers, name, defaultTableStyle)
        }
        let geometryTypes = Object.keys(tableStyles.styles)
        for (let i = 0; i < geometryTypes.length; i++) {
          const geometryType = geometryTypes[i]
          let tableStyle = tableStyles.getStyle(geometryType)
          GeoPackageVectorLayer.getStyleLayersForStyleRow(layers, name, tableStyle, geometryType)
        }
      }
      let tableIcons = featureStyles.getIcons()
      if (!_.isNil(tableIcons) && !tableIcons.isEmpty()) {
        let defaultTableIcon = tableIcons.getDefault()
        if (!_.isNil(defaultTableIcon)) {
          if (_.isNil(images[defaultTableIcon.getId() + ''])) {
            images[defaultTableIcon.getId() + ''] = {
              data: await GeoPackageVectorLayer.getImageData(defaultTableIcon.getData(), defaultTableIcon.getContentType(), defaultTableIcon.getWidth(), defaultTableIcon.getHeight()),
              width: defaultTableIcon.getWidth(),
              height: defaultTableIcon.getHeight(),
              id: defaultTableIcon.getId() + '-symbol'
            }
            GeoPackageVectorLayer.getMbStyleForIconRow(layers, name, defaultTableIcon)
          }
        }
        let geometryTypes = Object.keys(tableStyles.styles)
        for (let i = 0; i < geometryTypes.length; i++) {
          const geometryType = geometryTypes[i]
          let tableIcon = tableIcons.getIcon(geometryType)
          if (!_.isNil(tableIcon)) {
            if (_.isNil(images[tableIcon.getId() + ''])) {
              images[tableIcon.getId() + ''] = {
                data: await GeoPackageVectorLayer.getImageData(tableIcon.getData(), tableIcon.getContentType(), tableIcon.getWidth(), tableIcon.getHeight()),
                width: tableIcon.getWidth(),
                height: tableIcon.getHeight(),
                id: tableIcon.getId() + '-symbol'
              }
              GeoPackageVectorLayer.getMbStyleForIconRow(layers, name, tableIcon)
            }
          }
        }
      }
      for (let i = 0; i < this._features.length; i++) {
        const feature = this._features[i]
        var featureStylesForRow = featureTableStyles.getFeatureStyles(feature.id)
        if (featureStylesForRow !== null) {
          var stylesForRow = featureStylesForRow.getStyles()
          if (!_.isNil(stylesForRow) && !stylesForRow.isEmpty()) {
            let defaultStyle = stylesForRow.getDefault()
            if (defaultStyle !== null) {
              GeoPackageVectorLayer.getStyleLayersForStyleRow(layers, name, defaultStyle, null, feature.id)
            }
            let geometryTypes = Object.keys(stylesForRow.styles)
            for (let j = 0; j < geometryTypes.length; j++) {
              const geometryType = geometryTypes[j]
              let styleRow = stylesForRow.getStyle(geometryType)
              GeoPackageVectorLayer.getStyleLayersForStyleRow(layers, name, styleRow, geometryType, feature.id)
            }
          }
          var iconsForRow = featureStylesForRow.getIcons()
          if (!_.isNil(iconsForRow) && !iconsForRow.isEmpty()) {
            let defaultIcon = iconsForRow.getDefault()
            if (!_.isNil(defaultIcon)) {
              if (_.isNil(images[defaultIcon.getId() + ''])) {
                images[defaultIcon.getId() + ''] = {
                  data: await GeoPackageVectorLayer.getImageData(defaultIcon.getData(), defaultIcon.getContentType(), defaultIcon.getWidth(), defaultIcon.getHeight()),
                  width: defaultIcon.getWidth(),
                  height: defaultIcon.getHeight(),
                  id: defaultIcon.getId() + '-symbol'
                }
                GeoPackageVectorLayer.getMbStyleForIconRow(layers, name, defaultIcon)
              }
            }
            let geometryTypes = Object.keys(iconsForRow.icons)
            for (let j = 0; j < geometryTypes.length; j++) {
              const geometryType = geometryTypes[j]
              let iconRow = iconsForRow.getIcon(geometryType)
              if (!_.isNil(iconRow)) {
                if (_.isNil(images[iconRow.getId() + ''])) {
                  images[iconRow.getId() + ''] = {
                    data: await GeoPackageVectorLayer.getImageData(iconRow.getData(), iconRow.getContentType(), iconRow.getWidth(), iconRow.getHeight()),
                    width: iconRow.getWidth(),
                    height: iconRow.getHeight(),
                    id: iconRow.getId() + '-symbol'
                  }
                  GeoPackageVectorLayer.getMbStyleForIconRow(layers, name, iconRow)
                }
              }
            }
          }
        }
      }
    }
    mbStyle.layers = Object.values(layers)
    return {
      mbStyle: mbStyle,
      images: Object.values(images)
    }
  }

  static getImageData = function (data, contentType = 'image/png', width, height) {
    return new Promise(function (resolve, reject) {
      let image = new Image()
      image.onload = () => {
        let canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        let ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
        console.log(canvas.toDataURL())
        resolve(ctx.getImageData(0, 0, width, height))
      }
      image.onerror = (error) => {
        reject(error)
      }
      var src = data
      if (data instanceof Buffer) {
        src = 'data:' + contentType + ';base64,' + data.toString('base64')
      }
      image.src = src
    })
  }

  get extent () {
    if (!this._extent) {
      let contentsDao = this._geopackage.getContentsDao()
      let contents = contentsDao.queryForId(this.sourceLayerName)
      let proj = contentsDao.getProjection(contents)
      let boundingBox = new GeoPackage.BoundingBox(contents.min_x, contents.max_x, contents.min_y, contents.max_y).projectBoundingBox(proj, 'EPSG:4326')
      this._extent = [boundingBox.minLongitude, boundingBox.minLatitude, boundingBox.maxLongitude, boundingBox.maxLatitude]
    }
    return this._extent
  }

  get configuration () {
    return {
      ...super.configuration,
      ...{
        layerType: 'GeoPackageVector'
      }
    }
  }

  get featureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._features
    }
  }

  get tileIndexFeatureCollection () {
    return {
      type: 'FeatureCollection',
      features: this._featuresForTileIndex
    }
  }

  /**
   * Overwrite getLayerColumns
   * @returns {{columns: Array}}
   */
  getLayerColumns () {
    let columns = {
      columns: []
    }
    let geomColumn = this._dao.getTable().getGeometryColumn()
    columns.geom = {
      name: geomColumn.name
    }
    let idColumn = this._dao.getTable().getIdColumn()
    columns.id = {
      name: idColumn.name,
      dataType: DataTypes.name(idColumn.dataType)
    }
    for (const column of this._dao.getTable().columns) {
      if (column.name !== columns.id.name && column.name !== columns.geom.name) {
        let c = {
          dataType: DataTypes.name(column.dataType),
          name: column.name,
          max: column.max,
          notNull: column.notNull,
          defaultValue: column.defaultValue
        }
        columns.columns.push(c)
      }
    }
    return columns
  }

  /**
   * Overwrite iterateFeaturesInBounds
   * @param bounds
   * @returns {{next, [Symbol.iterator]}}
   */
  iterateFeaturesInBounds (bounds) {
    if (this._dao.isIndexed()) {
      let bb = new BoundingBox(bounds[0][1], bounds[1][1], bounds[0][0], bounds[1][0])
      let features = []
      try {
        let iterator = this._dao.queryForGeoJSONIndexedFeaturesWithBoundingBox(bb, true)
        for (const feature of iterator) {
          features.push(feature)
        }
      } catch (error) {
        console.log(error)
      }
      return features
    } else {
      console.log('not indexed, use vector layer')
      return super.iterateFeaturesInBounds(bounds)
    }
  }
}
