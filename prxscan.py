import requests
import re
from collections import OrderedDict
import telebot
import argparse
import time

# Cấu hình Telegram
TELEGRAM_BOT_TOKEN = '7819235807:AAEpCtPhIAAjTJYz0Efho35YZVl6ikAxKtc'
TELEGRAM_CHAT_ID = '1243471275'

# Cấu hình regex và timeout
PROXY_PATTERN = re.compile(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{1,5}\b')
REQUEST_TIMEOUT = 20
TELEGRAM_TIMEOUT = 60

def send_file_to_telegram(file_path, caption=""):
    """Gửi file qua Telegram với timeout mở rộng"""
    try:
        bot = telebot.TeleBot(TELEGRAM_BOT_TOKEN)
        with open(file_path, 'rb') as f:
            bot.send_document(
                chat_id=TELEGRAM_CHAT_ID,
                document=f,
                caption=caption[:1020] + '...' if len(caption) > 1024 else caption,
                timeout=TELEGRAM_TIMEOUT
            )
    except Exception as e:
        print(f"🔴 Lỗi Telegram: {str(e)}")

def fetch_proxies(url):
    """Lấy danh sách proxy từ URL với xử lý lỗi nâng cao"""
    try:
        response = requests.get(
            url, 
            timeout=REQUEST_TIMEOUT,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'}
        )
        
        if response.status_code != 200:
            return f"🔴 HTTP {response.status_code}", []
            
        proxies = PROXY_PATTERN.findall(response.text)
        return ("✅ Thành công", proxies) if proxies else ("🚫 Không có proxy", [])

    except requests.exceptions.Timeout:
        return "⏳ Timeout", []
    except requests.exceptions.RequestException as e:
        return f"🔴 Kết nối: {str(e)}", []
    except Exception as e:
        return f"🔴 Lỗi: {str(e)}", []

def process_urls(file_path):
    """Xử lý danh sách URL và phân loại kết quả"""
    with open(file_path, 'r') as f:
        urls = [line.strip() for line in f if line.strip()]

    results = {
        'success': [],
        'failed': [],
        'proxies': [],
        'total_time': 0.0
    }

    for url in urls:
        print(f"\n🔎 Đang quét: {url}")
        start = time.time()
        status, proxies = fetch_proxies(url)
        elapsed = time.time() - start

        if proxies:
            results['success'].append(url)
            results['proxies'].extend(proxies)
            print(f"🟢 {status} | {len(proxies)} proxy | ⏱️ {elapsed:.2f}s")
        else:
            results['failed'].append((url, status))
            print(f"🔴 {status} | ⏱️ {elapsed:.2f}s")

        print("━" * 60)
    
    return results

def update_url_lists(results):
    """Cập nhật file URL và ghi log lỗi"""
    # Ghi lại URL thành công
    with open(args.list, 'w') as f:
        f.write('\n'.join(results['success']))
    
    # Ghi log lỗi chi tiết
    if results['failed']:
        with open('urlerror.txt', 'w') as f:
            f.write("\n".join([f"{url} | {error}" for url, error in results['failed']]))

def generate_report(results, exec_time):
    """Tạo báo cáo định dạng Markdown"""
    total_proxies = len(results['proxies'])
    unique_proxies = list(OrderedDict.fromkeys(results['proxies']))
    
    report = [
        "📡 **BÁO CÁO PROXY**",
        f"• Proxy thu thập: `{total_proxies}`",
        f"• Proxy trùng lặp: `{total_proxies - len(unique_proxies)}`",
        f"• Proxy hợp lệ: `{len(unique_proxies)}`",
        f"• URL thành công: `{len(results['success'])}`",
        f"• URL thất bại: `{len(results['failed'])}`",
        f"\n⏳ Thời gian xử lý: `{exec_time:.2f}s`",
        f"🕒 Chu kỳ tiếp theo sau: `5 phút`"
    ]
    
    if results['failed']:
        report.append("\n🔴 **URL LỖI:**")
        report.extend([f"- `{url[:45]}...` | {error}" for url, error in results['failed'][:5]])
    
    return '\n'.join(report)

def main():
    global args
    parser = argparse.ArgumentParser(description="Công cụ quét proxy thông minh")
    parser.add_argument('-l', '--list', required=True, help="File chứa danh sách URL")
    args = parser.parse_args()

    while True:
        start_time = time.time()
        
        # Thực hiện quét
        results = process_urls(args.list)
        unique_proxies = list(OrderedDict.fromkeys(results['proxies']))
        
        # Lưu kết quả
        with open('live.txt', 'w') as f:
            f.write('\n'.join(unique_proxies))
        
        # Cập nhật danh sách
        update_url_lists(results)
        
        # Tạo và gửi báo cáo
        exec_time = time.time() - start_time
        report = generate_report(results, exec_time)
        send_file_to_telegram('live.txt', report)
        
        print(f"\n⏳ Tổng thời gian: {exec_time:.2f}s")
        print(f"🕒 Bắt đầu chu kỳ mới sau 5 phút...\n{'═' * 50}")
        time.sleep(300)

if __name__ == "__main__":
    main()
