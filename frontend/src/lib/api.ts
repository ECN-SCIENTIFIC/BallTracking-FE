import type { RootResponse, ProcessImageResponse, ServiceConfig, ServiceEndpoint } from './types';
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
        name: 'Root',
        url: '/',
        method: 'GET',
        description: 'Get service status and health check',
        responseType: 'RootResponse'
    },
    {
        name: 'Process Image',
        url: '/process_image',
        method: 'GET',
        description: 'Process an image through the pipeline',
        responseType: 'ProcessImageResponse'
    },
    {
        name: 'Camera Feed',
        url: '/frame',
        method: 'GET',
        description: 'Get the current camera frame',
        responseType: 'image/jpeg'
    }
];

export async function getServiceStatus(): Promise<RootResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/`);
    if (!response.ok) {
        throw new Error('Failed to fetch service status');
    }
    return response.json();
}

export async function processImage(): Promise<ProcessImageResponse> {
    const config = await loadConfig();
    const response = await fetch(`${config.apiBaseUrl}/process_image`);
    if (!response.ok) {
        throw new Error('Failed to process image');
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