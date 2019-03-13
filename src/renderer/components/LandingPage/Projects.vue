<template>
  <div>
    <div class="project-container" id="projects">
      <ul class="projects" id="project-list">

        <li class="project" @click="newProject()">
          <div class="project-thumb">
            <font-awesome-icon class="new-project-icon" icon="plus" size="2x"/>
          </div>
          <div class="project-thumb-name">Create A New Project</div>
        </li>

        <li v-for="project in projects" :key="project.id" @click="openProject(project)" class="project">
          <font-awesome-icon class="project-delete" icon="times-circle" size="lg" @click.stop="deleteProject(project)"/>
          <div class="project-thumb">
            <img class="project-thumb-icon" src="@/assets/Icon.png"></img>
          </div>
          <div class="project-thumb-name">{{project.name}}</div>
        </li>

      </ul>
    </div>
  </div>
</template>

<script>
  import { mapState, mapActions, mapGetters } from 'Vuex'

  export default {
    computed: {
      ...mapState({
        projects: state => {
          return state.Projects
        }
      }),
      ...mapGetters({
        getNewProject: 'Projects/getNewProject'
      })
    },
    methods: {
      ...mapActions({
        newProject: 'Projects/newProject',
        deleteProject: 'Projects/deleteProject',
        openProject: 'Projects/openProject'
      })
    }
  }
</script>

<style scoped>

  .project-container {
    overflow-y: scroll;
    height: 100vh;
    overflow-x: hidden;
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
  }

  .project-thumb-name {
    text-align: center;
    font-weight: 300;
    font-size: 1em;
    color: rgba(255, 255, 255, .87)
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
    border: 2px solid lightgrey;
    border-radius: 10px;
  }

  .new-project-icon {
    width: 100%;
    height: 100%;
    padding: 50px;
    text-align: center;
  }

</style>
