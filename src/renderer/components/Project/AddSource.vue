<template>
  <div>
    <div class="add-data-outer">
      <div @dragover.prevent="onDragOver" @drop.prevent="onDrop" @dragleave.prevent="onDragLeave" @click.stop="addFileClick" class="add-data-button" v-bind:class="{dragover: processing.dataDragOver}">
        <div class="file-icons">
          <div class="file-type-icons">
            <font-awesome-icon class="file-type-icon-1" icon="file-image" size="2x"/>
            <font-awesome-icon class="file-type-icon-2" icon="file-archive" size="2x"/>
            <font-awesome-icon class="file-type-icon-3" icon="globe-americas" transform="shrink-9 down-1" mask="file" size="2x" />
          </div>
          <font-awesome-icon class="file-import-icon" icon="file-import" size="3x"/>
        </div>
        <div class="major-button-text">Drag and drop or click here</div>
        <div class="major-button-subtext">to add data to your project</div>
        <div v-if="processing.dragging" class="major-button-text">{{processing.dragging}}</div>
      </div>
      <div v-if="!linkInputVisible" class="provide-link-text">You can also provide a <a @click.stop="provideLink">link from the web</a></div>
      <div v-show="linkInputVisible">
        <form class="link-form">
          <span class="provide-link-text">
            <label for="link-input">Link from web</label>
            <input type="url" id="link-input" class="link-input" v-model="linkToValidate"></input>
            <div class="provide-link-buttons">
              <a @click.stop="validateLink">Add URL</a>
              |
              <a @click.stop="cancelProvideLink">Cancel</a>
            </div>
          </span>
        </form>
      </div>
    </div>
    <processing-source v-for="source in processing.sources" :source="source" :key="source.file.path" class="sources processing-source" @clear-processing="clearProcessing"/>
  </div>
</template>

<script>
  import { remote } from 'electron'
  import jetpack from 'fs-jetpack'
  import { mapActions } from 'vuex'
  import SourceFactory from '../../../lib/source/SourceFactory'
  import FloatLabels from 'float-labels.js'
  import ProcessingSource from './ProcessingSource'
  import AddUrlDialog from './AddUrlDialog'

  document.ondragover = document.ondrop = (ev) => {
    ev.preventDefault()
  }

  let processing = {
    dataDragOver: false,
    sources: [],
    dragging: undefined,
    url: undefined
  }
  let linkInputVisible = false
  let linkToValidate = ''

  export default {
    props: {
      project: Object
    },
    data () {
      return {
        processing,
        linkInputVisible,
        linkToValidate
      }
    },
    components: {
      AddUrlDialog,
      ProcessingSource
    },
    methods: {
      ...mapActions({
        addProjectLayer: 'Projects/addProjectLayer'
      }),
      provideLink () {
        this.linkInputVisible = true
      },
      cancelProvideLink () {
        this.linkToValidate = ''
        this.linkInputVisible = false
      },
      validateLink () {
        console.log('validate the link', this.linkToValidate)
        this.processUrl(this.linkToValidate)
      },
      addFileClick (ev) {
        remote.dialog.showOpenDialog({
          properties: ['openFile']
        }, (files) => {
          let fileInfos = []
          for (const file of files) {
            let fileInfo = jetpack.inspect(file, {
              times: true,
              absolutePath: true
            })
            fileInfo.lastModified = fileInfo.modifyTime.getTime()
            fileInfo.lastModifiedDate = fileInfo.modifyTime
            fileInfo.path = fileInfo.absolutePath
            fileInfos.push(fileInfo)
          }
          this.processFiles(fileInfos)
        })
      },
      onDragOver (ev) {
        let item = ev.dataTransfer.items[0]
        let kind = item.kind
        let type = item.type
        processing.dragging = ev.dataTransfer.items.length + ' ' + type + ' ' + kind
        processing.dataDragOver = true
      },
      onDrop (ev) {
        processing.dragging = undefined
        processing.dataDragOver = false
        this.processFiles(ev.dataTransfer.files)
      },
      onDragLeave (ev) {
        processing.dataDragOver = false
        processing.dragging = undefined
      },
      async addSource (source) {
        try {
          let createdSource = await SourceFactory.constructSource(source.file.path)
          let layers = await createdSource.retrieveLayers()
          for (const layer of layers) {
            await layer.initialize()
            let config = layer.configuration
            this.addProjectLayer({project: this.project, layerId: layer.id, config: config})
          }

          this.clearProcessing(source)
        } catch (e) {
          console.log('source', source)
          console.log('setting source error to', e)
          source.error = e.toString()
          throw e
        }
      },
      clearProcessing (processingSource) {
        for (let i = 0; i < processing.sources.length; i++) {
          let source = processing.sources[i]
          if (source.file.path === processingSource.file.path) {
            processing.sources.splice(i, 1)
            break
          }
        }
      },

      processFiles (files) {
        let file = files[0]
        let sourceToProcess = {
          file: {
            lastModified: file.lastModified,
            lastModifiedDate: file.lastModifiedDate,
            name: file.name,
            size: file.size,
            type: file.type,
            path: file.path
          },
          status: undefined,
          error: undefined
        }
        processing.sources.push(sourceToProcess)
        console.log({file})
        setTimeout(() => {
          this.addSource(sourceToProcess)
        }, 0)
      },

      processUrl (url) {
        this.processFiles([{
          path: url
        }])
      }
    },
    mounted: function () {
      let fl = new FloatLabels('.link-form', {
        style: 1
      })
      console.log('fl', fl)
    }
  }
</script>

<style scoped>

  @import '~float-labels.js/dist/float-labels.css';

  .link-form {
    margin-top: 1em;
  }

  .provide-link-text {
    margin-top: .6em;
    font-size: .8em;
    color: rgba(54, 62, 70, .87);
  }

  .provide-link-text a {
    color: rgba(68, 152, 192, .95);
    cursor: pointer;
  }

  .provide-link-buttons {
    margin-top: -10px;
  }

  .file-icons {
    position: relative;
  }

  .file-import-icon {
    margin-top: 1.2em;
  }

  .file-type-icons {
    position: absolute;
    margin-left: auto;
    margin-right: auto;
    left: 0;
    right: 0;
    top: 10px;
  }

  .file-type-icon-1 {
    margin-right: 5px;
    transform: rotate(-40grad);
    opacity: .6;
  }

  .file-type-icon-2 {
    margin-bottom: 13px;
    transform: rotate(13grad);
    opacity: .4;
  }

  .file-type-icon-3 {
    margin-left: 1px;
    transform: rotate(30grad);
    opacity: .7;
  }

  .link-input {
    max-width: none;
  }

  .add-data-outer {
    padding: .75em;
    background-color: rgba(255, 255, 255, 1);
    border-radius: 4px;
    margin-bottom: 1em;
    margin-top: 1em;
  }

  .add-data-button {
    border-color: rgba(54, 62, 70, .87);
    border-width: 1px;
    border-style: dashed;
    border-radius: 4px;
    color: rgba(54, 62, 70, .87);
    background-color: #ECEFF1;
    padding-bottom: .2em;
    cursor: pointer;
  }

  .dragover {
    background-color: rgb(68, 152, 192);
    color: rgba(255, 255, 255, .95);
  }

  .project-name {
    font-size: 1.4em;
    font-weight: bold;
    cursor: pointer;
  }

  .major-button-text {
    font-size: 1.6em;
    font-weight: bold;
  }

  .major-button-subtext {
    opacity: .65;
    font-size: 1.1em;
  }

  .major-button-detail {
    opacity: .65;
    font-size: .7em;
  }

</style>
