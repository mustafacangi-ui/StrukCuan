from llmlingua import PromptCompressor
import sys
import os

compressor = PromptCompressor(
    model_name="gpt2",
    use_llmlingua2=False,
    device_map="cpu"
)

# Varsayılan sıkıştırma oranı
RATE = 0.35

if len(sys.argv) < 2:
    print("Kullanım: python compress.py dosya_adi.txt")
    sys.exit(1)

filename = sys.argv[1]

if not os.path.exists(filename):
    print(f"Dosya bulunamadı: {filename}")
    sys.exit(1)

with open(filename, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

try:
    compressed = compressor.compress_prompt(
        content,
        rate=RATE
    )

    output_text = compressed["compressed_prompt"]

    output_file = f"compressed_{os.path.basename(filename)}"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(output_text)

    original_length = len(content.split())
    compressed_length = len(output_text.split())

    print(f"Orijinal kelime sayısı: {original_length}")
    print(f"Sıkıştırılmış kelime sayısı: {compressed_length}")
    print(f"Tahmini küçülme oranı: %{round((1 - compressed_length / original_length) * 100, 1)}")
    print(f"Çıktı dosyası oluşturuldu: {output_file}")

except Exception as e:
    print(f"Hata oluştu: {e}")