<script lang="ts">
  import { onMount } from "svelte";
  import type { Translations } from "$lib/stores";

  type IndicatorTranslations = Translations & {
    ballAccumByDay: string;
    ballFlow: string;
    ballFlowHint: string;
  };

  export let t: IndicatorTranslations;
  export let formattedTimestamp: string;
  export let waitingLabel: string;
  export let ballsCurrentFrame: number;
  export let ballsTotalCount: number;
  export let lastDetectionDisplay: string;
  export let inchancable: boolean;
  export let inchancableValue: boolean | null;
  export let inchancableStatusLabel: string;
  export let shiftBallAccum: number;
  export let shiftRangeDisplay: string;
  export let dayBallAccum: number;
  export let dayRangeDisplay: string;
  export let ballFlowDisplay: string;
  export let onRunCleaner: () => void = () => {};
  export let onGenerateReport: () => void = () => {};

  type IndicatorId =
    | "currentFrame"
    | "totalCount"
    | "lastDetection"
    | "shiftBallAccum"
    | "dayBallAccum"
    | "ballFlow"
    | "inchancable";
  type Indicator = {
    id: IndicatorId;
    label: string;
    value: string | number;
    sublabel?: string;
  };

  const STORAGE_KEY = "ball-tracking-indicator-prefs-v1";
  const DEFAULT_INDICATOR_ORDER: IndicatorId[] = [
    "currentFrame",
    "totalCount",
    "lastDetection",
    "shiftBallAccum",
    "dayBallAccum",
    "ballFlow",
    "inchancable",
  ];
  const TILE_GAP_PX = 12;
  const MIN_TILE_WIDTH_PX = 210;

  let editMode = false;
  let indicatorOrder: IndicatorId[] = [...DEFAULT_INDICATOR_ORDER];
  let hiddenIndicatorIds: IndicatorId[] = [];
  let draggedIndicatorId: IndicatorId | null = null;
  let hasMounted = false;
  let indicatorGridElement: HTMLDivElement | null = null;
  let indicatorGridWidth = 0;

  $: availableIndicatorIds = inchancable
    ? DEFAULT_INDICATOR_ORDER
    : DEFAULT_INDICATOR_ORDER.filter(
        (id) => id !== "shiftBallAccum" && id !== "inchancable",
      );

  $: indicators = [
    {
      id: "currentFrame",
      label: t.currentFrame,
      value: ballsCurrentFrame,
    },
    {
      id: "totalCount",
      label: t.totalCount,
      value: ballsTotalCount,
    },
    {
      id: "lastDetection",
      label: t.lastDetection,
      value: lastDetectionDisplay,
    },
    {
      id: "shiftBallAccum",
      label: t.ballAccumByShift,
      value: shiftBallAccum,
      sublabel: shiftRangeDisplay,
    },
    {
      id: "dayBallAccum",
      label: t.ballAccumByDay,
      value: dayBallAccum,
      sublabel: dayRangeDisplay,
    },
    {
      id: "ballFlow",
      label: t.ballFlow,
      value: ballFlowDisplay,
      sublabel: t.ballFlowHint,
    },
    {
      id: "inchancable",
      label: t.inchancable,
      value: inchancableStatusLabel,
    },
  ] as Indicator[];

  $: indicatorById = new Map(indicators.map((indicator) => [indicator.id, indicator]));
  $: displayIndicatorIds = editMode
    ? indicatorOrder.filter((id) => availableIndicatorIds.includes(id))
    : indicatorOrder.filter(
        (id) => availableIndicatorIds.includes(id) && !hiddenIndicatorIds.includes(id),
      );
  $: displayIndicators = displayIndicatorIds
    .map((id) => indicatorById.get(id))
    .filter(isIndicator);
  $: activeTileCount = displayIndicators.length + 2;
  $: indicatorColumnCount = chooseIndicatorColumnCount(
    activeTileCount,
    indicatorGridWidth,
  );
  $: gridRowCount = Math.ceil(activeTileCount / indicatorColumnCount);
  $: shouldGroupActionTiles = gridRowCount > 2 && indicatorColumnCount >= 2;
  $: serializedPreferences = JSON.stringify({
    order: indicatorOrder,
    hidden: hiddenIndicatorIds,
  });
  $: if (hasMounted) {
    savePreferences(serializedPreferences);
  }

  onMount(() => {
    loadPreferences();
    hasMounted = true;

    syncIndicatorGridWidth();

    if (typeof ResizeObserver !== "undefined" && indicatorGridElement) {
      const observer = new ResizeObserver(syncIndicatorGridWidth);
      observer.observe(indicatorGridElement);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", syncIndicatorGridWidth);
    return () => window.removeEventListener("resize", syncIndicatorGridWidth);
  });

  function syncIndicatorGridWidth() {
    indicatorGridWidth = indicatorGridElement?.clientWidth ?? 0;
  }

  function chooseIndicatorColumnCount(tileCount: number, availableWidth: number) {
    if (tileCount <= 1) return 1;

    const maxColumnsByWidth =
      availableWidth > 0
        ? Math.floor((availableWidth + TILE_GAP_PX) / (MIN_TILE_WIDTH_PX + TILE_GAP_PX))
        : 3;
    const maxColumns = Math.max(1, Math.min(tileCount, maxColumnsByWidth));

    let bestColumnCount = 1;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let columnCount = 1; columnCount <= maxColumns; columnCount++) {
      const rowCount = Math.ceil(tileCount / columnCount);
      const lastRowCount = tileCount % columnCount || columnCount;
      const balancePenalty = rowCount === 1 ? 0 : columnCount - lastRowCount;
      const score = balancePenalty + rowCount - columnCount * 0.05;

      if (score < bestScore) {
        bestScore = score;
        bestColumnCount = columnCount;
      }
    }

    return bestColumnCount;
  }

  function normalizeIndicatorOrder(order: IndicatorId[], availableIds: IndicatorId[]) {
    const knownIds = order.filter(
      (id, index) => availableIds.includes(id) && order.indexOf(id) === index,
    );
    const missingIds = availableIds.filter((id) => !knownIds.includes(id));
    return [...knownIds, ...missingIds];
  }

  function isIndicatorId(value: unknown): value is IndicatorId {
    return DEFAULT_INDICATOR_ORDER.includes(value as IndicatorId);
  }

  function isIndicator(value: Indicator | undefined): value is Indicator {
    return Boolean(value);
  }

  function loadPreferences() {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const prefs = JSON.parse(raw) as {
        order?: unknown[];
        hidden?: unknown[];
      };

      if (Array.isArray(prefs.order)) {
        indicatorOrder = normalizeIndicatorOrder(
          prefs.order.filter(isIndicatorId),
          availableIndicatorIds,
        );
      }

      if (Array.isArray(prefs.hidden)) {
        hiddenIndicatorIds = prefs.hidden.filter(isIndicatorId);
      }
    } catch {
      /* Keep defaults if local preferences are malformed. */
    }
  }

  function savePreferences(serializedPreferences: string) {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, serializedPreferences);
    } catch {
      /* Ignore storage failures; the dashboard still works without persistence. */
    }
  }

  function toggleIndicatorVisibility(id: IndicatorId) {
    hiddenIndicatorIds = hiddenIndicatorIds.includes(id)
      ? hiddenIndicatorIds.filter((hiddenId) => hiddenId !== id)
      : [...hiddenIndicatorIds, id];
  }

  function resetIndicators() {
    indicatorOrder = normalizeIndicatorOrder(DEFAULT_INDICATOR_ORDER, availableIndicatorIds);
    hiddenIndicatorIds = [];
  }

  function moveDisplayedIndicator(id: IndicatorId, direction: -1 | 1) {
    const visibleOrder = indicatorOrder.filter((indicatorId) =>
      availableIndicatorIds.includes(indicatorId),
    );
    const currentIndex = visibleOrder.indexOf(id);
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= visibleOrder.length) return;

    const targetId = visibleOrder[nextIndex];
    if (direction < 0) {
      moveIndicatorBefore(id, targetId);
    } else {
      moveIndicatorBefore(targetId, id);
    }
  }

  function moveIndicatorBefore(sourceId: IndicatorId, targetId: IndicatorId) {
    if (sourceId === targetId) return;

    const nextOrder = indicatorOrder.filter((id) => id !== sourceId);
    const targetIndex = nextOrder.indexOf(targetId);
    if (targetIndex < 0) return;

    nextOrder.splice(targetIndex, 0, sourceId);
    indicatorOrder = nextOrder;
  }

  function handleDragStart(event: DragEvent, id: IndicatorId) {
    if (!editMode) return;

    draggedIndicatorId = id;
    event.dataTransfer?.setData("text/plain", id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(event: DragEvent) {
    if (!editMode || !draggedIndicatorId) return;

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(event: DragEvent, targetId: IndicatorId) {
    if (!editMode) return;

    event.preventDefault();
    const sourceId = event.dataTransfer?.getData("text/plain");
    if (isIndicatorId(sourceId)) {
      moveIndicatorBefore(sourceId, targetId);
    } else if (draggedIndicatorId) {
      moveIndicatorBefore(draggedIndicatorId, targetId);
    }
    draggedIndicatorId = null;
  }

  function indicatorIcon(id: IndicatorId) {
    const icons: Partial<Record<IndicatorId, string>> = {
      currentFrame: "center_focus_strong",
      shiftBallAccum: "chronic",
      lastDetection: "text_select_jump_to_end",
      ballFlow: "cycle",
      inchancable: "crisis_alert",
    };

    return icons[id] ?? "bubble_chart";
  }

  function indicatorAccentClass(id: IndicatorId) {
    const accents: Record<IndicatorId, string> = {
      // Live tracking metrics
      currentFrame: "after:bg-[#2563EB]",
      totalCount: "after:bg-[#2563EB]",
      lastDetection: "after:bg-[#2563EB]",
      // Accumulation metrics
      shiftBallAccum: "after:bg-[#059669]",
      dayBallAccum: "after:bg-[#059669]",
      // Throughput / flow metric
      ballFlow: "after:bg-[#7C3AED]",
      // Machine-state metric
      inchancable: "after:bg-[#D97706]",
    };

    return accents[id];
  }
</script>

<style>
  .indicator-grid {
    --indicator-gap: 0.75rem;
  }

  .indicator-tile {
    flex: 1 1
      calc(
        (100% - (var(--indicator-columns) - 1) * var(--indicator-gap)) /
          var(--indicator-columns)
      );
    min-width: min(100%, 10.5rem);
  }

  .indicator-action-row {
    display: flex;
    flex: 1 1 100%;
    gap: var(--indicator-gap);
    min-width: 100%;
  }

  .indicator-action-row > .indicator-tile {
    flex: 1 1 calc((100% - var(--indicator-gap)) / 2);
  }

  .indicator-symbol {
    font-variation-settings:
      "FILL" 0,
      "wght" 500,
      "GRAD" 0,
      "opsz" 40;
  }
</style>

<div
  class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-shrink-0 flex flex-col mb-4"
>
  <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
    <div>
      <div class="text-sm text-gray-300 font-medium">
        {t.ballDetectionIndicators}
      </div>
      <div class="text-xs text-gray-500">
        {formattedTimestamp || waitingLabel}
      </div>
    </div>
    <div class="flex items-center gap-2">
      {#if editMode}
        <button
          type="button"
          class="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          on:click={resetIndicators}
        >
          {t.reset}
        </button>
      {/if}
      <button
        type="button"
        class={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          editMode
            ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200 hover:bg-cyan-400/20"
            : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
        }`}
        aria-pressed={editMode}
        on:click={() => (editMode = !editMode)}
      >
        {editMode ? t.done : t.editIndicators}
      </button>
    </div>
  </div>

  {#if editMode}
    <div
      class="mb-3 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100"
    >
      {t.dragIndicatorsHint}
    </div>
  {/if}

  <div
    bind:this={indicatorGridElement}
    class="indicator-grid flex flex-wrap gap-3"
    style={`--indicator-columns: ${indicatorColumnCount};`}
  >
    {#if displayIndicators.length === 0}
      <div
        class="rounded-lg border border-dashed border-white/10 bg-slate-900/30 px-4 py-6 text-center text-sm text-gray-400 sm:col-span-2 lg:col-span-3"
      >
        {t.noIndicatorsVisible}
      </div>
    {/if}

      {#each displayIndicators as indicator (indicator.id)}
          {@const isHidden = hiddenIndicatorIds.includes(indicator.id)}
          {@const accentClass = indicatorAccentClass(indicator.id)}
          <article
            class={`indicator-tile group relative min-h-[132px] overflow-hidden rounded-none border-0 bg-[#0A1220] p-4 text-left shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition-all duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-2 ${accentClass} ${
              editMode ? "cursor-grab hover:-translate-y-0.5 hover:border-cyan-300/35 active:cursor-grabbing" : ""
            } ${isHidden ? "opacity-45 grayscale" : ""} ${
              draggedIndicatorId === indicator.id ? "scale-[0.98] opacity-60" : ""
            }`}
            data-inchancable-active={indicator.id === "inchancable" ? inchancableValue : undefined}
            aria-grabbed={draggedIndicatorId === indicator.id}
            on:dragover={handleDragOver}
            on:drop={(event) => handleDrop(event, indicator.id)}
          >
            {#if editMode}
              <div class="absolute left-2 right-2 top-2 z-20 flex items-center justify-between gap-2">
                <div
                  class="flex cursor-grab items-center gap-1 text-gray-500 active:cursor-grabbing"
                  aria-hidden="true"
                  draggable={editMode}
                  on:dragstart={(event) => handleDragStart(event, indicator.id)}
                  on:dragend={() => (draggedIndicatorId = null)}
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
                    />
                  </svg>
                </div>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="rounded-md border border-white/10 bg-slate-900/60 p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    draggable={false}
                    aria-label={t.moveIndicatorLeft}
                    disabled={displayIndicatorIds.indexOf(indicator.id) === 0}
                    on:click|stopPropagation={() => moveDisplayedIndicator(indicator.id, -1)}
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="rounded-md border border-white/10 bg-slate-900/60 p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                    draggable={false}
                    aria-label={t.moveIndicatorRight}
                    disabled={displayIndicatorIds.indexOf(indicator.id) === displayIndicatorIds.length - 1}
                    on:click|stopPropagation={() => moveDisplayedIndicator(indicator.id, 1)}
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class={`rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                      isHidden
                        ? "border-amber-400/30 bg-amber-400/10 text-amber-200 hover:bg-amber-400/15"
                        : "border-white/10 bg-slate-900/60 text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                    draggable={false}
                    aria-pressed={!isHidden}
                    on:click|stopPropagation={() => toggleIndicatorVisibility(indicator.id)}
                  >
                    {isHidden ? t.show : t.hide}
                  </button>
                </div>
              </div>
            {/if}

            <div
              class={`relative z-10 grid h-full grid-rows-[auto_1fr_auto] ${editMode ? "pt-8" : ""}`}
            >
              <div class="mb-5 flex items-center gap-3 text-[#A0A0A0]">
                <span
                  class="material-symbols-outlined indicator-symbol text-[28px] leading-none text-[#F8FAFC]"
                  aria-hidden="true"
                >
                  {indicatorIcon(indicator.id)}
                </span>
                <div class="text-sm font-medium leading-tight tracking-tight">{indicator.label}</div>
              </div>

              <div class="flex items-start">
                <div
                  class="text-4xl font-bold leading-none tracking-tight text-[#F8FAFC]"
                >
                  {indicator.value}
                </div>
              </div>

              <div class="mt-3 min-h-5 text-sm font-medium leading-tight text-[#A0A0A0]">
                {indicator.sublabel ?? ""}
              </div>
            </div>
          </article>
      {/each}

      <div class={shouldGroupActionTiles ? "indicator-action-row" : "contents"}>
        <button
          type="button"
          class="indicator-tile group relative min-h-[132px] overflow-hidden rounded-none border-0 bg-[#F8FAFC] p-4 text-left text-[#0F172A] shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#5B8EEA]/40 after:absolute after:inset-x-0 after:bottom-0 after:h-2 after:bg-[#5B8EEA]"
          on:click={onRunCleaner}
        >
          <div class="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">
            <div class="mb-5 flex items-center gap-3">
              <span
                class="material-symbols-outlined indicator-symbol text-[28px] leading-none"
                aria-hidden="true"
              >
                cleaning_services
              </span>
            </div>
            <div class="flex items-start">
              <span class="text-3xl font-bold leading-none tracking-tight">
                {t.runCleaner}
              </span>
            </div>
            <span class="mt-3 min-h-5 text-sm font-medium leading-tight text-slate-600"></span>
          </div>
        </button>

        <button
          type="button"
          class="indicator-tile group relative min-h-[132px] overflow-hidden rounded-none border-0 bg-[#F8FAFC] p-4 text-left text-[#0F172A] shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#FFF2EB] focus:outline-none focus:ring-2 focus:ring-[#F79056]/40 after:absolute after:inset-x-0 after:bottom-0 after:h-2 after:bg-[#F79056]"
          on:click={onGenerateReport}
        >
          <div class="relative z-10 grid h-full grid-rows-[auto_1fr_auto]">
            <div class="mb-5 flex items-center gap-3">
              <span
                class="material-symbols-outlined indicator-symbol text-[28px] leading-none"
                aria-hidden="true"
              >
                article_shortcut
              </span>
            </div>
            <div class="flex items-start">
              <span class="text-3xl font-bold leading-none tracking-tight">
                {t.generateReport}
              </span>
            </div>
            <span class="mt-3 min-h-5 text-sm font-medium leading-tight text-slate-600"></span>
          </div>
        </button>
      </div>
  </div>
</div>
