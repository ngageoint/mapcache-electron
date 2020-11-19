<template>
  <div/>
</template>

<script>
  import { ipcRenderer } from 'electron'
  import SourceFactory from '../../lib/source/SourceFactory'
  import GeoPackageUtilties from '../../lib/GeoPackageUtilities'
  import _ from 'lodash'

  const workerId = new URL(location.href).searchParams.get('id')
  async function processSource (project, source) {
    let dataSources = []
    let error = null
    try {
      let createdSource
      if (!_.isNil(source.url)) {
        if (source.serviceType === 0) {
          createdSource = await SourceFactory.constructWMSSource(source.url, source.layers, source.credentials, source.name, source.separateLayers)
        } else if (source.serviceType === 1) {
          createdSource = await SourceFactory.constructWFSSource(source.url, source.layers, source.credentials, source.name, source.separateLayers)
        } else if (source.serviceType === 2) {
          createdSource = await SourceFactory.constructXYZSource(source.url, source.credentials, source.name)
        }
      } else {
        createdSource = await SourceFactory.constructSource(source.file.path)
      }
      if (!_.isNil(createdSource)) {
        let layers = await createdSource.retrieveLayers()
        for (let i = 0; i < layers.length; i++) {
          try {
            let initLayer = await layers[i].initialize()
            dataSources.push({project: project, sourceId: initLayer.id, config: initLayer.configuration})
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('unable to initialize data source: ' + layers[i].sourceLayerName)
            // eslint-disable-next-line no-console
            console.error(error)
          }
        }
        createdSource.removeSourceDir()
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
      ipcRenderer.on('worker_process_source', (e, data) => {
        processSource(data.project, data.source).then((result) => {
          ipcRenderer.send('worker_process_source_completed_' + workerId, result)
        })
      })
      ipcRenderer.on('worker_build_feature_layer', (e, data) => {
        const statusCallback = (status) => {
          ipcRenderer.send('worker_build_feature_layer_status_' + workerId, status)
        }
        GeoPackageUtilties.buildFeatureLayer(data.configuration, statusCallback).then((result) => {
          ipcRenderer.send('worker_build_feature_layer_completed_' + workerId, result)
        })
      })
      ipcRenderer.on('worker_build_tile_layer', (e, data) => {
        const statusCallback = (status) => {
          ipcRenderer.send('worker_build_tile_layer_status_' + workerId, status)
        }
        GeoPackageUtilties.buildTileLayer(data.configuration, statusCallback).then((result) => {
          ipcRenderer.send('worker_build_tile_layer_completed_' + workerId, result)
        })
      })
    }
  }
</script>
