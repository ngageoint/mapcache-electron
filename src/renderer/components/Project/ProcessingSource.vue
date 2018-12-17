<template>
  <section :style="cssProps"
           class="card themed">
    <section class="card__part card__front">
      <div class="card__part__side m--back">
        <div class="card__part__inner card__face">
          <div class="card__face__colored-side"></div>
          <h3 class="card__face__header fill-background-color">
            <div v-if="source.error">
              <div class="card__header__close-btn" @click="closeCard"></div>
              <div class="card__face__source-error-name contrast-text">
                Error - {{source.file.name}}
              </div>
            </div>
            <div v-else>
              <div class="card__face__source-name contrast-text">
                <font-awesome-icon icon="spinner" title="processing" spin pulse></font-awesome-icon> Processing: {{source.file.name}}
              </div>
            </div>
          </h3>
          <div class="card_path">
            <p>Path: {{source.file.path}}</p>
            <p>Size: {{source.file.size}}</p>
            <p v-if="source.status">Status: {{source.status}}</p>
            <p v-if="source.error">{{source.error}}</p>
            <div style="padding-top: 10px">
              <x-button toggled v-if="!source.error">
                <x-box>
                  <x-icon name="cancel"></x-icon>
                  <x-label>Cancel Processing</x-label>
                </x-box>
              </x-button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>

<script>
  export default {
    props: ['source'],
    computed: {
      cssProps () {
        let fillColor = '#83BFC3'
        let textColor = '#111'
        if (this.source.error) {
          fillColor = '#C00'
          textColor = '#EEE'
        }
        return {
          '--fill-color': fillColor,
          '--contrast-text-color': textColor
        }
      }
    },
    methods: {
      closeCard () {
        this.$emit('clear-processing', this.source)
      }
    }
  }
</script>

<style scoped>

.card {
  z-index: 1;
  position: relative;
  height: 160px;
  margin-bottom: 15px;
  -webkit-perspective: 2000px;
          perspective: 2000px;
  -webkit-transition: margin 0.4s 0.1s;
  transition: margin 0.4s 0.1s;
}

.card__part {
  z-index: 1;
  position: absolute;
  left: 0;
  width: 100%;
  border-radius: 11px;
  -webkit-transform-origin: 50% 0;
          transform-origin: 50% 0;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
}
.card__part__side {
  z-index: 1;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: #fff;
  -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
  -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
}
.card__part__side.m--back {
  -webkit-transform: rotateX(180deg);
          transform: rotateX(180deg);
}

.card__front {
  z-index: 6;
  top: 100%;
  height: 100%;
  -webkit-transform: rotateX(179deg) translateZ(3px);
          transform: rotateX(179deg) translateZ(3px);
  -webkit-transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: border-radius 0.25s, -webkit-transform 0.5s ease-out;
  transition: transform 0.5s ease-out, border-radius 0.25s;
  transition: transform 0.5s ease-out, border-radius 0.25s, -webkit-transform 0.5s ease-out;
}
.card__front > .m--back {
  overflow: hidden;
  cursor: pointer;
}

.card.themed .card__face__colored-side {
  background: var(--fill-color);
}
.card.themed .card__face__path {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.card.themed .card__header {
  color: var(--contrast-text-color);
  background: var(--fill-color);
}
.card.themed .card__sender__rating__star {
  color: var(--fill-color);
}
.card.themed .card__path-big {
  background: -webkit-repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  background: repeating-linear-gradient(var(--fill-color), var(--fill-color) 3px, transparent 3px, transparent 6px);
  border-color: var(--fill-color);
}
.card__face__source-name {
  padding-top: 4px;
  font-size: 15px;
  font-weight: bold;
  padding-left: 5px;
  flex: 1;
}
.card__face__source-error-name {
  padding-top: 4px;
  font-size: 15px;
  font-weight: bold;
  padding-left: 25px;
  flex: 1;
}
.fill-color-background {
  background-color: var(--fill-color);
}
.contrast-text {
  color: var(--contrast-text-color);
}

.card__face__header {
  display: flex;
  align-items:center;
  margin-top: -20px;
  margin-left: -13px;
  margin-right: -20px;
  padding-bottom: 4px;
  font-weight: normal;
  font-size: 22px;
  -webkit-transition: color 0.3s;
  transition: color 0.3s;
  background-color: var(--fill-color);
}

.card__face {
  padding: 20px 20px 15px;
}
.card__face:after {
  content: "";
  z-index: 5;
  position: absolute;
  right: 0;
  top: 31px;
  width: 20px;
  height: 100%;
  background: -webkit-linear-gradient(left, rgba(255, 255, 255, 0), white 60%, white 100%);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), white 60%, white 100%);
}
.card__face__colored-side {
  z-index: -1;
  position: fixed;
  left: 0;
  top: 0;
  width: 7px;
  height: 100%;
  border-top-left-radius: 11px;
  border-bottom-left-radius: 11px;
  -webkit-transition: width 0.3s;
  transition: width 0.3s;
}
.card__header__close-btn {
  z-index: 2;
  position: absolute;
  left: 12px;
  top: 5px;
  width: 16px;
  height: 16px;
  -webkit-transition: -webkit-transform 0.3s;
  transition: -webkit-transform 0.3s;
  transition: transform 0.3s;
  transition: transform 0.3s, -webkit-transform 0.3s;
  cursor: pointer;
}
.card__header__close-btn:hover {
  -webkit-transform: rotate(90deg);
          transform: rotate(90deg);
}
.card__header__close-btn:before, .card__header__close-btn:after {
  content: "";
  position: absolute;
  left: -4px;
  top: 7px;
  width: 23px;
  height: 2px;
  background: var(--contrast-text-color);
}
.card__header__close-btn:before {
  -webkit-transform: rotate(45deg);
          transform: rotate(45deg);
}
.card__header__close-btn:after {
  -webkit-transform: rotate(-45deg);
          transform: rotate(-45deg);
}
.card_path {
  position: absolute;
  left: 18px;
  top: 37px;
  width: 300px;
  color: #555A5F;
  font-size: 13px;
  overflow-wrap: break-word;
}

</style>
