# PulseWise API Style Guide

## Base Rules

- Base URL: `/`
- Accept and respond with JSON only.
- Gunakan noun (bukan verb) pada endpoint path.
- Collection wajib plural nouns.
- Gunakan nested resources untuk objek hierarkis.

## Naming and URL Structure

- Collection:
  - `GET /patients`
  - `GET /doctors`
- Single resource:
  - `GET /patients/{patientId}`
- Nested resource:
  - `GET /doctors/{doctorId}/patients`

## Standard Response Envelope

### Success

```json
{
  "success": true,
  "message": "Operation success",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "details": {
    "code": "VALIDATION_ERROR",
    "issues": [
      {
        "field": "email",
        "issue": "must be a valid email"
      }
    ]
  }
}
```

## Standard Error Codes

- `400 Bad Request`: payload/query/path invalid
- `401 Unauthorized`: missing/invalid token
- `403 Forbidden`: role tidak punya akses
- `404 Not Found`: resource tidak ditemukan
- `409 Conflict`: data duplicate / state conflict
- `422 Unprocessable Entity`: valid JSON tetapi gagal business rule
- `500 Internal Server Error`: server exception

## Filtering, Sorting, Pagination

- Filtering: `?status=active&role=patient`
- Sorting: `?sortBy=createdAt&order=desc`
- Pagination: `?page=1&limit=20`

Response list wajib menyertakan:

```json
{
  "success": true,
  "message": "List fetched",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 120,
      "totalPages": 6
    }
  }
}
```

## Security Checklist

- Gunakan `Authorization: Bearer <token>` untuk endpoint protected.
- Jangan kirim data sensitif yang tidak diperlukan di response.
- Batasi body size untuk endpoint ingestion.
- Gunakan HTTPS/WSS di environment production.

## Caching

- Data yang jarang berubah dapat diberikan `Cache-Control`.
- Untuk data real-time/medis, default no-store kecuali ada alasan kuat.

## Versioning

- Jalur canonical saat ini **tanpa** prefix versi pada URL.
- Breaking change berikutnya harus diumumkan eksplisit di changelog dan handoff FE.
- Swagger/OpenAPI dan Postman wajib sinkron dengan jalur canonical yang aktif.
