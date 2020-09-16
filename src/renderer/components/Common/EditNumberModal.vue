<template>
  <v-card @click.stop="onClick">
    <v-card-title style="color: grey; font-weight: 600;">
      <v-row no-gutters justify="start" align="center">
        <v-icon>{{icon}}</v-icon>{{title}}
      </v-row>
    </v-card-title>
    <v-card-text>
      <v-form>
        <v-container class="ma-0 pa-0">
          <v-row no-gutters>
            <v-col cols="12">
              <number-picker :number="value" :label="label" :step="step" @update-number="updateValue" :min="min" :max="max" :arrows-only="arrowsOnly" />
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="#3b779a"
        text
        :dark="darkMode"
        @click="cancel">
        {{cancelText}}
      </v-btn>
      <v-btn
        color="#3b779a"
        text
        :dark="darkMode"
        @click="save">
        {{saveText}}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
  import UniqueIDUtilities from '../../../lib/UniqueIDUtilities'
  import NumberPicker from './NumberPicker'

  export default {
    props: {
      title: String,
      icon: String,
      label: String,
      value: Number,
      saveText: {
        type: String,
        default: 'Save'
      },
      cancelText: {
        type: String,
        default: 'Cancel'
      },
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
