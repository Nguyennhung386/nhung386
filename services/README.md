# Dịch vụ tải video TikTok

Nút **TẢI XUỐNG** trên SaveTok gọi dịch vụ Python này. Link TikTok được tải bằng `yt-dlp`
(cần `curl_cffi` để vượt lớp chống bot), ưu tiên MP4 H.264 không logo.
Chọn **Nhạc MP3** trên giao diện để tách âm thanh thành MP3 (dùng ffmpeg đi kèm `imageio-ffmpeg`).

Không dùng API trả phí nào. Chi phí duy nhất là nơi chạy dịch vụ này.

## Chạy trên máy (phát triển)

```powershell
python -m venv C:\dyd\.venv
C:\dyd\.venv\Scripts\python -m pip install -r services\requirements.txt
C:\dyd\.venv\Scripts\python services\download_api.py
npm run dev
```

Vite chuyển `/api/dl` sang `127.0.0.1:8001`, không cần cấu hình thêm.

## Đưa lên mạng

Giao diện và dịch vụ tải chạy ở hai nơi khác nhau:

1. **Dịch vụ tải → Render (gói Free).** Trên render.com: New → Blueprint → chọn repo này
   (Render đọc `render.yaml`). Khi được hỏi `ALLOWED_ORIGINS`, điền địa chỉ trang Vercel,
   ví dụ `https://savetok.vercel.app` (nhiều địa chỉ thì ngăn cách bằng dấu phẩy).
   Sau khi deploy, mở `https://<tên-dịch-vụ>.onrender.com/api/dl/health` phải thấy `{"status":"ok"}`.
2. **Giao diện → Vercel.** Trên vercel.com: Add New → Project → import repo này (Vercel tự nhận
   cấu hình build). Trong Environment Variables thêm `VITE_DOWNLOAD_API_URL` =
   `https://<tên-dịch-vụ>.onrender.com`, rồi Deploy.
3. Nếu địa chỉ Vercel khác với địa chỉ đã điền ở bước 1, sửa `ALLOWED_ORIGINS` trên Render cho khớp.

Biến môi trường của dịch vụ: `PORT` (Render tự đặt), `ALLOWED_ORIGINS`, `MAX_CONCURRENT`
(mặc định 2 lượt tải cùng lúc), `RATE_LIMIT` (mặc định 20 lượt / 10 phút / người).

## Lưu ý

- Gói Free của Render "ngủ" khi không ai dùng; lượt tải đầu tiên sau đó chờ khoảng 1 phút.
- TikTok có thể chặn IP máy chủ ("IP address is blocked"). Nếu xảy ra thường xuyên, chạy dịch vụ
  trên máy nhà + Cloudflare Tunnel, hoặc dùng proxy.
- Khi TikTok đổi cơ chế, cập nhật yt-dlp (trên Render: Manual Deploy → Clear build cache & deploy).
- Gói Hobby của Vercel chỉ cho dự án phi thương mại; trang có kiếm tiền cần gói Pro.
