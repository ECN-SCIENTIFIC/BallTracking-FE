<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
  import { processedImageStore, ballTrackingStore, languageStore, translations, type BallTrackingPoint } from '$lib/stores';
  
    $: t = translations[$languageStore];
    let lastLanguage: string | null = null;
  
    let chartContainer: HTMLDivElement;
    let chart: any;
    let ApexCharts: any;
    let maxDataPoints = 50; // Rolling window size
    let lastUpdateTime = 0;
    let simulationInterval: ReturnType<typeof setInterval> | null = null;
    let isSimulating = false;
    let runningCount = 0;
  
    // Use the persistent store instead of local dataPoints
  let dataPoints: BallTrackingPoint[] = [];
  $: dataPoints = $ballTrackingStore;
  
    // Chart options
    $: chartOptions = {
      series: [
        {
          name: t.ballsInFrame,
          data: dataPoints.map(d => ({ x: d.time, y: d.pulse })),
          yAxisIndex: 0 // 👈 uses the first yaxis config
        },
        {
          name: t.runningCount,
          data: dataPoints.map(d => ({ x: d.time, y: d.runningCount })),
          yAxisIndex: 1 // 👈 uses the second yaxis config
        }
      ],
      chart: {
        type: 'line',
        height: '100%',
        background: 'transparent',
        foreColor: '#e2e8f0',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 300
        },
        toolbar: {
          show: false
        },
        zoom: {
          enabled: false
        }
      },
      colors: ['#3b82f6', '#10b981'], // Blue for pulse, green for running count
      stroke: {
        curve: 'smooth',
        width: 2
      },
      markers: {
        size: 0
      },
   xaxis: {
    type: 'datetime',
    datetimeUTC: false, // still set, but doesn't fix everything
    title: {
      text: t.time,
      style: { color: '#c9dee6' }
    },
    labels: {
      formatter: (val: number) => {
        // val is the timestamp (ms)
        const d = new Date(val);
        return d.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
          // timeZone: 'America/Los_Angeles'  <-- force a specific zone if needed
        });
      }
    }
  },
      yaxis: [
        {
          // Left axis -> Pulse
          title: {
            text: t.ballsInFrame,
            style: { color: '#c9dee6' }
          },
          labels: {
            style: {
              colors: '#3b82f6',
              fontSize: '12px'
            }
          },
          min: 0,
          max: 2, // keep a tight scale since pulses are small
          tickAmount: 2
        },
        {
          // Right axis -> Running Count
          opposite: true, 
          title: {
            text: t.runningCount,
            style: { color: '#c9dee6' }
          },
          labels: {
            style: {
              colors: '#10b981',
              fontSize: '12px'
            }
          },
          min: 0
          // no max -> will grow dynamically as values increase
        }
      ],
      grid: {
        borderColor: '#374151',
        strokeDashArray: 4,
        xaxis: {
          lines: {
            show: true
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '14px',
        fontFamily: 'monospace',
        labels: {
          colors: '#e2e8f0'
        },
        markers: {
          width: 8,
          height: 8,
          radius: 4
        }
      },
      tooltip: {
        theme: 'dark',
        style: {
          fontSize: '12px',
          fontFamily: 'monospace'
        },
        x: {
          format: 'HH:mm:ss'
        },
        y: {
          formatter: function(value: number, { seriesIndex }: any) {
            return seriesIndex === 0 ? `${value} ${t.balls}` : `${value} ${t.total}`;
          }
        }
      },
      responsive: [{
        breakpoint: 768,
        options: {
          chart: {
            height: '100%'
          },
          legend: {
            position: 'bottom',
            fontSize: '12px'
          }
        }
      }]
    };
  
    // Simulation functions
    function startSimulation() {
      if (isSimulating) return;
      
      isSimulating = true;
      runningCount = 0;
      
      simulationInterval = setInterval(() => {
        // Generate realistic simulation data
        const basePulse = Math.floor(Math.random() * 8) + 1; // 1-8 rocks per frame
        const pulseVariation = Math.random() * 0.3; // ±30% variation
        const pulse = Math.max(0, Math.floor(basePulse * (1 + pulseVariation - 0.15)));
        
        // Add some to running count (not all detected rocks are counted)
        const countProbability = 0.7; // 70% chance each rock gets counted
        const newCount = Math.floor(pulse * countProbability);
        runningCount += newCount;
        
        addDataPoint(pulse, runningCount);
      }, 2000); // Update every 2 seconds
    }
  
    function stopSimulation() {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
      }
      isSimulating = false;
    }
  
    // Add new data point
    function addDataPoint(pulse: number, runningCount: number) {
      const now = Date.now();
      
      // Only add if we have new data or enough time has passed
      if (now - lastUpdateTime > 1000) { // Update every second minimum
        ballTrackingStore.addPoint({
          time: now,
          pulse: pulse,
          runningCount: runningCount
        });
  
        lastUpdateTime = now;
        updateChart();
      }
    }
  
    // Update chart with new data
    function updateChart() {
      if (!browser || !chart) return;
  
      try {
        const newSeries = [
          dataPoints.map(d => ({ x: d.time, y: d.pulse })),
          dataPoints.map(d => ({ x: d.time, y: d.runningCount }))
        ];
        
        chart.updateSeries([
          { name: t.ballsInFrame, data: newSeries[0], yAxisIndex: 0 },
          { name: t.runningCount, data: newSeries[1], yAxisIndex: 1 }
        ]);
      } catch (error) {
        console.warn('Chart update failed:', error);
      }
    }
  
    // Update chart labels when language changes
    $: if (browser && chart) {
      const lang = $languageStore as unknown as string;
      if (lang && lang !== lastLanguage) {
        chart.updateOptions(chartOptions, false, true);
        lastLanguage = lang;
      }
    }
  
    // Initialize chart
    function initializeChart() {
      if (browser && chartContainer && !chart) {
        import('apexcharts').then((ApexChartsModule) => {
          ApexCharts = ApexChartsModule.default;
          chart = new ApexCharts(chartContainer, chartOptions);
          chart.render();
        });
      }
    }
  
    // React to store changes (only if not simulating)
  $: if ($processedImageStore.data && !isSimulating) {
    const processedData = $processedImageStore.data as any;
    const results = processedData?.results ?? processedData ?? {};
    const pulse = results?.numero_bolas_img ?? 0;
    const runningCount = results?.conteo_bolas ?? 0;
    addDataPoint(pulse, runningCount);
  }
  
    onMount(() => {
      initializeChart();
      
      // Clean old data on mount
      ballTrackingStore.cleanOldData();
      
      // Get the latest running count from existing data
      if ($ballTrackingStore.length > 0) {
        const lastPoint = $ballTrackingStore[$ballTrackingStore.length - 1];
        runningCount = lastPoint.runningCount;
      }
      
      // Start simulation automatically
      // setTimeout(() => {
      //   startSimulation();
      // }, 1000); // Start after 1 second delay
      
      return () => {
        stopSimulation();
        if (chart) {
          chart.destroy();
          chart = null;
        }
      };
    });
  
    onDestroy(() => {
      stopSimulation();
      if (chart) {
        chart.destroy();
        chart = null;
      }
    });
  </script>
  
  <div class="w-full h-full">
    <div bind:this={chartContainer} class="w-full h-full"></div>
  </div>
  