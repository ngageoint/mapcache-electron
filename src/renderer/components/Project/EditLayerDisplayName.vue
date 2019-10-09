<template>
  <div class="layer-name-container">
    <div
        v-if="!editNameMode"
        @click.stop="editLayerName"
        class="layer-name">
      {{initialDisplayName.length > 40 ? initialDisplayName.substring(0, 37) + "..." : initialDisplayName}}
    </div>
    <div v-show="editNameMode" class="add-data-outer provide-link-text">
      <form class="link-form">
        <label for="layer-name-edit">Layer Name</label>
        <input
            type="text"
            class="layer-name-edit"
            id="layer-name-edit"
            :value="initialDisplayName"
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
  import _ from 'lodash'

  let editNameMode = false

  export default {
    props: {
      layer: Object,
      projectId: String
    },
    data () {
      return {
        editNameMode
      }
    },
    computed: {
      initialDisplayName () {
        return _.isNil(this.layer.displayName) ? this.layer.name : this.layer.displayName
      }
    },
    methods: {
      ...mapActions({
        setLayerDisplayName: 'Projects/setLayerDisplayName'
      }),
      editLayerName () {
        this.editNameMode = true
        setTimeout(() => {
          document.getElementById('layer-name-edit').focus()
        }, 0)
      },
      saveEditedName (event) {
        this.editNameMode = false
        let layerNameEdit = event.target.closest('.layer-name-container').querySelector('.layer-name-edit')
        this.setLayerDisplayName({projectId: this.projectId, layerId: this.layer.id, displayName: layerNameEdit.value})
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

.layer-name {
  font-size: 1.2em;
  font-weight: bold;
  cursor: pointer;
}

</style>
