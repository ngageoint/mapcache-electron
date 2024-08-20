<template>
  <div>
    <v-textarea variant="underlined" class="editable-text-area" no-resize rows="1" auto-grow :label="lowerCaseName" clearable v-if="dataType === TEXT" v-model="editedValue" :rules="rules"></v-textarea>
    <v-row style="height: 50px !important; margin-right: 6px !important;" class="align-center" no-gutters align="center"
           justify="space-between" v-else-if="dataType === BOOLEAN">
      <v-col>
        <v-list-item-subtitle>{{ lowerCaseName }}</v-list-item-subtitle>
      </v-col>
      <v-switch class="pa-0 mt-0" color="primary" v-model="editedValue" hide-details></v-switch>
    </v-row>
    <v-row no-gutters justify="space-between" v-else-if="dataType === DATE || dataType === DATETIME">
      <v-col v-if="showDate">
        <v-menu
            v-model="dateMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            min-width="290px"
        >
          <template v-slot:activator="{ props }">
            <v-text-field
                variant="underlined"
                v-model="editedDateValue"
                :label="name"
                prepend-icon="mdi-calendar"
                readonly
                clearable
                v-bind="props"
            ></v-text-field>
          </template>
          <v-date-picker
              v-model="editedDateValue"
              no-title
              scrollable
          >
            <v-spacer></v-spacer>
            <v-btn
                variant="text"
                color="primary"
                @click="dateMenu = false"
            >
              OK
            </v-btn>
          </v-date-picker>
        </v-menu>
      </v-col>
      <v-col v-if="showTime">
        <v-menu
            v-model="timeMenu"
            :close-on-content-click="false"
            transition="scale-transition"
            offset-y
            min-width="290px"
        >
          <template v-slot:activator="{ props }">
            <v-text-field
                variant="underlined"
                v-model="editedTimeValue"
                label="time"
                prepend-icon="mdi-clock"
                readonly
                clearable
                v-bind="props"
            ></v-text-field>
          </template>
          <v-time-picker
              v-model="editedTimeValue"
              format="24hr"
              use-seconds
          >
            <v-spacer></v-spacer>
            <v-btn
                variant="text"
                color="primary"
                @click="timeMenu = false"
            >
              OK
            </v-btn>
          </v-time-picker>
        </v-menu>
      </v-col>
    </v-row>
    <v-text-field variant="underlined" :label="lowerCaseName" clearable type="number" v-else v-model="editedValue" :rules="rules"></v-text-field>
  </div>
</template>

<script>
export default {
  props: {
    index: Number,
    updateColumnProperty: Function,
    value: [String, Number, Date, Boolean],
    timeValue: [String, Object, Date],
    dateValue: [String, Object, Date],
    showTime: Boolean,
    showDate: Boolean,
    name: String,
    rules: Array,
    lowerCaseName: String,
    dataType: Number
  },
  data () {
    return {
      TEXT: window.mapcache.GeoPackageDataType.TEXT,
      FLOAT: window.mapcache.GeoPackageDataType.FLOAT,
      BOOLEAN: window.mapcache.GeoPackageDataType.BOOLEAN,
      DATETIME: window.mapcache.GeoPackageDataType.DATETIME,
      DATE: window.mapcache.GeoPackageDataType.DATE,
      dateMenu: false,
      timeMenu: false,
    }
  },
  computed: {
    editedValue: {
      get () {
        return this.value
      },
      set (value) {
        this.updateColumnProperty(value, 'value', this.index)
      }
    },
    editedTimeValue: {
      get () {
        return this.timeValue
      },
      set (value) {
        this.updateColumnProperty(value, 'timeValue', this.index)
      }
    },
    editedDateValue: {
      get () {
        return this.dateValue
      },
      set (value) {
        this.updateColumnProperty(value, 'dateValue', this.index)
      }
    }
  }
}
</script>

<style scoped>
.editable-text-area:deep(.textarea) {
  max-height: 10rem;
  overflow: auto;
}
.editable-text-area:deep(.textarea::-webkit-scrollbar) {
  width: 0 !important;
}
</style>
