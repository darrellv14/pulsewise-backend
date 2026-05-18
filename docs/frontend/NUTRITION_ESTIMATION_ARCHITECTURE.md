# Nutrition Estimation with Gemini

Dokumen ini menjelaskan fondasi estimasi nutrisi PulseWise setelah pivot dari Qwen/OpenAI ke Gemini.

## Tujuan

User tidak perlu mengisi kalori secara manual. Backend menerima kombinasi input makanan, lalu meminta model multimodal Gemini untuk mengembalikan estimasi nutrisi dalam JSON yang ketat.

## Input yang dipakai

Untuk menjaga kualitas estimasi, backend saat ini mewajibkan:

- `mealName`
- ditambah minimal salah satu dari:
  - `mealDescription`
  - `imageBase64`

Contoh kombinasi yang valid:

- `mealName + mealDescription`
- `mealName + imageBase64`
- `mealName + mealDescription + imageBase64`

## Arsitektur singkat

1. FE mengirim request ke backend PulseWise.
2. Backend menyusun prompt berbasis nama makanan dan deskripsi user.
   Prompt juga menekankan bahwa model harus cukup peka terhadap makanan dan minuman Indonesia.
3. Jika ada gambar, backend menyertakan `inline_data` image ke Gemini.
4. Gemini diminta mengembalikan JSON-only dengan schema ketat.
5. Backend memvalidasi JSON output.
6. Backend:
   - mengembalikan hasil estimasi, atau
   - menyimpan snapshot nutrisi ke `daily_consumptions`

## Endpoint

### Estimate only

`POST /users/:userId/nutrition-estimates`

Body minimal:

```json
{
  "mealName": "Nasi padang",
  "mealDescription": "1 plate nasi padang with rice, rendang, sambal ijo, and cassava leaves"
}
```

Body multimodal:

```json
{
  "mealName": "Nasi padang",
  "mealDescription": "1 plate nasi padang with rice, rendang, sambal ijo, and cassava leaves",
  "imageBase64": "<base64-image>",
  "imageMimeType": "image/jpeg"
}
```

### Estimate and save

`POST /users/:userId/diaries/by-date/consumptions/estimate`

Contoh body:

```json
{
  "diaryDate": "2026-05-18",
  "mealName": "Nasi padang",
  "mealDescription": "1 plate nasi padang with rice, rendang, sambal ijo, and cassava leaves",
  "type": "food",
  "time": "12:30"
}
```

## Output model yang diminta

Gemini diminta mengembalikan JSON dengan struktur:

- `is_food_image`
- `validation_message`
- `detected_foods`
- `portion_estimate`
- `portion_grams_estimate`
- `fdc_food_id`
- `nutrition_source`
- `calories_kcal`
- `protein_g`
- `carbs_g`
- `sugar_g`
- `fiber_g`
- `fat_g`
- `saturated_fat_g`
- `monounsaturated_fat_g`
- `polyunsaturated_fat_g`
- `cholesterol_mg`
- `calcium_mg`
- `confidence`
- `notes`

## Guardrails backend

Backend tetap melakukan validasi:

- JSON harus valid
- `nutrition_source` harus sesuai konstanta internal
- `sugar_g <= carbs_g`
- komponen lemak tidak boleh melebihi `fat_g`
- payload non-food akan ditolak saat flow estimate-and-save

## Config env

Backend memakai env berikut:

- `NUTRITION_ESTIMATION_ENABLED`
- `GEMINI_API_KEY`
- `GEMINI_BASE_URL`
- `NUTRITION_ESTIMATION_MODEL`
- `NUTRITION_ESTIMATION_TIMEOUT_MS`
- `NUTRITION_ESTIMATION_MAX_OUTPUT_TOKENS`
- `NUTRITION_ESTIMATION_THINKING_LEVEL`

Default model saat ini diarahkan ke `gemini-3-flash-preview`, karena itu model resmi yang terdokumentasi untuk structured output + multimodal pada integrasi yang kita pakai sekarang.

Thinking level default disetel ke `minimal` agar token budget tidak habis untuk reasoning internal pada use case estimasi nutrisi yang sifatnya structured dan cepat.

## Catatan implementasi

- `portion` di backend sudah dilonggarkan menjadi maksimal 255 karakter.
- Sumber nutrisi AI disimpan sebagai `gemini_food_macro_analysis`.
- Jika nanti kualitas estimasi perlu dinaikkan, tahap lanjut yang paling masuk akal adalah:
  - cache hasil request
  - rate limit per user
  - retry/repair saat model menghasilkan JSON yang tidak valid
