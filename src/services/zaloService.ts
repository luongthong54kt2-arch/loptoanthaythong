/**
 * Zalo Official Account (OA) & ZNS Service
 * Quản lý gửi tin nhắn trực tiếp qua Zalo OA OpenAPI
 */

const ZALO_APP_ID = import.meta.env.VITE_ZALO_APP_ID || '';
const ZALO_APP_SECRET = import.meta.env.VITE_ZALO_APP_SECRET || '';
const ZALO_OA_ID = import.meta.env.VITE_ZALO_OA_ID || '';
const ZALO_REFRESH_TOKEN = import.meta.env.VITE_ZALO_REFRESH_TOKEN || '';

// Kiểm tra xem cấu hình Zalo OA đã sẵn sàng chưa
export const isZaloOAConfigured = Boolean(ZALO_APP_ID && ZALO_APP_SECRET && ZALO_OA_ID && ZALO_REFRESH_TOKEN);

// Bộ nhớ cache tạm thời cho Access Token (hiệu lực 25 tiếng)
// Bộ nhớ cache tạm thời cho Access Token (hiệu lực 25 tiếng)
let cachedAccessToken: string | null = localStorage.getItem('ZALO_CACHED_ACCESS_TOKEN');
let tokenExpiresAt: number = parseInt(localStorage.getItem('ZALO_TOKEN_EXPIRES_AT') || '0', 10);

/**
 * Lấy hoặc làm mới Access Token từ Refresh Token
 */
export async function getZaloAccessToken(): Promise<string | null> {
  // 1. Nếu Access Token trong bộ nhớ/localStorage còn hiệu lực (chưa hết 25h), DÙNG LẠI NGAY KHÔNG CẦN REFRESH
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    console.log('⚡ Dùng lại Zalo Access Token hợp lệ từ Cache');
    return cachedAccessToken;
  }

  if (!ZALO_APP_ID || !ZALO_APP_SECRET || !ZALO_REFRESH_TOKEN) {
    console.warn('⚠️ Chưa cấu hình đầy đủ ZALO_APP_ID, ZALO_APP_SECRET, VITE_ZALO_REFRESH_TOKEN trong file .env');
    return null;
  }

  // 2. Chỉ khi Access Token hết hạn hoàn toàn mới dùng Refresh Token lấy mã mới
  const currentRefreshToken = localStorage.getItem('ZALO_LATEST_REFRESH_TOKEN') || ZALO_REFRESH_TOKEN;

  try {
    const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'secret_key': ZALO_APP_SECRET,
      },
      body: new URLSearchParams({
        refresh_token: currentRefreshToken,
        app_id: ZALO_APP_ID,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      cachedAccessToken = data.access_token as string;
      const expiresIn = (parseInt(data.expires_in, 10) || 90000) - 300;
      tokenExpiresAt = Date.now() + expiresIn * 1000;

      localStorage.setItem('ZALO_CACHED_ACCESS_TOKEN', cachedAccessToken);
      localStorage.setItem('ZALO_TOKEN_EXPIRES_AT', tokenExpiresAt.toString());

      if (data.refresh_token) {
        localStorage.setItem('ZALO_LATEST_REFRESH_TOKEN', data.refresh_token);
      }

      console.log('✅ Đã làm mới Zalo OA Access Token thành công!');
      return cachedAccessToken;
    } else {
      console.error('❌ Lỗi từ Zalo OAuth Server:', JSON.stringify(data));
      // Nếu lỗi refresh token, xóa cache để người dùng cấp token mới từ .env
      localStorage.removeItem('ZALO_CACHED_ACCESS_TOKEN');
      localStorage.removeItem('ZALO_TOKEN_EXPIRES_AT');
      localStorage.removeItem('ZALO_LATEST_REFRESH_TOKEN');
      alert(`⚠️ Mã Zalo Refresh Token hết hạn hoặc vừa bị đổi!\n👉 Hãy tạo mã mới trên developers.zalo.me/tools/explorer dán vào .env!`);
      return null;
    }
  } catch (error) {
    console.error('❌ Lỗi kết nối Zalo OAuth API:', error);
    return null;
  }
}

/**
 * Gửi tin nhắn chăm sóc khách hàng (CSKH) qua Zalo OA
 * @param userZaloId hoặc phone số điện thoại người nhận (định dạng 84xxx)
 * @param message Nội dung tin nhắn
 */
export async function sendZaloOAMessage(phoneOrUserId: string, message: string): Promise<{ success: boolean; message?: string }> {
  const accessToken = await getZaloAccessToken();

  // Chuẩn hóa số điện thoại dạng 84xxxxxxxxx
  let formattedPhone = phoneOrUserId.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '84' + formattedPhone.slice(1);
  }

  if (!accessToken) {
    // Fallback thử gọi qua local Zalo Server nếu chưa cài được Token OpenAPI trực tiếp
    try {
      const res = await fetch('http://localhost:3001/api/zalo/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, message })
      });
      if (res.ok) return { success: true, message: 'Gửi qua Zalo Bot Server' };
    } catch (e) {
      // ignore
    }
    return { success: false, message: 'Chưa cấu hình Token Zalo OA chính thức hoặc không kết nối được Server' };
  }

  try {
    // 1. Nếu là SĐT (như 84912453646), gửi qua Zalo CS API dùng { recipient: { phone_number: ... } }
    const isUserId = formattedPhone.length > 13;
    const recipientPayload = isUserId ? { user_id: formattedPhone } : { phone_number: formattedPhone };

    let response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        recipient: recipientPayload,
        message: { text: message },
      }),
    });

    let result = await response.json();
    console.log('✅ Kết quả trả về từ Zalo OpenAPI:', JSON.stringify(result, null, 2));

    // 2. Nếu Zalo trả về -201 (Cần Zalo User ID của người đã bấm Quan tâm), gọi qua Zalo Message Promotion / Quản lý người dùng
    if (result.error === -201 && !isUserId) {
      // Thử dùng định dạng chuẩn 0xxx cho phone_number
      let rawPhone = phoneOrUserId.replace(/\D/g, '');
      if (rawPhone.startsWith('84')) rawPhone = '0' + rawPhone.slice(2);

      const altRes = await fetch('https://openapi.zalo.me/v3.0/oa/message/promotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': accessToken,
        },
        body: JSON.stringify({
          recipient: { phone_number: rawPhone },
          message: { text: message },
        }),
      });
      const altResult = await altRes.json();
      if (altResult.error === 0) {
        result = altResult;
      }
    }

    if (result.error === 0) {
      alert(`🎉 Gửi thành công Zalo OA cho ${formattedPhone}!`);
      return { success: true, message: 'Đã gửi thành công qua Zalo OA!' };
    } else if (result.error === -224) {
      // Mã lỗi -224: Zalo OA chưa mua gói trả phí (Dùng gói Dùng Thử/Miễn Phí) -> Tự động dùng Zalo Bot Web
      console.warn('⚠️ Zalo OA ở gói miễn phí, đang tự động gửi qua Zalo Bot Chrome...');
      try {
        const botRes = await fetch('http://localhost:3001/api/zalo/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: formattedPhone, message })
        });
        if (botRes.ok) {
          alert(`✅ Đã tự động chuyển tiếp và gửi thành công tin nhắn tới SĐT ${formattedPhone} qua Zalo!`);
          return { success: true, message: 'Gửi thành công qua Zalo Bot' };
        }
      } catch (e) {
        // Zalo Bot Server chưa bật
      }
      alert(`⚠️ Zalo OA của bạn hiện ở Gói Dùng Thử (Miễn phí) nên Zalo chặn API nhắn tin trực tiếp.\n👉 Giải pháp: Mua gói Zalo OA Basic/Standard (khoảng 39k/tháng) HOẶC bật lệnh "node scripts/zalo-server.js" để gửi miễn phí qua Zalo Web!`);
      return { success: false, message: 'OA cần nâng cấp gói cước Zalo OA' };
    } else {
      alert(`⚠️ Zalo báo lỗi (Mã ${result.error}): ${result.message}`);
      return { success: false, message: `${result.message || 'Lỗi gửi tin Zalo'} (Mã lỗi Zalo: ${result.error})` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Lỗi mạng khi kết nối Zalo OA' };
  }
}

/**
 * Gửi thông báo học phí bằng mẫu tin nhắn ZNS (Zalo Notification Service)
 */
export async function sendZNSNotification(
  phone: string,
  templateId: string,
  templateData: Record<string, any>
): Promise<{ success: boolean; message?: string }> {
  const accessToken = await getZaloAccessToken();
  if (!accessToken) {
    return { success: false, message: 'Chưa có Access Token Zalo OA' };
  }

  let formattedPhone = phone.replace(/\D/g, '');
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '84' + formattedPhone.slice(1);
  }

  try {
    const response = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        template_id: templateId,
        template_data: templateData,
        tracking_id: `tuition_${Date.now()}`,
      }),
    });

    const result = await response.json();
    if (result.error === 0) {
      return { success: true, message: 'Đã gửi thông báo ZNS thành công!' };
    } else {
      return { success: false, message: `Lỗi ZNS: ${result.message} (Mã lỗi: ${result.error})` };
    }
  } catch (error: any) {
    return { success: false, message: error.message || 'Lỗi gửi tin nhắn ZNS' };
  }
}
