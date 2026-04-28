export interface ServiceStatus {
    camera: boolean;
    inference: boolean;
    postprocess: boolean;
    db_service: boolean;
}

export interface RootResponse {
    message: string;
    service_status: ServiceStatus;
}

export interface ProcessImageResponse {
    status: string;
    timestamp?: number;
    message?: string;
    results: {
        fs_dict: Record<string, number>;
        fs_ajust_dict: Record<string, number>;
        img_result?: string;
        img_result_mime?: string;
        numero_bolas_img?: number;
        conteo_bolas?: number;
        last_detection_timestamp?: number | null;
        masa_total?: number;
        total_mass?: number;
        mass?: number;
        gate_status?: 'open' | 'closed';
        active_mill?: string;
        inchancable?: boolean;
        conteo_bolas_turno?: number;
        conteo_bolas_dia?: number;
        conteo_bolas_day?: number;
        day_ball_count?: number;
        daily_ball_count?: number;
        daily_total_count?: number;
        ball_flow_per_minute?: number;
        balls_per_minute?: number;
        flujo_bolas_minuto?: number;
        ball_flow_per_hour?: number;
        balls_per_hour?: number;
        flujo_bolas_hora?: number;
        shift_ball_count?: number;
        shift_total_count?: number;
        shift_start_timestamp?: number;
        shift_end_timestamp?: number;
        shift_start_time?: number | string;
        shift_end_time?: number | string;
        turno_inicio?: number | string;
        turno_fin?: number | string;
        ball_tracking?: {
            bucket_ms: number;
            pulses: Array<{ time: number; m1: number; m2: number }>;
            cumulative: Array<{ time: number; m1: number; m2: number }>;
        };
    };
}

export interface ServiceConfig {
    camera_config: {
        width: number;
        height: number;
        FPS: number;
        emular_camara: string;
        emular_fuente: string;
    };
    inference_config: {
        confidence: number;
        iou_thres: number;
        use_windowed_inference: boolean;
        nbox: number[];
        win_size: number[];
        overlay: number[];
        ini_cords: number[];
        model_path: string;
        classes: number[];
    };
    postprocess_config: {
        cumulative_size: number;
        scale: number;
        func_ajuste_alpha: number;
        func_ajuste_beta: number;
    };
}

export interface ServiceEndpoint {
    name: string;
    url: string;
    method: 'GET' | 'POST';
    description: string;
    responseType: string;
} 