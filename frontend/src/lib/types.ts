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
    results: {
        fs_dict: Record<string, number>;
        fs_ajust_dict: Record<string, number>;
        img_result?: string;
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