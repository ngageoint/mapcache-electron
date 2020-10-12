<template>
  <v-container fluid class="pa-0 ma-0">
    <div v-if="!editMode" class="flex-container title-edit" :style="{justifyContent: justify}">
      <p :style="{fontSize: this.fontSize, fontWeight: this.fontWeight, color: this.fontColor}">
        {{value + appendedText}}
      </p>
      <v-btn text icon :color="fontColor" @click.stop="editValue" v-if="!editingDisabled">
        <v-icon>mdi-pencil</v-icon>
      </v-btn>
    </div>
    <v-row v-if="editMode && !compact" @click.stop="onClick">
      <v-card-text>
        <v-text-field :id="id" :label="label" v-model="editedValue" hide-details :dark="this.darkMode" />
      </v-card-text>
      <v-container class="pa-0">
       <v-card-actions>
         <v-spacer></v-spacer>
         <v-btn
                 text
                 color="light darken-1"
                 :dark="this.darkMode"
                 @click.stop="cancel">
           {{"Cancel"}}
         </v-btn>
         <v-btn
                 color="info"
                 :dark="this.darkMode"
                 @click.stop="save">
           {{"Save"}}
         </v-btn>
       </v-card-actions>
      </v-container>
    </v-row>
    <v-row v-if="editMode && compact" @click.stop="onClick">
      <v-col offset="3" cols="5" class="pa-0">
        <v-text-field dense :id="id" :label="label" v-model="editedValue" hide-details :dark="this.darkMode" />
      </v-col>
      <v-col cols="3" class="pa-0 pl-2">
        <v-btn
          class="pr-2"
          text
          :dark="this.darkMode"
          @click.stop="cancel">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :dark="this.darkMode"
          @click.stop="save">
          Save
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'

  export default {
    props: {
      label: String,
      value: String,
      onSave: Function,
      compact: {
        type: Boolean,
        default: false
      },
      darkMode: {
        type: Boolean,
        default: false
      },
      fontSize: {
        type: String,
        default: '16px'
      },
      fontWeight: {
        type: String,
        default: '500'
      },
      fontColor: {
        type: String,
        default: '#212121'
      },
      backgroundColor: {
        type: String,
        default: '#ffffff'
      },
      appendedText: {
        type: String,
        default: ''
      },
      editingDisabled: {
        type: Boolean,
        default: false
      },
      justify: {
        type: String,
        default: 'start'
      }
    },
    data () {
      return {
        editMode: false,
        editedValue: this.value,
        id: UniqueIDUtilities.createUniqueID()
      }
    },
    methods: {
      editValue () {
        this.editMode = true
        setTimeout(() => {
          document.getElementById(this.id).focus()
        }, 0)
      },
      save (e) {
        this.editMode = false
        this.onSave(this.editedValue)
        e.stopPropagation()
      },
      cancel (e) {
        this.editMode = false
        e.stopPropagation()
      },
      onClick (e) {
        e.stopPropagation()
      }
    },
    watch: {
      value: function () {
        this.editedValue = this.value
      }
    }
  }
</script>

<style scoped>
  .title-edit {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
  }
  .title-edit p {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    word-break: break-all;
    margin-bottom: 0 !important;
  }
  .no-overflow {
    overflow: hidden;
    flex-grow: 0;
  }
  .flex-container {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
  }
</style>
