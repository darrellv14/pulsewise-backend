# Education CMS FE Handoff

Dokumen ini adalah acuan frontend untuk integrasi modul **Edukasi / Artikel** PulseWise.

## Ringkasan

- Semua user login (`patient`, `doctor`, `admin`) boleh menulis artikel.
- Artikel **tidak pernah langsung live**.
- Draft baru harus **di-review admin** sebelum published.
- Edit artikel yang sudah published akan membuat **pending revision**; versi live lama tetap tampil sampai admin approve revisinya.
- Konten disimpan sebagai **raw markdown/MDX string** di field `contentMarkdown`.
- Frontend CMS web bisa memakai **MDXEditor**; backend menyimpan source string apa adanya.
- Cover/inline image upload memakai **signed upload ke Cloudinary**.

## Model publish yang penting

### Draft baru
1. writer buat draft
2. writer submit review
3. admin approve/reject
4. kalau approve -> artikel masuk feed published

### Edit artikel published
1. writer edit artikel
2. backend membuat / memperbarui pending revision
3. feed published **masih menampilkan versi live lama**
4. admin approve revision
5. baru versi live diperbarui

## Endpoint utama writer

- `GET /education/categories`
- `GET /education/tags`
- `GET /education/upload-signature?kind=cover|inline`
- `POST /education/articles`
- `PUT /education/articles/{articleId}`
- `POST /education/articles/{articleId}/submit-review`
- `GET /education/me/articles?page=1&limit=10&status=draft|pending_review|published|rejected|archived|unpublished`
- `GET /education/me/articles/{articleId}`

## Endpoint reader

- `GET /education/articles?category=<slug>&tag=<slug>&q=<term>&sort=latest|popular&cursor=<cursor>&limit=10`
- `GET /education/articles/{slug}`
- `GET /education/articles/{articleId}/comments?cursor=<cursor>&limit=20`
- `POST /education/articles/{articleId}/likes`
- `DELETE /education/articles/{articleId}/likes`
- `POST /education/articles/{articleId}/comments`
- `POST /education/comments/{commentId}/replies`
- `PUT /education/comments/{commentId}`
- `DELETE /education/comments/{commentId}`

## Endpoint admin moderation

- `GET /admin/education/articles/pending?page=1&limit=20`
- `GET /admin/education/articles/revisions/pending?page=1&limit=20`
- `GET /admin/education/articles/{articleId}`
- `POST /admin/education/articles/{articleId}/approve`
- `POST /admin/education/articles/{articleId}/reject`
- `POST /admin/education/revisions/{revisionId}/approve`
- `POST /admin/education/revisions/{revisionId}/reject`
- `POST /admin/education/articles/{articleId}/feature`
- `POST /admin/education/articles/{articleId}/archive`
- `POST /admin/education/articles/{articleId}/unpublish`
- `POST /admin/education/comments/{commentId}/hide`

## Kontrak konten editor

Frontend CMS web boleh mengirim source dari **MDXEditor** langsung ke:

```json
{
  "contentMarkdown": "# Judul\n\nParagraf...\n\n```js\nconsole.log('halo')\n```"
}
```

Catatan:
- backend **tidak men-trim** source markdown/MDX
- newline awal/akhir, code fence, block quote, list, dan heading akan tetap disimpan
- untuk fase awal, sebaiknya FE membatasi fitur editor ke:
  - heading
  - paragraph
  - bold/italic
  - list
  - quote
  - link
  - image
  - code block

Kalau FE mulai memakai fitur MDX yang lebih canggih seperti JSX/custom components, backend tetap bisa menyimpan stringnya, tapi renderer FE harus benar-benar siap me-render MDX.

## Body create / update artikel

```json
{
  "categorySlug": "nutrisi-pola-makan",
  "title": "Menu rendah garam untuk lansia",
  "excerpt": "Panduan singkat memilih makanan yang lebih aman untuk kesehatan jantung.",
  "contentMarkdown": "# Menu rendah garam\n\nIsi artikel markdown/MDX di sini.",
  "coverImageUrl": "https://res.cloudinary.com/example/image/upload/v1/pulsewise/education/covers/sample.jpg",
  "coverImagePublicId": "pulsewise/education/covers/sample",
  "tags": ["rendah garam", "lansia", "nutrisi"]
}
```

Catatan:
- pilih salah satu:
  - `categoryId`
  - `categorySlug`
- `tags` boleh string label biasa; backend akan normalisasi ke slug

## Response penting article detail

```json
{
  "success": true,
  "message": "Detail artikel edukasi berhasil diambil",
  "data": {
    "articleId": "uuid",
    "slug": "menu-rendah-garam-untuk-lansia",
    "title": "Menu rendah garam untuk lansia",
    "excerpt": "Panduan singkat...",
    "contentMarkdown": "# Menu rendah garam\n\nIsi artikel markdown/MDX di sini.",
    "status": "published",
    "category": {
      "categoryId": "uuid",
      "slug": "nutrisi-pola-makan",
      "name": "Nutrisi & Pola Makan"
    },
    "author": {
      "userId": "uuid",
      "role": "doctor",
      "displayName": "Dr. Budi",
      "badge": "Ditulis Dokter"
    },
    "tags": [
      { "slug": "rendah-garam", "name": "rendah garam" }
    ],
    "likeCount": 12,
    "commentCount": 4,
    "viewCount": 98,
    "likedByMe": false,
    "isFeatured": true,
    "featuredOrder": 1,
    "latestRevision": null,
    "pendingRevision": null,
    "publishedAt": "2026-06-04T10:00:00.000Z"
  }
}
```

## Feed pagination contract

Published feed memakai **cursor pagination**:

```json
{
  "success": true,
  "message": "Daftar artikel edukasi berhasil diambil",
  "data": {
    "items": [],
    "pagination": {
      "limit": 10,
      "hasMore": true,
      "nextCursor": "opaque-cursor"
    }
  }
}
```

Catatan FE:
- feed utama cocok pakai **infinite scroll**
- kalau `hasMore=false`, stop fetch
- kirim `cursor=<nextCursor>` untuk page berikutnya

## My Articles / Admin list pagination

Semua list operasional writer/admin memakai **page + limit** biasa:

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 3,
    "totalPages": 1
  }
}
```

## Comments contract

Komentar juga memakai cursor:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "commentId": "uuid",
        "content": "Artikel ini membantu sekali",
        "status": "visible",
        "author": {
          "displayName": "Ayu"
        },
        "replies": [
          {
            "commentId": "uuid-2",
            "content": "Setuju",
            "status": "visible"
          }
        ]
      }
    ],
    "pagination": {
      "limit": 20,
      "hasMore": false,
      "nextCursor": null
    }
  }
}
```

Catatan:
- nested reply maksimal **1 level**
- FE jangan bikin thread bercabang dalam

## UX notes

### Writer CMS web
- editor page terpisah
- autosave boleh nanti, tapi fase awal cukup tombol:
  - `Simpan Draft`
  - `Ajukan Review`
- tampilkan status artikel:
  - `Draft`
  - `Menunggu Review`
  - `Published`
  - `Ditolak`
  - `Archived`
  - `Unpublished`

### Saat edit artikel published
- tampilkan warning halus:
  - “Perubahan Anda akan dikirim sebagai revisi dan menunggu review admin.”
- jangan bilang perubahan langsung live

### Admin moderation
- pisahkan tab:
  - `Draft Baru`
  - `Revisi`
- admin preview harus merender snapshot penuh dari `contentMarkdown`

### Feed reader
- feed utama pakai infinite scroll
- list card:
  - cover
  - category
  - title
  - excerpt
  - author badge
  - like/comment count

## Error handling penting

- `401` belum login / token invalid
- `403` bukan pemilik resource atau bukan admin
- `404` artikel/revisi/komentar tidak ditemukan
- `409` state conflict, misalnya approve artikel yang bukan pending review
- `400` cursor invalid / reply terlalu dalam / payload invalid

## Referensi

- `docs/api/openapi.yaml`
- `src/routes/educationRoutes.js`
- `src/validators/educationValidator.js`
