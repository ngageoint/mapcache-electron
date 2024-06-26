import fs from 'fs'
import path from 'path'
import Source from '../Source'
import VectorLayer from '../../layer/vector/VectorLayer'
import { createUniqueID } from '../../util/UniqueIDUtilities'
import { streamingGeoPackageBuild } from '../../geopackage/GeoPackageFeatureTableUtilities'
import { convertGroundOverlayToGeotiffLayer, rotateImage } from '../../util/kml/KMLUtilities'
import { getDefaultKMLIcon } from '../../util/style/NodeStyleUtilities'
import { createDirectory, createNextAvailableLayerDirectory, rmDirAsync } from '../../util/file/FileUtilities'
import { VECTOR } from '../../layer/LayerTypes'
import { getRemoteImage } from '../../network/NetworkRequestUtils'
import { streamKml } from './KmlStream'
import { disposeImage, makeImage } from '../../util/canvas/CanvasUtilities'
import { sleep } from '../../util/common/CommonUtilities'

export default class KMLSource extends Source {

  /**
   * Generates an icon from a kml IconStyle element
   * @param kmlIconStyle
   * @param kmlDir
   * @param tmpDir
   * @param iconFileName
   * @return {Promise<{anchorV: number, data: Buffer, anchorU: number, width: number, name: string, description: string, contentType: string, height: number}>}
   */
  async generateIconFromKmlIconStyle (kmlIconStyle, kmlDir, tmpDir, iconFileName) {
    let icon = null
    let iconName = path.basename(kmlIconStyle.href, path.extname(kmlIconStyle.href))
    let iconFile = path.join(kmlDir, kmlIconStyle.href)
    let cachedIconFile = path.join(tmpDir, kmlIconStyle.href)

    if (kmlIconStyle.href.startsWith('http')) {
      iconFile = iconFileName
      cachedIconFile = path.join(tmpDir, path.basename(kmlIconStyle.href))
      await getRemoteImage(kmlIconStyle.href, cachedIconFile)
      iconFile = cachedIconFile
    }

    if (fs.existsSync(iconFile)) {
      try {
        if (kmlIconStyle.heading != null) {
          iconFile = await rotateImage(iconFile, parseFloat(kmlIconStyle.heading))
        }
        const scale = kmlIconStyle.scale || 1.0
        const dataUrl = 'data:image/' + path.extname(iconFile).substring(1) + ';base64,' + fs.readFileSync(iconFile).toString('base64')
        const image = await makeImage(dataUrl)
        let width = scale * image.width()
        let height = scale * image.height()
        disposeImage(image)

        // adjust icon sizing to prevent large images from being saved
        let aspectRatio = width / height
        const maxSize = 48
        if (width > maxSize) {
          width = maxSize
          height = width / aspectRatio
        }
        if (height > maxSize) {
          height = maxSize
          width = height * aspectRatio
        }

        let anchorU = 0.5
        let anchorV = 0.5
        if (kmlIconStyle.anchor_x != null) {
          if (kmlIconStyle.anchor_x.mode === 'pixels') {
            anchorU = kmlIconStyle.anchor_x.value / width
          } else if (kmlIconStyle.anchor_x.mode === 'insetPixels') {
            anchorU = (width - kmlIconStyle.anchor_x.value) / width
          } else if (kmlIconStyle.anchor_x.mode === 'fraction') {
            anchorU = kmlIconStyle.anchor_x.value
          }
        }
        if (kmlIconStyle.anchor_y != null) {
          if (kmlIconStyle.anchor_y.mode === 'pixels') {
            anchorV = kmlIconStyle.anchor_y.value / height
          } else if (kmlIconStyle.anchor_y.mode === 'insetPixels') {
            anchorV = (height - kmlIconStyle.anchor_y.value) / height
          } else if (kmlIconStyle.anchor_y.mode === 'fraction') {
            anchorV = kmlIconStyle.anchor_y.value
          }
        }

        // if no anchor is specified but the height is greater than the width by more than a pixel, set the anchor to the bottom center
        if (kmlIconStyle.anchor_x == null && kmlIconStyle.anchor_y == null && (height - width > 1)) {
          anchorU = 0.5
          anchorV = 1.0
        }

        icon = {
          contentType: 'image/' + path.extname(iconFile).substring(1),
          data: fs.readFileSync(iconFile),
          width: width,
          height: height,
          anchorU: anchorU,
          anchorV: anchorV,
          name: iconName
        }
        // eslint-disable-next-line no-unused-vars
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to generate icon.')
      }
    }

    if (icon == null) {
      icon = getDefaultKMLIcon('Default')
    }

    return icon
  }

  /**
   * Retrieves all of the layers belonging to this source
   * @param statusCallback
   * @returns {Promise<*[]>}
   */
  async retrieveLayers (statusCallback) {
    statusCallback('Processing KML file', 0)
    await sleep(250)
    let layers = []
    // setup tmp directory
    const tmpDir = path.join(this.directory, 'tmp')
    createDirectory(tmpDir)

    const kmlDirectory = path.dirname(this.filePath)
    const name = path.basename(this.filePath, path.extname(this.filePath))

    statusCallback('Parsing and storing features', 0)

    const groundOverlays = []
    const styles = {}
    const styleMaps = {}
    let featureCount = 0
    const refsToAdd = {}

    await streamKml(this.filePath, (feature) => {
      refsToAdd[feature.styleId] = true
      featureCount++
    }, groundOverlay => {
      groundOverlays.push(groundOverlay)
    }, style => {
      styles[style.id] = style
    }, styleMap => {
      styleMaps[styleMap.id] = styleMap
    })

    const featureStatusMax = 100 - groundOverlays.length

    if (featureCount > 0) {
      const { layerId, layerDirectory } = this.createLayerDirectory()
      let fileName = name + '.gpkg'
      let filePath = path.join(layerDirectory, fileName)
      const {
        adjustBatchSize,
        addFeature,
        addStyle,
        addIcon,
        addMediaAttachment,
        setFeatureStyle,
        setFeatureIcon,
        setTableIcon,
        done
      } = await streamingGeoPackageBuild(filePath, name)

      adjustBatchSize(featureCount)

      // iterate over styles/icons and add them to the geopackage
      const styleIdMap = {}
      const iconIdMap = {}
      let iconFileNameCount = 1

      const getOrAddIcon = async (iconId) => {
        let insertedIconId = iconIdMap[iconId]
        if (insertedIconId == null) {
          const style = styles[iconId]
          if (style != null && style.hasIcon) {
            try {
              const icon = await this.generateIconFromKmlIconStyle(style.icon, kmlDirectory, tmpDir, 'icon_' + iconFileNameCount)
              if (icon != null) {
                insertedIconId = addIcon(icon)
                iconIdMap[iconId] = insertedIconId
                iconFileNameCount++
              }
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Failed to generate icon.')
            }
          }
        }
        return insertedIconId
      }
      const getOrAddStyle = (styleId) => {
        let insertedStyleId = styleIdMap[styleId]
        if (insertedStyleId == null) {
          const style = styles[styleId]
          if (style != null && !style.hasIcon && (style.hasLine || style.hasPoly)) {
            style.name = style.id
            insertedStyleId = addStyle(style)
            styleIdMap[styleId] = insertedStyleId
          }
        }
        return insertedStyleId
      }

      // add default kml point style
      const defaultStyle = getDefaultKMLIcon('Default')
      const defaultStyleId = addIcon(defaultStyle)
      setTableIcon(defaultStyleId, 'Point')
      setTableIcon(defaultStyleId, 'MultiPoint')

      const refKeys = Object.keys(refsToAdd)
      for (let i = 0; i < refKeys.length; i++) {
        let styleRef = refKeys[i]
        while (styleMaps[styleRef] != null) {
          styleRef = styleMaps[styleRef].normal
        }
        await getOrAddIcon(styleRef)
      }

      const notifyStepSize = 0.01
      let currentStep = 0.0
      let featuresAdded = 0

      const storeAttachmentsInDescription = (featureRowId, html) => {
        var regex = /href="(.*?)"/gi
        var link

        while ((link = regex.exec(html)) !== null) {
          html.replace(link[1], '')
          if (!link[1].startsWith('http')) {
            const relativePath = path.join(kmlDirectory, link[1])
            addMediaAttachment(featureRowId, relativePath)
          }
        }

        return html
      }
      await streamKml(this.filePath, (feature) => {
        let styleRef = feature.styleId
        delete feature.styleId

        const featureRowId = addFeature(feature)

        // check for CDATA description that contains relative file paths (we should store off those attachments if possible
        if (feature.properties.description != null) {
          try {
            storeAttachmentsInDescription(featureRowId, feature.properties.description)
            // eslint-disable-next-line no-empty, no-unused-vars
          } catch (e) {}
        }

        // there is a style, icons will already have been added, but not styles
        if (styleRef != null) {
          // if ref is for a map, select the normal style reference
          while (styleMaps[styleRef] != null) {
            styleRef = styleMaps[styleRef].normal
          }

          if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint' && iconIdMap[styleRef] != null) {
            const iconRowId = iconIdMap[styleRef]
            if (iconRowId != null) {
              setFeatureIcon(featureRowId, feature.geometry.type, iconRowId)
            }
          } else {
            const styleRowId = getOrAddStyle(styleRef)
            if (styleRowId != null) {
              setFeatureStyle(featureRowId, feature.geometry.type, styleRowId)
            }
          }
        }

        if ((featuresAdded + 1) / featureCount > currentStep) {
          statusCallback('Parsing and storing features', featureStatusMax * currentStep)
          currentStep += notifyStepSize
        }
        featuresAdded++
      }, () => {
      }, () => {
      }, () => {
      })

      const { extent, count } = await done()

      layers.push(new VectorLayer({
        id: layerId,
        layerType: VECTOR,
        directory: layerDirectory,
        sourceDirectory: this.directory,
        geopackageFilePath: filePath,
        sourceLayerName: name,
        sourceType: 'KML',
        count: count,
        extent: extent
      }))
    }


    statusCallback('Processing ground overlays', featureStatusMax)

    for (let i = 0; i < groundOverlays.length; i++) {
      const groundOverlay = groundOverlays[i]
      if (groundOverlay.name == null) {
        groundOverlay.name = 'Ground Overlay #' + i
      }
      const geotiffLayer = await convertGroundOverlayToGeotiffLayer(groundOverlay, kmlDirectory, tmpDir, () => {
        return {
          layerId: createUniqueID(),
          layerDirectory: createNextAvailableLayerDirectory(this.directory),
          sourceDirectory: this.directory
        }
      })
      if (geotiffLayer != null) {
        layers.push(geotiffLayer)
      }
      statusCallback('Processing ground overlays', (featureStatusMax + i + 1))
    }

    statusCallback('Cleaning up', 100)
    await sleep(250)

    await rmDirAsync(tmpDir)

    return layers
  }
}
