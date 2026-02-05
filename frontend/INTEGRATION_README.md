# F80 Backend Integration

This document describes the integration between the frontend and the F80 backend API.

## Backend API

The backend is a FastAPI application located at `backend/f80/f80_process_fastapi.py` that provides:

### Endpoint: `/get-latest-result`

**Method:** GET  
**URL:** `http://localhost:8000/get-latest-result`

**Response Structure:**
```json
{
  "image_string": "base64_encoded_image_data",
  "timestamp": "2024-01-01T12:00:00",
  "rock_table": {
    "id": [1, 2, 3, ...],
    "type": ["large", "medium", "small", ...],
    "axis_mayor": [45, 30, 20, ...],
    "axis_minor": [25, 18, 12, ...],
    "center_x": [80, 200, 320, ...],
    "center_y": [60, 80, 120, ...],
    "volumen": [volume_values, ...]
  }
}
```

## Frontend Integration

### Updated Components

1. **API Layer** (`src/lib/api.ts`)
   - Updated to use `/get-latest-result` endpoint
   - Added proper error handling for 503 status (service starting)
   - Maintains backward compatibility

2. **Data Types** (`src/lib/types.ts`)
   - Added `RockData` interface matching backend structure
   - Updated `ProcessImageResponse` to match actual API response
   - Maintained legacy interfaces for compatibility

3. **Stores** (`src/lib/stores.ts`)
   - Added `rockDataStore` for rock analysis data
   - Enhanced `processedImageStore` to handle new data structure
   - Automatic conversion of backend arrays to rock objects

4. **Components**
   - **F80MetricCard**: Updated to calculate F80 from rock volumes
   - **InteractiveCameraFeed**: Now uses real rock data from backend
   - **RockSummaryTable**: Displays actual rock analysis results
   - **ProcessedImageDisplay**: New component showing processed image with rock overlays

### Key Features

- **Real-time Updates**: Polls backend every 2 seconds for new data
- **Error Handling**: Graceful handling of connection issues and service startup
- **Loading States**: Visual feedback during data fetching
- **Rock Visualization**: Interactive display of detected rocks with tooltips
- **Metrics Calculation**: F80 calculation based on rock volume distribution

## Running the Integration

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies (if not already installed):
   ```bash
   pip install fastapi uvicorn opencv-python pandas
   ```

3. Start the backend server:
   ```bash
   python f80/f80_process_fastapi.py
   ```
   The server will run on `http://localhost:8000`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontendf80demo/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Visit `http://localhost:5173` to see the application

### Testing the Integration

Visit `http://localhost:5173/test-integration` to see a dedicated test page that:
- Tests the backend connection
- Displays raw API response
- Shows processed images with rock overlays
- Lists all detected rocks in a table
- Calculates metrics from the data

## Data Flow

1. **Backend Processing**:
   - Camera captures images (or uses simulation)
   - YOLO model detects and segments rocks
   - Results are stored in memory

2. **API Response**:
   - Frontend calls `/get-latest-result`
   - Backend returns processed image and rock data
   - Data is structured as arrays for efficiency

3. **Frontend Processing**:
   - Arrays are converted to rock objects
   - Image is displayed with rock overlays
   - Metrics are calculated from rock data
   - Historical data is stored for charts

## Configuration

The backend configuration is in `backend/config.json`:
- `simulation`: Set to `true` for testing with sample images
- `img_sim_path`: Path to simulation images
- `conf_thresh`: Confidence threshold for rock detection
- `iou_thresh`: IOU threshold for non-maximum suppression

## Troubleshooting

### Common Issues

1. **Backend not starting**:
   - Check Python dependencies are installed
   - Verify model files exist in specified paths
   - Check configuration file is valid

2. **Frontend can't connect**:
   - Ensure backend is running on port 8000
   - Check CORS settings if needed
   - Verify network connectivity

3. **No data displayed**:
   - Check backend logs for processing errors
   - Verify simulation images exist
   - Check API endpoint is responding

### Debug Tools

- Use the test page at `/test-integration` to verify connection
- Check browser console for API errors
- Monitor backend console for processing logs
- Use browser network tab to inspect API calls

## Future Enhancements

- Add WebSocket support for real-time updates
- Implement authentication for API endpoints
- Add more sophisticated F80 calculations
- Support for multiple camera feeds
- Historical data persistence in database 