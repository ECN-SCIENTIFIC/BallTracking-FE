<script lang="ts">
  import { onMount } from 'svelte';
  import { languageStore, translations } from './stores';
  
  export let data: { time: number; value: number }[] = [];
  let chartDiv: HTMLDivElement;
  let chartInitialized = false;
  let chartAction: any = null;
  let validData: { time: number; value: number }[] = [];
  let options: any;
  
  $: t = translations[$languageStore];

  // Validate and filter out invalid data points
  $: {
    validData = data.filter(point => 
      typeof point.time === 'number' && 
      !isNaN(point.time) && 
      typeof point.value === 'number' && 
      !isNaN(point.value)
    );
  }

  const chartOptions = {
    chart: {
      type: 'line',
      fontFamily: 'Satoshi, sans-serif',
      background: 'transparent',
      height: '100%', // Key fix: Use 100% height
      width: '100%',  // Key fix: Use 100% width
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      },
      toolbar: {
        show: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      lineCap: 'round'
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
        sizeOffset: 3
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false,
        format: 'HH:mm:ss',
        style: { colors: '#ffffff' }
      },
      title: {
        text: '',
        style: { color: '#c9dee6' }
      }
    },
    yaxis: {
      title: {
        text: '',
        style: { color: '#c9dee6' }
      },
      labels: {
        formatter: (value: number) => (isNaN(value) ? '0' : value.toFixed(2)),
        style: { colors: '#c9dee6' }
      }
    },
    tooltip: {
      theme: 'dark',
      x: {
        format: 'HH:mm:ss'
      },
      y: {
        formatter: (value: number) => (isNaN(value) ? '0' : value.toFixed(2))
      }
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    }
  };

  $: {
    const seriesData = validData.map((point: { time: number; value: number }) => ({
      x: point.time,
      y: point.value
    }));
    
    options = {
      ...chartOptions,
      xaxis: {
        ...chartOptions.xaxis,
        title: {
          text: t.time,
          style: { color: '#c9dee6' }
        }
      },
      yaxis: {
        ...chartOptions.yaxis,
        title: {
          text: t.f80Value,
          style: { color: '#c9dee6' }
        }
      },
      series: [{
        name: 'F80',
        data: seriesData
      }]
    };
  }

  onMount(async () => {
    try {
      const { chart } = await import('svelte-apexcharts');
      chartAction = chart;
      chartInitialized = true;
    } catch (error) {
      console.error('Failed to load chart library:', error);
    }
  });
</script>

<!-- Key fix: Remove flex classes that interfere with ApexCharts sizing -->
<div class="w-full h-full">
  {#if validData.length === 0}
    <div class="h-full flex items-center justify-center text-gray-400">
      {t.waitingForF80Data}
    </div>
  {:else}
    {#if chartInitialized && chartAction}
      <div 
        bind:this={chartDiv} 
        use:chartAction={options} 
        class="w-full h-full"
      ></div>
    {:else}
      <div class="h-full flex items-center justify-center text-gray-400">
        {t.initializingChart}
      </div>
    {/if}
  {/if}
</div>