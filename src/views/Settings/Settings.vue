<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <base-maps v-if="baseMapsDialog" :project="project" :back="() => { baseMapsDialog = false }"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
      color="main"
      dark
      flat
      class="sticky-toolbar"
    >
      <v-btn icon @click="back"><v-icon large>{{mdiChevronLeft}}</v-icon></v-btn>
      <v-toolbar-title>Settings</v-toolbar-title>
    </v-toolbar>
    <v-dialog v-model="deleteProjectDialog" max-width="400" persistent @keydown.esc="hideDeleteProjectDialog">
      <v-card v-if="deleteProjectDialog">
        <v-card-title>
          <v-icon color="warning" class="pr-2">{{mdiTrashCan}}</v-icon>
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
    <v-dialog v-model="savedUrlDialog" max-width="450" persistent scrollable @keydown.esc="savedUrlDialog = false">
      <saved-urls :close="() => {savedUrlDialog = false}"/>
    </v-dialog>
    <v-dialog v-model="editProjectNameDialog" max-width="400" persistent @keydown.esc="toggleEditProjectNameDialog">
      <edit-text-modal autofocus :icon="mdiPencil" title="Rename project" :rules="projectNameRules" save-text="Rename" :on-cancel="toggleEditProjectNameDialog" :value="project.name" font-size="16px" font-weight="bold" label="Project name" :on-save="saveProjectName"/>
    </v-dialog>
    <v-dialog v-model="editMaxFeaturesDialog" max-width="400" persistent @keydown.esc="toggleEditMaxFeaturesDialog">
      <edit-number-modal autofocus :icon="mdiPencil" title="Edit max features" save-text="Save" :on-cancel="toggleEditMaxFeaturesDialog" :value="Number(project.maxFeatures)" :min="Number(0)" :step="Number(100)" :max="1000000" :darkMode="false" font-size="16px" font-weight="bold" label="Max Features" :on-save="saveMaxFeatures"/>
    </v-dialog>
    <v-sheet class="mapcache-sheet-content">
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
                @click.stop.prevent="launchHelpWindow"
                icon
              >
                <v-icon>{{mdiHelpCircleOutline}}</v-icon>
              </v-btn>
            </template>
            <span>Help</span>
          </v-tooltip>
        </v-row>
        <v-list-item selectable @click.stop.prevent="toggleDarkTheme">
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
        <v-list-item selectable @click.stop.prevent="notifications = !notifications">
          <v-list-item-content>
            <v-list-item-title>Notifications</v-list-item-title>
            <v-list-item-subtitle>Allow system notifications</v-list-item-subtitle>
          </v-list-item-content>
          <v-list-item-action>
            <v-switch
                v-model="notifications"
                color="primary"
            ></v-switch>
          </v-list-item-action>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="toggleShowToolTip">
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
        <v-list-item selectable @click.stop.prevent="savedUrlDialog = true">
          <v-list-item-content>
            <v-list-item-title>Saved urls</v-list-item-title>
            <v-list-item-subtitle>Manage saved urls</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="baseMapsDialog = true">
          <v-list-item-content>
            <v-list-item-title>Base maps</v-list-item-title>
            <v-list-item-subtitle>Manage base maps</v-list-item-subtitle>
          </v-list-item-content>
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
          <v-list-item>
            <template v-slot:default="{ active }">
              <v-list-item-content>
                <v-list-item-title>Display coordinates</v-list-item-title>
                <v-list-item-subtitle>Show cursor coordinates</v-list-item-subtitle>
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
                <v-list-item-title>Display scale</v-list-item-title>
                <v-list-item-subtitle>Show map scale</v-list-item-subtitle>
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
            <v-btn icon color="warning"><v-icon>{{mdiTrashCan}}</v-icon></v-btn>
          </v-list-item-avatar>
        </v-list-item>
      </v-list>
    </v-sheet>
  </v-sheet>
</template>

<script>
import EditTextModal from '../Common/EditTextModal'
import EditNumberModal from '../Common/EditNumberModal'
import SavedUrls from './SavedUrls'
import BaseMaps from '../BaseMaps/BaseMaps'
import {mdiChevronLeft, mdiCloudOutline, mdiHelpCircleOutline, mdiPencil, mdiTrashCan} from '@mdi/js'
import EventBus from '../../lib/vue/EventBus'

export default {
    props: {
      project: Object,
      dark: {
        type: Boolean,
        default: false
      },
      allowNotifications: {
        type: Boolean,
        default: false
      },
      back: Function
    },
    components: {
      BaseMaps,
      SavedUrls,
      EditTextModal,
      EditNumberModal
    },
    computed: {
      darkTheme: {
        get () {
          return this.dark
        },
        set (val) {
          window.mapcache.setDarkTheme({projectId: this.project.id, enabled: val})
        }
      },
      showToolTip: {
        get () {
          return this.project.showToolTips
        },
        set (val) {
          window.mapcache.showToolTips({projectId: this.project.id, show: val})
        }
      },
      notifications: {
        get () {
          return this.allowNotifications
        },
        set (val) {
          if (val && Notification.permission !== 'granted') {
            Notification.requestPermission().then((permission) => {
              if (permission === 'granted') {
                window.mapcache.allowNotifications({projectId: this.project.id, allow: val})
              } else if (permission === 'denied') {
                EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Notification permission not granted.')
                window.mapcache.allowNotifications({projectId: this.project.id, allow: false})
              }
            })
          } else {
            window.mapcache.allowNotifications({projectId: this.project.id, allow: val})
          }
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
          if (this.project.displayCoordinates || false) {
            settings.push(3)
          }
          if (this.project.displayScale || false) {
            settings.push(4)
          }
          return settings
        },
        set (settings) {
          const zoomControlEnabled = this.project.zoomControlEnabled || false
          const displayZoomEnabled = this.project.displayZoomEnabled || false
          const displayAddressSearchBar = this.project.displayAddressSearchBar || false
          const displayCoordinates = this.project.displayCoordinates || false
          const displayScale = this.project.displayScale || false
          const zoomControlSettingFound = settings.findIndex(setting => setting === 0) >= 0
          const displayZoomSettingFound = settings.findIndex(setting => setting === 1) >= 0
          const displayAddressSearchBarFound = settings.findIndex(setting => setting === 2) >= 0
          const displayCoordinatesFound = settings.findIndex(setting => setting === 3) >= 0
          const displayScaleFound = settings.findIndex(setting => setting === 4) >= 0

          if (zoomControlEnabled !== zoomControlSettingFound) {
            window.mapcache.setZoomControlEnabled({projectId: this.project.id, enabled: zoomControlSettingFound})
          }
          if (displayZoomEnabled !== displayZoomSettingFound) {
            window.mapcache.setDisplayZoomEnabled({projectId: this.project.id, enabled: displayZoomSettingFound})
          }
          if (displayAddressSearchBar !== displayAddressSearchBarFound) {
            window.mapcache.setDisplayAddressSearchBar({projectId: this.project.id, enabled: displayAddressSearchBarFound})
          }
          if (displayCoordinates !== displayCoordinatesFound) {
            window.mapcache.setDisplayCoordinates({projectId: this.project.id, enabled: displayCoordinatesFound})
          }
          if (displayScale !== displayScaleFound) {
            window.mapcache.setDisplayScale({projectId: this.project.id, enabled: displayScaleFound})
          }
        }
      }
    },
    data () {
      return {
        mdiChevronLeft: mdiChevronLeft,
        mdiPencil: mdiPencil,
        mdiTrashCan: mdiTrashCan,
        mdiCloudOutline: mdiCloudOutline,
        mdiHelpCircleOutline: mdiHelpCircleOutline,
        editProjectNameDialog: false,
        editMaxFeaturesDialog: false,
        helpDialog: false,
        deleteProjectDialog: false,
        savedUrlDialog: false,
        baseMapsDialog: false,
        projectNameRules: [v => !!v || 'Project name is required.']
      }
    },
    methods: {
      launchHelpWindow () {
        window.mapcache.launchUserGuide()
      },
      saveProjectName (val) {
        window.mapcache.setProjectName({project: this.project, name: val})
        this.toggleEditProjectNameDialog()
      },
      saveMaxFeatures (val) {
        window.mapcache.setProjectMaxFeatures({projectId: this.project.id, maxFeatures: val})
        this.toggleEditMaxFeaturesDialog()
      },
      toggleShowToolTip () {
        window.mapcache.showToolTips({projectId: this.project.id, show: !this.project.showToolTips})
      },
      toggleDarkTheme () {
        window.mapcache.setDarkTheme({projectId: this.project.id, enabled: !this.dark})
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
        window.mapcache.deleteProject(this.project)
        window.mapcache.closeProject()
      }
    }
  }
</script>

<style scoped>
</style>
