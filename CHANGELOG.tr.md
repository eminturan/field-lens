# Sürüm notları

[English](CHANGELOG.md)

## 0.2.16

- Düzeltme: aramalar büyük/küçük harfi tam yok saymıyordu. Türkçe küçük harfe çevirmede "I" harfi "ı" olduğu için "GIT.BOA" ile "git.boa" eşleşmiyordu. Proje araması, alan araması, sonuç filtreleri ve aynı ad kontrolü artık I, ı, İ ve i'yi aynı sayıyor.

## 0.2.15

- Rapor sayfası: projeler arası sorgu için **Projeler** filtresi: bu proje (varsayılan), görebildiğiniz tüm projeler ya da aranabilir listeden seçili projeler. Türler ve state'ler kapsamdaki projelerden birleştirilir, Team Project kolonu eklenir ve ID'ler kaydı kendi projesinde açar. Kapsam kayıtlı sorgulara ve sorgu bağlantılarına girer.
- Widget: kayıtlı sorguya bağlı widget sorgunun projelerini de alır.

## 0.2.14

- Rapor sayfası: **Atanan** filtresi (herkes, `@Me` ile bana atananlar, atanmamış). Kayıtlı sorgulara girer; böylece tek bir paylaşılan sorgu herkese kendi kayıtlarını gösterir.
- Kayıtlı sorgular: **Bağlantıyı kopyala**. Bağlantı rapor sayfasını sorgu yüklenmiş ve çalışmış olarak açar. Silinmiş ya da paylaşılmamış bir sorgunun bağlantısı mesaj gösterir.
- Widget: **Kaynak** ayarı. Projeyle paylaşılmış bir kayıtlı sorgu seçilirse widget türü, tarih alanı, state'leri, atanan filtresini ve (Özet, Haftalık, Tarihe göre için) aralığı sorgudan alır, sorgudaki sonraki değişiklikleri de izler. **Raporu aç** o sorguyu açar.

## 0.2.13

- Rapor sayfası: **kayıtlı sorgular**. Formdaki ayarları isim vererek kaydedin, kayıtlı sorgular arasında geçiş yapın, güncelleyin, yeniden adlandırın ya da silin. **Projeyle paylaş** işaretlenmezse sorgu kişiseldir; paylaşılanları projedeki herkes görür, yalnızca oluşturan düzenleyip silebilir (arayüz kısıtı). Paylaşılan sorgular okunurken doğrulanır, eşzamanlı kaydetmede uyarı çıkar.

## 0.2.12

- Rapor sayfası: Çalıştır satırının sağında **Ayarları sıfırla** düğmesi. İlk tık onay ister; ikincisi türü, tarih alanını, aralığı, state'leri, kolonları, kuralı, sonuçları ve satır görünümünü temizler, kayıtlı seçimleri siler.

## 0.2.11

- Güvenlik: kurallar (türetilen kolon ve widget kırılımı) `(a+)+` gibi iç içe tekrarları kabul etmiyor; bunlar panoyu açan herkesin tarayıcısını dondurabilirdi. Kural bir değerin yalnızca ilk 500 karakterine bakar. Böyle bir kuralla kaydedilmiş widget yeniden ayarlanmak ister.
- Derleme: paketleme aracının `glob` bağımlılığı bilinen açığı olmayan bir sürüme sabitlendi (`npm audit`: 0).

## 0.2.10

- Örnek veri ve belgelerdeki örnekler artık uydurma kişi, birim ve alan adları kullanıyor.

## 0.2.9

- Widget grafikleri (Tarihe göre, Haftalık, Aylık trend): tarih etiketleri yan yana sığmadığında 45° çapraz yazılıyor, böylece her çubuğun tarihi görünüyor. Önceden etiketler birer atlanıyordu. İlk etiket artık sol kenardan kesilmiyor.
- Grafiklerin altındaki açıklamanın altında biraz daha boşluk var.

## 0.2.8

- Widget, kırılım alanı seçili **Özet**: artık her değer için bir **yatay çubuk** olarak, en büyük önce çiziliyor. Her çubuk seçili state'lere, panodaki renkleriyle bölünüyor; çubuğun üzerine gelince state başına sayılar görünüyor. Bütün değerler gösteriliyor ("Diğer" yok), uzun listeler widget içinde kayıyor. Kırılım alanı yoksa Özet, state'lere bölünmüş halka grafik olarak kalıyor.

## 0.2.7

- Rapor sayfası: **kuralla türetilen kolon**. Bir kaynak alan seçip bir kural (regex) ve kolon adı yazarsınız. Yeni kolona, alanın görünen değerinde kurala uyan ilk kısım yazılır. Örneğin `\b(ABC|XY)\b.*` kuralı "Deniz Arslan ABC Ödeme Hizmetleri" değerini "ABC Ödeme Hizmetleri" yapar. Eşleşmeyen değerler "(eşleşmedi)" olarak görünür, boş değerler boş kalır.
  - Kolonda arama, filtre ve sıralama yapılabilir; kolon CSV'ye girer ve seçimlerle birlikte saklanır.
  - Çalıştırdıktan sonra canlı önizleme, kuralı gerçek değerler üzerinde gösterir. Geçersiz kural bildirilir ve düzeltilene kadar kolon raporda yer almaz.
- Widget, **Özet**: kırılım alanına isteğe bağlı kural. Böylece halka grafik kişiye göre değil birime göre bölünebilir. Ayar panelinde, widget'ın kendi filtreleriyle canlı önizleme gösterilir.

## 0.2.6

- Widget, **Özet** görünümü: ortasında toplam yazan bir **halka grafik** ve sayılarla yüzdeleri gösteren bir açıklama. State çubuğunun yerini aldı.
- Widget, **Özet** görünümü: isteğe bağlı **kırılım alanı**. Boşsa halka state'lere göre bölünür. Bir alan seçilirse seçili state'lerdeki kayıtlar o alanın değerlerine göre sayılır: en büyük 7 değer ayrı gösterilir, kalanlar "Diğer"de toplanır, boş değerler "(boş)" olarak görünür.
- Rapor sayfası: haftalara göre grafik kaldırıldı. Haftalık görünüm widget'ta duruyor.

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
