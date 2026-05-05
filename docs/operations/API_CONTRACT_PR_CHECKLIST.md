# API Contract PR Checklist

Gunakan checklist ini setiap kali PR menyentuh endpoint yang sudah dipakai frontend.

- [ ] route path tetap
- [ ] method tetap
- [ ] auth requirement tetap
- [ ] success envelope tetap (`success`, `message`, `data`)
- [ ] existing response fields tetap ada
- [ ] perubahan response hanya additive
- [ ] update OpenAPI jika ada perubahan additive pada contract
- [ ] update Postman jika ada perubahan additive pada contract
- [ ] `npm run lint`
- [ ] `npm test`
