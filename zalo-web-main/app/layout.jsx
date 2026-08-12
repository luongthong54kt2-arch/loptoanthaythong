// [FRONTEND] app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "Sổ liên lạc — trao đổi với phụ huynh",
  description: "Nhắn tin Zalo với phụ huynh từ trang quản lý trung tâm",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        {/* Be Vietnam Pro được thiết kế riêng cho dấu tiếng Việt — dấu không lệch,
            không chồng lên chữ hoa như các font Latin thông thường. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
