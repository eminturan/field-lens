# Field Lens

**Herhangi bir tarih alanına** göre aylık rapor hazırlayan Azure DevOps Server 2022 eklentisi. Bir work item türünün, seçilen Date/Time alanı belirli bir aralığa düşen kayıtlarını listeler, özetler, CSV olarak dışa aktarır ve dashboard'a taşır.

[English](README.md)

## Rapor sayfası

Bir proje açın → **Boards** → **Field Lens**.

### Filtreler

| Filtre | Ayrıntı |
| --- | --- |
| **Work item türü** | Tek tür. Ekip tek bir kart türüne bakar. |
| **Tarih alanı** | Özel alanlar dahil herhangi bir Date/Time alanı (örneğin `Custom.TargetDate`). Görünen ad ya da referans adıyla aranır; hiçbir alan sabit yazılmaz. |
| **Aralık** | Son 15 / 30 / 90 gün, bu ay, geçen ay ya da özel başlangıç–bitiş. İki uç da dahildir. |
| **State** | Bir ya da birkaç. Kaydın **şu anki** state'i bunlardan biriyse sayılır. |
| **Kolonlar** | İstenen alanlar. Görünen ad (büyük) ya da referans adıyla (küçük) aranır. Etiketi sürükleyerek ya da Tab ile seçip Alt + ←/→ ile sıralanır. |

Seçilen tarih alanı kolonlara kendiliğinden eklenir. Seçimler kullanıcı başına saklanır (Extension Data Service, kullanıcı kapsamı) ve sonraki açılışta geri gelir. Artık var olmayan tür ya da alanlar atlanır.

### Sonuçlar

- **Çalıştır**'dan sonra filtreler tek satırlık bir rapor başlığına iner; **Düzenle** onları yeniden açar. Sorgu sürerken gri yer tutucular görünür.
- **Toplam** kartı **önceki dönemle** karşılaştırılır:
  - Aralık tam bir takvim ayıysa önceki dönem bir önceki aydır.
  - Değilse, aralıktan hemen önceki aynı uzunlukta dönemdir.
  - Kartın üzerine gelince tarihler görünür.
  - Arama ya da kolon filtresi açıkken karşılaştırma gizlenir.
- **State kartları** panodaki state renklerini kullanır. Bir karta tıklayınca tabloda ve CSV'de yalnızca o state kalır.
- **Tablo**:
  - tüm kolonlarda arama, her başlığın altında filtre kutusu, başlığa tıklayarak sıralama (artan → azalan → kapalı)
  - sayfa başına 100 satır, sabit başlık
  - rahat ya da sıkı satır görünümü
  - uzun hücreler kendi içinde kaydırılır
  - ID'ye tıklayınca kayıt açılır
- Metin filtreleri state kartlarını da günceller.

### CSV dışa aktarma

**CSV indir**, o an görünen kayıtların tamamını indirir (state kartı, arama ve kolon filtreleri uygulanmış halde); yalnızca ekrandaki sayfayı değil. Filtre açıkken düğmede satır sayısı yazar.

- Dosya UTF-8 (BOM'lu) olduğu için Excel Türkçe karakterleri doğru okur.
- Ayırıcı Türkçe arayüzde `;`, İngilizce arayüzde `,` olur.
- `=`, `+`, `-` ya da `@` ile başlayan hücrelerin başına `'` eklenir; Excel bunları formül olarak çalıştırmaz.
- Dosya adı: `field-lens_<tür>[_<state>]_<başlangıç>_<bitiş>.csv`.

## Dashboard widget'ı

Dashboard'da **Edit → Add a widget → Field Lens**, ardından ayarlar için düzenle simgesi. Ayarlar widget'a kaydedilir ve dashboard'u açan herkes aynı görünümü görür.

| Görünüm | Gösterdiği | Aralık ayarı |
| --- | --- | --- |
| **Özet** | Ortasında toplam yazan halka, önceki döneme göre fark ve sayılarla yüzdeleri gösteren açıklama. State'lere ya da isteğe bağlı **kırılım alanına** göre bölünür (en büyük 7 değer ve "Diğer"; boş değerler "(boş)") | Göreli aralık ya da özel |
| **Aylık trend** | Her takvim ayı için yığılmış bir çubuk | Son 3 / 6 / 12 ay ya da özel |
| **Haftalık** | Her pazartesi–pazar haftası için `13–19.10` etiketli bir çubuk | Göreli aralık ya da özel |
| **Tarihe göre** | Kayıt olan her gün için tarihiyle etiketlenmiş bir çubuk | Göreli aralık ya da özel |
| **Yaklaşanlar** | Tarihi bugünden önümüzdeki 7 / 14 / 30 / 60 güne düşen kayıtlar, en yakın önce; en fazla 100 kayıt listelenir, ID kaydı açar | Her zaman bugünden itibaren |

- Diğer ayarlar work item türü, tarih alanı ve state'lerdir. State'ler önceden seçili gelmez, siz seçersiniz.
- Göreli aralıklar takvimle birlikte ilerler; "Geçen ay" ayarlı bir dashboard hep güncel kalır. Özel aralık sabittir.
- Widget 2–6 sütun genişliğinde, 1–4 satır yüksekliğinde olabilir ve grafikler boyuta göre ölçeklenir. Çubuklar daraldığında sayılar fareyle üzerine gelince çıkan ipucuna taşınır; tarih etiketleri üst üste binmesin diye aralıklı yazılır.
- **Raporu aç** bağlantısı Field Lens sayfasını açar. Widget'taki filtreleri sayfaya taşımaz.

## Sınırlar ve hesaplama

- Tek bir sorgu en fazla 20.000 kayıt döndürür. Bu sınıra ulaşılırsa listenin eksik olabileceği uyarısı çıkar.
- Önceki dönem sayısı yalnızca sayım yapan ayrı bir sorguyla alınır; başarısız olursa karşılaştırma gösterilmez.
- Tarihler gün bazında karşılaştırılır. Grafikler değerleri tarayıcının yerel gününe göre gruplar.
- Yalnızca okuma yapar; tek yetki `vso.work`.

## Geliştirme

```bash
npm install
npm run dev        # örnek veriyle, ?lang=tr|en
                   # rapor sayfası:  http://localhost:3003/hub/hub.html
                   # widget:         http://localhost:3003/report-widget/report-widget.html?view=summary|trend|weekly|daily|upcoming
                   # widget ayarları: http://localhost:3003/report-config/report-config.html
npm test
npm run package    # out/turanemin.field-lens-<sürüm>.vsix
```

Her paketten önce `package.json`, `package-lock.json` ve `vss-extension.json` içindeki `version` artırılır. Her sürümde `CHANGELOG.md` ile `CHANGELOG.tr.md` dosyalarına ve `overview.md` ile `overview.tr.md` içindeki "Sürüm notları / Release notes" bölümlerine bir giriş eklenir. Yüklemek için: Collection Settings → Extensions → Browse local extensions → Manage extensions → Upload extension.

Klasörler:

- `src/hub/`: rapor sayfası. Aşağıdaki modülleri widget da kullanır.
  - `logic.ts`: birim testli saf fonksiyonlar
  - `api.ts`: REST, api-version 7.0
  - `chart.tsx`
  - `fieldPicker.tsx`
  - `i18n.ts`
- `src/widget/`: dashboard widget'ı ve ayar paneli.

## Sunucuda doğrulanacaklar

- Seçimlerin Extension Data Service ile kaydedilip geri gelmesi.
- Gerçek tarih alanıyla ay sonuna denk gelen bir aralıkta bitiş gününün dahil olması.
- Saat dilimi: WIQL tarihleri sunucuda karşılaştırır, grafikler ise tarayıcının gününe göre gruplar. Gece yarısına yakın kayıtlar komşu güne düşebilir.
- Widget: katalogda görünmesi, ayar paneli, canlı önizleme ve Kaydet'ten sonra ayarların kalması.
- **Raporu aç** bağlantısı (`/<proje>/_apps/hub/turanemin.field-lens.hub`).

## Lisans

[MIT](LICENSE). Sürüm notları: [CHANGELOG.tr.md](CHANGELOG.tr.md).
