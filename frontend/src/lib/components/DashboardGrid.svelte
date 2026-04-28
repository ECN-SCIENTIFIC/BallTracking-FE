<script lang="ts">
  /** When true, show the camera slot in the main layout. */
  export let showCamera = false;
  /** When true, show the charts slot (normally always on for this dashboard). */
  export let showCharts = true;
  export let isDesktop = false;
</script>

{#if isDesktop}
  <div class="grid grid-cols-12 gap-4 flex-1 min-h-0 min-w-0 items-stretch min-h-[480px]">
    {#if showCamera}
      <div
        class={showCharts
          ? "col-span-6 flex flex-col min-h-0 min-w-0 h-full self-stretch"
          : "col-span-12 flex flex-col min-h-0 min-w-0 h-full self-stretch"}
      >
        <slot name="camera" />
      </div>
    {/if}
    {#if showCharts}
      <div
        class={showCamera
          ? "col-span-6 flex flex-col gap-4 min-h-0 min-w-0 h-full self-stretch"
          : "col-span-12 flex flex-col gap-4 min-h-0 min-w-0"}
      >
        <slot name="charts" />
      </div>
    {/if}
  </div>
{:else}
  <div class="flex flex-col gap-4 flex-1 min-h-0 min-w-0 max-w-full">
    {#if showCamera}
      <div class="flex-shrink-0 min-w-0 max-w-full">
        <slot name="camera" />
      </div>
    {/if}
    {#if showCharts}
      <div class="min-h-0 min-w-0 max-w-full flex-1">
        <slot name="charts" />
      </div>
    {/if}
  </div>
{/if}
