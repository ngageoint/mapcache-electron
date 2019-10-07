<template>
  <div class="style-name-container">
    <div
        v-if="!editNameMode"
        @click.stop="editProjectName"
        class="style-name">
      {{name}}
    </div>
    <div v-show="editNameMode" class="add-data-outer provide-link-text">
      <form class="link-form">
        <label v-bind:for="id">{{iconOrStyle === 'icon' ? 'Icon Name' : 'Style Name'}}</label>
        <input
            type="text"
            class="name-edit"
            :id="id"
            :value="name"
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
      iconOrStyle: String,
      iconOrStyleId: String,
      name: String,
      layerId: String,
      projectId: String
    },
    data () {
      return {
        editNameMode: editNameMode,
        id: this.iconOrStyleId + '-name-edit'
      }
    },
    methods: {
      ...mapActions({
        setIconOrStyleName: 'Projects/setIconOrStyleName'
      }),
      editProjectName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById(this.id).focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let styleNameEdit = event.target.closest('.style-name-container').querySelector('.name-edit')
        this.setIconOrStyleName({projectId: this.projectId, layerId: this.layerId, iconOrStyle: this.iconOrStyle, id: this.iconOrStyleId, name: styleNameEdit.value})
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

.style-name {
  font-size: 1.2em;
  font-weight: bold;
  cursor: pointer;
}

</style>
