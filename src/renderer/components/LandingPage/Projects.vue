<template>
  <div>
    <div class="project-container" id="projects">
      <ul class="projects" id="project-list">
        <li v-for="project in projects" :key="project.id" @click="openProject(project)" style="position: relative;">
          <font-awesome-icon class="project-delete" icon="times-circle" size="lg" @click.stop="deleteProject(project)"/>
          <div class="project-thumb">
            <img class="project-thumb-icon" src="@/assets/Icon.png"></img>
          </div>
          <div class="project-thumb-name">{{project.name}}</div>
        </li>
      </ul>
    </div>
    <x-button @click="newProject()" id="new-project-button">
      <x-box>
        <x-icon name="camera"></x-icon>
        <x-label>New Project</x-label>
      </x-box>
    </x-button>
  </div>
</template>

<script>
  import * as Projects from '../../../lib/projects'

  let projects = Object.values(Projects.readProjects())

  const newProject = () => {
    projects.push(Projects.newProject())
  }

  export default {
    data () {
      return {
        projects
      }
    },
    methods: {
      openProject (project) {
        console.log('open project', project)
        Projects.openProject(project.id)
      },
      deleteProject (project) {
        console.log('delete project', project)
        Projects.deleteProject(project)
      },
      newProject
    }
  }
</script>

<style scoped>

  .project-container {
    margin: 20px;
  }

  .projects {
    list-style: none;
    display: flex;
    flex-flow: row wrap;
    justify-content: space-around;
  }

  .project-thumb {
    background: lightgrey;
    padding: 5px;
    width: 200px;
    height: 200px;
    margin-top: 10px;
    border-radius: 60px;
    line-height: 200px;
    color: white;
    text-align: center;
    font-size: 2em;
  }

  .project-thumb-name {
    text-align: center;
    font-weight: 300;
    font-size: 1em;
  }

  .project-thumb-icon {
    width:100%;
    height:100%;
    border-radius: 55px;
  }

  .project-delete {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .project-delete:hover {
    border: 2px solid lightgrey;
    border-radius: 10px;
  }

</style>
