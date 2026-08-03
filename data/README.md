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
2. Sửa `id`, `name`, `icon`, `color`, `container` cho chủ đề mới.
3. Chọn 1 chữ cái prefix chưa dùng (o, m, e, h, b đã dùng) cho `id` của từng từ, vd `t1`, `t2`...
4. Thêm `id-moi` vào mảng trong `data/index.json` theo đúng vị trí muốn hiển thị.
5. Cập nhật bảng prefix ở trên (và bảng "Các topic hiện có" trong `CLAUDE.md`).

## Lưu ý

- Mỗi file `<id>.json` là **1 object**, không phải mảng — object đó chứa mảng `words` bên trong.
- `icon` dùng tên icon có sẵn trong `js/core/icons.js`.
- `color`/`container` là mã hex, `container` thường là bản nhạt của `color` (dùng làm nền badge).
