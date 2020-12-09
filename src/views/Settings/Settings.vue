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
    <v-dialog
      v-model="deleteProjectDialog"
      max-width="400"
      persistent>
      <v-card>
        <v-card-title>
          <v-icon color="warning" class="pr-2">mdi-trash-can</v-icon>
          Delete project
        </v-card-title>
        <v-card-text>
          Deleting this project will delete any downloaded data sources. Data sources and GeoPackages imported from the file system will not be deleted. Are you sure you want to delete <b>{{project.name}}</b>? This action can't be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            text
            @click="hideDeleteProjectDialog">
            Cancel
          </v-btn>
          <v-btn
            color="warning"
            text
            @click="deleteProjectAndClose">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="editProjectNameDialog" max-width="400" persistent>
      <edit-text-modal icon="mdi-pencil" title="Rename project" save-text="Rename" :on-cancel="toggleEditProjectNameDialog" :value="project.name" :darkMode="false" font-size="16px" font-weight="bold" label="Project Name" :on-save="saveProjectName"/>
    </v-dialog>
    <v-dialog v-model="editMaxFeaturesDialog" max-width="400" persistent>
      <edit-number-modal icon="mdi-pencil" title="Edit Max Features" save-text="Save" :on-cancel="toggleEditMaxFeaturesDialog" :value="Number(project.maxFeatures)" :min="Number(0)" :step="Number(100)" :darkMode="false" font-size="16px" font-weight="bold" label="Max Features" :on-save="saveMaxFeatures"/>
    </v-dialog>
    <v-dialog v-model="helpDialog" max-width="500" persistent>
      <help :close="() => {helpDialog = false}"></help>
    </v-dialog>
    <v-list two-line subheader>
      <v-row no-gutters justify="space-between" align="center">
        <v-col>
          <v-subheader>General</v-subheader>
        </v-col>
        <v-tooltip right :disabled="!project.showToolTips">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              v-bind="attrs"
              v-on="on"
              class="ma-2"
              @click.stop.prevent="helpDialog = true"
              icon
            >
              <v-icon>mdi-help-circle-outline</v-icon>
            </v-btn>
          </template>
          <span>Help</span>
        </v-tooltip>
      </v-row>
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

    <v-divider></v-divider>

    <v-list subheader two-line style="padding-top: 0;">
      <v-subheader>Project</v-subheader>
      <v-list-item @click="toggleEditProjectNameDialog">
        <v-list-item-content style="padding-right: 12px;">
          <v-list-item-title>Rename project</v-list-item-title>
          <v-list-item-subtitle>Rename <b>{{project.name}}</b> project</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item @click="showDeleteProjectDialog">
        <v-list-item-content style="padding-right: 12px;">
          <v-list-item-title class="warning--text">Delete project</v-list-item-title>
          <v-list-item-subtitle class="warning--text">Permanently delete <b>{{project.name}}</b> project</v-list-item-subtitle>
        </v-list-item-content>
        <v-list-item-avatar>
          <v-btn icon color="warning"><v-icon>mdi-trash-can</v-icon></v-btn>
        </v-list-item-avatar>
      </v-list-item>
    </v-list>

  </div>
</template>

<script>
  import { ipcRenderer } from 'electron'
  import EditTextModal from '../Common/EditTextModal'
  import EditNumberModal from '../Common/EditNumberModal'
  import Help from './Help'
  import ActionUtilities from '../../lib/ActionUtilities'

  let options = {
    editProjectNameDialog: false,
    editMaxFeaturesDialog: false,
    helpDialog: false,
    deleteProjectDialog: false
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
      EditNumberModal,
      Help
    },
    computed: {
      darkTheme: {
        get () {
          return this.dark
        },
        set (val) {
          ActionUtilities.setDarkTheme({projectId: this.project.id, enabled: val})
        }
      },
      showToolTip: {
        get () {
          return this.project.showToolTips
        },
        set (val) {
          ActionUtilities.showToolTips({projectId: this.project.id, show: val})
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
            ActionUtilities.setZoomControlEnabled({projectId: this.project.id, enabled: zoomControlSettingFound})
          }
          if (displayZoomEnabled !== displayZoomSettingFound) {
            ActionUtilities.setDisplayZoomEnabled({projectId: this.project.id, enabled: displayZoomSettingFound})
          }
          if (displayAddressSearchBar !== displayAddressSearchBarFound) {
            ActionUtilities.setDisplayAddressSearchBar({projectId: this.project.id, enabled: displayAddressSearchBarFound})
          }
        }
      }
    },
    data () {
      return options
    },
    methods: {
      saveProjectName (val) {
        ActionUtilities.setProjectName({project: this.project, name: val})
        this.toggleEditProjectNameDialog()
      },
      saveMaxFeatures (val) {
        ActionUtilities.setProjectMaxFeatures({projectId: this.project.id, maxFeatures: val})
        this.toggleEditMaxFeaturesDialog()
      },
      toggleEditProjectNameDialog () {
        this.editProjectNameDialog = !this.editProjectNameDialog
      },
      showDeleteProjectDialog () {
        this.deleteProjectDialog = true
      },
      hideDeleteProjectDialog () {
        this.deleteProjectDialog = false
      },
      toggleEditMaxFeaturesDialog () {
        this.editMaxFeaturesDialog = !this.editMaxFeaturesDialog
      },
      deleteProjectAndClose () {
        ActionUtilities.deleteProject(this.project)
        ipcRenderer.send('close-project')
      }
    }
  }
</script>

<style scoped>
</style>