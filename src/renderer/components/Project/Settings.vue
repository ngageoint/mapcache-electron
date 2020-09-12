<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <v-card class="mx-auto">
    <v-dialog v-model="editProjectNameDialog" max-width="400">
      <edit-text-modal :on-cancel="toggleEditProjectNameDialog" :value="project.name" :darkMode="false" font-size="16px" font-weight="bold" label="Project Name" :on-save="saveProjectName"/>
    </v-dialog>
    <v-toolbar
      color="#3b779a"
      class="round-top-border"
      dark
      flat
    >
      <v-toolbar-title>Settings</v-toolbar-title>
    </v-toolbar>
    <v-list two-line subheader>
      <v-subheader>General</v-subheader>
      <v-list-item @click="toggleEditProjectNameDialog">
        <v-list-item-content style="padding-right: 12px;">
          <v-list-item-title>Project name</v-list-item-title>
          <v-list-item-subtitle>Edit project name</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>

    <v-divider></v-divider>

    <v-list
      subheader
      two-line
      flat
    >
      <v-subheader>Map</v-subheader>
      <v-list-item-group
        v-model="settings"
        multiple
      >
        <v-list-item>
          <template v-slot:default="{ active }">
          <v-list-item-action>
            <v-checkbox
              :input-value="active"
              color="#3b779a"
            ></v-checkbox>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Zoom control</v-list-item-title>
            <v-list-item-subtitle>Show zoom in/out control</v-list-item-subtitle>
          </v-list-item-content>
          </template>
        </v-list-item>
        <v-list-item>
          <template v-slot:default="{ active }">
            <v-list-item-action>
              <v-checkbox
                :input-value="active"
                color="#3b779a"
              ></v-checkbox>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>Display current zoom</v-list-item-title>
              <v-list-item-subtitle>Show current zoom level</v-list-item-subtitle>
            </v-list-item-content>
          </template>
        </v-list-item>
      </v-list-item-group>
    </v-list>
  </v-card>
</template>

<script>
  import { mapActions } from 'vuex'
  import EditTextModal from '../Common/EditTextModal'

  let options = {
    editProjectNameDialog: false
  }
  export default {
    props: {
      project: Object
    },
    components: {
      EditTextModal
    },
    computed: {
      settings: {
        get () {
          const settings = []
          if (this.project.zoomControlEnabled || false) {
            settings.push(0)
          }
          if (this.project.displayZoomEnabled || false) {
            settings.push(1)
          }
          return settings
        },
        set (settings) {
          const zoomControlEnabled = this.project.zoomControlEnabled || false
          const displayZoomEnabled = this.project.displayZoomEnabled || false
          const zoomControlSettingFound = settings.findIndex(setting => setting === 0) >= 0
          const displayZoomSettingFound = settings.findIndex(setting => setting === 1) >= 0

          if (zoomControlEnabled !== zoomControlSettingFound) {
            this.setZoomControlEnabled({projectId: this.project.id, enabled: zoomControlSettingFound})
          }
          if (displayZoomEnabled !== displayZoomSettingFound) {
            this.setDisplayZoomEnabled({projectId: this.project.id, enabled: displayZoomSettingFound})
          }
        }
      }
    },
    data () {
      return options
    },
    methods: {
      ...mapActions({
        setProjectName: 'Projects/setProjectName',
        setZoomControlEnabled: 'Projects/setZoomControlEnabled',
        setDisplayZoomEnabled: 'Projects/setDisplayZoomEnabled'
      }),
      saveProjectName (val) {
        this.setProjectName({project: this.project, name: val})
        this.toggleEditProjectNameDialog()
      },
      toggleEditProjectNameDialog () {
        this.editProjectNameDialog = !this.editProjectNameDialog
      }
    }
  }
</script>

<style scoped>
  .round-top-border {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
</style>
