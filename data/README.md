# Hướng dẫn thêm từ vựng thủ công

## Thêm từ vào chủ đề có sẵn

1. Mở file `data/<id>.json` của chủ đề cần thêm.
2. Copy 1 object trong mảng `words`, dán vào cuối mảng (trước `]`), sửa nội dung.
3. Đặt `id` mới = prefix chủ đề + số tiếp theo (xem bảng dưới).
4. `ipa` và `pos` để `""` nếu không có dữ liệu.
5. `ex` phải là câu tiếng Anh thuần, **không** chèn nghĩa tiếng Việt trong ngoặc.

### Bảng prefix & ID tiếp theo

| Chủ đề (id) | File | Prefix | Số từ hiện tại | ID tiếp theo |
|---|---|---|---|---|
| office | office.json | `o` | 191 | `o192` |
| meetings | meetings.json | `m` | 137 | `m138` |
| email | email.json | `e` | 148 | `e149` |
| hr | hr.json | `h` | 149 | `h150` |
| banking | banking.json | `b` | 200 | `b201` |

> Cập nhật lại bảng này mỗi khi thêm từ mới, để lần sau biết ID tiếp theo mà không phải đếm lại.

### Mẫu 1 từ

```json
{
  "id": "o192",
  "en": "deadline",
  "vi": "hạn chót",
  "ex": "We need to finish before the deadline.",
  "ipa": "",
  "pos": "n"
}
```

## Thêm chủ đề mới

1. Copy file `_template.json` thành `data/<id-moi>.json` (vd: `travel.json`).
2. Sửa `id`, `name` cho chủ đề mới (`name` là tên tiếng Anh gốc, dùng làm fallback).
3. Chọn 1 chữ cái prefix chưa dùng (o, m, e, h, b đã dùng) cho `id` của từng từ, vd `t1`, `t2`...
4. Thêm `id-moi` vào mảng trong `data/index.json` theo đúng vị trí muốn hiển thị.
5. Thêm entry cho `id-moi` vào **cả 3 map** trong [js/services/vocabulary.js](../js/services/vocabulary.js): `TOPIC_EMOJI` (icon ký tự/emoji), `TOPIC_NAME_VI` (tên tiếng Việt ngắn gọn), `TOPIC_COLOR` (màu badge + nền nhạt) — thiếu bước này chủ đề mới vẫn chạy được nhưng sẽ dùng giá trị mặc định (📚, tên tiếng Anh, màu xám).
6. Cập nhật bảng prefix ở trên (và bảng "Các topic hiện có" trong `CLAUDE.md`).

## Lưu ý

- Mỗi file `<id>.json` là **1 object**, không phải mảng — object đó chỉ chứa đúng 3 trường `id`, `name`, `words` (mảng từ vựng bên trong). **Không** để icon/màu sắc trong data — mọi thứ thuộc về trình bày (icon, tên tiếng Việt, màu) định nghĩa tập trung trong `js/services/vocabulary.js`, xem bước 5 ở trên.
