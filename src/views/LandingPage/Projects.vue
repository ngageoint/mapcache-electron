<template>
  <div class="project-container" id="projects">
    <v-dialog
      v-if="removeProject"
      v-model="removeDialog"
      max-width="400"
      persistent>
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Delete project
        </v-card-title>
        <v-card-text>
          Deleting this project will delete any downloaded data sources. Data sources and GeoPackages imported from the file system will not be deleted. Are you sure you want to delete <b>{{removeProject.name}}</b>? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="removeDialog = false">
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
      width="400">
      <edit-text-modal v-if="addProjectDialog" focusOnMount icon="mdi-plus" title="Create Project" save-text="Create" :on-cancel="cancelNewProject" :value="projectName" :rules="projectNameRules" :darkMode="false" font-size="16px" font-weight="bold" label="Project name" :on-save="createNewProject"/>
    </v-dialog>
    <v-row class="mt-4 mb-2" no-gutters justify="end">
      <v-btn dark text @click="onClickNewProject"><v-icon small>mdi-plus</v-icon> Create Project</v-btn>
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
            <v-btn icon @click.stop.prevent="showRemoveProjectDialog(project)"><v-icon>mdi-trash-can-outline</v-icon></v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
      <v-card dark flat v-else class="semi-transparent project-list">
        <v-card-text>
          No projects. Click the <b><v-icon small>mdi-plus</v-icon>Create Project</b> button to get started.
        </v-card-text>
      </v-card>
    </v-row>
  </div>
</template>

<script>
  import Vue from 'vue'
  import { mapState } from 'vuex'
  import { ipcRenderer } from 'electron'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'
  import EditTextModal from '../Common/EditTextModal'

  export default {
    components: {EditTextModal},
    computed: {
      ...mapState({
        projects: state => {
          return state.Projects
        }
      })
    },
    data () {
      return {
        dialog: false,
        dialogText: '',
        removeDialog: false,
        removeProject: null,
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
        const id = UniqueIDUtilities.createUniqueID()
        ActionUtilities.newProject({id: id, name: projectName})
        ipcRenderer.once('show-project-completed', () => {
          this.dialog = false
        })
        Vue.nextTick(() => {
          ipcRenderer.send('show-project', id)
        })
      },
      onClickNewProject () {
        this.projectName = ''
        this.addProjectDialog = true
      },
      showRemoveProjectDialog (project) {
        this.removeProject = project
        this.removeDialog = true
      },
      remove () {
        ActionUtilities.deleteProject(this.removeProject)
        this.removeDialog = false
        this.removeProject = null
      },
      onClickOpenProject (project) {
        this.dialogText = 'Loading ' + project.name + '...'
        this.dialog = true
        ipcRenderer.once('show-project-completed', () => {
          this.dialog = false
        })
        ipcRenderer.send('show-project', project.id)
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
