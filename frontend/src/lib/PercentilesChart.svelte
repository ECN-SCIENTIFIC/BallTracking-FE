<script lang="ts">
  import { onMount } from 'svelte';
  import { languageStore, translations } from './stores';
  
  // Fixed size categories in millimeters
  const FIXED_SIZES = [0.1, 0.5, 1, 2, 4, 8, 16, 31.5, 45, 63];
  
  export let data: { size: number; percentage: number; cumulative: number }[] = [];
  let chartDiv: HTMLDivElement;
  let chartInitialized = false;
  let chartAction: any = null;
  let validData: { size: number; percentage: number; cumulative: number }[] = [];
  let options: any;
  
  $: t = translations[$languageStore];

  function generateRandomData() {
    // Generate random percentages that sum to 100
    let percentages: number[] = [];
    let remaining = 100;

    // First, generate raw random numbers
    let rawNumbers: number[] = [];
    for (let i = 0; i < FIXED_SIZES.length; i++) {
      // Use exponential distribution occasionally to create peaks
      const useExponential = Math.random() < 0.3;
      if (useExponential) {
        rawNumbers.push(Math.exp(Math.random() * 3)); // Creates occasional high peaks
      } else {
        rawNumbers.push(Math.random());
      }
    }

    // Normalize to sum to 100
    const total = rawNumbers.reduce((a, b) => a + b, 0);
    percentages = rawNumbers.map(n => Number((n * 100 / total).toFixed(1)));

    // Adjust last value to ensure exact 100 sum (fixing any rounding errors)
    const currentSum = percentages.slice(0, -1).reduce((a, b) => a + b, 0);
    percentages[percentages.length - 1] = Number((100 - currentSum).toFixed(1));

    // Calculate cumulative percentages
    let cumulative: number[] = [];
    let sum = 0;
    for (const percent of percentages) {
      sum += percent;
      cumulative.push(Number(sum.toFixed(1)));
    }

    // Create the data array
    data = FIXED_SIZES.map((size, index) => ({
      size,
      percentage: percentages[index],
      cumulative: cumulative[index]
    }));
  }

  // Validate and filter out invalid data points
  $: {
    validData = data.filter(point => 
      typeof point.size === 'number' && 
      !isNaN(point.size) && 
      typeof point.percentage === 'number' && 
      !isNaN(point.percentage) &&
      typeof point.cumulative === 'number' && 
      !isNaN(point.cumulative)
    );
  }

  $: chartOptions = {
    chart: {
      type: 'line',
      fontFamily: 'Satoshi, sans-serif',
      background: 'transparent',
      height: '100%',
      width: '100%',
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      },
      toolbar: {
        show: false
      },
      stacked: false,
      zoom: {
        enabled: false
      }
    },
    stroke: {
      curve: 'straight',
      width: [0, 3], // First series (histogram) has no stroke, second (line) has stroke
      lineCap: 'round'
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '70%',
        borderRadius: 4,
        distributed: true,
        colors: {
          ranges: [{
            from: 0,
            to: 100,
            color: '#3b82f6'  // Blue color for all bars
          }]
        }
      }
    },
    dataLabels: {
      enabled: false,
      style: {
        colors: ['#3b82f6']
      }
    },
    fill: {
      opacity: [0.8, 1],
      gradient: {
        inverseColors: false,
        shade: 'light',
        type: "vertical",
        opacityFrom: 0.85,
        opacityTo: 0.55,
        stops: [0, 100, 100, 100]
      }
    },
    markers: {
      size: 0,
      hover: {
        size: 6,
        sizeOffset: 3
      }
    },
    xaxis: {
      type: 'category',
      labels: {
        style: { colors: '#ffffff' },
        formatter: (value: string) => `${value}mm`
      },
      title: {
        text: t.particleSize,
        style: { color: '#c9dee6' }
      }
    },
    yaxis: [
      {
        title: {
          text: t.percentage,
          style: { color: '#c9dee6' }
        },
        labels: {
          formatter: (value: number) => (isNaN(value) ? '0' : value.toFixed(1)),
          style: { colors: '#c9dee6' }
        },
        min: 0,
        max: 100
      },
      {
        opposite: true,
        title: {
          text: t.cumulative,
          style: { color: '#c9dee6' }
        },
        labels: {
          formatter: (value: number) => (isNaN(value) ? '0' : value.toFixed(1)),
          style: { colors: '#c9dee6' }
        },
        min: 0,
        max: 100
      }
    ],
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        formatter: (value: string) => `${value}mm`
      },
      y: [
        {
          formatter: (value: number) => (isNaN(value) ? '0' : `${value.toFixed(1)}%`)
        },
        {
          formatter: (value: number) => (isNaN(value) ? '0' : `${value.toFixed(1)}%`)
        }
      ]
    },
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      strokeDashArray: 4
    },
    theme: {
      mode: 'dark'
    },
    colors: ['#3b82f6', '#10b981'], // Blue for histogram, green for line
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: '#c9dee6'
      }
    }
  };

  $: {
    const histogramData = validData.map((point) => ({
      x: point.size.toString(),
      y: point.percentage
    }));
    
    const lineData = validData.map((point) => ({
      x: point.size.toString(),
      y: point.cumulative
    }));
    
    options = {
      ...chartOptions,
      series: [
        {
          name: t.percentageLabel,
          type: 'column',
          data: histogramData
        },
        {
          name: t.cumulativeLabel,
          type: 'line',
          data: lineData
        }
      ]
    };
  }

  onMount(async () => {
    try {
      const { chart } = await import('svelte-apexcharts');
      chartAction = chart;
      chartInitialized = true;
      // Generate initial random data if none provided
      if (data.length === 0) {
        generateRandomData();
      }
    } catch (error) {
      console.error('Failed to load chart library:', error);
    }
  });
</script>

<div class="w-full h-full">
  <div class="absolute top-4 right-4 z-10">
    <button
      on:click={generateRandomData}
      class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg transition-colors duration-200"
    >
      Randomize Data
    </button>
  </div>
  
  {#if validData.length === 0}
    <div class="h-full flex items-center justify-center text-gray-400">
      Waiting for percentiles data...
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
        Initializing chart...
      </div>
    {/if}
  {/if}
</div> 