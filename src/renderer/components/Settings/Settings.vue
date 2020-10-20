<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <div flat class="mx-auto" style="width: 100%;">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>mdi-chevron-left</v-icon></v-btn>
      <v-toolbar-title>Settings</v-toolbar-title>
    </v-toolbar>
    <v-dialog v-model="editProjectNameDialog" max-width="400" persistent>
      <edit-text-modal icon="mdi-pencil" :title="'Rename ' + project.name" save-text="Rename" :on-cancel="toggleEditProjectNameDialog" :value="project.name" :darkMode="false" font-size="16px" font-weight="bold" label="Project Name" :on-save="saveProjectName"/>
    </v-dialog>
    <v-dialog v-model="editMaxFeaturesDialog" max-width="400" persistent>
      <edit-number-modal icon="mdi-pencil" title="Edit Max Features" save-text="Save" :on-cancel="toggleEditMaxFeaturesDialog" :value="Number(project.maxFeatures)" :min="Number(0)" :step="Number(100)" :darkMode="false" font-size="16px" font-weight="bold" label="Max Features" :on-save="saveMaxFeatures"/>
    </v-dialog>
    <v-list two-line subheader>
      <v-subheader>General</v-subheader>
      <v-list-item @click="toggleEditProjectNameDialog">
        <v-list-item-content style="padding-right: 12px;">
          <v-list-item-title>Project name</v-list-item-title>
          <v-list-item-subtitle>Edit project name</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>Theme</v-list-item-title>
          <v-list-item-subtitle>Dark</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-switch
            v-model="darkTheme"
            color="primary"
          ></v-switch>
        </v-list-item-action>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>Tooltips</v-list-item-title>
          <v-list-item-subtitle>Show tooltips in application</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-action>
          <v-switch
            v-model="showToolTip"
            color="primary"
          ></v-switch>
        </v-list-item-action>
      </v-list-item>
    </v-list>

    <v-divider></v-divider>

    <v-list
      subheader
      two-line
      flat
      style="padding-bottom: 0;"
    >
      <v-subheader>Map</v-subheader>
      <v-list-item-group
        v-model="settings"
        multiple
      >
        <v-list-item>
          <template v-slot:default="{ active }">
          <v-list-item-content>
            <v-list-item-title>Zoom control</v-list-item-title>
            <v-list-item-subtitle>Show zoom in/out control</v-list-item-subtitle>
          </v-list-item-content>
            <v-list-item-action>
              <v-switch
                :input-value="active"
                color="primary"
              ></v-switch>
            </v-list-item-action>
          </template>
        </v-list-item>
        <v-list-item>
          <template v-slot:default="{ active }">
            <v-list-item-content>
              <v-list-item-title>Display current zoom</v-list-item-title>
              <v-list-item-subtitle>Show current zoom level</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-switch
                :input-value="active"
                color="primary"
              ></v-switch>
            </v-list-item-action>
          </template>
        </v-list-item>
        <v-list-item>
          <template v-slot:default="{ active }">
            <v-list-item-content>
              <v-list-item-title>Address search</v-list-item-title>
              <v-list-item-subtitle>Show address search bar</v-list-item-subtitle>
            </v-list-item-content>
            <v-list-item-action>
              <v-switch
                :input-value="active"
                color="primary"
              ></v-switch>
            </v-list-item-action>
          </template>
        </v-list-item>
      </v-list-item-group>
    </v-list>
    <v-list
      two-line
      style="padding-top: 0;"
    >
      <v-list-item @click="toggleEditMaxFeaturesDialog">
        <v-list-item-content style="padding-right: 12px;">
          <v-list-item-title>Max features</v-list-item-title>
          <v-list-item-subtitle>Maximum features that should be rendered per tile</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </div>
</template>

<script>
  import { mapActions } from 'vuex'
  import EditTextModal from '../Common/EditTextModal'
  import EditNumberModal from '../Common/EditNumberModal'

  let options = {
    editProjectNameDialog: false,
    editMaxFeaturesDialog: false
  }
  export default {
    props: {
      project: Object,
      dark: {
        type: Boolean,
        default: false
      },
      back: Function
    },
    components: {
      EditTextModal,
      EditNumberModal
    },
    computed: {
      darkTheme: {
        get () {
          return this.dark
        },
        set (val) {
          this.setDarkTheme({projectId: this.project.id, enabled: val})
        }
      },
      showToolTip: {
        get () {
          return this.project.showToolTips
        },
        set (val) {
          this.showToolTips({projectId: this.project.id, show: val})
        }
      },
      settings: {
        get () {
          const settings = []
          if (this.project.zoomControlEnabled || false) {
            settings.push(0)
          }
          if (this.project.displayZoomEnabled || false) {
            settings.push(1)
          }
          if (this.project.displayAddressSearchBar || false) {
            settings.push(2)
          }
          return settings
        },
        set (settings) {
          const zoomControlEnabled = this.project.zoomControlEnabled || false
          const displayZoomEnabled = this.project.displayZoomEnabled || false
          const displayAddressSearchBar = this.project.displayAddressSearchBar || false
          const zoomControlSettingFound = settings.findIndex(setting => setting === 0) >= 0
          const displayZoomSettingFound = settings.findIndex(setting => setting === 1) >= 0
          const displayAddressSearchBarFound = settings.findIndex(setting => setting === 2) >= 0

          if (zoomControlEnabled !== zoomControlSettingFound) {
            this.setZoomControlEnabled({projectId: this.project.id, enabled: zoomControlSettingFound})
          }
          if (displayZoomEnabled !== displayZoomSettingFound) {
            this.setDisplayZoomEnabled({projectId: this.project.id, enabled: displayZoomSettingFound})
          }
          if (displayAddressSearchBar !== displayAddressSearchBarFound) {
            this.setDisplayAddressSearchBar({projectId: this.project.id, enabled: displayAddressSearchBarFound})
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
        setProjectMaxFeatures: 'Projects/setProjectMaxFeatures',
        setZoomControlEnabled: 'Projects/setZoomControlEnabled',
        setDisplayZoomEnabled: 'Projects/setDisplayZoomEnabled',
        setDisplayAddressSearchBar: 'Projects/setDisplayAddressSearchBar',
        setDarkTheme: 'UIState/setDarkTheme',
        showToolTips: 'Projects/showToolTips'
      }),
      saveProjectName (val) {
        this.setProjectName({project: this.project, name: val})
        this.toggleEditProjectNameDialog()
      },
      saveMaxFeatures (val) {
        this.setProjectMaxFeatures({projectId: this.project.id, maxFeatures: val})
        this.toggleEditMaxFeaturesDialog()
      },
      toggleEditProjectNameDialog () {
        this.editProjectNameDialog = !this.editProjectNameDialog
      },
      toggleEditMaxFeaturesDialog () {
        this.editMaxFeaturesDialog = !this.editMaxFeaturesDialog
      }
    }
  }
</script>

<style scoped>
</style>
