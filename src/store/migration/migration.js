import { app } from 'electron'
import store from '../.'
import cloneDeep from 'lodash/cloneDeep'
import isNil from 'lodash/isNil'
import keys from 'lodash/keys'
import jetpack from 'fs-jetpack'
import path from 'path'
import { mkdirSync, readdirSync, existsSync } from 'fs'
import { CanvasKitCanvasAdapter } from '@ngageoint/geopackage'
import { mapcache } from '../../../package.json'
import { getDefaultBaseMaps } from '../../lib/util/basemaps/BaseMapUtilities'
import { DEFAULT_TIMEOUT, DEFAULT_RETRY_ATTEMPTS, NO_LIMIT } from '../../lib/network/HttpUtilities'
import {CONTAINS_V4_REGEX, V4_REGEX} from '../../lib/util/UniqueIDUtilities'
import {
  clearUserDirectory,
  createNextAvailableLayerDirectory,
  createNextAvailableSourceDirectory,
  createNextAvailableBaseMapDirectory,
  createNextAvailableProjectDirectory,
  removeUnusedFromUserDirectory,
  rmDirAsync
} from '../../lib/util/file/FileUtilities'
import { getInternalTableInformation } from '../../lib/geopackage/GeoPackageCommon'
import { PROJECT_DIRECTORY_IDENTIFIER, BASEMAP_DIRECTORY_IDENTIFIER } from '../../lib/util/file/FileConstants'
import GeoTIFFSource from '../../lib/source/geotiff/GeoTIFFSource'
import {GEOTIFF, VECTOR, MBTILES, WMS, isRemote} from '../../lib/layer/LayerTypes'
import { WEB_MERCATOR } from '../../lib/projection/ProjectionConstants'

/**
 * Executes the necessary migration scripts based on current version of the store and the installation version of the store
 * @returns {Promise<boolean>}
 */
export async function runMigration (forceReset = false) {
  // Prevent GeoPackage from loading canvas kit wasm, as we do not need to execute any canvas related functions in background.js
  CanvasKitCanvasAdapter.initialized = true

  const migrations = {
    2: async function (state) {
      // setup initial state for tabNotification, mapZoom, and preview layer
      keys(state.UIState).forEach(projectId => {
        state.UIState[projectId].tabNotification = {0: false, 1: false, 2: false}
        state.UIState[projectId].mapZoom = 3
        state.UIState[projectId].previewLayer = null
      })

      // setup initial mapRenderingOrder, also set all layers to not be visible
      keys(state.Projects).forEach(projectId => {
        keys(state.Projects[projectId].sources).forEach(sourceId => {
          state.Projects[projectId].sources[sourceId].visible = false
        })
        keys(state.Projects[projectId].geopackages).forEach(geopackageId => {
          keys(state.Projects[projectId].geopackages[geopackageId].tables.tiles).forEach(table => {
            state.Projects[projectId].geopackages[geopackageId].tables.tiles[table].visible = false
          })
          keys(state.Projects[projectId].geopackages[geopackageId].tables.features).forEach(table => {
            state.Projects[projectId].geopackages[geopackageId].tables.features[table].visible = false
          })
        })
        state.Projects[projectId].mapRenderingOrder = []
      })
    },
    3: async function (state) {
      // setup initial BaseMaps
      state.BaseMaps = {
        baseMaps: getDefaultBaseMaps()
      }
    },
    4: async function (state) {
      // remove any existing credentials
      const projectKeys = keys(state.Projects)
      for (let i = 0; i < projectKeys.length; i++) {
        const projectId = projectKeys[i]
        const sourceKeys = keys(state.Projects[projectId].sources)
        for (let j = 0; j < sourceKeys.length; j++) {
          const sourceId = sourceKeys[j]
          delete state.Projects[projectId].sources[sourceId].credentials
        }
      }
    },
    5: async function (state) {
      // add network settings to default base maps
      state.BaseMaps.baseMaps.filter(baseMap => baseMap.readonly && baseMap.id < 3).forEach(baseMap => {
        baseMap.layerConfiguration.timeoutMs = DEFAULT_TIMEOUT
        baseMap.layerConfiguration.retryAttempts = DEFAULT_RETRY_ATTEMPTS
        baseMap.layerConfiguration.rateLimit = NO_LIMIT
      })
    },
    6: async function (state) {
      // ensure all base map ids are strings
      state.BaseMaps.baseMaps.map(baseMap => {
        baseMap.id = baseMap.id + ''
        baseMap.layerConfiguration.id = baseMap.id + ''
        return baseMap
      })
    },
    7: async function (state) {
      // migrates existing project sources and basemaps into new directory structure. cleans up lost directories
      const updateSource = async function (source) {
        if (source.layerType === GEOTIFF) {
          const geotiff = await GeoTIFFSource.getGeoTIFF(source.filePath)
          const image = await GeoTIFFSource.getImage(geotiff)
          let {
            imageOrigin,
            imageResolution,
            imageWidth,
            imageHeight,
            srs,
            littleEndian,
            fileDirectory,
          } = GeoTIFFSource.getImageData(image)
          let {
            colorMap,
            photometricInterpretation,
            samplesPerPixel,
            bitsPerSample,
            sampleFormat,
            bytesPerSample
          } = GeoTIFFSource.getFileDirectoryData(fileDirectory)
          source.imageOrigin = imageOrigin
          source.imageResolution = imageResolution
          source.imageWidth = imageWidth
          source.imageHeight = imageHeight
          source.srs = srs
          source.littleEndian = littleEndian
          source.colorMap = colorMap
          source.photometricInterpretation = photometricInterpretation
          source.samplesPerPixel = samplesPerPixel
          source.bitsPerSample = bitsPerSample
          source.sampleFormat = sampleFormat
          source.bytesPerSample = bytesPerSample
          source.visible = false
        } else if (source.layerType === VECTOR) {
          delete source['styleAssignment']
          delete source['iconAssignment']
          delete source['tableStyleAssignment']
          delete source['tableIconAssignment']
          delete source['maxFeatures']
          delete source['layerKey']
          delete source['sourceId']
          source.styleKey = 0
          source.style = {}
        } else if (source.layerType === MBTILES) {
          source.style = {}
        } else if (isRemote(source)) {
          source.withCredentials = false
        }
        return source
      }

      // create projects directory
      const userDataDir = app.getPath('userData')
      const projectDir = path.join(userDataDir, PROJECT_DIRECTORY_IDENTIFIER)
      if (!existsSync(projectDir)) {
        mkdirSync(projectDir)
      }

      // iterate over projects and add project directories
      const pKeys = keys(state.Projects)

      for (let i = 0; i < pKeys.length; i++) {
        const projectId = pKeys[i]
        const project = state.Projects[projectId]
        project.directory = createNextAvailableProjectDirectory(userDataDir)

        // iterate over sources and add source/layer directories. Also update sources as needed
        const sKeys = keys(project.sources)
        for (let j = 0; j < sKeys.length; j++) {
          let sourceId = sKeys[j]
          let source = project.sources[sourceId]
          source.sourceDirectory = createNextAvailableSourceDirectory(project.directory)
          source.directory = createNextAvailableLayerDirectory(source.sourceDirectory, false)
          source.id = sourceId

          let oldDir = path.join(userDataDir, sourceId)
          if (!existsSync(oldDir)) {
            if (!isNil(source.sourceId)) {
              oldDir = path.join(userDataDir, source.sourceId)
            } else {
              // source.sourceId was not set, but it might exist within the fileName
              const matches = source.filePath.match(CONTAINS_V4_REGEX)
              if (matches != null && matches.length === 4) {
                oldDir = path.join(userDataDir, matches[2])
              }
            }
          }
          delete source['sourceId']

          // move source contents
          if (existsSync(oldDir)) {
            jetpack.move(oldDir, source.directory)
          }

          // update source file references
          if (!isNil(source.filePath)) {
            source.filePath = source.filePath.replace(oldDir, source.directory)
          }
          if (!isNil(source.geopackageFilePath)) {
            source.geopackageFilePath = source.geopackageFilePath.replace(oldDir, source.directory)
          }
          state.Projects[projectId].sources[sourceId] = await updateSource(source)
        }
      }

      // create basemaps directory
      const baseMapsDir = path.join(userDataDir, BASEMAP_DIRECTORY_IDENTIFIER)
      if (!existsSync(baseMapsDir)) {
        mkdirSync(baseMapsDir)
      }

      // iterate over basemaps and update them accordingly
      for (let i = 0; i < state.BaseMaps.baseMaps.length; i++) {
        const baseMap = state.BaseMaps.baseMaps[i]
        if (['0','1','2','3'].indexOf(baseMap.id) !== -1) {
          continue
        }
        // move base map contents to new directory
        const baseMapDir = createNextAvailableBaseMapDirectory(userDataDir, false)
        const oldDir = path.join(userDataDir, baseMap.id)
        if (!existsSync(baseMapDir) && existsSync(oldDir)) {
          jetpack.move(oldDir, baseMapDir)
        }
        // update base map file references
        baseMap.directory = baseMapDir
        baseMap.layerConfiguration.directory = baseMapDir
        baseMap.layerConfiguration.sourceDirectory = baseMapDir
        if (!isNil(baseMap.layerConfiguration.filePath)) {
          baseMap.layerConfiguration.filePath = baseMap.layerConfiguration.filePath.replace(oldDir, baseMapDir)
        }
        if (!isNil(baseMap.layerConfiguration.geopackageFilePath)) {
          baseMap.layerConfiguration.geopackageFilePath = baseMap.layerConfiguration.geopackageFilePath.replace(oldDir, baseMapDir)
        }
        baseMap.layerConfiguration = await updateSource(baseMap.layerConfiguration)
      }

      // delete all uuidv4 directories
      const uuidv4Dirs = readdirSync(userDataDir, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name)
        .filter(dir => dir.match(V4_REGEX))
        .map(dir => path.join(userDataDir, dir))

      for (let i = 0; i < uuidv4Dirs.length; i++) {
        await rmDirAsync(uuidv4Dirs[i])
      }

      const projectKeys = keys(state.Projects)
      for (const projectId of projectKeys) {
        const geopackageIds = keys(state.Projects[projectId].geopackages)
        for (const geopackageId of geopackageIds) {
          const geopackage = state.Projects[projectId].geopackages[geopackageId]
          geopackage.tables = await getInternalTableInformation(geopackage.path)
        }
      }
    },
    8: async function (state) {
      // add default srs to existing wms data sources and base maps
      const projectKeys = keys(state.Projects)
      for (let i = 0; i < projectKeys.length; i++) {
        const projectId = projectKeys[i]
        const sourceKeys = keys(state.Projects[projectId].sources)
        for (let j = 0; j < sourceKeys.length; j++) {
          const sourceId = sourceKeys[j]
          if (state.Projects[projectId].sources[sourceId].layerType === WMS) {
            state.Projects[projectId].sources[sourceId].srs = WEB_MERCATOR
          }
        }
      }
      // remove default base maps from vuex, these will be dynamic now
      state.BaseMaps.baseMaps = state.BaseMaps.baseMaps.filter(baseMap => ['0', '1', '2', '3'].indexOf(baseMap.id) === -1)
      for (let i = 0; i < state.BaseMaps.baseMaps.length; i++) {
        const baseMap = state.BaseMaps.baseMaps[i]
        if (baseMap.layerConfiguration.layerType === WMS) {
          baseMap.layerConfiguration.srs = WEB_MERCATOR
        }
      }
    },
    9: async function (state) {
      // remove any existing credentials
      const projectKeys = keys(state.Projects)
      for (let i = 0; i < projectKeys.length; i++) {
        const projectId = projectKeys[i]
        state.Projects[projectId].displayCoordinates = true
        state.Projects[projectId].displayScale = true
      }
    }
  }

  let success = true
  // check if store is out of date, if so, delete content
  let currentVersion = parseInt(store.state.Version ? store.state.Version.version : '-1')
  let installationVersion = parseInt(mapcache.store.version)
  if (currentVersion !== installationVersion) {
    // if the current version isn't set or this is a downgrade, reset state to this version's defaults, otherwise run the migration
    const requiresReset = forceReset || currentVersion < 1 || installationVersion < currentVersion
    if (!requiresReset) {
      let state = cloneDeep(store.state)
      for (let i = currentVersion + 1; i <= installationVersion; i++) {
        if (migrations[i]) {
          try {
            await migrations[i](state)
            // eslint-disable-next-line no-unused-vars
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Migration script failed: ' + i)
            success = false
          }
        } else {
          // eslint-disable-next-line no-console
          console.error('Migration script not found. exiting.')
          success = false
        }
      }
      if (success) {
        await Promise.all([
          store.dispatch('UIState/migrateState', {migratedState: state.UIState}),
          store.dispatch('URLs/migrateState', {migratedState: state.URLs}),
          store.dispatch('BaseMaps/migrateState', {migratedState: state.BaseMaps}),
          store.dispatch('Projects/migrateState', {migratedState: state.Projects}),
          store.dispatch('Version/setVersion', installationVersion),
          removeUnusedFromUserDirectory(app.getPath('userData'), state)])
      }
    } else {
      // store version not set or major revision is off, delete store
      await Promise.all([
        store.dispatch('UIState/resetState'),
        store.dispatch('URLs/resetState'),
        store.dispatch('BaseMaps/resetState'),
        store.dispatch('Projects/resetState'),
        store.dispatch('Version/setVersion', installationVersion),
        clearUserDirectory(app.getPath('userData'))])
    }
  } else {
    await removeUnusedFromUserDirectory(app.getPath('userData'), store.state)
  }
  return success
}

