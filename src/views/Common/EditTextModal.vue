<template>
  <v-card>
    <v-card-title v-if="title != null">
      <v-icon color="primary" class="pr-2">{{ icon }}</v-icon>
      {{ title }}
    </v-card-title>
    <v-card-text>
      <v-form v-on:submit.prevent v-model="valid" ref="form">
        <v-container class="ma-0 pa-0">
          <v-row no-gutters>
            <v-col cols="12">
              <v-text-field ref="textField" :label="label" v-model="editedValue" :rules="rules" :autofocus="autofocus"
                            @keydown.space="handleSpaceKey"/>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </v-card-text>
    <v-card-actions>
      <v-btn
          v-if="onBack != null"
          text
          @click="back">
        {{ backText }}
      </v-btn>
      <v-spacer></v-spacer>
      <v-btn
          text
          @click="cancel">
        {{ cancelText }}
      </v-btn>
      <v-btn
          :disabled="!valid"
          color="primary"
          text
          @click="save">
        {{ saveText }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  props: {
    title: String,
    icon: String,
    label: String,
    value: String,
    rules: {
      type: Array,
      default: () => []
    },
    saveText: {
      type: String,
      default: 'Save'
    },
    cancelText: {
      type: String,
      default: 'Cancel'
    },
    backText: {
      type: String,
      default: 'Back'
    },
    onSave: Function,
    onCancel: Function,
    onBack: Function,
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
    autofocus: {
      type: Boolean,
      default: false
    },
    preventSpaces: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      editedValue: this.value,
      valid: false
    }
  },
  methods: {
    save (e) {
      this.onSave(this.editedValue)
      e.stopPropagation()
    },
    back (e) {
      this.onBack()
      this.editedValue = this.value
      e.stopPropagation()
    },
    cancel (e) {
      this.onCancel()
      this.editedValue = this.value
      e.stopPropagation()
    },
    handleSpaceKey (e) {
      if (this.preventSpaces) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  },
  watch: {
    value: function () {
      this.editedValue = this.value
    }
  },
  mounted () {
    this.$nextTick(() => {
      this.$refs.form.resetValidation()
    })
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
