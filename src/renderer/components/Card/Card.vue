<template>
  <div class="card">
    <slot name="card">
      default card
    </slot>
  </div>
</template>

<style scoped>
  .card {
    background-color: white;
    padding: 0.5rem;
    border-radius: 0.25rem;
    min-height: 3rem;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
    margin: 0.25rem;
  }
</style>
