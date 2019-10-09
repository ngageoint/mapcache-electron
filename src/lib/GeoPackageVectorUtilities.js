import GeoPackage from '@ngageoint/geopackage'
import FeatureTableStyles from '@ngageoint/geopackage/lib/extension/style/featureTableStyles'
import _ from 'lodash'

export default class GeoPackageVectorUtilities {
  static async buildGeoPackageForLayer (layer, fileName) {
    let gp = await GeoPackage.create(fileName)
    // execute feature configurations
    try {
      const layerName = layer.layerName || layer.name
      // get the vectors in the bounds
      let layerColumns = layer.getLayerColumns()
      const FeatureColumn = GeoPackage.FeatureColumn
      let geometryColumns = new GeoPackage.GeometryColumns()
      geometryColumns.table_name = layerName
      geometryColumns.column_name = layerColumns.geom.name
      geometryColumns.geometry_type_name = 'GEOMETRYCOLLECTION'
      geometryColumns.z = 0
      geometryColumns.m = 0

      let columns = []
      columns.push(FeatureColumn.createPrimaryKeyColumnWithIndexAndName(0, layerColumns.id.name))
      columns.push(FeatureColumn.createGeometryColumn(1, layerColumns.geom.name, 'GEOMETRYCOLLECTION', false, null))
      let columnCount = 2
      for (const column of layerColumns.columns) {
        if (column.name !== layerColumns.id.name && column.name !== layerColumns.geom.name) {
          columns.push(FeatureColumn.createColumnWithIndex(columnCount++, column.name, GeoPackage.DataTypes.fromName(column.dataType), column.notNull, column.defaultValue))
        }
      }

      let bounds = layer.extent
      let bb = new GeoPackage.BoundingBox(bounds[0], bounds[2], bounds[1], bounds[3])
      await gp.createFeatureTableWithGeometryColumns(geometryColumns, bb, 4326, columns)
      let featureTableName = layerName

      var featureTableStyles = null
      if (layer.style !== null && layer.style !== undefined) {
        await gp.getFeatureStyleExtension().getOrCreateExtension(featureTableName)
        await gp.getFeatureStyleExtension().getRelatedTables().getOrCreateExtension()
        await gp.getFeatureStyleExtension().getContentsId().getOrCreateExtension()
        featureTableStyles = new FeatureTableStyles(gp, featureTableName)
        await featureTableStyles.createTableStyleRelationship()
        await featureTableStyles.createTableIconRelationship()
        await featureTableStyles.createStyleRelationship()
        await featureTableStyles.createIconRelationship()

        let polyStyle = layer.style.styleRowMap[layer.style.default.styles['Polygon']]
        let polygonStyleRow = featureTableStyles.getStyleDao().newRow()
        polygonStyleRow.setColor(polyStyle.color, polyStyle.opacity)
        polygonStyleRow.setFillColor(polyStyle.fillColor, polyStyle.fillOpacity)
        polygonStyleRow.setWidth(polyStyle.width)
        let polyStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(polygonStyleRow)
        delete layer.style.styleRowMap[layer.style.default.styles['Polygon']]
        layer.style.default.styles['Polygon'] = polyStyleRowId
        layer.style.styleRowMap[polyStyleRowId] = polyStyle

        let lineStyle = layer.style.styleRowMap[layer.style.default.styles['LineString']]
        let lineStringStyleRow = featureTableStyles.getStyleDao().newRow()
        lineStringStyleRow.setColor(lineStyle.color, lineStyle.opacity)
        lineStringStyleRow.setWidth(lineStyle.width)
        let lineStringStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(lineStringStyleRow)
        delete layer.style.styleRowMap[layer.style.default.styles['LineString']]
        layer.style.default.styles['LineString'] = lineStringStyleRowId
        layer.style.styleRowMap[lineStringStyleRowId] = lineStyle

        let pointStyle = layer.style.styleRowMap[layer.style.default.styles['Point']]
        let pointStyleRow = featureTableStyles.getStyleDao().newRow()
        pointStyleRow.setColor(pointStyle.color, pointStyle.opacity)
        pointStyleRow.setWidth(pointStyle.width)
        let pointStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(pointStyleRow)
        delete layer.style.styleRowMap[layer.style.default.styles['Point']]
        layer.style.default.styles['Point'] = pointStyleRowId
        layer.style.styleRowMap[pointStyleRowId] = pointStyle

        if (layer.style.default.iconOrStyle['Point'] === 'icon') {
          let pointIcon = layer.style.iconRowMap[layer.style.default.icons['Point']]
          let pointIconRow = featureTableStyles.getIconDao().newRow()
          pointIconRow.setData(Buffer.from(pointIcon.url.split(',')[1], 'base64'))
          pointIconRow.setContentType('image/png')
          pointIconRow.setWidth(pointIcon.width)
          pointIconRow.setHeight(pointIcon.height)
          pointIconRow.setAnchorU(pointIcon.anchor_u)
          pointIconRow.setAnchorV(pointIcon.anchor_v)
          let pointIconRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(pointIconRow)
          delete layer.style.iconRowMap[layer.style.default.icons['Point']]
          layer.style.default.icons['Point'] = pointIconRowId
          layer.style.iconRowMap[pointIconRowId] = pointIcon
          await featureTableStyles.setTableIcon('Point', pointIconRow)
          await featureTableStyles.setTableIcon('MultiPoint', pointIconRow)
        }
        await featureTableStyles.setTableStyle('Polygon', polygonStyleRow)
        await featureTableStyles.setTableStyle('LineString', lineStringStyleRow)
        await featureTableStyles.setTableStyle('Point', pointStyleRow)
        await featureTableStyles.setTableStyle('MultiPolygon', polygonStyleRow)
        await featureTableStyles.setTableStyle('MultiLineString', lineStringStyleRow)
        await featureTableStyles.setTableStyle('MultiPoint', pointStyleRow)
      }

      console.log('creating geopackage for layer')
      let icons = {}
      let styles = {}
      let iconIdToIconRowId = {}
      let styleIdToStyleRowId = {}
      let iterator = layer.featureCollection.features
      for (let feature of iterator) {
        if (feature.properties) {
          feature.properties.id = undefined
        }
        let featureRowId = GeoPackage.addGeoJSONFeatureToGeoPackage(gp, feature, featureTableName)
        if (!_.isNil(layer.style.features[feature.id])) {
          if (layer.style.features[feature.id].iconOrStyle === 'icon') {
            let iconId = layer.style.features[feature.id].icon
            let featureIconRow = icons[iconId]
            if (_.isNil(featureIconRow)) {
              let featureIcon = layer.style.iconRowMap[iconId]
              featureIconRow = featureTableStyles.getIconDao().newRow()
              featureIconRow.setData(Buffer.from(featureIcon.url.split(',')[1], 'base64'))
              featureIconRow.setContentType('image/png')
              featureIconRow.setWidth(featureIcon.width)
              featureIconRow.setHeight(featureIcon.height)
              featureIconRow.setAnchorU(featureIcon.anchor_u)
              featureIconRow.setAnchorV(featureIcon.anchor_v)
              let featureIconRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(featureIconRow)
              delete layer.style.iconRowMap[iconId]
              layer.style.iconRowMap[featureIconRowId] = featureIcon
              iconIdToIconRowId[iconId] = featureIconRowId
              icons[iconId] = featureIconRow
            }
            layer.style.features[feature.id].icon = iconIdToIconRowId[iconId]
            await featureTableStyles.setIcon(featureRowId, feature.geometry.type, featureIconRow)
          } else {
            let styleId = layer.style.features[feature.id].style
            let featureStyleRow = styles[styleId]
            if (_.isNil(featureStyleRow)) {
              let featureStyle = layer.style.styleRowMap[styleId]
              featureStyleRow = featureTableStyles.getStyleDao().newRow()
              featureStyleRow.setColor(featureStyle.color, featureStyle.opacity)
              featureStyleRow.setWidth(featureStyle.width)
              if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
                featureStyleRow.setFillColor(featureStyle.fillColor, featureStyle.fillOpacity)
              }
              let featureStyleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(featureStyleRow)
              delete layer.style.styleRowMap[styleId]
              layer.style.styleRowMap[featureStyleRowId] = featureStyle
              styleIdToStyleRowId[styleId] = featureStyleRowId
              styles[styleId] = featureStyleRow
            }
            layer.style.features[feature.id].style = styleIdToStyleRowId[styleId]
            await featureTableStyles.setStyle(featureRowId, feature.geometry.type, featureStyleRow)
          }
        }
      }
      var featureDao = gp.getFeatureDao(featureTableName)
      var fti = featureDao.featureTableIndex
      if (fti) {
        fti.getTableIndex()
        await fti.index()
      }
    } catch (error) {
      console.log(error)
    }
  }

  static async updateStyle (gp, layer) {
    let styleOrIconRowIdsChanged = false
    const featureTableName = layer.name
    let featureTableStyles = new FeatureTableStyles(gp, featureTableName)
    var oldFeatureStyles = featureTableStyles.getTableFeatureStyles()
    var oldTableStyles = oldFeatureStyles.getStyles()
    var oldTableIcons = oldFeatureStyles.getIcons()

    let newStyle = _.cloneDeep(layer.style)
    // update polygon table style if it changed
    let polyStyle = newStyle.styleRowMap[newStyle.default.styles['Polygon']]
    let polyStyleRow = !_.isNil(oldTableStyles) ? oldTableStyles.getStyle('Polygon') : undefined
    if (polyStyleRow.getHexColor() !== polyStyle.color ||
      polyStyleRow.getOpacity() !== polyStyle.opacity ||
      polyStyleRow.getFillHexColor() !== polyStyle.fillColor ||
      polyStyleRow.getFillOpacity() !== polyStyle.fillOpacity ||
      polyStyleRow.getWidth() !== polyStyle.width) {
      polyStyleRow.setColor(polyStyle.color, polyStyle.opacity)
      polyStyleRow.setFillColor(polyStyle.fillColor, polyStyle.fillOpacity)
      polyStyleRow.setWidth(polyStyle.width)
      featureTableStyles.getStyleDao().update(polyStyleRow)
      await featureTableStyles.setTableStyle('Polygon', polyStyleRow)
      await featureTableStyles.setTableStyle('MultiPolygon', polyStyleRow)
    }
    // update line string table style if it changed
    let lineStringStyle = newStyle.styleRowMap[newStyle.default.styles['LineString']]
    let lineStringStyleRow = !_.isNil(oldTableStyles) ? oldTableStyles.getStyle('LineString') : undefined
    if (lineStringStyleRow.getHexColor() !== lineStringStyle.color ||
      lineStringStyleRow.getOpacity() !== lineStringStyle.opacity ||
      lineStringStyleRow.getWidth() !== lineStringStyle.width) {
      lineStringStyleRow.setColor(lineStringStyle.color, lineStringStyle.opacity)
      lineStringStyleRow.setWidth(lineStringStyle.width)
      featureTableStyles.getStyleDao().update(lineStringStyleRow)
      await featureTableStyles.setTableStyle('LineString', lineStringStyleRow)
      await featureTableStyles.setTableStyle('MultiLineString', lineStringStyleRow)
    }
    // update point table icon or style if it changed
    if (newStyle.default.iconOrStyle['Point'] === 'icon') {
      featureTableStyles.deleteTableStyle('Point')
      featureTableStyles.deleteTableStyle('MultiPoint')
      let pointIcon = newStyle.iconRowMap[newStyle.default.icons['Point']]
      let pointIconRow = !_.isNil(oldTableIcons) ? oldTableIcons.getIcon('Point') : undefined
      if (!_.isNil(pointIconRow)) {
        if (pointIconRow.getData() !== Buffer.from(pointIcon.url.split(',')[1], 'base64') ||
          pointIconRow.getWidth() !== pointIcon.width ||
          pointIconRow.getHeight() !== pointIcon.height ||
          pointIconRow.getAnchorU() !== pointIcon.anchor_u ||
          pointIconRow.getAnchorV() !== pointIcon.anchor_v) {
          pointIconRow.setData(Buffer.from(pointIcon.url.split(',')[1], 'base64'))
          pointIconRow.setContentType('image/png')
          pointIconRow.setWidth(pointIcon.width)
          pointIconRow.setHeight(pointIcon.height)
          pointIconRow.setAnchorU(pointIcon.anchor_u)
          pointIconRow.setAnchorV(pointIcon.anchor_v)
          featureTableStyles.getIconDao().update(pointIconRow)
          await featureTableStyles.setTableIcon('Point', pointIconRow)
          await featureTableStyles.setTableIcon('MultiPoint', pointIconRow)
        }
      } else {
        pointIconRow = featureTableStyles.getIconDao().newRow()
        pointIconRow.setData(Buffer.from(pointIcon.url.split(',')[1], 'base64'))
        pointIconRow.setContentType('image/png')
        pointIconRow.setWidth(pointIcon.width)
        pointIconRow.setHeight(pointIcon.height)
        pointIconRow.setAnchorU(pointIcon.anchor_u)
        pointIconRow.setAnchorV(pointIcon.anchor_v)
        await featureTableStyles.setTableIcon('Point', pointIconRow)
        await featureTableStyles.setTableIcon('MultiPoint', pointIconRow)
      }
    } else {
      featureTableStyles.deleteTableIcon('Point')
      featureTableStyles.deleteTableIcon('MultiPoint')
      let pointStyle = newStyle.styleRowMap[newStyle.default.styles['Point']]
      let pointStyleRow = !_.isNil(oldTableStyles) ? oldTableStyles.getStyle('Point') : undefined
      if (!_.isNil(pointStyleRow)) {
        if (pointStyleRow.getHexColor() !== pointStyle.color ||
          pointStyleRow.getOpacity() !== pointStyle.opacity ||
          pointStyleRow.getWidth() !== pointStyle.width) {
          pointStyleRow.setColor(pointStyle.color, pointStyle.opacity)
          pointStyleRow.setWidth(pointStyle.width)
          featureTableStyles.getStyleDao().update(pointStyleRow)
          await featureTableStyles.setTableStyle('Point', pointStyleRow)
          await featureTableStyles.setTableStyle('MultiPoint', pointStyleRow)
        }
      } else {
        let pointStyle = newStyle.styleRowMap[newStyle.default.styles['Point']]
        let pointStyleRow = featureTableStyles.getStyleDao().newRow()
        pointStyleRow.setColor(pointStyle.color, pointStyle.opacity)
        pointStyleRow.setWidth(pointStyle.width)
        await featureTableStyles.setTableStyle('Point', pointStyleRow)
        await featureTableStyles.setTableStyle('MultiPoint', pointStyleRow)
      }
    }

    let styleDao = featureTableStyles.getStyleDao()
    let styleIds = featureTableStyles.getAllStyleIds().map(n => Number(n))
    let currentStyleIds = Object.keys(newStyle.styleRowMap).map(n => Number(n))
    // remove the defaults first
    _.remove(currentStyleIds, function (val) {
      return val === newStyle.default.styles['Point'] ||
        val === newStyle.default.styles['LineString'] ||
        val === newStyle.default.styles['Polygon']
    })
    for (let styleIdIdx in styleIds) {
      let styleId = styleIds[styleIdIdx]
      // style no longer exists, delete that style and style mapping relationships (should this exist in geopackage instead?)
      if (_.isNil(newStyle.styleRowMap[styleId])) {
        featureTableStyles.deleteStyleAndMappingsByStyleRowId(styleId)
      } else {
        // style still exists, check if it has changed
        let styleRow = styleDao.queryForId(styleId)
        if (!_.isNil(styleRow)) {
          let newStyleRow = newStyle.styleRowMap[styleId]
          if (styleRow.getHexColor() !== newStyleRow.color ||
            styleRow.getOpacity() !== newStyleRow.opacity ||
            styleRow.getFillHexColor() !== newStyleRow.fillColor ||
            styleRow.getFillOpacity() !== newStyleRow.fillOpacity ||
            styleRow.getWidth() !== newStyleRow.width) {
            styleRow.setColor(newStyleRow.color, newStyleRow.opacity)
            styleRow.setFillColor(newStyleRow.fillColor, newStyleRow.fillOpacity)
            styleRow.setWidth(newStyleRow.width)
            styleDao.update(styleRow)
          }
        }
      }
    }
    // check if any new styles were added
    for (let currentStyleIdIdx in currentStyleIds) {
      let currentStyle = currentStyleIds[currentStyleIdIdx]
      // check if the style exists in the geopackage
      if (_.isNil(styleIds) || styleIds.indexOf(currentStyle) === -1) {
        let style = newStyle.styleRowMap[currentStyle]
        let styleRow = featureTableStyles.getStyleDao().newRow()
        styleRow.setColor(style.color, style.opacity)
        styleRow.setFillColor(style.fillColor, style.fillOpacity)
        styleRow.setWidth(style.width)
        let styleRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertStyle(styleRow)
        delete newStyle.styleRowMap[currentStyle]
        newStyle.styleRowMap[styleRowId] = style
        styleOrIconRowIdsChanged = true
      }
    }

    let iconDao = featureTableStyles.getIconDao()
    let iconIds = featureTableStyles.getAllIconIds().map(n => Number(n))
    console.log(iconIds)
    let currentIconIds = Object.keys(newStyle.iconRowMap).map(n => Number(n))
    // remove the defaults first
    _.remove(currentIconIds, function (val) {
      return val === newStyle.default.icons['Point']
    })
    for (let iconIdIdx in iconIds) {
      let iconId = iconIds[iconIdIdx]
      // style no longer exists, delete that style and style mapping relationships (should this exist in geopackage instead?)
      if (_.isNil(newStyle.iconRowMap[iconId])) {
        featureTableStyles.deleteIconAndMappingsByIconRowId(iconId)
      } else {
        // style still exists, check if it has changed
        let iconRow = iconDao.queryForId(iconId)
        if (!_.isNil(iconRow)) {
          let newIconRow = newStyle.iconRowMap[iconId]
          if (iconRow.getData() !== Buffer.from(newIconRow.url.split(',')[1], 'base64') ||
            iconRow.getWidth() !== newIconRow.width ||
            iconRow.getHeight() !== newIconRow.height ||
            iconRow.getAnchorU() !== newIconRow.anchor_u ||
            iconRow.getAnchorV() !== newIconRow.anchor_v) {
            iconRow.setData(Buffer.from(newIconRow.url.split(',')[1], 'base64'))
            iconRow.setContentType('image/png')
            iconRow.setWidth(newIconRow.width)
            iconRow.setHeight(newIconRow.height)
            iconRow.setAnchorU(newIconRow.anchor_u)
            iconRow.setAnchorV(newIconRow.anchor_v)
            iconDao.update(iconRow)
          }
        }
      }
    }
    // check if any new styles were added
    for (let currentIconIdIdx in currentIconIds) {
      let currentIcon = currentIconIds[currentIconIdIdx]
      // check if the style exists in the geopackage
      if (_.isNil(iconIds) || iconIds.indexOf(currentIcon) === -1) {
        let icon = newStyle.iconRowMap[currentIcon]
        let iconRow = featureTableStyles.getIconDao().newRow()
        iconRow.setData(Buffer.from(icon.url.split(',')[1], 'base64'))
        iconRow.setContentType('image/png')
        iconRow.setWidth(icon.width)
        iconRow.setHeight(icon.height)
        iconRow.setAnchorU(icon.anchor_u)
        iconRow.setAnchorV(icon.anchor_v)
        let iconRowId = featureTableStyles.getFeatureStyleExtension().getOrInsertIcon(iconRow)
        delete newStyle.iconRowMap[currentIcon]
        newStyle.iconRowMap[iconRowId] = icon
        styleOrIconRowIdsChanged = true
      }
    }
    if (styleOrIconRowIdsChanged) {
      return newStyle
    } else {
      return null
    }
  }
}
