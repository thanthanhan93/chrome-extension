# Copy bình luận Facebook

Tiện ích Chrome thử mở thêm bình luận và phản hồi của bài viết đang mở, rồi copy mỗi mục theo dạng `tên: nội dung`.
Dữ liệu được xử lý trên máy và không được tiện ích gửi đến máy chủ nào.

## Cài đặt

1. Mở `chrome://extensions` trong Chrome.
2. Bật **Chế độ dành cho nhà phát triển**.
3. Chọn **Tải tiện ích đã giải nén** và chọn thư mục gốc của repo `chrome-extension`.
4. Ghim tiện ích nếu muốn truy cập nhanh.

## Sử dụng

1. Đăng nhập Facebook và mở riêng bài viết muốn lấy bình luận.
2. Tiện ích thử chọn **Tất cả bình luận**, mở thêm phản hồi và cuộn để tải nội dung.
3. Bấm biểu tượng tiện ích và chọn **Tải và copy**.
4. Giữ cửa sổ tiện ích mở trong khi chạy, sau đó dán kết quả vào nơi cần dùng.
5. Nếu Chrome từ chối ghi clipboard, copy nội dung trong ô kết quả.

## Giới hạn

Tiện ích chỉ đọc nội dung tài khoản đang đăng nhập có thể xem.
Không có cách xác nhận rằng Facebook đã tải hoặc hiển thị toàn bộ bình luận, nên kết quả có thể thiếu.
Tiện ích thử bấm nút tải thêm bằng tiếng Việt hoặc tiếng Anh và giới hạn số lượt tải.
Phản hồi được thụt dưới bình luận gốc khi cấu trúc trang thể hiện quan hệ cha con.
Một số giao diện Facebook không thể hiện rõ quan hệ này và kết quả có thể không xác định được bình luận gốc.
Bình luận chỉ chứa ảnh, video hoặc nội dung không phải văn bản có thể bị bỏ qua.
Facebook có thể thay đổi giao diện và làm tiện ích ngừng hoạt động hoặc đọc sai nội dung.

## Kiểm thử

Trên macOS có Google Chrome và Node.js, chạy từ thư mục tiện ích:

```sh
node \
  tests/test.mjs
```

Nếu Chrome nằm ở vị trí khác, đặt biến `CHROME` thành đường dẫn tới chương trình Chrome trước khi chạy.
Kiểm thử dùng một trang HTML giả lập, không kiểm chứng giao diện Facebook thực.
