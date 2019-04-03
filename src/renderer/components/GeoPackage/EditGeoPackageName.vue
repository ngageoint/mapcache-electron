<template>

  <div class="project-name-container">

    <div v-if="!editNameMode"
         @click.stop="editGeoPackageName"
         class="project-name">
      <div v-if="geopackage.name">{{geopackage.name}}</div>
      <div v-if="!geopackage.name">Unnamed</div>
    </div>

    <div v-show="editNameMode" class="add-data-outer provide-link-text">
      <form class="link-form">
        <label for="project-name-edit">GeoPackage Name</label>
        <input
            type="text"
            class="project-name-edit"
            id="project-name-edit"
            :value="geopackage.name"
            @keydown.enter.prevent="saveEditedName">
        </input>
        <div class="provide-link-buttons">
          <a @click.stop="saveEditedName">Save</a>
          |
          <a @click.stop="cancelEditName">Cancel</a>
        </div>
      </form>
    </div>

  </div>

</template>

<script>
  import { mapActions } from 'vuex'
  import FloatLabels from 'float-labels.js'

  let editNameMode = false

  export default {
    props: {
      project: Object,
      geopackage: Object
    },
    data () {
      return {
        editNameMode
      }
    },
    methods: {
      ...mapActions({
        setGeoPackageName: 'Projects/setGeoPackageName'
      }),
      editGeoPackageName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('project-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let geopackageNameEdit = event.target.closest('.project-name-container').querySelector('.project-name-edit')
        this.setGeoPackageName({projectId: this.project.id, geopackageId: this.geopackage.id, name: geopackageNameEdit.value})
      },
      cancelEditName () {
        this.editNameMode = false
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

.add-data-outer {
  padding: .75em;
  background-color: rgba(255, 255, 255, 1);
  border-radius: 4px;
  margin-bottom: 1em;
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

.link-form {
  margin-top: 1em;
}

.save-name-button {
  margin-right: 5px;
}

.project-name {
  font-size: 1.4em;
  font-weight: bold;
  cursor: pointer;
}

</style>
