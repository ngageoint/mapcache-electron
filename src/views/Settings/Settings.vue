<template xmlns:v-slot="http://www.w3.org/1999/XSL/Transform">
  <add-base-map :dark="dark" v-if="addBaseMapDialog" :base-maps="baseMaps" :project="project" :close="() => {addBaseMapDialog = false}"></add-base-map>
  <base-maps v-else-if="baseMapsDialog" :project="project" :back="() => { baseMapsDialog = false }"/>
  <v-sheet v-else class="mapcache-sheet">
    <v-toolbar
        color="main"
        flat
        class="sticky-toolbar"
    >
      <v-btn density="comfortable" icon="mdi-chevron-left" @click="back"/>
      <v-toolbar-title>Settings</v-toolbar-title>
    </v-toolbar>
    <v-dialog v-model="deleteProjectDialog" max-width="400" persistent @keydown.esc="hideDeleteProjectDialog">
      <v-card v-if="deleteProjectDialog">
        <v-card-title>
          <v-icon icon="mdi-trash-can" color="warning" class="pr-2"/>
          Delete project
        </v-card-title>
        <v-card-text>
          Deleting this project will delete any downloaded data sources. Data sources and GeoPackages imported from the
          file system will not be deleted. Are you sure you want to delete <b>{{ project.name }}</b>? This action can't
          be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
              variant="text"
              @click="hideDeleteProjectDialog">
            Cancel
          </v-btn>
          <v-btn
              color="warning"
              variant="text"
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
      <edit-text-modal autofocus icon="mdi-pencil" title="Rename project" :rules="projectNameRules" save-text="Rename"
                       :on-cancel="toggleEditProjectNameDialog" :value="project.name" font-size="16px"
                       font-weight="bold" label="Project name" :on-save="saveProjectName"/>
    </v-dialog>
    <v-dialog v-model="editMaxFeaturesDialog" max-width="400" persistent @keydown.esc="toggleEditMaxFeaturesDialog">
      <edit-number-modal autofocus icon="mdi-pencil" title="Edit max features" save-text="Save"
                         :on-cancel="toggleEditMaxFeaturesDialog" :value="Number(project.maxFeatures)" :min="Number(0)"
                         :step="Number(100)" :max="1000000" :darkMode="false" font-size="16px" font-weight="bold"
                         label="Max Features" :on-save="saveMaxFeatures"/>
    </v-dialog>
    <v-dialog v-model="nominatimUrlDialog" max-width="400" persistent @keydown.esc="toggleNominatimUrlDialog">
      <edit-text-modal autofocus icon="mdi-pencil" title="Edit nominatim url" :rules="urlRules" save-text="Save"
                       :on-cancel="toggleNominatimUrlDialog" :value="nominatimUrl" font-size="16px"
                       font-weight="bold" label="Nominatim url" :on-save="saveNominatimUrl"/>
    </v-dialog>
    <v-dialog v-model="overpassUrlDialog" max-width="400" persistent @keydown.esc="toggleOverpassUrlDialog">
      <edit-text-modal autofocus icon="mdi-pencil" title="Edit overpass interpreter url" :rules="urlRules"
                       save-text="Save"
                       :on-cancel="toggleOverpassUrlDialog" :value="overpassUrl" font-size="16px"
                       font-weight="bold" label="Overpass url" :on-save="saveOverpassUrl"/>
    </v-dialog>
    <v-sheet class="mapcache-sheet-content">
      <v-list lines="two" subheader>
        <v-row density="compact" no-gutters justify="space-between" align="center">
          <v-col>
            <v-list-subheader>General</v-list-subheader>
          </v-col>
          <v-tooltip text="Help" location="start" :disabled="!project.showToolTips">
            <template v-slot:activator="{ props }">
              <v-btn
                  variant="flat"
                  v-bind="props"
                  class="ma-2"
                  @click.stop.prevent="launchHelpWindow"
                  icon="mdi-help-circle-outline"
              >
              </v-btn>
            </template>
          </v-tooltip>
        </v-row>
        <v-list-item selectable @click.stop.prevent="toggleDarkTheme">
          <div>
            <v-list-item-title>Theme</v-list-item-title>
            <v-list-item-subtitle>Dark</v-list-item-subtitle>
          </div>
          <template v-slot:append>
            <v-switch v-model="darkTheme" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="notifications = !notifications">
          <div>
            <v-list-item-title>Notifications</v-list-item-title>
            <v-list-item-subtitle>Allow system notifications</v-list-item-subtitle>
          </div>
          <template v-slot:append>
            <v-switch v-model="notifications" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="toggleShowToolTip">
          <div>
            <v-list-item-title>Tooltips</v-list-item-title>
            <v-list-item-subtitle>Show tooltips in application</v-list-item-subtitle>
          </div>
          <template v-slot:append>
            <v-switch v-model="showToolTip" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="savedUrlDialog = true">
          <div>
            <v-list-item-title>Saved urls</v-list-item-title>
            <v-list-item-subtitle>Manage saved urls</v-list-item-subtitle>
          </div>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="baseMapsDialog = true">
          <div>
            <v-list-item-title>Base maps</v-list-item-title>
            <v-list-item-subtitle>Manage base maps</v-list-item-subtitle>
          </div>
        </v-list-item>
        <v-list-item @click="toggleNominatimUrlDialog">
          <div style="padding-right: 12px;">
            <v-list-item-title>Nominatim URL</v-list-item-title>
            <v-list-item-subtitle>Adjust the nominatim service used to search the map.</v-list-item-subtitle>
          </div>
        </v-list-item>
        <v-list-item @click="toggleOverpassUrlDialog">
          <div style="padding-right: 12px;">
            <v-list-item-title>Overpass URL</v-list-item-title>
            <v-list-item-subtitle>Adjust the interpreter used for Overpass data imports.</v-list-item-subtitle>
          </div>
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list
          subheader
          lines="two">
        <v-list-subheader>Map</v-list-subheader>
        <v-list-item>
          <div>
            <v-list-item-title>Projection</v-list-item-title>
            <v-list-item-subtitle>Adjust the map's projection</v-list-item-subtitle>
            <v-radio-group color="primary" hide-details density="compact" class="ml-2 mt-2 pt-0" v-model="mapProjection" :value="mapProjection" row>
              <v-radio density="compact" label="Web Mercator (EPSG:3857)" :value="3857"></v-radio>
              <v-radio density="compact" label="Plate Carrée (EPSG:4326)" :value="4326"></v-radio>
            </v-radio-group>
          </div>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="zoomControlEnabled = !zoomControlEnabled">
          <v-list-item-title>Zoom control</v-list-item-title>
          <v-list-item-subtitle>Show zoom in/out control</v-list-item-subtitle>
          <template v-slot:append>
            <v-switch v-model="zoomControlEnabled" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="displayZoomEnabled = !displayZoomEnabled">
          <v-list-item-title>Display current zoom</v-list-item-title>
          <v-list-item-subtitle>Show current zoom level</v-list-item-subtitle>
          <template v-slot:append>
            <v-switch v-model="displayZoomEnabled" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="displayAddressSearchBar = !displayAddressSearchBar">
          <v-list-item-title>Address search</v-list-item-title>
          <v-list-item-subtitle>Show address search bar</v-list-item-subtitle>
          <template v-slot:append>
            <v-switch v-model="displayAddressSearchBar" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="displayCoordinates = !displayCoordinates">
          <v-list-item-title>Display coordinates</v-list-item-title>
          <v-list-item-subtitle>Show cursor coordinates</v-list-item-subtitle>
          <template v-slot:append>
            <v-switch v-model="displayCoordinates" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item selectable @click.stop.prevent="displayScale = !displayScale">
          <v-list-item-title>Display scale</v-list-item-title>
          <v-list-item-subtitle>Show map scale</v-list-item-subtitle>
          <template v-slot:append>
            <v-switch v-model="displayScale" color="primary" hide-details/>
          </template>
        </v-list-item>
        <v-list-item @click="toggleEditMaxFeaturesDialog">
          <v-list-item-title>Max features</v-list-item-title>
          <v-list-item-subtitle>Maximum features that should be rendered per tile</v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <v-divider></v-divider>
      <v-list subheader lines="two" style="padding-top: 0;">
        <v-list-subheader>Project</v-list-subheader>
        <v-list-item @click="toggleEditProjectNameDialog">
          <div style="padding-right: 12px;">
            <v-list-item-title>Rename project</v-list-item-title>
            <v-list-item-subtitle>Rename <b>{{ project.name }}</b> project</v-list-item-subtitle>
          </div>
        </v-list-item>
        <v-list-item @click="showDeleteProjectDialog">
          <div style="padding-right: 12px;">
            <v-list-item-title class="warning--text">Delete project</v-list-item-title>
            <v-list-item-subtitle class="warning--text">Permanently delete <b>{{ project.name }}</b> project
            </v-list-item-subtitle>
          </div>
          <template v-slot:append>
            <v-btn variant="text" icon="mdi-trash-can-outline" color="warning"/>
          </template>
        </v-list-item>
      </v-list>
    </v-sheet>
  </v-sheet>
</template>

<script>
import EditTextModal from '../Common/EditTextModal.vue'
import EditNumberModal from '../Common/EditNumberModal.vue'
import SavedUrls from './SavedUrls.vue'
import BaseMaps from '../BaseMaps/BaseMaps.vue'
import AddBaseMap from '../BaseMaps/AddBaseMap.vue'
import EventBus from '../../lib/vue/EventBus'
import { mapState } from 'vuex'
import { environment } from '../../lib/env/env'
import { WEB_MERCATOR_CODE } from '../../lib/projection/ProjectionConstants'
import { getDefaultBaseMaps } from '../../lib/util/basemaps/BaseMapUtilities'
import { deleteProject } from '../../lib/vue/vuex/CommonActions'
import {
  allowNotifications,
  setDarkTheme,
  setDisplayAddressSearchBar, setDisplayCoordinates, setDisplayScale,
  setDisplayZoomEnabled, setMapProjection, setNominatimUrl, setOverpassUrl,
  setProjectMaxFeatures,
  setProjectName,
  setZoomControlEnabled,
  showToolTips
} from '../../lib/vue/vuex/ProjectActions'

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
    AddBaseMap,
    BaseMaps,
    SavedUrls,
    EditTextModal,
    EditNumberModal
  },
  computed: {
    ...mapState({
      nominatimUrl: state => {
        return state.URLs.nominatimUrl || environment.nominatimUrl
      },
      overpassUrl: state => {
        return state.URLs.overpassUrl || environment.overpassUrl
      },
      baseMaps: state => {
        return getDefaultBaseMaps().concat(state.BaseMaps.baseMaps || [])
      }
    }),
    darkTheme: {
      get () {
        return this.dark || false
      },
      set (val) {
        setDarkTheme(this.project.id, val)
      }
    },
    showToolTip: {
      get () {
        return this.project.showToolTips || false
      },
      set (val) {
        showToolTips(this.project.id, val)
      }
    },
    mapProjection: {
      get () {
        return this.project.mapProjection || WEB_MERCATOR_CODE
      },
      set (val) {
        setMapProjection(this.project.id, val)
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
              allowNotifications(this.project.id, val)
            } else if (permission === 'denied') {
              EventBus.$emit(EventBus.EventTypes.ALERT_MESSAGE, 'Notification permission not granted.')
              allowNotifications(this.project.id, false)
            }
          })
        } else {
          allowNotifications(this.project.id, val)
        }
      }
    },
    zoomControlEnabled: {
      get () {
        return this.project.zoomControlEnabled || false
      },
      set (val) {
        setZoomControlEnabled(this.project.id, val)
      }
    },
    displayZoomEnabled: {
      get () {
        return this.project.displayZoomEnabled || false
      },
      set (val) {
        setDisplayZoomEnabled(this.project.id, val)
      }
    },
    displayAddressSearchBar: {
      get () {
        return this.project.displayAddressSearchBar || false
      },
      set (val) {
        setDisplayAddressSearchBar(this.project.id, val)
      }
    },
    displayCoordinates: {
      get () {
        return this.project.displayCoordinates || false
      },
      set (val) {
        setDisplayCoordinates(this.project.id, val)
      }
    },
    displayScale: {
      get () {
        return this.project.displayScale || false
      },
      set (val) {
        setDisplayScale(this.project.id, val)
      }
    },
  },
  data () {
    return {
      editProjectNameDialog: false,
      editMaxFeaturesDialog: false,
      helpDialog: false,
      deleteProjectDialog: false,
      savedUrlDialog: false,
      baseMapsDialog: false,
      nominatimUrlDialog: false,
      overpassUrlDialog: false,
      urlRules: [
        v => !!v || 'Url is required',
        v => window.mapcache.isUrlValid(v) || 'Invalid url',
      ],
      projectNameRules: [v => !!v || 'Project name is required.'],
      addBaseMapDialog: false
    }
  },
  methods: {
    launchHelpWindow () {
      window.mapcache.launchUserGuide()
    },
    saveProjectName (val) {
      setProjectName(this.project.id, val)
      this.toggleEditProjectNameDialog()
    },
    saveMaxFeatures (val) {
      setProjectMaxFeatures(this.project.id, val)
      this.toggleEditMaxFeaturesDialog()
    },
    toggleShowToolTip () {
      showToolTips(this.project.id, !this.project.showToolTips)
    },
    toggleDarkTheme () {
      setDarkTheme(this.project.id, !this.dark)
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
    toggleNominatimUrlDialog () {
      this.nominatimUrlDialog = !this.nominatimUrlDialog
    },
    saveNominatimUrl (val) {
      setNominatimUrl(val)
      this.toggleNominatimUrlDialog()
    },
    toggleOverpassUrlDialog () {
      this.overpassUrlDialog = !this.overpassUrlDialog
    },
    saveOverpassUrl (val) {
      setOverpassUrl(val)
      this.toggleOverpassUrlDialog()
    },
    deleteProjectAndClose () {
      deleteProject(this.project).then(() => {
        setTimeout(() => {
          window.mapcache.closeProject()
        }, 100)
      })
    }
  },
  mounted () {
    EventBus.$on(EventBus.EventTypes.CREATE_BASE_MAP, () => {
      this.baseMapsDialog = true
      this.addBaseMapDialog = true
    })
  },
  beforeDestroy () {
    EventBus.$off(EventBus.EventTypes.CREATE_BASE_MAP)
  }
}
</script>

<style scoped>
</style>
