<template>
  <div class="project-container" id="projects">
    <v-dialog
      v-model="deleteProjectDialog"
      max-width="400"
      persistent
      @keydown.esc="cancelRemove">
      <v-card v-if="deleteProjectDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
          Delete project
        </v-card-title>
        <v-card-text>
          Deleting this project will delete any downloaded data sources. Data sources and GeoPackages imported from the file system will not be deleted. Are you sure you want to delete <b>{{projectToDelete.name}}</b>? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="cancelRemove">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
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
        color="#426e91" dark class="pt-2">
        <v-card-text
          class="padding-top">
          {{dialogText}}
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0">
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
      <edit-text-modal v-if="addProjectDialog" autofocus :icon="mdiPlus" title="Create Project" save-text="Create" :on-cancel="cancelNewProject" :value="projectName" :rules="projectNameRules" font-size="16px" font-weight="bold" label="Project name" :on-save="createNewProject"/>
    </v-dialog>
    <v-row class="mt-4 mb-2" no-gutters justify="end">
      <v-btn dark text @click="onClickNewProject"><v-icon small>{{mdiPlus}}</v-icon> Create Project</v-btn>
    </v-row>
    <v-row no-gutters justify="center" class="flex-grow-1">
      <v-list dark class="semi-transparent project-list" v-if="Object.keys(projects).length > 0">
        <v-list-item class="semi-transparent" v-for="project in projects" :key="project.id" @click="onClickOpenProject(project)">
          <v-list-item-content>
            <v-list-item-title style="font-weight: 600;">
              {{project.name}}
            </v-list-item-title>
            <v-list-item-subtitle class="ml-2">
              {{Object.keys(project.geopackages).length + ' GeoPackage' + (Object.keys(project.geopackages).length !== 1 ? 's' : '')}}
            </v-list-item-subtitle>
            <v-list-item-subtitle class="ml-2">
              {{Object.keys(project.sources).length + ' data source' + (Object.keys(project.sources).length !== 1 ? 's' : '')}}
            </v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-btn icon @click.stop.prevent="showDeleteProjectDialog(project)"><v-icon>{{mdiTrashCanOutline}}</v-icon></v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
      <v-card dark flat v-else class="semi-transparent project-list">
        <v-card-text>
          No projects. Click the <b><v-icon small>{{mdiPlus}}</v-icon>Create Project</b> button to get started.
        </v-card-text>
      </v-card>
    </v-row>
  </div>
</template>

<script>
import {mapState} from 'vuex'
import EditTextModal from '../Common/EditTextModal'
import {mdiPlus, mdiTrashCan, mdiTrashCanOutline} from '@mdi/js'

export default {
    components: { EditTextModal },
    computed: {
      ...mapState({
        projects: state => {
          return state.Projects
        }
      })
    },
    data () {
      return {
        mdiTrashCan: mdiTrashCan,
        mdiTrashCanOutline: mdiTrashCanOutline,
        mdiPlus: mdiPlus,
        dialog: false,
        dialogText: '',
        deleteProjectDialog: false,
        projectToDelete: null,
        addProjectDialog: false,
        projectName: '',
        projectNameRules: [v => !!v || 'Project name is required.']
      }
    },
    methods: {
      cancelNewProject () {
        this.addProjectDialog = false
      },
      createNewProject(projectName) {
        this.addProjectDialog = false
        this.dialogText = 'Creating '  + projectName + '...'
        this.dialog = true
        this.projectName = ''
        const id = window.mapcache.createUniqueID()
        const directory = window.mapcache.createProjectDirectory()
        window.mapcache.newProject({id: id, name: projectName, directory: directory})
        window.mapcache.onceProjectShown(() => {
          this.dialog = false
        })
        this.$nextTick(() => {
          window.mapcache.showProject(id)
        })
      },
      onClickNewProject () {
        this.projectName = ''
        this.addProjectDialog = true
      },
      showDeleteProjectDialog (project) {
        this.projectToDelete = project
        this.deleteProjectDialog = true
      },
      cancelRemove () {
        this.deleteProjectDialog = false
        this.projectToDelete = null
      },
      remove () {
        window.mapcache.deleteProject(this.projectToDelete)
        this.deleteProjectDialog = false
        this.projectToDelete = null
      },
      onClickOpenProject (project) {
        this.dialogText = 'Loading ' + project.name + '...'
        this.dialog = true
        window.mapcache.disableRemoteSources(project.id)
        window.mapcache.onceProjectShown(() => {
          this.dialog = false
        })
        this.$nextTick(() => {
          window.mapcache.showProject(project.id)
        })
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
    height: 480px;
    max-height: 480px;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }
</style>
