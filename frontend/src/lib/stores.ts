import { writable } from 'svelte/store';
import type { ProcessImageResponse } from './types';
import type { BallTrackingChartsConfig, MillDefinition } from './ballTracking/caseConfig';
import type { ResolvedRuntimeConfig } from './runtimeConfig';

const DEFAULT_SINGLE_MILL: MillDefinition[] = [{ id: 'M1', label: 'M1' }];

/** Mills for this deployment, set from `config.json` on each `loadConfig()`. */
export const ballTrackingMillsStore = writable<MillDefinition[]>(DEFAULT_SINGLE_MILL);

/** Feature flag from `config.json` (`inchancable: false` to hide shift / inchancable tiles). */
export const ballTrackingInchancableStore = writable(true);

function defaultChartPrefs(): BallTrackingChartsConfig {
  return {
    mode: 'separate',
    series: ['detections', 'accumulated'],
    compareMills: true,
  };
}

function createBallTrackingChartPrefsStore() {
  const STORAGE_KEY = 'ball-tracking-chart-prefs-v1';
  let initial = defaultChartPrefs();
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Record<string, unknown>;
        if (p && typeof p === 'object') {
          if (p.mode === 'combined' || p.mode === 'separate') {
            initial = { ...initial, mode: p.mode };
          }
          if (typeof p.compareMills === 'boolean') {
            initial = { ...initial, compareMills: p.compareMills };
          }
          if (Array.isArray(p.series) && p.series.length) {
            const s = p.series.filter(
              (x): x is 'detections' | 'accumulated' =>
                x === 'detections' || x === 'accumulated',
            );
            if (s.length) initial = { ...initial, series: s };
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const { subscribe, set, update } = writable<BallTrackingChartsConfig>(initial);

  if (typeof window !== 'undefined') {
    subscribe((v) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
      } catch {
        /* ignore */
      }
    });
  }

  return { subscribe, set, update };
}

/** User-controlled chart layout (persisted): combined vs separate, compare vs aggregate, series. */
export const ballTrackingChartPrefsStore = createBallTrackingChartPrefsStore();

function createBooleanLocalStorageStore(key: string, defaultVal: boolean) {
  let initial = defaultVal;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(key);
      if (raw === 'false') initial = false;
      if (raw === 'true') initial = true;
    } catch {
      /* ignore */
    }
  }
  const { subscribe, set, update } = writable(initial);
  if (typeof window !== 'undefined') {
    subscribe((v) => {
      try {
        localStorage.setItem(key, String(v));
      } catch {
        /* ignore */
      }
    });
  }
  return { subscribe, set, update };
}

/** User toggle: show the camera feed panel (persisted). */
export const ballTrackingShowCameraStore = createBooleanLocalStorageStore(
  'ball-tracking-show-camera-v1',
  true,
);

export function syncBallTrackingFromResolvedConfig(cfg: ResolvedRuntimeConfig) {
  ballTrackingMillsStore.set(cfg.millsResolved);
  ballTrackingInchancableStore.set(cfg.inchancableEnabled);
}

// Store for processed image data
export const processedImageStore = writable<{
  data: ProcessImageResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}>({
  data: null,
  loading: false,
  error: null,
  lastUpdated: null
});

// Helper function to update the store with new data
export function updateProcessedImage(data: ProcessImageResponse) {
  processedImageStore.update(store => ({
    ...store,
    data,
    loading: false,
    error: null,
    lastUpdated: new Date()
  }));
}

// Helper function to set loading state
export function setProcessedImageLoading(loading: boolean) {
  processedImageStore.update(store => ({
    ...store,
    loading
  }));
}

// Helper function to set error state
export function setProcessedImageError(error: string | null) {
  processedImageStore.update(store => ({
    ...store,
    error,
    loading: false
  }));
}

// Historical F80 data type
export type HistoricalF80Point = {
  time: number;
  value: number;
};

// Create a persistent store for historical F80 data
function createHistoricalF80Store() {
  const STORAGE_KEY = 'f80-historical-data';
  const MAX_POINTS = 60; // Keep last 60 points (30min at 30s intervals)
  
  // Load initial data from localStorage
  let initialData: HistoricalF80Point[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored);
        // Filter out old data (older than 2 hours)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        initialData = parsedData.filter((point: HistoricalF80Point) => point.time > twoHoursAgo);
      }
    } catch (e) {
      console.warn('Failed to load historical F80 data from localStorage:', e);
    }
  }

  const { subscribe, set, update } = writable<HistoricalF80Point[]>(initialData);

  // Subscribe to changes and save to localStorage
  if (typeof window !== 'undefined') {
    subscribe((data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save historical F80 data to localStorage:', e);
      }
    });
  }

  return {
    subscribe,
    addPoint: (point: HistoricalF80Point) => {
      update(data => {
        const newData = [...data, point];
        // Keep only the last MAX_POINTS
        return newData.slice(-MAX_POINTS);
      });
    },
    clear: () => {
      set([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    // Method to clean old data (older than 2 hours)
    cleanOldData: () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      update(data => data.filter(point => point.time > twoHoursAgo));
    }
  };
}

export const historicalF80Store = createHistoricalF80Store();

// Track last F80 update time
export const lastF80UpdateStore = writable<number>(0);

// Ball tracking data type
export type BallTrackingPoint = {
  time: number;
  pulse: number;
  runningCount: number;
};

function createBallTrackingStore() {
  const STORAGE_KEY = 'ball-tracking-data';
  const MAX_POINTS = 50;

  let initialData: BallTrackingPoint[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedData = JSON.parse(stored);
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        initialData = parsedData.filter(
          (point: BallTrackingPoint) => point.time > twoHoursAgo,
        );
      }
    } catch (e) {
      console.warn('Failed to load ball tracking data from localStorage:', e);
    }
  }

  const { subscribe, set, update } = writable<BallTrackingPoint[]>(initialData);

  if (typeof window !== 'undefined') {
    subscribe((data) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn('Failed to save ball tracking data to localStorage:', e);
      }
    });
  }

  return {
    subscribe,
    addPoint: (point: BallTrackingPoint) => {
      update((data) => {
        const newData = [...data, point];
        return newData.slice(-MAX_POINTS);
      });
    },
    clear: () => {
      set([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    cleanOldData: () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
      update((data) => data.filter((point) => point.time > twoHoursAgo));
    },
  };
}

export const ballTrackingStore = createBallTrackingStore();

/** Selected mill id, or `all` to show every configured mill (compare or aggregate per chart config). */
export type MillSelection = 'all' | string;
export type GateStatus = 'open' | 'closed';

export type MillSeriesPoint = {
  time: number;
  m1: number;
  m2: number;
};

export type BallTrackingBackendPayload = {
  bucketMs: number;
  gateStatus: GateStatus;
  activeMill: string;
  pulses: MillSeriesPoint[];
  cumulative: MillSeriesPoint[];
};

export const millSelectionStore = writable<MillSelection>('all');
export const ballTrackingBackendStore = writable<BallTrackingBackendPayload | null>(null);

// Translation types
export type Language = 'en' | 'es';

export interface Translations {
  // Language selector
  language: string;
  english: string;
  spanish: string;
  guest: string;
  signOut: string;
  
  // Main page
  generalOverview: string;
  f80Meter: string;
  granulometriaCamara: string;
  loadingProcessedImage: string;
  retry: string;
  updating: string;
  updated: string;
  error: string;
  loading: string;
  noImageAvailable: string;
  cameraFaja: string;
  backend: string;
  f80HistoricalChart: string;
  
  // Density levels
  muyFino: string;
  fino: string;
  normal: string;
  grueso: string;
  muyGrueso: string;
  
  // Sidebar tabs
  resultados: string;
  variables: string;
  config: string;
  
  // Sidebar content
  currentResults: string;
  currentStatistics: string;
  mean: string;
  distribution: string;
  noDataAvailable: string;
  
  // Camera Settings
  cameraSettings: string;
  resolution: string;
  frameRate: string;
  exposure: string;
  
  // Analysis Settings
  analysisSettings: string;
  detectionSensitivity: string;
  sizeThreshold: string;
  enterSizeInMm: string;
  
  // Metric cards
  categoria: string;
  raw: string;
  na: string;
  
  // Time formatting
  ago: string;
  seconds: string;
  minutes: string;
  
  // Charts
  particleSizeDistribution: string;
  waitingForF80Data: string;
  initializingChart: string;
  particleSize: string;
  percentage: string;
  cumulative: string;
  cumulativeLabel: string;
  percentageLabel: string;
  time: string;
  f80Value: string;
  
  // Analytics page
  overview: string;
  analytics: string;
  detailOf: string;
  shiftSummary: string;
  liveMonitoring: string;
  summary: string;
  ballTracking: string;
  ballDetectionIndicators: string;
  editIndicators: string;
  dragIndicatorsHint: string;
  noIndicatorsVisible: string;
  ballAccumByShift: string;
  runCleaner: string;
  runCleanerHint: string;
  generateReport: string;
  generateReportHint: string;
  ballAccumByDay: string;
  ballFlow: string;
  ballFlowHint: string;
  show: string;
  hide: string;
  done: string;
  reset: string;
  moveIndicatorLeft: string;
  moveIndicatorRight: string;
  ballDetectionOverview: string;
  waitingForUpdates: string;
  ballsInFrame: string;
  runningCount: string;
  balls: string;
  total: string;
  currentFrame: string;
  totalCount: string;
  lastDetection: string;
  mass: string;
  ballDetectionTimeline: string;
  rollingWindow: string;
  ballTrackingComingSoon: string;
  inchancable: string;
  active: string;
  inactive: string;
  noSignal: string;
  allMills: string;
  ballTrackingSidebarLayout: string;
  showCameraFeed: string;
  chartDisplayCombined: string;
  chartDisplaySeparate: string;
  compareMillsSideBySide: string;
  chartSeriesDetections: string;
  chartSeriesAccumulated: string;
  chartSeriesSection: string;
  backToOverview: string;
  fajaNotFound: string;
  
  // SmartDataEntry
  guard: string;
  date: string;
  copyFromPrevious: string;
  copy: string;
  bulkEdit: string;
  bulk: string;
  autoCalculate: string;
  auto: string;
  dataForGuard: string;
  rate: string;
  actual: string;
  variance: string;
  enterValueToApply: string;
  applyToCells: string;
  cells: string;
  clickCellsToSelect: string;
  importCsv: string;
  export: string;
  saveChanges: string;
  autoCalculated: string;
  autoCalc: string;
  
  // Measurement categories
  largeAperture: string;
  mediumAperture: string;
  coarseMesh: string;
  mediumMesh: string;
  fineMesh: string;
  veryFine: string;
  special: string;
}

// Translation dictionaries
export const translations: Record<Language, Translations> = {
  en: {
    language: 'Language',
    english: 'English',
    spanish: 'Spanish',
    guest: 'Guest',
    signOut: 'Sign Out',
    generalOverview: 'General Overview',
    f80Meter: 'F80 Meter',
    granulometriaCamara: 'Granulometry Camera',
    loadingProcessedImage: 'Loading processed image...',
    retry: 'Retry',
    updating: 'Updating...',
    updated: 'Updated',
    error: 'Error',
    loading: 'Loading...',
    noImageAvailable: 'No image available',
    cameraFaja: 'CAMERA FAJA',
    backend: 'Backend',
    f80HistoricalChart: 'F80 Historical Chart',
    muyFino: 'Very Fine',
    fino: 'Fine',
    normal: 'Normal',
    grueso: 'Coarse',
    muyGrueso: 'Very Coarse',
    resultados: 'Results',
    variables: 'Variables',
    config: 'Config',
    currentResults: 'Current Results',
    currentStatistics: 'Current Statistics',
    mean: 'Mean',
    distribution: 'Distribution',
    noDataAvailable: 'No data available',
    cameraSettings: 'Camera Settings',
    resolution: 'Resolution',
    frameRate: 'Frame Rate',
    exposure: 'Exposure',
    analysisSettings: 'Analysis Settings',
    detectionSensitivity: 'Detection Sensitivity',
    sizeThreshold: 'Size Threshold',
    enterSizeInMm: 'Enter size in mm',
    categoria: 'Category',
    raw: 'Raw',
    na: 'N/A',
    ago: 'ago',
    seconds: 's',
    minutes: 'm',
    particleSizeDistribution: 'Particle Size Distribution',
    waitingForF80Data: 'Waiting for F80 data...',
    initializingChart: 'Initializing chart...',
    particleSize: 'Particle Size (mm)',
    percentage: 'Percentage (%)',
    cumulative: 'Cumulative (%)',
    percentageLabel: 'Percentage',
    cumulativeLabel: 'Cumulative',
    time: 'Time',
    f80Value: 'F80 Value',
    overview: 'Overview',
    analytics: 'Analytics',
    detailOf: 'Detail of',
    shiftSummary: 'Shift Summary',
    liveMonitoring: 'Live Monitoring',
    summary: 'Data Entry',
    ballTracking: 'Ball Tracking',
    ballDetectionIndicators: 'Ball Detection Indicators',
    editIndicators: 'Edit indicators',
    dragIndicatorsHint: 'Drag cards to reorder. Use Show/Hide to choose which indicators appear on the dashboard.',
    noIndicatorsVisible: 'All indicators are hidden. Open edit mode to show one again.',
    ballAccumByShift: 'Ball accum by shift',
    runCleaner: 'Run cleaner',
    runCleanerHint: 'Start a cleaning cycle',
    generateReport: 'Generate report',
    generateReportHint: 'Export the latest summary',
    ballAccumByDay: 'Ball accum by day',
    ballFlow: 'Ball flow',
    ballFlowHint: 'Rolling rate',
    show: 'Show',
    hide: 'Hide',
    done: 'Done',
    reset: 'Reset',
    moveIndicatorLeft: 'Move indicator left',
    moveIndicatorRight: 'Move indicator right',
    ballDetectionOverview: 'Ball detection overview',
    waitingForUpdates: 'Waiting for updates',
    ballsInFrame: 'Balls in Frame',
    runningCount: 'Running Count',
    balls: 'balls',
    total: 'total',
    currentFrame: 'Current Frame',
    totalCount: 'Total Count',
    lastDetection: 'Last Detection',
    mass: 'Mass',
    ballDetectionTimeline: 'Ball Detection Timeline',
    rollingWindow: 'Rolling window',
    ballTrackingComingSoon: 'Ball tracking chart coming soon',
    inchancable: 'Inchancable',
    active: 'Active',
    inactive: 'Inactive',
    noSignal: 'No signal',
    allMills: 'All',
    ballTrackingSidebarLayout: 'Ball tracking layout',
    showCameraFeed: 'Show camera feed',
    chartDisplayCombined: 'Single chart (dual axis)',
    chartDisplaySeparate: 'Separate chart cards',
    compareMillsSideBySide: 'Compare mills side-by-side when “All” is selected',
    chartSeriesDetections: 'Detections series',
    chartSeriesAccumulated: 'Accumulated series',
    chartSeriesSection: 'Chart series',
    backToOverview: 'Back to Overview',
    fajaNotFound: 'Faja not found',
    guard: 'Guard',
    date: 'Date',
    copyFromPrevious: 'Copy from Previous',
    copy: 'Copy',
    bulkEdit: 'Bulk Edit',
    bulk: 'Bulk',
    autoCalculate: 'Auto Calculate',
    auto: 'Auto',
    dataForGuard: 'Data for Guard',
    rate: 'Rate',
    actual: 'Actual',
    variance: 'Variance',
    enterValueToApply: 'Enter value to apply to selected cells',
    applyToCells: 'Apply to',
    cells: 'cells',
    clickCellsToSelect: 'Click on cells to select them, then enter a value to apply to all selected cells at once.',
    importCsv: 'Import CSV',
    export: 'Export',
    saveChanges: 'Save Changes',
    autoCalculated: 'Auto-calculated',
    autoCalc: 'Auto-calc',
    largeAperture: 'Large Aperture',
    mediumAperture: 'Medium Aperture',
    coarseMesh: 'Coarse Mesh',
    mediumMesh: 'Medium Mesh',
    fineMesh: 'Fine Mesh',
    veryFine: 'Very Fine',
    special: 'Special'
  },
  es: {
    language: 'Idioma',
    english: 'Inglés',
    spanish: 'Español',
    guest: 'Invitado',
    signOut: 'Cerrar sesión',
    generalOverview: 'Vista General',
    f80Meter: 'Medidor F80',
    granulometriaCamara: 'Granulometría Cámara',
    loadingProcessedImage: 'Cargando imagen procesada...',
    retry: 'Reintentar',
    updating: 'Actualizando...',
    updated: 'Actualizado',
    error: 'Error',
    loading: 'Cargando...',
    noImageAvailable: 'No hay imagen disponible',
    cameraFaja: 'CÁMARA FAJA',
    backend: 'Servidor',
    f80HistoricalChart: 'Gráfico Histórico F80',
    muyFino: 'Muy Fino',
    fino: 'Fino',
    normal: 'Normal',
    grueso: 'Grueso',
    muyGrueso: 'Muy Grueso',
    resultados: 'Resultados',
    variables: 'Variables',
    config: 'Config',
    currentResults: 'Resultados Actuales',
    currentStatistics: 'Estadísticas Actuales',
    mean: 'Promedio',
    distribution: 'Distribución',
    noDataAvailable: 'No hay datos disponibles',
    cameraSettings: 'Configuración de Cámara',
    resolution: 'Resolución',
    frameRate: 'Velocidad de Fotogramas',
    exposure: 'Exposición',
    analysisSettings: 'Configuración de Análisis',
    detectionSensitivity: 'Sensibilidad de Detección',
    sizeThreshold: 'Umbral de Tamaño',
    enterSizeInMm: 'Ingrese el tamaño en mm',
    categoria: 'Categoría',
    raw: 'Crudo',
    na: 'N/D',
    ago: 'hace',
    seconds: 's',
    minutes: 'm',
    particleSizeDistribution: 'Distribución de Tamaño de Partículas',
    waitingForF80Data: 'Esperando datos F80...',
    initializingChart: 'Inicializando gráfico...',
    particleSize: 'Tamaño de Partícula (mm)',
    percentage: 'Porcentaje (%)',
    cumulative: 'Acumulativo (%)',
    percentageLabel: 'Porcentaje',
    cumulativeLabel: 'Acumulativo',
    time: 'Tiempo',
    f80Value: 'Valor F80',
    overview: 'Vista General',
    analytics: 'Análisis',
    detailOf: 'Detalle de',
    shiftSummary: 'Resumen de turno',
    liveMonitoring: 'Monitoreo en Vivo',
    summary: 'Ingesta',
    ballTracking: 'Conteo de bolas',
    ballDetectionIndicators: 'Indicadores de detección de bolas',
    editIndicators: 'Editar indicadores',
    dragIndicatorsHint: 'Arrastre las tarjetas para reordenarlas. Use Mostrar/Ocultar para elegir qué indicadores aparecen en el panel.',
    noIndicatorsVisible: 'Todos los indicadores están ocultos. Abra el modo de edición para mostrar uno nuevamente.',
    ballAccumByShift: 'Bolas acumuladas por turno',
    runCleaner: 'Ejecutar limpieza',
    runCleanerHint: 'Iniciar ciclo de limpieza',
    generateReport: 'Generar reporte',
    generateReportHint: 'Exportar resumen reciente',
    ballAccumByDay: 'Bolas acumuladas por día',
    ballFlow: 'Flujo de bolas',
    ballFlowHint: 'Tasa móvil',
    show: 'Mostrar',
    hide: 'Ocultar',
    done: 'Listo',
    reset: 'Restablecer',
    moveIndicatorLeft: 'Mover indicador a la izquierda',
    moveIndicatorRight: 'Mover indicador a la derecha',
    ballDetectionOverview: 'Resumen de detección de bolas',
    waitingForUpdates: 'Esperando actualizaciones',
    ballsInFrame: 'Bolas en frame',
    runningCount: 'Conteo acumulado',
    balls: 'bolas',
    total: 'total',
    currentFrame: 'Frame actual',
    totalCount: 'Conteo total',
    lastDetection: 'Última detección',
    mass: 'Masa',
    ballDetectionTimeline: 'Línea de tiempo de detección de bolas',
    rollingWindow: 'Ventana móvil',
    ballTrackingComingSoon: 'Gráfico de seguimiento de bolas próximamente',
    inchancable: 'Inchancable',
    active: 'Activo',
    inactive: 'Inactivo',
    noSignal: 'Sin senal',
    allMills: 'Todos',
    ballTrackingSidebarLayout: 'Diseño de conteo de bolas',
    showCameraFeed: 'Mostrar cámara',
    chartDisplayCombined: 'Un gráfico (dos ejes)',
    chartDisplaySeparate: 'Gráficos separados',
    compareMillsSideBySide: 'Comparar molinos cuando “Todos” está seleccionado',
    chartSeriesDetections: 'Serie de detecciones',
    chartSeriesAccumulated: 'Serie acumulada',
    chartSeriesSection: 'Series del gráfico',
    backToOverview: 'Volver a Vista General',
    fajaNotFound: 'Faja no encontrada',
    guard: 'Guardia',
    date: 'Fecha',
    copyFromPrevious: 'Copiar del Anterior',
    copy: 'Copiar',
    bulkEdit: 'Edición Masiva',
    bulk: 'Masiva',
    autoCalculate: 'Cálculo Automático',
    auto: 'Auto',
    dataForGuard: 'Datos para Guardia',
    rate: 'Tasa',
    actual: 'Real',
    variance: 'Varianza',
    enterValueToApply: 'Ingrese el valor para aplicar a las celdas seleccionadas',
    applyToCells: 'Aplicar a',
    cells: 'celdas',
    clickCellsToSelect: 'Haga clic en las celdas para seleccionarlas, luego ingrese un valor para aplicar a todas las celdas seleccionadas a la vez.',
    importCsv: 'Importar CSV',
    export: 'Exportar',
    saveChanges: 'Guardar Cambios',
    autoCalculated: 'Auto-calculado',
    autoCalc: 'Auto-calc',
    largeAperture: 'Apertura Grande',
    mediumAperture: 'Apertura Mediana',
    coarseMesh: 'Malla Gruesa',
    mediumMesh: 'Malla Mediana',
    fineMesh: 'Malla Fina',
    veryFine: 'Muy Fino',
    special: 'Especial'
  }
};

// Create a persistent language store
function createLanguageStore() {
  const STORAGE_KEY = 'f80-language';
  const DEFAULT_LANGUAGE: Language = 'en';
  
  // Load initial language from localStorage
  let initialLanguage: Language = DEFAULT_LANGUAGE;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === 'en' || stored === 'es')) {
        initialLanguage = stored as Language;
      }
    } catch (e) {
      console.warn('Failed to load language from localStorage:', e);
    }
  }

  const { subscribe, set, update } = writable<Language>(initialLanguage);

  // Subscribe to changes and save to localStorage
  if (typeof window !== 'undefined') {
    subscribe((language) => {
      try {
        localStorage.setItem(STORAGE_KEY, language);
      } catch (e) {
        console.warn('Failed to save language to localStorage:', e);
      }
    });
  }

  return {
    subscribe,
    set,
    update,
    getTranslations: (lang: Language): Translations => translations[lang]
  };
}

export const languageStore = createLanguageStore();

// Helper function to get current translations
export function getCurrentTranslations(): Translations {
  let currentLang: Language = 'en';
  languageStore.subscribe(lang => {
    currentLang = lang;
  })();
  return translations[currentLang];
}

// Auth store for session persistence
export interface AuthState {
  isLoggedIn: boolean;
  username?: string;
}

// Create a persistent auth store
function createAuthStore() {
  const STORAGE_KEY = 'f80-auth';
  
  // Load initial auth state from localStorage
  let initialAuth: AuthState = { isLoggedIn: false };
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check if session is still valid (you can add expiration logic here)
        if (parsed.isLoggedIn) {
          initialAuth = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load auth state from localStorage:', e);
    }
  }

  const { subscribe, set, update } = writable<AuthState>(initialAuth);

  // Subscribe to changes and save to localStorage
  if (typeof window !== 'undefined') {
    subscribe((auth) => {
      try {
        if (auth.isLoggedIn) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Failed to save auth state to localStorage:', e);
      }
    });
  }

  return {
    subscribe,
    set,
    update,
    login: (username?: string) => {
      set({ isLoggedIn: true, username });
    },
    logout: () => {
      set({ isLoggedIn: false });
    }
  };
}

export const authStore = createAuthStore(); 