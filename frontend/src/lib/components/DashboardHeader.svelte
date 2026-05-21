<script lang="ts">
  type StatusIndicator = {
    label: string;
    value: string;
    tone: "green" | "cyan" | "yellow" | "red" | "gray";
  };

  export let pageTitle: string;
  export let pageSubtitle: string;
  export let gateStatus: string;
  export let activeMill: string;
  export let showMillSelector: boolean;
  export let millOptions: Array<{ value: string; label: string }> = [];
  export let selectedMill: string;
  export let statusIndicators: StatusIndicator[] = [];
  export let onSelectMill: (value: string) => void = () => {};

  function statusClasses(tone: StatusIndicator["tone"]) {
    if (tone === "green") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-300";
    if (tone === "cyan") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-300";
    if (tone === "yellow") return "border-yellow-400/30 bg-yellow-500/10 text-yellow-300";
    if (tone === "red") return "border-red-400/30 bg-red-500/10 text-red-300";
    return "border-slate-400/20 bg-slate-700/40 text-slate-300";
  }
</script>

<header class="mb-4 flex flex-col gap-3 flex-shrink-0 sm:flex-row sm:items-start sm:gap-4">
  <div class="flex-1 min-w-0">
    <h1 class="text-4xl font-bold text-white">
      {pageTitle}
    </h1>
    <h2 class="text-xl text-gray-300 mt-1">
      {pageSubtitle}
    </h2>
    {#if statusIndicators.length > 0}
      <div class="mt-3 flex flex-wrap gap-2">
        {#each statusIndicators as indicator}
          <div class={`rounded-full border px-3 py-1 text-xs ${statusClasses(indicator.tone)}`}>
            <span class="text-gray-400">{indicator.label}:</span>
            <span class="font-semibold">{indicator.value}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
  <div class="flex flex-col items-start gap-2 sm:items-end">
    {#if showMillSelector && millOptions.length > 0}
      <div class="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
        {#each millOptions as option}
          <button
            type="button"
            class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
              selectedMill === option.value
                ? "bg-cyan-500/25 border-cyan-400/70 text-cyan-200"
                : "bg-slate-700/60 border-white/10 text-gray-200 hover:bg-slate-600/70"
            }`}
            on:click={() => onSelectMill(option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    {/if}
    <div class="text-xs text-gray-500 text-left sm:text-right">
      <div>
        Gate:
        <span class={gateStatus === "open" ? "text-emerald-400" : "text-orange-400"}>{gateStatus}</span>
      </div>
      <div>
        Active mill: <span class="text-cyan-400">{activeMill}</span>
      </div>
    </div>
  </div>
</header>
