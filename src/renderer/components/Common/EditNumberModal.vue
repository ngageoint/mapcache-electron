<template>
  <v-card>
    <v-row no-gutters @click.stop="onClick">
      <v-card-text>
        <number-picker :number="value" :label="label" :step="step" @update-number="updateValue" :min="min" :max="max" :arrows-only="arrowsOnly" />
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
  </v-card>
</template>

<script>
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import NumberPicker from './NumberPicker'

  export default {
    props: {
      label: String,
      value: Number,
      onSave: Function,
      onCancel: Function,
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
      step: Number,
      min: Number,
      max: Number,
      arrowsOnly: {
        type: Boolean,
        default: false
      }
    },
    components: {
      NumberPicker
    },
    data () {
      return {
        editedValue: this.value,
        id: UniqueIDUtilities.createUniqueID()
      }
    },
    methods: {
      editValue () {
        setTimeout(() => {
          document.getElementById(this.id).focus()
        }, 0)
      },
      save (e) {
        this.onSave(this.editedValue)
        e.stopPropagation()
      },
      cancel (e) {
        this.onCancel()
        this.editedValue = this.value
        e.stopPropagation()
      },
      onClick (e) {
        e.stopPropagation()
      },
      updateValue (val) {
        this.editedValue = val
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
