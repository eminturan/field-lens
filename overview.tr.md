# Field Lens

Work item'larınızdan **herhangi bir tarih alanına** göre aylık rapor. Bir work item türü, bir Date/Time alanı (özel alanlar dahil) ve bir aralık seçersiniz. Field Lens tarihi o aralığa düşen kayıtları listeler, özetler ve dashboard'a taşır.

## Rapor sayfası

- **Filtreler**:
  - tek bir work item türü
  - görünen adı ya da referans adıyla aranabilen herhangi bir Date/Time alanı
  - bir ya da birkaç state
  - aralık: son 15 / 30 / 90 gün, bu ay, geçen ay ya da özel başlangıç–bitiş
- **İstediğiniz kolonlar**: görünen ad ya da referans adıyla arayın, sürükleyerek (ya da Alt + ←/→ ile) sıralayın.
- **Kuralla türetilen kolon**: bir alanın değerinin yalnızca bir kısmını yeni bir kolona alır. Örneğin `\b(ABC|XY)\b.*` kuralı "Deniz Arslan ABC Ödeme Hizmetleri" değerini "ABC Ödeme Hizmetleri" yapar. Canlı önizleme sonucu gösterir.
- **Rapor başlığı**: çalıştırdıktan sonra filtreler tek satıra iner ("Change raporu · Hedef tarih · 2026-10-01 – 2026-10-31 · 3 state"). Yanında Düzenle ve CSV bulunur.
- **Toplamlar**:
  - toplam ve önceki döneme göre fark (+/− %)
  - panodaki state renklerinde her state için bir kart; karta tıklayınca yalnızca o state gösterilir
- **Sonuç tablosu**:
  - tüm kolonlarda arama, kolon bazında filtre, başlığa tıklayarak sıralama
  - sayfa başına 100 satır, sabit başlık
  - rahat ya da sıkı satır görünümü
  - ID'ye tıklayınca kayıt açılır
- **CSV dışa aktarma**: o an görünen kayıtlar iner. Dosya UTF-8 olduğu için Excel Türkçe karakterleri bozmaz; ayırıcı arayüz diline göre `;` ya da `,` olur.
- Seçimleriniz hatırlanır.
- **Atanan** filtresi: herkes, bana atananlar ya da atanmamış.
- **Kayıtlı sorgular**: ayarları isim vererek kaydedin, aralarında geçiş yapın, güncelleyin, yeniden adlandırın ya da silin. **Projeyle paylaş** işaretlenirse projedeki herkes görür; yalnızca oluşturan düzenleyip silebilir. **Bağlantıyı kopyala** ile sorgu paylaşılır: bağlantı raporu o sorguyla, çalışmış olarak açar.

## Dashboard widget'ı

Widget kataloğundan **Field Lens**'i ekleyip ayarlarından görünümü seçin:

1. **Özet**: toplam ve önceki döneme göre fark. Tek başına, state'lere bölünmüş bir halka grafiktir. Bir **kırılım alanı** (sistem, atanan kişi…) seçilince her değer için bir yatay çubuk olur ve her çubuk state'lere bölünür. İsteğe bağlı bir kural, alanın değerini önce bir gruba çevirebilir; örneğin kişiyi birimine.
2. **Aylık trend**: son 3, 6 ya da 12 ay (ya da özel aralık), state'lere göre yığılmış.
3. **Haftalık**: seçilen aralıkta takvim haftası başına kayıt.
4. **Tarihe göre**: kayıt olan her gün için tarihiyle etiketlenmiş bir çubuk.
5. **Yaklaşanlar**: tarihi önümüzdeki 7 / 14 / 30 / 60 güne düşen kayıtlar, en yakın önce, bağlantılı.

"Geçen ay" gibi göreli aralıklar kullanırsanız dashboard kendiliğinden güncel kalır; isterseniz sabit bir özel aralık da seçebilirsiniz. Widget'ı farklı görünümlerle birkaç kez ekleyerek bir rapor sayfası kurabilirsiniz. **Raporu aç** bağlantısı tam rapora götürür. Widget, projeyle paylaşılmış bir kayıtlı sorguyu da kullanabilir; böylece filtreler tek yerde tanımlanır.

## Nerede

Bir proje açın → **Boards** → **Field Lens**. Widget: **Dashboards → Edit → Add a widget**.

## Sürüm notları

**0.2.14**: atanan filtresi, sorgu bağlantıları ve kayıtlı sorguyu kullanan widget'lar.

**0.2.13**: kişisel ya da projeyle paylaşılan kayıtlı sorgular.

**0.2.12**: Ayarları sıfırla düğmesi rapor sayfasındaki tüm ayarları tek seferde temizliyor.

**0.2.11**: tarayıcıyı dondurabilecek kurallar kabul edilmiyor.

**0.2.10**: örnek veri ve belge örnekleri uydurma adlar kullanıyor.

**0.2.9**: grafik tarihleri sığmadığında çapraz yazılıyor, hiçbir tarih atlanmıyor.

**0.2.8**: kırılım alanlı Özet, state'lere bölünmüş yatay çubuklar olarak çiziliyor.

**0.2.7**: rapor sayfasında kuralla (regex) türetilen kolon, aynı kuralın widget kırılımında kullanımı ve canlı önizleme.

**0.2.6**: widget Özet görünümü halka grafik oldu ve isteğe bağlı kırılım alanı eklendi. Haftalara göre grafik rapor sayfasından kaldırıldı.

**0.2.5**: sürüm notları İngilizce ve Türkçe.

**0.2.4**: Marketplace sayfası ve README İngilizce ve Türkçe.

**0.2.3**:
- Yeni **Tarihe göre** widget görünümü.
- Dağılım görünümü kaldırıldı.
- Haftalık grafikler tarih aralığıyla etiketlenen pazartesi–pazar haftalarını kullanıyor.
- Kalabalık grafikler okunur kalıyor.

**0.2.2**: widget'ta özel başlangıç–bitiş aralığı.

**0.2.0**: Özet, Aylık trend, Haftalık ve Yaklaşanlar görünümleriyle dashboard widget'ı.

**0.1.10**:
- Rapor başlığı.
- Önceki dönemle karşılaştırma.
- Haftalara göre grafik.
- Sıkı satır görünümü.

**0.1.7**: arama, kolon filtreleri ve sıralama.

**0.1.6**: pano renklerinde state özet kartları.

Tüm geçmiş: [CHANGELOG.tr.md](https://github.com/eminturan/field-lens/blob/main/CHANGELOG.tr.md) · [English](https://github.com/eminturan/field-lens/blob/main/CHANGELOG.md)

## Yetkiler

Yalnızca okuma: `vso.work`.

Türkçe ve İngilizce arayüz; Azure DevOps temasına uyar. Azure DevOps Server 2022 için geliştirildi.
