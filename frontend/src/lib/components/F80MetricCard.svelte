<script lang="ts">
  import { languageStore, translations } from '../stores';
  
  export let processedImageStore: any;
  export let isCompact: boolean = false;
  
  $: t = translations[$languageStore];
</script>

<div
  class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-{isCompact
    ? 'lg'
    : 'xl'} p-{isCompact ? '3' : '4'} flex-shrink-0"
>
  <div class="flex items-center space-x-3 mb-3 min-w-0">
    <div class="p-{isCompact ? '1' : '2'} mr-2 bg-blue-500/20 rounded-lg flex-shrink-0">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-{isCompact ? '4' : '6'} h-{isCompact ? '4' : '6'} text-blue-400"
        viewBox="0 -960 960 960"
        fill="currentColor"
      >
        <path
          d="M80-80h800L640-400l-200-80-120-160H80v560Zm80-80v-64l80 26 361-120 119 158H160Zm80-122-80-27v-75l80 26 158-52 96 43-254 85Zm500-118 180-80v-160l-180-40-100 80v120l100 80Zm-500-42-80-27v-91h120l65 83-105 35Zm512-51-32-25v-44l40-32 80 18v44l-88 39ZM480-640l200-80v-200l-200-40-120 80v160l120 80Zm9-90-49-33v-74l57-38 103 21v80l-111 44Z"
        />
      </svg>
    </div>
    <div class="text-sm text-gray-400 truncate">F80(mm)</div>
  </div>
  {#if $processedImageStore.data}
    {@const f80Key = Object.keys(
      $processedImageStore.data.results.fs_ajust_dict,
    ).find((key) => key.includes("F80"))}
    {@const f80Value = f80Key
      ? $processedImageStore.data.results.fs_ajust_dict[f80Key]
      : null}
    {@const rawF80Key = Object.keys(
      $processedImageStore.data.results.fs_dict,
    ).find((key) => key.includes("F80"))}
    {@const rawF80Value = rawF80Key
      ? $processedImageStore.data.results.fs_dict[rawF80Key]
      : null}
    <div class="text-{isCompact ? 'xl' : '3xl'} font-bold text-white">
      {f80Value ? f80Value.toFixed(3) : t.na}
    </div>
    {#if !isCompact}
      <div class="text-sm text-gray-400 mt-1">
        {t.raw}: {rawF80Value ? rawF80Value.toFixed(3) : t.na}
      </div>
    {/if}
  {:else}
    <div class="text-{isCompact ? 'xl' : '3xl'} font-bold text-white">{t.na}</div>
    {#if !isCompact}
      <div class="text-sm text-gray-400 mt-1">{t.noDataAvailable}</div>
    {/if}
  {/if}
</div>