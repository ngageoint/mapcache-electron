<template>
  <div/>
</template>

<script>
  import SourceFactory from '../../../lib/source/SourceFactory'
  import GeoPackageBuilder from '../../../lib/source/GeoPackageBuilder'
  import store from '../../../store'

  const workerId = new URL(location.href).searchParams.get('id')
  async function processSource (project, source) {
    let projectLayers = []
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
          projectLayers.push({project: project, layerId: initLayer.id, config: initLayer.configuration})
        } catch (error) {
          console.error('unable to initialize layer: ' + layers[i].sourceLayerName)
          console.error(error)
        }
      }
    } catch (e) {
      console.error(e)
      error = e
    }
    return {
      projectLayers: projectLayers,
      source: source,
      error: error
    }
  }

  async function buildGeoPackage (project, geopackageConfiguration) {
    const geopackageBuilder = new GeoPackageBuilder(geopackageConfiguration, project, store)
    return geopackageBuilder.go()
  }

  export default {
    name: 'worker-page',
    created: function () {
      this.$electron.ipcRenderer.on('worker_process_source', (e, data) => {
        processSource(data.project, data.source).then((result) => {
          this.$electron.ipcRenderer.send('worker_process_source_completed_' + workerId, result)
        })
      })
      this.$electron.ipcRenderer.on('worker_build_geopackage', (e, data) => {
        buildGeoPackage(data.project, data.geopackage).then((result) => {
          this.$electron.ipcRenderer.send('worker_build_geopackage_completed_' + workerId, result)
        })
      })
    }
  }
</script>
