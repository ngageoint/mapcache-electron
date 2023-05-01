<template>
  <div class="project-container" id="projects">
    <v-dialog
        id="import-dialog"
        v-model="geoPackageFileImportDialog"
        max-width="450"
        class="import-dialog"
        persistent
        @keydown.esc="cancelRemove">
      <v-card flat tile v-if="geoPackageFileImportDialog" class="overflow-hidden">
        <v-card-title>
          <v-icon color="primary" class="pr-2" icon="mdi-package-variant"/>
          Open {{ geoPackageFiles.length }} GeoPackage {{ geoPackageFiles.length === 1 ? 'file' : 'files' }}
        </v-card-title>
        <v-card-text class="pb-0">
          <v-card-subtitle class="pa-0 pb-2">
            Open in a new project...
          </v-card-subtitle>
          <v-form v-on:submit.prevent v-model="projectNameValid" ref="form">
            <v-text-field variant="underlined" class="pl-4 pr-4" label="Project name" v-model="projectName" :rules="projectNameRules">
              <template v-slot:append>
                <v-tooltip location="end">
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" color="primary" icon="mdi-plus" :disabled="!projectNameValid"
                           @click="() => createNewProject(projectName)">
                    </v-btn>
                  </template>
                  <span>Create</span>
                </v-tooltip>
              </template>
            </v-text-field>
          </v-form>
          <v-card-subtitle class="pa-0 pb-4">
            or select a recent project.
          </v-card-subtitle>
          <v-row no-gutters class="pl-4 pr-4">
            <v-list lines="three" class="dialog-project-list" v-if="projects.length > 0">
              <v-list-item v-for="project in projects" :key="project.id" @click="onClickOpenProject(project)">
                <div>
                  <v-list-item-title>
                    {{ project.name }}
                  </v-list-item-title>
                  <v-list-item-subtitle class="ml-2">
                    {{
                      Object.keys(project.geopackages).length + ' GeoPackage' + (Object.keys(project.geopackages).length !== 1 ? 's' : '')
                    }}
                  </v-list-item-subtitle>
                  <v-list-item-subtitle class="ml-2">
                    {{
                      Object.keys(project.sources).length + ' data source' + (Object.keys(project.sources).length !== 1 ? 's' : '')
                    }}
                  </v-list-item-subtitle>
                </div>
              </v-list-item>
            </v-list>
          </v-row>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="cancelGeoPackageFileImport">
            Cancel
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="deleteProjectDialog"
        max-width="400"
        persistent
        @keydown.esc="cancelRemove">
      <v-card v-if="deleteProjectDialog" class="pa-2">
        <v-card-title>
          <v-icon icon="mdi-trash-can" color="warning" class="pr-2"/>
          Delete project
        </v-card-title>
        <v-card-text>
          Deleting this project will delete any downloaded data sources. Data sources and GeoPackages imported from the
          file system will not be deleted. Are you sure you want to delete <b>{{ projectToDelete.name }}</b>? This
          action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="cancelRemove">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
              @click="remove">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="dialog"
        persistent
        width="400">
      <v-card
          theme="dark"
          color="#426e91" class="pt-2 pb-4">
        <v-card-text
            theme="dark"
            class="pt-2">
          {{ dialogText }}
          <v-progress-linear
              class="mt-2"
              indeterminate
              color="white">
          </v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
    <v-dialog
        v-model="addProjectDialog"
        persistent
        class="padding-top"
        width="400"
        @keydown.esc="cancelNewProject">
      <edit-text-modal v-if="addProjectDialog" autofocus icon="mdi-plus" title="Create project" save-text="Create"
                       :on-cancel="cancelNewProject" :value="projectName" :rules="projectNameRules" font-size="16px"
                       font-weight="bold" label="Project name" :on-save="createNewProject"/>
    </v-dialog>
    <v-row class="mt-4 mb-2" no-gutters justify="end">
      <v-btn class="dark-btn" prepend-icon="mdi-plus" @click="onClickNewProject" variant="text">
        Create project
      </v-btn>
    </v-row>
    <span style="color: whitesmoke; font-size: 12px">Recent projects</span>
    <v-row no-gutters justify="center" class="flex-grow-1 mt-2">
      <v-list lines="two" class="semi-transparent project-list pa-0" v-if="projects.length > 0" theme="dark">
        <v-list-item class="semi-transparent" v-for="project in projects" :key="project.id" @click="onClickOpenProject(project)">
          <v-list-item-title style="font-weight: 600;">
            {{ project.name }}
          </v-list-item-title>
          <v-list-item-subtitle class="ml-2">
            {{
              Object.keys(project.geopackages).length + ' GeoPackage' + (Object.keys(project.geopackages).length !== 1 ? 's' : '')
            }}
          </v-list-item-subtitle>
          <v-list-item-subtitle class="ml-2">
            {{
              Object.keys(project.sources).length + ' data source' + (Object.keys(project.sources).length !== 1 ? 's' : '')
            }}
          </v-list-item-subtitle>
          <template v-slot:append>
            <v-btn variant="text" icon="mdi:mdi-trash-can-outline" @click.stop.prevent="showDeleteProjectDialog(project)"/>
          </template>
        </v-list-item>
      </v-list>
      <v-card flat v-else class="semi-transparent project-list">
        <v-card-text>
          No projects. Click the <b>
          <v-icon icon="mdi-plus" small/>
          Create project</b> button to get started.
        </v-card-text>
      </v-card>
    </v-row>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import EditTextModal from '../Common/EditTextModal.vue'
import { environment } from '../../lib/env/env'
import { addGeoPackage, deleteProject } from '../../lib/vue/vuex/CommonActions'
import { disableRemoteSources, newProject, setProjectAccessed } from '../../lib/vue/vuex/LandingActions'

export default {
  components: { EditTextModal },
  computed: {
    ...mapState({
      projects: state => {
        return state != null ? Object.values(state.Projects).sort((a, b) => {
          return (b.lastAccessedDateTime || 0) - (a.lastAccessedDateTime || 0)
        }) : []
      }
    })
  },
  data () {
    return {
      step: 1,
      dialog: false,
      dialogText: '',
      deleteProjectDialog: false,
      projectToDelete: null,
      addProjectDialog: false,
      projectName: 'New project',
      projectNameRules: [v => !!v || 'Project name is required.'],
      projectNameValid: true,
      geoPackageFileImportDialog: false,
      geoPackageFiles: [],
      selectedProject: null
    }
  },
  beforeMount () {
    window.mapcache.registerGeoPackageFileHandler((filePaths) => {
      filePaths.forEach(filePath => {
        if (filePath.endsWith('.gpkg') && this.geoPackageFiles.indexOf(filePath) === -1) {
          this.geoPackageFiles.push(filePath)
        }
      })
      this.geoPackageFileImportDialog = this.geoPackageFiles.length > 0
    })
  },
  mounted () {
    this.setupDragAndDrop()
  },
  beforeDestroy () {
    window.mapcache.unregisterGeoPackageFileHandler()
  },
  methods: {
    reset () {
      this.projectName = 'New project'
      this.selectedProject = null
      this.geoPackageFiles = []
      this.projectToDelete = null
      this.step = 1
    },
    setupDragAndDrop () {
      const project = document.getElementById('wrapper')
      const importDialog = document.getElementById('import-dialog')
      if (project != null && importDialog != null) {
        project.ondragover = () => {
          return false
        }
        project.ondragleave = () => {
          return false
        }
        project.ondragend = () => {
          return false
        }
        project.ondrop = (e) => {
          e.preventDefault()
          for (let f of e.dataTransfer.files) {
            if (f.path.endsWith('.gpkg') && this.geoPackageFiles.indexOf(f.path) === -1) {
              this.geoPackageFiles.push(f.path)
            }
          }
          this.geoPackageFileImportDialog = this.geoPackageFiles.length > 0
          return false
        }
        importDialog.ondragover = () => {
          return false
        }
        importDialog.ondragleave = () => {
          return false
        }
        importDialog.ondragend = () => {
          return false
        }
        importDialog.ondrop = () => {
          return false
        }
      }
    },
    cancelGeoPackageFileImport () {
      this.geoPackageFileImportDialog = false
      this.$nextTick(() => {
        this.reset()
      })
    },
    cancelNewProject () {
      this.addProjectDialog = false
      this.$nextTick(() => {
        this.reset()
      })
    },
    createPreloadedDataSources (directory) {
      const sources = {}
      environment.preloadedDataSources.forEach(preloadedSource => {
        const source = Object.assign({}, preloadedSource)
        const sourceDirectory = window.mapcache.createSourceDirectory(directory)
        const layerDirectory = window.mapcache.createNextAvailableLayerDirectory(sourceDirectory)
        source.id = window.mapcache.createUniqueID()
        source.directory = layerDirectory
        source.sourceDirectory = sourceDirectory
        sources[source.id] = source
      })
      return sources
    },
    async createNewProject (projectName) {
      this.addProjectDialog = false
      this.geoPackageFileImportDialog = false
      this.dialogText = 'Creating ' + projectName + '...'
      this.dialog = true
      const id = window.mapcache.createUniqueID()
      const directory = window.mapcache.createProjectDirectory()
      const sources = this.createPreloadedDataSources(directory)
      await newProject({ id: id, name: projectName, directory: directory, sources: sources })
      let geopackageIds = []
      while (this.geoPackageFiles.length > 0) {
        geopackageIds.push(await addGeoPackage({ projectId: id, filePath: this.geoPackageFiles.pop() }))
      }
      setTimeout(() => {
        setProjectAccessed(id)
        window.mapcache.showProject(id, geopackageIds)
        this.reset()
      }, 100)
    },
    onClickNewProject (event, projectName = 'New project') {
      this.projectName = projectName
      this.addProjectDialog = true
    },
    showDeleteProjectDialog (project) {
      this.projectToDelete = project
      this.deleteProjectDialog = true
    },
    cancelRemove () {
      this.deleteProjectDialog = false
      this.reset()
    },
    remove () {
      deleteProject(this.projectToDelete.id).catch(e => {
        console.error(e)
      }).finally(() => {
        this.deleteProjectDialog = false
        this.reset()
      })
    },
    async onClickOpenProject (project) {
      this.geoPackageFileImportDialog = false
      this.dialogText = 'Loading ' + project.name + '...'
      this.dialog = true
      await disableRemoteSources(project.id)
      await setProjectAccessed(project.id)
      window.mapcache.showProject(project.id, null, this.geoPackageFiles.slice())
      this.reset()
    }
  }
}
</script>

<style scoped>
.project-container {
  overflow-y: auto;
  height: 100%;
  width: 100%;
  overflow-x: hidden;
}

.semi-transparent {
  background-color: #00000020 !important;
  border-color: #00000040 !important;
}

.project-list {
  height: 450px;
  max-height: 450px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.dialog-project-list {
  max-height: 225px;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border: solid lightgray 1px;
}

.import-dialog {
  max-height: 400px !important;
}

.no-transition .v-stepper__content {
  transition: none;
}

.dark-btn {
  color: #FFFFFF !important;
}
</style>
