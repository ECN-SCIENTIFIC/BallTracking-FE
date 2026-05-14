# BallTracking — API para frontend

Backend FastAPI para tracking en banda, resultados en tiempo casi real, carguío, almacenamiento y captura de imágenes.

**Base URL por defecto:** `http://<host>:8000` (si ejecutas `python main.py` o `uvicorn` sin cambiar puerto).

---

## Convenciones

- **JSON** en respuestas salvo donde se indique.
- **Códigos HTTP:** `200` éxito, `404` recurso deshabilitado por configuración, `501` no implementado / no cableado, `503` servicio no listo o dependencia no disponible.

---

## Endpoints

### `GET /health`

Comprueba que el proceso responde y si se solicitó apagado.

**Respuesta 200**

```json
{
  "ok": true,
  "shutdown": false
}
```

- `shutdown`: `true` si el proceso está terminando (señal o fin de emulación de vídeo, etc.).

---

### `GET /get-latest-result`

Último resultado del pipeline (tracking + payload de carguío).

**Respuesta 200** (ejemplo; campos pueden variar según estado)

```json
{
  "timestamp": "2026-04-24T12:00:00",
  "numero_bolas_img": 2,
  "conteo_bolas": 15,
  "image_string": "data:image/jpeg;base64,...",
  "carguio": {
    "status": "active",
    "evento_id": 3,
    "inicio_iso": "2026-04-24T11:58:00",
    "fin_carguio_iso": null,
    "acumulado_bolas_evento": 120,
    "flujo_bolas_por_minuto": 12.5,
    "flujo_bolas_por_hora": 750.0,
    "tiempo_presencia_acumulado_s": 45.2,
    "tiempo_evento_s": 120.0,
    "ultimo_cierre": null
  }
}
```

Con evento inactivo, `carguio.status` es `"idle"`, `evento_id` e `inicio_iso` suelen ser `null`, y `ultimo_cierre` puede contener el último cierre confirmado o no confirmado (objeto con `confirmed`, `fin_carguio_iso`, etc.).

**Vídeo en el JSON (`modules`)**

- `image_string` solo se incluye si **`results_enabled` y `video_enabled`** son ambos `true` en YAML (capacidad interna `results_include_video`).
- Si no, la API **elimina** `image_string` aunque el pipeline lo haya generado (data URL JPEG).

**Respuesta 503**

```json
{
  "error": "Servicio iniciandose, aun no hay resultados."
}
```

---

### `POST /reset-ball-count`

Reinicia el conteo global de IDs de tracking y el campo `conteo_bolas` del último resultado si existe.

**Cuerpo:** ninguno requerido.

**Respuesta 200**

```json
true
```

---

### `POST /pulse-do0`

Dispara un pulso en la salida digital **DO0** (hardware autolimpiante). Corre en un hilo; la petición devuelve al instante.

**Requisito:** en `config/default.yaml`, `modules.autolimpiante_enabled: true`.

**Cuerpo:** ninguno requerido.

**Respuesta 200**

```json
{
  "ok": true,
  "channel": 0,
  "duration_s": 0.5,
  "message": "Pulso DO0 iniciado (thread)"
}
```

**Errores**

- `404`: módulo autolimpiante desactivado en configuración.
- `501`: tarea de pulso no configurada en el servidor.

---

### `POST /storage/capture/start`

Inicia la **captura continua de imágenes** en disco (mientras dure la sesión configurada en YAML).

**Requisito:** bloque `storage` válido en YAML (modo `local_db` o `remote_db`) para que exista servicio de storage.

**Cuerpo / query:** ninguno. La duración sale **solo** de `storage.images.continuous.default_duration_s` en `config/default.yaml`.

**Respuesta 200** (ejemplo; coincide con implementación interna)

```json
{
  "ok": true,
  "active": true,
  "duration_s": 3600,
  "remaining_s": 3600,
  "started_at_iso": "2026-04-24T12:00:00"
}
```

**Errores / cuerpos especiales**

- `503`: `{"detail":"Storage no configurado."}` si no hay `storage` en config.
- **200** con `"ok": false` si `storage.images.continuous.enabled` es `false` (`reason`: `"continuous_disabled"`) o duración inválida (`"invalid_duration"`).

---

### `POST /storage/capture/stop`

Detiene la captura continua antes de que expire el tiempo.

**Respuesta 200**

```json
{
  "ok": true,
  "active": false
}
```

o, si ya estaba detenida:

```json
{
  "ok": true,
  "active": false,
  "already_stopped": true
}
```

**Errores**

- `503`: storage no configurado.

---

### `GET /storage/capture/status`

Consulta si la captura continua está activa y cuántos segundos quedan (aproximado).

**Respuesta 200**

```json
{
  "active": true,
  "remaining_s": 1200,
  "started_at_iso": "2026-04-24T12:00:00"
}
```

Si no hay sesión o expiró:

```json
{
  "active": false,
  "remaining_s": 0,
  "started_at_iso": null
}
```

Si storage no está configurado, devuelve el mismo objeto “inactivo” (no es error HTTP).

---

## Configuración relevante para el frontend

En `config/default.yaml`:

| Clave | Efecto en API |
|--------|----------------|
| `modules.results_enabled` + `modules.video_enabled` | Ambos `true` → `get-latest-result` incluye `image_string`. |
| `modules.autolimpiante_enabled` | Si existe y funciona `POST /pulse-do0`. |
| `storage` + `storage.images` | Si existen endpoints de captura y guardado en disco. |
| `storage.images.continuous.default_duration_s` | Duración de `POST /storage/capture/start`. |


## Ejecución rápida

Desde la raíz del repositorio:

```powershell
$env:PYTHONPATH="src"
python main.py
```

Variables útiles:

- `CONFIG_PATH`: ruta a un YAML completo alternativo.
