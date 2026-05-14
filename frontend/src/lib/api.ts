import type {
    CommandResponse,
    RootResponse,
    ProcessImageResponse,
    ServiceConfig,
    ServiceEndpoint
} from './types';
import { loadConfig } from './runtimeConfig';

// Add a function to check if a service is available
export async function checkServiceAvailability(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (error) {
        console.error(`Service at ${url} is not available:`, error);
        return false;
    }
}

export const availableEndpoints: ServiceEndpoint[] = [
    {
        name: 'Health',
        url: '/health',
        method: 'GET',
        description: 'Get backend health and shutdown state',
        responseType: 'RootResponse'
    },
    {
        name: 'Latest Result',
        url: '/get-latest-result',
        method: 'GET',
        description: 'Get the latest tracking and loading result',
        responseType: 'ProcessImageResponse'
    },
    {
        name: 'Reset Ball Count',
        url: '/reset-ball-count',
        method: 'POST',
        description: 'Reset the global tracking count',
        responseType: 'boolean'
    },
    {
        name: 'Pulse Cleaner',
        url: '/pulse-do0',
        method: 'POST',
        description: 'Trigger the DO0 cleaner pulse',
        responseType: 'CommandResponse'
    }
];

export async function getServiceStatus(): Promise<RootResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/health`);
    if (!response.ok) {
        throw new Error('Failed to fetch service status');
    }
    return response.json();
}

export async function getLatestResult(): Promise<ProcessImageResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/get-latest-result`);
    if (!response.ok) {
        throw new Error(`Failed to fetch latest result: HTTP ${response.status}`);
    }
    return response.json();
}

// Backwards-compatible name for routes that still display "process image" copy.
export const processImage = getLatestResult;

export async function resetBallCount(): Promise<boolean> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/reset-ball-count`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to reset ball count: HTTP ${response.status}`);
    }
    return response.json();
}

export async function pulseCleaner(): Promise<CommandResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/pulse-do0`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to trigger cleaner: HTTP ${response.status}`);
    }
    return response.json();
}

export async function startStorageCapture(): Promise<CommandResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/storage/capture/start`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to start storage capture: HTTP ${response.status}`);
    }
    return response.json();
}

export async function stopStorageCapture(): Promise<CommandResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/storage/capture/stop`, { method: 'POST' });
    if (!response.ok) {
        throw new Error(`Failed to stop storage capture: HTTP ${response.status}`);
    }
    return response.json();
}

export async function getStorageCaptureStatus(): Promise<CommandResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/storage/capture/status`);
    if (!response.ok) {
        throw new Error(`Failed to fetch storage capture status: HTTP ${response.status}`);
    }
    return response.json();
}

export async function getServiceConfig(): Promise<ServiceConfig> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/config`);
    if (!response.ok) {
        throw new Error('Failed to fetch service config');
    }
    return response.json();
}

async function performCameraHandshake(): Promise<void> {
    try {
        const runtimeConfig = await loadConfig();
        // First check if the camera service is available
        const isAvailable = await checkServiceAvailability(runtimeConfig.cameraUrl);
        if (!isAvailable) {
            throw new Error('Camera service is not available. Make sure it is running in Docker.');
        }

        const config = await getServiceConfig();
        const response = await fetch(`${runtimeConfig.cameraUrl}/handshake`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config.camera_config)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Camera handshake failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        
        const result = await response.json();
        if (result.message !== 'Handshake successful') {
            throw new Error('Camera handshake did not return success message');
        }
    } catch (error) {
        console.error('Camera handshake error:', error);
        throw error;
    }
}

export async function getCameraFeed(): Promise<Blob> {
    try {
        const config = await loadConfig();
        // First ensure camera is initialized
        await performCameraHandshake();
        
        const response = await fetch(`${config.cameraUrl}/frame`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch camera feed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return response.blob();
    } catch (error) {
        console.error('Camera feed error:', error);
        throw error;
    }
} 