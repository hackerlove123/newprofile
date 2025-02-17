import requests
import re
from collections import OrderedDict
import telebot
import argparse
import time

# Cấu hình Telegram
TELEGRAM_BOT_TOKEN = '7819235807:AAEpCtPhIAAjTJYz0Efho35YZVl6ikAxKtc'
TELEGRAM_CHAT_ID = '1243471275'

# Pattern regex để tìm proxy
PROXY_PATTERN = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}')
ERROR_MESSAGES = {
    'timeout': '⏳ Timeout',
    'no_proxy': '🚫 Không có proxy',
    'invalid_format': '📄 Định dạng không hợp lệ',
}

def send_file_to_telegram(file_path, caption=""):
    """Gửi file qua Telegram với caption được cắt gọn"""
    try:
        bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
        with open(file_path, 'rb') as f:
            bot.send_document(
                chat_id=TELEGRAM_CHAT_ID,
                document=f,
                caption=caption[:1023] + '...' if len(caption) > 1024 else caption
            )
    except Exception as e:
        print(f"🔴 Telegram Error: {str(e)}")

def fetch_proxies(url):
    """Lấy danh sách proxy từ URL với xử lý lỗi chi tiết"""
    try:
        response = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        
        if response.status_code != 200:
            return f"🔴 HTTP {response.status_code}", []
            
        proxies = PROXY_PATTERN.findall(response.text)
        if not proxies:
            return ERROR_MESSAGES['no_proxy'], []
            
        return "✅ Thành công", proxies
        
    except requests.exceptions.Timeout:
        return ERROR_MESSAGES['timeout'], []
    except Exception as e:
        return f"🔴 {str(e)}", []

def process_urls(file_path):
    """Xử lý toàn bộ URL trong file và trả về kết quả"""
    with open(file_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    results = {'success': [], 'failed': [], 'proxies': []}
    
    for url in urls:
        print(f"🔎 Đang quét: {url}")
        status, proxies = fetch_proxies(url)
        
        if proxies:
            results['success'].append(url)
            results['proxies'].extend(proxies)
            print(f"🟢 {status} | {len(proxies)} proxy")
        else:
            results['failed'].append((url, status))
            print(f"🔴 {status}")

        print("━" * 60)
    
    return results

def update_url_lists(file_path, results):
    """Cập nhật danh sách URL và ghi log lỗi"""
    # Ghi lại các URL thành công
    with open(file_path, 'w') as f:
        f.write('\n'.join(results['success']))
    
    # Ghi log lỗi
    if results['failed']:
        with open('urlerror.txt', 'w') as f:
            for url, error in results['failed']:
                f.write(f"{url} | {error}\n")

def generate_report(results):
    """Tạo báo cáo tổng hợp"""
    total = len(results['proxies'])
    unique = len(OrderedDict.fromkeys(results['proxies']))
    
    report = [
        "📡 BÁO CÁO PROXY",
        f"▸ Tổng proxy trước khi lọc: {total}",
        f"▸ Đã loại bỏ {total - unique} proxy trùng lặp",
        f"▸ Proxy duy nhất sau lọc: {unique}",
        f"▸ URL thành công: {len(results['success'])}",
        f"▸ URL thất bại: {len(results['failed'])}",
    ]
    
    if results['failed']:
        report.append("\n🔴 URL LỖI:")
        for url, error in results['failed'][:5]:  # Giới hạn hiển thị 5 lỗi
            report.append(f"▸ {url[:50]}... | {error}")
    
    return '\n'.join(report)

def main():
    parser = argparse.ArgumentParser(description="Công cụ quét proxy tự động")
    parser.add_argument('-l', '--list', required=True, help="File chứa danh sách URL")
    args = parser.parse_args()

    while True:
        start_time = time.time()
        
        # Xử lý chính
        results = process_urls(args.list)
        unique_proxies = list(OrderedDict.fromkeys(results['proxies']))
        
        # Lưu kết quả
        with open('live.txt', 'w') as f:
            f.write('\n'.join(unique_proxies))
        
        update_url_lists(args.list, results)
        
        # Gửi báo cáo
        report = generate_report(results)
        send_file_to_telegram('live.txt', report)
        
        # Thống kê
        exec_time = time.time() - start_time
        print(f"⏳ Đã hoàn thành trong {exec_time:.2f}s")
        print(f"🕒 Chu kỳ tiếp theo sau 5 phút...")
        time.sleep(300)

if __name__ == "__main__":
    main()
