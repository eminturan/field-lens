# Field Lens

Work item'larınızdan **herhangi bir tarih alanına** göre aylık rapor. Bir work item türü, bir Date/Time alanı (özel alanlar dahil) ve bir aralık seçersiniz. Field Lens tarihi o aralığa düşen kayıtları listeler, özetler ve dashboard'a taşır.

## Rapor sayfası

- **Filtreler**:
  - tek bir work item türü
  - görünen adı ya da referans adıyla aranabilen herhangi bir Date/Time alanı
  - bir ya da birkaç state
  - aralık: son 15 / 30 / 90 gün, bu ay, geçen ay ya da özel başlangıç–bitiş
- **İstediğiniz kolonlar**: görünen ad ya da referans adıyla arayın, sürükleyerek (ya da Alt + ←/→ ile) sıralayın.
- **Rapor başlığı**: çalıştırdıktan sonra filtreler tek satıra iner ("Change raporu · Hedef tarih · 2026-10-01 – 2026-10-31 · 3 state"). Yanında Düzenle ve CSV bulunur.
- **Toplamlar**:
  - toplam ve önceki döneme göre fark (+/− %)
  - panodaki state renklerinde her state için bir kart; karta tıklayınca yalnızca o state gösterilir
- **Haftalara göre grafik**: pazartesi–pazar haftaları, state'lere göre yığılmış.
- **Sonuç tablosu**:
  - tüm kolonlarda arama, kolon bazında filtre, başlığa tıklayarak sıralama
  - sayfa başına 100 satır, sabit başlık
  - rahat ya da sıkı satır görünümü
  - ID'ye tıklayınca kayıt açılır
- **CSV dışa aktarma**: o an görünen kayıtlar iner. Dosya UTF-8 olduğu için Excel Türkçe karakterleri bozmaz; ayırıcı arayüz diline göre `;` ya da `,` olur.
- Seçimleriniz hatırlanır.

## Dashboard widget'ı

Widget kataloğundan **Field Lens**'i ekleyip ayarlarından görünümü seçin:

1. **Özet**: toplam, önceki döneme göre fark ve her state'in payı.
2. **Aylık trend**: son 3, 6 ya da 12 ay (ya da özel aralık), state'lere göre yığılmış.
3. **Haftalık**: seçilen aralıkta takvim haftası başına kayıt.
4. **Tarihe göre**: kayıt olan her gün için tarihiyle etiketlenmiş bir çubuk.
5. **Yaklaşanlar**: tarihi önümüzdeki 7 / 14 / 30 / 60 güne düşen kayıtlar, en yakın önce, bağlantılı.

"Geçen ay" gibi göreli aralıklar kullanırsanız dashboard kendiliğinden güncel kalır; isterseniz sabit bir özel aralık da seçebilirsiniz. Widget'ı farklı görünümlerle birkaç kez ekleyerek bir rapor sayfası kurabilirsiniz. **Raporu aç** bağlantısı tam rapora götürür.

## Nerede

Bir proje açın → **Boards** → **Field Lens**. Widget: **Dashboards → Edit → Add a widget**.

## Yetkiler

Yalnızca okuma: `vso.work`.

Türkçe ve İngilizce arayüz; Azure DevOps temasına uyar. Azure DevOps Server 2022 için geliştirildi.
