<template>
  <div/>
</template>

<script>
  import SourceFactory from '../../../lib/source/SourceFactory'
  import GeoPackageUtilties from '../../../lib/GeoPackageUtilities'

  const workerId = new URL(location.href).searchParams.get('id')
  async function processSource (project, source) {
    let dataSources = []
    let error = null
    try {
      let createdSource = null
      if (source.wms) {
        createdSource = await SourceFactory.constructWMSSource(source.file.path, source.layers, source.credentials)
      } else if (source.wfs) {
        createdSource = await SourceFactory.constructWFSSource(source.file.path, source.layers, source.credentials)
      } else if (source.xyz) {
        createdSource = await SourceFactory.constructXYZSource(source.file.path, source.credentials)
      } else {
        createdSource = await SourceFactory.constructSource(source.file.path)
      }
      let layers = await createdSource.retrieveLayers()
      for (let i = 0; i < layers.length; i++) {
        try {
          let initLayer = await layers[i].initialize()
          dataSources.push({project: project, sourceId: initLayer.id, config: initLayer.configuration})
        } catch (error) {
          console.error('unable to initialize data source: ' + layers[i].sourceLayerName)
          console.error(error)
        }
      }
      createdSource.removeSourceDir()
    } catch (e) {
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
      this.$electron.ipcRenderer.on('worker_process_source', (e, data) => {
        processSource(data.project, data.source).then((result) => {
          this.$electron.ipcRenderer.send('worker_process_source_completed_' + workerId, result)
        })
      })
      this.$electron.ipcRenderer.on('worker_build_feature_layer', (e, data) => {
        const statusCallback = (status) => {
          this.$electron.ipcRenderer.send('worker_build_feature_layer_status_' + workerId, status)
        }
        GeoPackageUtilties.buildFeatureLayer(data.configuration, statusCallback).then((result) => {
          this.$electron.ipcRenderer.send('worker_build_feature_layer_completed_' + workerId, result)
        })
      })
      this.$electron.ipcRenderer.on('worker_build_tile_layer', (e, data) => {
        const statusCallback = (status) => {
          this.$electron.ipcRenderer.send('worker_build_tile_layer_status_' + workerId, status)
        }
        GeoPackageUtilties.buildTileLayer(data.configuration, statusCallback).then((result) => {
          this.$electron.ipcRenderer.send('worker_build_tile_layer_completed_' + workerId, result)
        })
      })
    }
  }
</script>
