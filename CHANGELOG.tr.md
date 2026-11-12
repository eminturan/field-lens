# Sürüm notları

[English](CHANGELOG.md)

## 0.2.5

- Sürüm notları İngilizce (`CHANGELOG.md`) ve Türkçe (`CHANGELOG.tr.md`) olarak eklendi. Marketplace sayfası ve README'ler bu dosyalara bağlantı veriyor.

## 0.2.4

- Marketplace sayfası İngilizce (`overview.md`) ve Türkçe (`overview.tr.md`) olarak hazırlandı.
- README yeniden yazıldı ve Türkçesi (`README.tr.md`) eklendi.

## 0.2.3

- Widget: yeni **Tarihe göre** görünümü eklendi. Kayıt olan her gün için, tarihiyle etiketlenmiş bir çubuk çizer.
- Widget: **Dağılım** görünümü kaldırıldı. Bu görünüme ayarlanmış widget yeniden ayarlanmak ister.
- Rapor sayfasında ve widget'ta haftalık grafikler artık pazartesi–pazar takvim haftalarını kullanıyor ve tarih aralığıyla etiketleniyor (`13–19.10`). Önceden haftalar aralığın ilk gününden sayılıyor, etikette yalnızca ilk gün yazıyordu.
- Dar çubukların üstündeki sayılar gizlenir; sayı, çubuğun üzerine gelince yine görünür. Tarih etiketleri üst üste binmesin diye aralıklı yazılır ve kenardaki etiketler artık kesilmez.

## 0.2.2

- Widget: Özet, Haftalık ve Aylık trend için özel başlangıç–bitiş aralığı. Başlangıç bitişten sonraysa ayar kaydedilemez.

## 0.2.1

- Widget: ayarlarda state'ler artık önceden seçili gelmiyor; siz seçiyorsunuz.

## 0.2.0

- **Dashboard widget'ı** eklendi. Ayarlarından görünüm seçilir: Özet, Aylık trend, Haftalık, Dağılım ya da Yaklaşanlar. Her görünümün türü, tarih alanı, state'leri ve göreli aralığı kendi ayarlarındadır. Widget 2–6 sütun genişliğinde, 1–4 satır yüksekliğinde olabilir ve bir **Raporu aç** bağlantısı vardır.
- Grafik, rapor sayfası ile widget arasında ortak kullanılıyor.

## 0.1.12

- "En yoğun gün" kartı kaldırıldı.

## 0.1.11

- Toplam kartının üzerine gelince önceki dönemin tarihleri görünüyor.

## 0.1.10

- Çalıştırdıktan sonra filtreler, Düzenle ve CSV düğmeleriyle birlikte tek satırlık bir **rapor başlığına** iner.
- **Toplam** kartı **önceki dönemle** karşılaştırılır. Aralık tam bir takvim ayıysa önceki ayla, değilse aralıktan hemen önceki aynı uzunluktaki dönemle.
- State'lere göre yığılmış **haftalara göre grafik**.
- Tarayıcıda hatırlanan **rahat / sıkı** satır görünümü.

## 0.1.9

- Sorgu sürerken gri yer tutucular gösteriliyor.

## 0.1.8

- Filtre açıkken CSV düğmesi indireceği satır sayısını gösteriyor.

## 0.1.7

- Tüm kolonlarda **arama**, her kolon başlığının altında **filtre kutusu** ve başlığa tıklayarak **sıralama** (artan → azalan → kapalı). Metin filtreleri state kartlarını da günceller.

## 0.1.6

- Panodaki state renklerinde **state özet kartları**. Bir karta tıklayınca tabloda ve CSV'de yalnızca o state kalır.
- Tabloda renkli state noktaları, filtre paneli, sabit tablo başlığı ve vurgulu Çalıştır düğmesi.

## 0.1.5

- Kolonlar sürükleyerek ya da kolon seçiliyken Alt + ←/→ ile yeniden sıralanabiliyor.

## 0.1.4 ve öncesi

Boards altındaki rapor sayfasının ilk sürümü:

- Tek bir work item türü, aranabilen herhangi bir Date/Time alanı (hiçbir alan sabit yazılmaz), bir ya da birkaç state ve bir aralık: son 15 / 30 / 90 gün, bu ay, geçen ay ya da özel. Aralığın iki ucu da dahildir.
- İstenen kolonlar; görünen ad (büyük) ya da referans adıyla (küçük) aranır.
- Sayfa başına 100 satır. Uzun hücreler sabit yükseklikteki satırın içinde kaydırılır.
- Excel için CSV: UTF-8 (BOM'lu), dile göre `;` ya da `,` ayırıcı ve formül koruması.
- Seçimler kullanıcı başına saklanır.
- Türkçe ve İngilizce arayüz.
