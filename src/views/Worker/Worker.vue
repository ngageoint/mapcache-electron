<template>
  <div/>
</template>

<script>
  import { ipcRenderer } from 'electron'
  import SourceFactory from '../../lib/source/SourceFactory'
  import GeoPackageUtilties from '../../lib/GeoPackageUtilities'
  import GeoTIFFUtilities from '../../lib/GeoTIFFUtilities'
  import _ from 'lodash'
  import ActionUtilities from '../../lib/ActionUtilities'

  async function processSource (project, source) {
    let dataSources = []
    let error = null
    try {
      let createdSource
      if (!_.isNil(source.url)) {
        if (source.serviceType === 0) {
          createdSource = await SourceFactory.constructWMSSource(source.url, source.layers, source.credentials, source.name)
        } else if (source.serviceType === 1) {
          createdSource = await SourceFactory.constructWFSSource(source.url, source.layers, source.credentials, source.name)
        } else if (source.serviceType === 2) {
          createdSource = await SourceFactory.constructXYZSource(source.url, source.credentials, source.name)
        } else if (source.serviceType === 3) {
          createdSource = await SourceFactory.constructArcGISFeatureServiceSource(source.url, source.layers, source.credentials, source.name)
        }
      } else {
        createdSource = await SourceFactory.constructSource(source.file.path)
      }
      if (!_.isNil(createdSource)) {
        let layers = await createdSource.retrieveLayers().catch(err => {
          throw err
        })
        for (let i = 0; i < layers.length; i++) {
          try {
            let initLayer = await layers[i].initialize(true, false)
            dataSources.push({project: project, sourceId: initLayer.id, config: initLayer.configuration})
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('unable to initialize data source: ' + layers[i].sourceLayerName)
            // eslint-disable-next-line no-console
            console.error(error)
          }
        }
        createdSource.removeSourceDir()
      } else {
        error = 'Unable to create source.'
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
      error = e
    }
    return {
      dataSources: dataSources,
      source: source,
      error: error
    }
  }

  export default {
    name: 'worker-page',
    created: function () {
      ipcRenderer.removeAllListeners('worker_process_source')
      ipcRenderer.removeAllListeners('worker_build_feature_layer')
      ipcRenderer.removeAllListeners('worker_build_tile_layer')
      ipcRenderer.removeAllListeners('worker_read_raster')
      ipcRenderer.removeAllListeners('worker_attach_media')

      ipcRenderer.on('worker_process_source', (e, data) => {
        processSource(data.project, data.source).then((result) => {
          ipcRenderer.send('worker_process_source_completed_' + data.taskId, result)
        })
      })
      ipcRenderer.on('worker_build_feature_layer', (e, data) => {
        const statusCallback = (status) => {
          ipcRenderer.send('worker_build_feature_layer_status_' + data.taskId, status)
        }
        GeoPackageUtilties.buildFeatureLayer(data.configuration, statusCallback).then((result) => {
          ipcRenderer.send('worker_build_feature_layer_completed_' + data.taskId, result)
        })
      })
      ipcRenderer.on('worker_build_tile_layer', (e, data) => {
        const statusCallback = (status) => {
          ipcRenderer.send('worker_build_tile_layer_status_' + data.taskId, status)
        }
        GeoPackageUtilties.buildTileLayer(data.configuration, statusCallback).then((result) => {
          ipcRenderer.send('worker_build_tile_layer_completed_' + data.taskId, result)
        })
      })
      ipcRenderer.on('worker_read_raster', (e, data) => {
        GeoTIFFUtilities.readRasters(data.filePath).then(rasters => {
          ipcRenderer.send('worker_read_raster_completed_' + data.taskId, rasters)
        })
      })
      ipcRenderer.on('worker_attach_media', (e, data) => {
        GeoPackageUtilties.addMediaAttachment(data.geopackagePath, data.tableName, data.featureId, data.filePath).then(result => {
          if (data.isGeoPackage) {
            ActionUtilities.synchronizeGeoPackage({projectId: data.projectId, geopackageId: data.id})
          } else {
            ActionUtilities.updateStyleKey(data.projectId, data.id, data.tableName, data.isGeoPackage)
          }
          ipcRenderer.send('worker_attach_media_completed_' + data.taskId, result)
        })
      })
    }
  }
</script>
