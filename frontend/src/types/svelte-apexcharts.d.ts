declare module 'svelte-apexcharts' {
  interface ChartOptions {
    chart?: any;
    series?: any[];
    type?: string;
    width?: string | number;
    height?: string | number;
    [key: string]: any;
  }

  interface ChartInstance {
    update: (options: ChartOptions) => void;
  }

  export function chart(node: HTMLElement, options: ChartOptions): ChartInstance;
} 