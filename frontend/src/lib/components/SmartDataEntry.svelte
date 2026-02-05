<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { languageStore, translations } from '../stores';

  const dispatch = createEventDispatcher();
  
  $: t = translations[$languageStore];

  // State variables
  let activeGuard = 'A';
  let activeDate = '05/05/2023';
  let data: Record<string, string> = {};
  let bulkMode = false;
  let bulkValue = '';
  let selectedCells = new Set<string>();
  let autoCalculate = true;
  let isDesktop = false;
  let isResizing = false;
  let resizeTimeout: ReturnType<typeof setTimeout>;

  const guards = [
    { id: 'A', dates: ['05/05/2023', '22/05/2023', '05/06/2023'] },
    { id: 'B', dates: ['22/05/2023', '12/06/2023', '26/06/2023'] }
  ];

  $: measurements = [
    { id: '1in', name: '1 in', category: t.largeAperture },
    { id: '1-2in', name: '1/2 in', category: t.largeAperture },
    { id: '3-8in', name: '3/8 in', category: t.mediumAperture },
    { id: '1-4in', name: '1/4 in', category: t.mediumAperture },
    { id: 'malla4', name: 'Malla 4', category: t.coarseMesh },
    { id: 'malla6', name: 'Malla 6', category: t.coarseMesh },
    { id: 'malla8', name: 'Malla 8', category: t.mediumMesh },
    { id: 'malla10', name: 'Malla 10', category: t.fineMesh },
    { id: 'malla-10', name: 'Malla -10', category: t.veryFine },
    { id: 'f80', name: 'F80 (mm)', category: t.special }
  ];

  function handleResize() {
    isResizing = true;
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      isDesktop = window.innerWidth >= 1024;
      isResizing = false;
    }, 150);
  }

  onMount(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  });

  // Smart features
  function copyFromPrevious() {
    const currentGuard = guards.find(g => g.id === activeGuard);
    if (!currentGuard) return;
    
    const currentDateIndex = currentGuard.dates.indexOf(activeDate);
    if (currentDateIndex > 0) {
      const previousDate = currentGuard.dates[currentDateIndex - 1];
      measurements.forEach(measurement => {
        ['rate', 'actual'].forEach(field => {
          const prevKey = `${activeGuard}-${previousDate}-${measurement.id}-${field}`;
          const currentKey = `${activeGuard}-${activeDate}-${measurement.id}-${field}`;
          if (data[prevKey]) {
            data = { ...data, [currentKey]: data[prevKey] };
          }
        });
      });
      data = data; // Trigger reactivity
    }
  }

  function autoFillSequence(startValue: string, increment: number, count: number) {
    let value = parseFloat(startValue);
    const keys = Array.from(selectedCells);
    keys.forEach((key, index) => {
      data = { ...data, [key]: (value + increment * index).toFixed(2) };
    });
  }

  function applyBulkValue() {
    selectedCells.forEach(key => {
      data = { ...data, [key]: bulkValue };
    });
    selectedCells = new Set();
    bulkValue = '';
  }

  function getValue(measurement: string, field: string): string {
    const key = `${activeGuard}-${activeDate}-${measurement}-${field}`;
    return data[key] || '';
  }

  function setValue(measurement: string, field: string, value: string) {
    const key = `${activeGuard}-${activeDate}-${measurement}-${field}`;
    data = { ...data, [key]: value };
    
    // Auto-calculate actual from rate with a typical conversion factor
    if (field === 'rate' && autoCalculate && value) {
      const actualKey = `${activeGuard}-${activeDate}-${measurement}-actual`;
      if (!data[actualKey]) {
        const calculatedActual = (parseFloat(value) * 0.95).toFixed(2); // 5% typical loss
        data = { ...data, [actualKey]: calculatedActual };
      }
    }
  }

  function toggleCellSelection(measurement: string, field: string) {
    const key = `${activeGuard}-${activeDate}-${measurement}-${field}`;
    const newSelected = new Set(selectedCells);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    selectedCells = newSelected;
  }

  function getCompletionPercentage(): number {
    const totalFields = measurements.length * 2; // rate and actual for each
    const filledFields = measurements.reduce((count, measurement) => {
      return count + 
        (getValue(measurement.id, 'rate') ? 1 : 0) + 
        (getValue(measurement.id, 'actual') ? 1 : 0);
    }, 0);
    return Math.round((filledFields / totalFields) * 100);
  }

  function calculateVariance(measurement: string): string {
    const rate = getValue(measurement, 'rate');
    const actual = getValue(measurement, 'actual');
    if (rate && actual) {
      return (((parseFloat(actual) - parseFloat(rate)) / parseFloat(rate)) * 100).toFixed(1);
    }
    return '';
  }

  function getVarianceColor(measurement: string): string {
    const rate = getValue(measurement, 'rate');
    const actual = getValue(measurement, 'actual');
    if (rate && actual) {
      return Math.abs(parseFloat(rate) - parseFloat(actual)) > 0.1 ? 'text-red-400' : 'text-green-400';
    }
    return 'text-gray-400';
  }

  function getCurrentDates() {
    return guards.find(g => g.id === activeGuard)?.dates || [];
  }

  $: completionPercentage = getCompletionPercentage();
  $: currentDates = getCurrentDates();
</script>

<div class="min-h-full bg-gray-900 text-white pt-1 pb-4 px-2">
  <div class="w-full mx-auto">
    
    <!-- Header with Smart Controls -->
    <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-4">
      {#if isResizing}
        <!-- Header Skeleton -->
        <div class="animate-pulse">
          <div class="flex items-center justify-between mb-4">
            <div>
              <div class="h-8 bg-slate-600 rounded w-48 mb-2"></div>
              <div class="h-4 bg-slate-600/50 rounded w-64"></div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="h-3 bg-slate-600/50 rounded w-16 mb-1"></div>
                <div class="h-6 bg-slate-600 rounded w-12"></div>
              </div>
              <div class="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-slate-600"></div>
            </div>
          </div>

          <!-- Context Selection Skeleton -->
          <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 mb-4">
            <div class="w-full lg:w-auto">
              <div class="h-4 bg-slate-600/50 rounded w-16 mb-2"></div>
              <div class="flex gap-2 w-full lg:w-auto">
                <div class="h-10 bg-slate-600 rounded flex-1 lg:w-24"></div>
                <div class="h-10 bg-slate-600 rounded flex-1 lg:w-24"></div>
              </div>
            </div>
            <div class="w-full lg:w-auto">
              <div class="h-4 bg-slate-600/50 rounded w-16 mb-2"></div>
              <div class="h-10 bg-slate-600 rounded w-full lg:w-48"></div>
            </div>
          </div>

          <!-- Smart Tools Skeleton -->
          <div class="flex flex-wrap gap-2 lg:gap-3">
            {#each Array(4) as _}
              <div class="h-10 bg-slate-600 rounded w-24"></div>
            {/each}
          </div>
        </div>
      {:else}
        <!-- <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs lg:text-sm text-gray-400">Completion</div>
              <div class="text-xl lg:text-2xl font-bold text-cyan-400">{completionPercentage}%</div>
            </div>
            <div class="w-12 h-12 lg:w-16 lg:h-16 relative">
              <svg class="w-12 h-12 lg:w-16 lg:h-16 transform -rotate-90">
                <circle cx={isDesktop ? "32" : "24"} cy={isDesktop ? "32" : "24"} r={isDesktop ? "28" : "20"} stroke="currentColor" stroke-width="4" fill="none" class="text-gray-600" />
                <circle 
                  cx={isDesktop ? "32" : "24"} cy={isDesktop ? "32" : "24"} r={isDesktop ? "28" : "20"} stroke="currentColor" stroke-width="4" fill="none" 
                  stroke-dasharray="{completionPercentage * (isDesktop ? 1.76 : 1.26)} {isDesktop ? 176 : 126}"
                  class="text-cyan-400 transition-all duration-500"
                />
              </svg>
            </div>
          </div>
        </div> -->

        <!-- Context Selection -->
        <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-6 mb-4">
          <div class="w-full lg:w-auto">
            <label class="block text-sm font-medium text-gray-300 mb-2">{t.guard}</label>
            <div class="flex gap-2 w-full lg:w-auto">
              {#each guards as guard}
                <button
                  on:click={() => activeGuard = guard.id}
                  class="flex-1 lg:flex-none px-3 lg:px-4 py-2 rounded-lg font-medium transition-all text-sm lg:text-base {activeGuard === guard.id 
                    ? 'bg-cyan-600 text-white shadow-lg' 
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}"
                >
                  {t.guard} {guard.id}
                </button>
              {/each}
            </div>
          </div>

          <div class="w-full lg:w-auto">
            <label class="block text-sm font-medium text-gray-300 mb-2">{t.date}</label>
            <select
              bind:value={activeDate}
              class="w-full lg:w-auto px-3 lg:px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm lg:text-base"
            >
              {#each currentDates as date}
                <option value={date}>{date}</option>
              {/each}
            </select>
          </div>
        </div>

        <!-- Smart Tools -->
        <div class="flex flex-wrap gap-2 lg:gap-3">
          <button
            on:click={copyFromPrevious}
            class="flex items-center gap-2 px-3 lg:px-4 py-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors border border-green-500/30 text-sm lg:text-base"
          >
            <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span class="hidden sm:inline">{t.copyFromPrevious}</span>
            <span class="sm:hidden">{t.copy}</span>
          </button>

          <button
            on:click={() => bulkMode = !bulkMode}
            class="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors border text-sm lg:text-base {bulkMode 
              ? 'bg-purple-600 text-white border-purple-500' 
              : 'bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border-purple-500/30'}"
          >
            <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
            </svg>
            <span class="hidden sm:inline">{t.bulkEdit}</span>
            <span class="sm:hidden">{t.bulk}</span>
            {#if selectedCells.size > 0}<span class="text-xs">({selectedCells.size})</span>{/if}
          </button>

          <label class="flex items-center gap-2 px-3 lg:px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg border border-cyan-500/30 text-sm lg:text-base">
            <svg class="w-3 h-3 lg:w-4 lg:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <input
              type="checkbox"
              bind:checked={autoCalculate}
              class="rounded bg-slate-700 border-slate-600 text-cyan-500 focus:ring-cyan-500"
            />
            <span class="hidden sm:inline">{t.autoCalculate}</span>
            <span class="sm:hidden">{t.auto}</span>
          </label>
        </div>

        <!-- Bulk Edit Panel -->
        {#if bulkMode}
          <div class="mt-4 p-3 lg:p-4 bg-purple-600/10 rounded-lg border border-purple-500/30">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <div class="flex-1">
                <input
                  type="text"
                  bind:value={bulkValue}
                  placeholder={t.enterValueToApply}
                  class="w-full px-3 py-2 bg-slate-700 border border-purple-500/50 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm lg:text-base"
                />
              </div>
              <button
                on:click={applyBulkValue}
                disabled={selectedCells.size === 0 || !bulkValue}
                class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm lg:text-base whitespace-nowrap"
              >
                {t.applyToCells} {selectedCells.size} {t.cells}
              </button>
            </div>
            <p class="text-xs lg:text-sm text-purple-400 mt-2">
              {t.clickCellsToSelect}
            </p>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Simplified Data Grid -->
    <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <div class="p-4 lg:p-6 border-b border-white/10">
        <h2 class="text-lg font-semibold text-white">
          {t.dataForGuard} {activeGuard} - {activeDate}
        </h2>
      </div>

      <div class="p-2 lg:p-4">
        {#if isResizing}
          <!-- Skeleton Loading State -->
          {#if isDesktop}
            <!-- Desktop Skeleton -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {#each Array(10) as _}
                <div class="grid grid-cols-12 gap-2 p-3 border border-white/10 rounded-lg bg-slate-700/30 animate-pulse">
                  <div class="col-span-3">
                    <div class="h-4 bg-slate-600 rounded w-3/4 mb-1"></div>
                    <div class="h-3 bg-slate-600/50 rounded w-1/2"></div>
                  </div>
                  <div class="col-span-4">
                    <div class="h-3 bg-slate-600/50 rounded w-1/4 mb-1"></div>
                    <div class="h-8 bg-slate-600 rounded w-full"></div>
                  </div>
                  <div class="col-span-4">
                    <div class="h-3 bg-slate-600/50 rounded w-1/4 mb-1"></div>
                    <div class="h-8 bg-slate-600 rounded w-full"></div>
                  </div>
                  <div class="col-span-1">
                    <div class="h-8 bg-slate-600 rounded w-full"></div>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Mobile Skeleton -->
            <div class="space-y-3">
              {#each Array(10) as _}
                <div class="p-3 border border-white/10 rounded-lg bg-slate-700/30 animate-pulse">
                  <div class="mb-3">
                    <div class="h-4 bg-slate-600 rounded w-3/4 mb-1"></div>
                    <div class="h-3 bg-slate-600/50 rounded w-1/2"></div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <div class="h-3 bg-slate-600/50 rounded w-1/4 mb-1"></div>
                      <div class="h-10 bg-slate-600 rounded w-full"></div>
                    </div>
                    <div>
                      <div class="h-3 bg-slate-600/50 rounded w-1/4 mb-1"></div>
                      <div class="h-10 bg-slate-600 rounded w-full"></div>
                    </div>
                  </div>
                  <div class="mt-2">
                    <div class="h-3 bg-slate-600 rounded w-1/4 mx-auto"></div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        {:else}
          {#if isDesktop}
            <!-- Existing Desktop Layout -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {#each measurements as measurement}
                <div class="grid grid-cols-12 gap-2 p-3 border border-white/10 rounded-lg hover:bg-slate-700/30 transition-colors items-center">
                  
                  <!-- Measurement Info -->
                  <div class="col-span-3">
                    <div class="font-medium text-white text-sm">{measurement.name}</div>
                    <div class="text-xs text-gray-400">{measurement.category}</div>
                  </div>

                  <!-- Rate Input -->
                  <div class="col-span-4">
                    <label class="block text-xs font-medium text-gray-300 mb-1">{t.rate}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getValue(measurement.id, 'rate')}
                      on:input={(e) => setValue(measurement.id, 'rate', (e.target as HTMLInputElement).value)}
                      on:click={() => bulkMode && toggleCellSelection(measurement.id, 'rate')}
                      class="w-full px-2 py-1.5 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-white text-sm {bulkMode && selectedCells.has(`${activeGuard}-${activeDate}-${measurement.id}-rate`) 
                        ? 'border-purple-400 bg-purple-600/20' 
                        : 'border-slate-600'}"
                      placeholder="0.00"
                    />
                  </div>

                  <!-- Actual Input -->
                  <div class="col-span-4">
                    <label class="block text-xs font-medium text-gray-300 mb-1">{t.actual}</label>
                    <input
                      type="number"
                      step="0.01"
                      value={getValue(measurement.id, 'actual')}
                      on:input={(e) => setValue(measurement.id, 'actual', (e.target as HTMLInputElement).value)}
                      on:click={() => bulkMode && toggleCellSelection(measurement.id, 'actual')}
                      class="w-full px-2 py-1.5 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-white text-sm {bulkMode && selectedCells.has(`${activeGuard}-${activeDate}-${measurement.id}-actual`) 
                        ? 'border-purple-400 bg-purple-600/20' 
                        : 'border-slate-600'}"
                      placeholder={autoCalculate && getValue(measurement.id, 'rate') ? t.autoCalc : '0.00'}
                    />
                  </div>

                  <!-- Variance Indicator -->
                  <div class="col-span-1 text-center">
                    {#if getValue(measurement.id, 'rate') && getValue(measurement.id, 'actual')}
                      <div>
                        <div class="text-xs text-gray-400">{t.variance}</div>
                        <div class="text-xs font-medium {getVarianceColor(measurement.id)}">
                          {calculateVariance(measurement.id)}%
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <!-- Mobile: Optimized single column layout -->
            <div class="space-y-3">
              {#each measurements as measurement}
                <div class="p-3 border border-white/10 rounded-lg hover:bg-slate-700/30 transition-colors">
                  
                  <!-- Measurement Info -->
                  <div class="mb-3">
                    <div class="font-medium text-white text-sm">{measurement.name}</div>
                    <div class="text-xs text-gray-400">{measurement.category}</div>
                  </div>

                  <!-- Input Row -->
                  <div class="grid grid-cols-2 gap-3">
                    <!-- Rate Input -->
                    <div>
                      <label class="block text-xs font-medium text-gray-300 mb-1">{t.rate}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={getValue(measurement.id, 'rate')}
                        on:input={(e) => setValue(measurement.id, 'rate', (e.target as HTMLInputElement).value)}
                        on:click={() => bulkMode && toggleCellSelection(measurement.id, 'rate')}
                        class="w-full px-3 py-2 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-white text-sm {bulkMode && selectedCells.has(`${activeGuard}-${activeDate}-${measurement.id}-rate`) 
                          ? 'border-purple-400 bg-purple-600/20' 
                          : 'border-slate-600'}"
                        placeholder="0.00"
                      />
                    </div>

                    <!-- Actual Input -->
                    <div>
                      <label class="block text-xs font-medium text-gray-300 mb-1">{t.actual}</label>
                      <input
                        type="number"
                        step="0.01"
                        value={getValue(measurement.id, 'actual')}
                        on:input={(e) => setValue(measurement.id, 'actual', (e.target as HTMLInputElement).value)}
                        on:click={() => bulkMode && toggleCellSelection(measurement.id, 'actual')}
                        class="w-full px-3 py-2 bg-slate-700 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-white text-sm {bulkMode && selectedCells.has(`${activeGuard}-${activeDate}-${measurement.id}-actual`) 
                          ? 'border-purple-400 bg-purple-600/20' 
                          : 'border-slate-600'}"
                        placeholder={autoCalculate && getValue(measurement.id, 'rate') ? t.autoCalculated : '0.00'}
                      />
                    </div>
                  </div>

                  <!-- Variance Indicator -->
                  {#if getValue(measurement.id, 'rate') && getValue(measurement.id, 'actual')}
                    <div class="mt-2 text-center">
                      <span class="text-xs text-gray-400">{t.variance}: </span>
                      <span class="text-xs font-medium {getVarianceColor(measurement.id)}">
                        {calculateVariance(measurement.id)}%
                      </span>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Action Bar -->
    <div class="mt-4 lg:mt-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
      {#if isResizing}
        <!-- Action Bar Skeleton -->
        <div class="flex flex-col sm:flex-row gap-3 animate-pulse w-full">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="h-10 bg-slate-600 rounded w-32"></div>
            <div class="h-10 bg-slate-600 rounded w-32"></div>
          </div>
          <div class="sm:ml-auto">
            <div class="h-10 bg-slate-600 rounded w-32"></div>
          </div>
        </div>
      {:else}
        <div class="flex flex-col sm:flex-row gap-3">
          <button class="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600 text-sm lg:text-base">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            {t.importCsv}
          </button>
          <button class="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors border border-slate-600 text-sm lg:text-base">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t.export}
          </button>
        </div>
        <button class="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium text-sm lg:text-base">
          {t.saveChanges}
        </button>
      {/if}
    </div>
  </div>
</div> 