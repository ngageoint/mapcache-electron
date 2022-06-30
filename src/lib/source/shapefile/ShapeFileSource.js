import fs from 'fs'
import AdmZip from 'adm-zip'
import Source from '../Source'
import path from 'path'
import shp from 'shpjs'
import jetpack from 'fs-jetpack'
import VectorLayer from '../../layer/vector/VectorLayer'
import { VECTOR } from '../../layer/LayerTypes'
import { streamingGeoPackageBuild } from '../../geopackage/GeoPackageFeatureTableUtilities'
import GeoTIFFSource from '../geotiff/GeoTIFFSource'
import { defineProjection } from '../../projection/ProjectionUtilities'
import { COLON_DELIMITER, EPSG } from '../../projection/ProjectionConstants'

export default class ShapeFileSource extends Source {
  async retrieveLayers (statusCallback) {
    const layers = []
    const name = path.basename(this.filePath, path.extname(this.filePath))
    if (!await jetpack.existsAsync(this.filePath)) {
      throw new Error('.shp file not found in zip file\'s root directory.')
    }
    let isZip = false
    let shapefiles = 1
    let geotiffs = []
    if (path.extname(this.filePath) === '.zip') {
      isZip = true
      const zip = new AdmZip(this.filePath)
      const zipEntries = zip.getEntries()
      // determine number of shape files
      shapefiles = zipEntries.filter(zipEntry => zipEntry.entryName.endsWith('.shp') && zipEntry.entryName.indexOf('__MACOSX') === -1).length

      // prepare the geotiff files
      geotiffs = zipEntries.filter(zipEntry => zipEntry.entryName.endsWith('.tif') && zipEntry.entryName.indexOf('__MACOSX') === -1).map(entry => {
        const geotiffFile = entry.entryName
        const geotiffFileName = entry.entryName.slice(0, -4)
        const { layerId, layerDirectory } = this.createLayerDirectory()
        const geotiffData = {
          layerId: layerId,
          layerDirectory: layerDirectory,
          geotiffFile: path.join(layerDirectory, geotiffFile),
        }
        zip.extractEntryTo(entry, layerDirectory, true, true, true, undefined)
        const prjEntry = zipEntries.find(zE => zE.entryName.startsWith(geotiffFileName) && zE.entryName.endsWith('.prj'))
        if (prjEntry != null) {
          zip.extractEntryTo(prjEntry, layerDirectory, true, true, true, undefined)
          geotiffData.prjFile = path.join(layerDirectory, prjEntry.entryName)

        }
        return geotiffData
      })
    }

    const expectedLayers = geotiffs.length + shapefiles

    const stepSize = 100.0 / expectedLayers

    if (geotiffs.length > 0) {
      for (let i = 0; i < geotiffs.length; i++) {
        const { layerId, layerDirectory, geotiffFile, prjFile } = geotiffs[i]
        try {
          let prjString
          if (prjFile != null) {
            prjString = fs.readFileSync(prjFile, {encoding:'utf8'})
            const srs = await GeoTIFFSource.determineSrs(geotiffFile)
            defineProjection(EPSG + COLON_DELIMITER + srs, prjString)
          }
          const layerName = path.basename(geotiffFile, path.extname(geotiffFile))
          const layer = await GeoTIFFSource.createGeoTiffLayer(geotiffFile, layerName, layerId, layerDirectory, this.directory, (status, percentage) => {
            // need to modify this
            statusCallback(status, stepSize * i + (stepSize * (percentage / 100.0)))
          })
          if (prjString != null) {
            layer.projection = prjString
          }
          layers.push(layer)
          // eslint-disable-next-line no-unused-vars
        } catch (e) {
          console.error('Failed to process internal GeoTIFF: ' + geotiffFile)
        }
      }
    }

    if (shapefiles > 0) {
      let featureCollections = []
      statusCallback('Parsing shapefile', geotiffs.length > 0 ? 50 : 0)
      await this.sleep(250)

      if (isZip) {
        const result = await shp.parseZip(jetpack.read(this.filePath, 'buffer'))
        if (result.length == null) {
          featureCollections.push(result)
        } else {
          featureCollections = result
        }
      } else {
        featureCollections.push({
          type: 'FeatureCollection',
          features: shp.parseShp(jetpack.read(this.filePath, 'buffer')),
          fileName: name
        })
      }

      if (featureCollections.length > 0) {
        statusCallback('Storing features', (stepSize * geotiffs.length))

        const totalFeatures = featureCollections.map(featureCollection => featureCollection.features.length).reduce((previousValue, currentValue) => previousValue + currentValue, 0)
        const notifyStepSize = Math.ceil(totalFeatures / 10)
        let featuresAdded = 0

        let layerName = null
        for (let idx = 0; idx < featureCollections.length; idx++) {
          try {
            const featureCollection = featureCollections[idx]
            const features = featureCollection.features
            layerName = featureCollection.fileName || name

            const { layerId, layerDirectory } = this.createLayerDirectory()
            let fileName = layerName + '.gpkg'
            let filePath = path.join(layerDirectory, fileName)

            const { addFeature, done } = await streamingGeoPackageBuild(filePath, layerName)

            for (let i = 0; i < features.length; i++) {
              const feature = features[i]
              if (feature.geometry != null) {
                delete features[i].geometry.bbox
                addFeature(feature)
              }
              featuresAdded++
              if ((featuresAdded % notifyStepSize) === 0) {
                statusCallback('Storing features', (stepSize * (idx + geotiffs.length)) + (stepSize * (featuresAdded / totalFeatures)))
              }
            }

            const { count, extent } = await done()

            layers.push(new VectorLayer({
              id: layerId,
              layerType: VECTOR,
              directory: layerDirectory,
              sourceDirectory: this.directory,
              name: layerName,
              geopackageFilePath: filePath,
              sourceFilePath: this.filePath,
              sourceLayerName: layerName,
              sourceType: 'ShapeFile',
              count: count,
              extent: extent
            }))
          } catch (e) {
            console.error('Error processing shapefile layer: ' + layerName)
          }
        }
      }
    }

    statusCallback('Cleaning up', 100)
    await this.sleep(250)
    return layers
  }
}
