<template>
  <v-card>
    <v-card-title>
      Select a certificate
    </v-card-title>
    <v-card-subtitle>
      Select a certificate to authenticate yourself to {{ certificateRequestUrl }}
    </v-card-subtitle>
    <v-card-text>
      <v-data-table
          v-model="certificateSelection"
          single-select
          height="150px"
          dense
          disable-filtering
          disable-pagination
          disable-sort
          :headers="headers"
          :hide-default-footer="true"
          :items="certificateList"
          class="elevation-1"
      >
        <template v-slot:item="{ item }">
          <tr :class="certificateSelection[0] === item.id ? 'grey lighten-1' : ''"
              @click.stop.prevent="selectCertificateRow(item)">
            <td class="text-truncate" style="max-width: 200px;">{{ item.subjectName }}</td>
            <td class="text-truncate" style="max-width: 150px;">{{ item.issuerName }}</td>
            <td class="text-truncate" style="max-width: 150px;">{{ item.serialNumber }}</td>
          </tr>
        </template>
      </v-data-table>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
          text
          @click="() => {cancelSelection(certificateRequestUrl)}">
        Cancel
      </v-btn>
      <v-btn
          color="primary"
          text
          @click="select">
        Select
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>

export default {
  data () {
    return {
      headers: [
        { text: 'Subject ', value: 'subjectName', width: 200 },
        { text: 'Issuer', value: 'issuerName', width: 150 },
        { text: 'Serial', value: 'serialNumber', width: 150 }
      ],
      certificateSelection: [0]
    }
  },
  props: {
    certificateList: Array,
    certificateRequestUrl: String,
    selectCertificate: Function,
    cancelSelection: Function
  },
  methods: {
    select () {
      this.selectCertificate(this.certificateRequestUrl, this.certificateList[this.certificateSelection].certificate)
    },
    selectCertificateRow (row) {
      this.certificateSelection = [row.id]
    }
  }
}
</script>

<style scoped>
.content-panel {
  background-color: whitesmoke;
  max-width: 400px;
  min-height: 100vh;
  max-height: 100vh;
  /*overflow-y: auto;*/
}

.list-item:hover {
  background-color: rgb(var(--v-theme-main-darken-2)) !important;
  color: whitesmoke;
}

.list-item-active {
  background-color: rgb(var(--v-theme-main_active_background));
  color: rgb(var(--v-theme-main_active_text)) !important;
}

.list-item-active:hover {
  background-color: rgb(var(--v-theme-main));
  color: whitesmoke !important;
}
</style>
