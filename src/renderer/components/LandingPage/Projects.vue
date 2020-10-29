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
          Remove project
        </v-card-title>
        <v-card-text>
          Are you sure you want to remove <b>{{removeProject.name}}</b>? This action can't be undone.
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
            Remove
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <div class="project-container" id="projects">
      <ul class="projects" id="project-list">

        <li class="project" @click="onClickNewProject">
          <div class="project-thumb">
            <font-awesome-icon class="new-project-icon" icon="plus" size="2x"/>
          </div>
          <div class="project-thumb-name">Create A New Project</div>
        </li>

        <li v-for="project in projects" :key="project.id" @click="onClickOpenProject(project)" class="project">
          <font-awesome-icon class="project-delete" icon="times-circle" size="lg" @click.stop="showRemoveProjectDialog(project)"/>
          <div class="project-thumb">
            <img class="project-thumb-icon" src="@/assets/Icon.png"></img>
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
  import { mapState, mapActions } from 'Vuex'

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
      ...mapActions({
        newProject: 'Projects/newProject',
        deleteProject: 'Projects/deleteProject',
        openProject: 'Projects/openProject'
      }),
      onClickNewProject () {
        this.dialogText = 'Loading New Project...'
        this.dialog = true
        this.newProject()
        this.$electron.ipcRenderer.once('show-project-completed', () => {
          this.dialog = false
        })
      },
      showRemoveProjectDialog (project) {
        this.removeProject = project
        this.removeDialog = true
      },
      remove () {
        this.deleteProject(this.removeProject)
        this.removeDialog = false
        this.removeProject = null
      },
      onClickOpenProject (project) {
        this.dialogText = 'Loading ' + project.name + '...'
        this.dialog = true
        this.openProject(project)
        this.$electron.ipcRenderer.once('show-project-completed', () => {
          this.dialog = false
        })
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
    margin-top: 10px;
    border-radius: 1em;
    line-height: 200px;
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
    top: 5px;
    right: 0px;
    color: rgba(255, 255, 255, .87);
  }

  .project-delete:hover {
    border: 2px solid lightgray;
    border-radius: 10px;
  }

  .new-project-icon {
    width: 100%;
    height: 100%;
    padding: 50px;
    text-align: center;
  }

</style>
