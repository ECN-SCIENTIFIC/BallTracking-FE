<script lang="ts">
	import type { ChartSeriesKind } from '$lib/ballTracking/caseConfig';
	import {
		languageStore,
		translations,
		ballTrackingMillsStore,
		ballTrackingShowCameraStore,
		ballTrackingChartPrefsStore
	} from '$lib/stores';

	let {
		showBallTrackingLayoutControls = false
	}: {
		showBallTrackingLayoutControls?: boolean;
	} = $props();

	const t = $derived(translations[$languageStore]);
</script>

<div class="flex h-full min-h-0 flex-col bg-slate-900/30">
	<div class="border-b border-white/10 px-3 py-2">
		<span class="text-sm font-semibold text-cyan-300">{t.config}</span>
	</div>

	<div class="flex-1 min-h-0 overflow-y-auto p-3">
		{#if showBallTrackingLayoutControls}
			<div class="space-y-3">
				<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
					<input
						type="checkbox"
						class="rounded border-white/20 bg-slate-800"
						checked={$ballTrackingShowCameraStore}
						onchange={(e) => ballTrackingShowCameraStore.set(e.currentTarget.checked)}
					/>
					{t.showCameraFeed}
				</label>

				<div class="space-y-2">
					<div class="text-[10px] text-gray-400">
						{t.chartDisplaySeparate} / {t.chartDisplayCombined}
					</div>
					<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
						<input
							type="radio"
							name="chart-mode-panel"
							class="border-white/20 bg-slate-800"
							checked={$ballTrackingChartPrefsStore.mode === 'separate'}
							onchange={() =>
								ballTrackingChartPrefsStore.update((p) => ({
									...p,
									mode: 'separate'
								}))}
						/>
						{t.chartDisplaySeparate}
					</label>
					<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
						<input
							type="radio"
							name="chart-mode-panel"
							class="border-white/20 bg-slate-800"
							checked={$ballTrackingChartPrefsStore.mode === 'combined'}
							onchange={() =>
								ballTrackingChartPrefsStore.update((p) => ({
									...p,
									mode: 'combined'
								}))}
						/>
						{t.chartDisplayCombined}
					</label>
				</div>

				{#if $ballTrackingMillsStore.length > 1}
					<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
						<input
							type="checkbox"
							class="rounded border-white/20 bg-slate-800"
							checked={$ballTrackingChartPrefsStore.compareMills}
							onchange={(e) =>
								ballTrackingChartPrefsStore.update((p) => ({
									...p,
									compareMills: e.currentTarget.checked
								}))}
						/>
						{t.compareMillsSideBySide}
					</label>
				{/if}

				<div class="space-y-2">
					<div class="text-[10px] text-gray-400">{t.chartSeriesSection}</div>
					<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
						<input
							type="checkbox"
							class="rounded border-white/20 bg-slate-800"
							checked={$ballTrackingChartPrefsStore.series.includes('detections')}
							onchange={(e) => {
								const on = e.currentTarget.checked;
								ballTrackingChartPrefsStore.update((p) => {
									let series: ChartSeriesKind[] = p.series.filter((x) => x !== 'detections');
									if (on) series = [...series, 'detections'];
									if (!series.length) series = ['accumulated'];
									return { ...p, series };
								});
							}}
						/>
						{t.chartSeriesDetections}
					</label>
					<label class="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
						<input
							type="checkbox"
							class="rounded border-white/20 bg-slate-800"
							checked={$ballTrackingChartPrefsStore.series.includes('accumulated')}
							onchange={(e) => {
								const on = e.currentTarget.checked;
								ballTrackingChartPrefsStore.update((p) => {
									let series: ChartSeriesKind[] = p.series.filter((x) => x !== 'accumulated');
									if (on) series = [...series, 'accumulated'];
									if (!series.length) series = ['detections'];
									return { ...p, series };
								});
							}}
						/>
						{t.chartSeriesAccumulated}
					</label>
				</div>
			</div>
		{/if}
	</div>
</div>
