<template>
  <div>
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
    <div class="project-container" id="projects">
      <ul class="projects" id="project-list">
        <li class="project" @click="onClickNewProject">
          <div class="project-thumb">
            <v-icon class="new-project-icon">mdi-plus</v-icon>
          </div>
          <div class="project-thumb-name">Create a new project</div>
        </li>
        <li v-for="project in projects" :key="project.id" @click="onClickOpenProject(project)" class="project">
          <v-btn dark class="project-delete" icon @click.stop.prevent="showRemoveProjectDialog(project)"><v-icon>mdi-close-circle</v-icon></v-btn>
          <div class="project-thumb">
            <img class="project-thumb-icon" src="../../assets/Icon.png"/>
          </div>
          <p class="project-thumb-name">{{project.name}}</p>
        </li>
        <v-dialog
          v-model="dialog"
          persistent
          class="padding-top"
          width="400">
          <v-card
            color="#426e91" dark>
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
      </ul>
    </div>
  </div>
</template>

<script>
  import Vue from 'vue'
  import { mapState } from 'vuex'
  import { ipcRenderer } from 'electron'
  import UniqueIDUtilities from '../../lib/UniqueIDUtilities'
  import ActionUtilities from '../../lib/ActionUtilities'

  export default {
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
        removeProject: null
      }
    },
    methods: {
      onClickNewProject () {
        this.dialogText = 'Loading New Project...'
        this.dialog = true
        const id = UniqueIDUtilities.createUniqueID()
        ActionUtilities.newProject({id: id})
        ipcRenderer.once('show-project-completed', () => {
          this.dialog = false
        })
        Vue.nextTick(() => {
          ipcRenderer.send('show-project', id)
        })
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
    height: 100vh;
    overflow-x: hidden;
  }

  .padding-top {
    padding-top: 12px !important;
  }

  .projects {
    list-style: none;
    display: flex;
    flex-flow: row wrap;
    justify-content: center;
  }

  .project {
    position: relative;
    margin: 2em;
  }

  .project-thumb {
    background: rgb(150, 150, 150);
    padding: 5px;
    width: 6em;
    height: 6em;
    border-radius: 1em;
    color: white;
    text-align: center;
    font-size: 2em;
    cursor: pointer;
  }

  .project-thumb:hover {
    background: rgb(100, 100, 100);
  }

  .project-thumb-name {
    max-width: 12em;
    text-align: center;
    font-weight: 700;
    font-size: 1em;
    color: rgba(255, 255, 255, .87);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-thumb-icon {
    width:100%;
    height:100%;
    border-radius: .8em;
  }

  .project-delete {
    position: absolute;
    top: -8px;
    right: -8px;
    color: rgba(255, 255, 255, .87);
  }

  .new-project-icon {
    font-size: 64px !important;
    text-align: center;
    margin-top: 58px;
  }

</style>
