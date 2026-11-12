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
| **Projeler** | **Bu proje** (varsayılan), görebildiğiniz **Tüm projeler** ya da aranabilir listeden **Seçili projeler**. Proje-arası kapsamda türler ve state'ler kapsamdaki projelerden birleştirilir (state rengi o state'i içeren ilk projeden gelir), ID'nin arkasına **Team Project** kolonu eklenir ve ID kaydı kendi projesinde açar. Sonuçlar yetkilerinize göre gelir. |
| **Atanan** | Herkes (varsayılan), **Bana atananlar** (raporu çalıştıran kişi, `@Me`) ya da **Atanmamış**. "Bana atananlar" ayarlı paylaşılan bir sorgu herkese kendi kayıtlarını gösterir. |
| **Kolonlar** | İstenen alanlar. Görünen ad (büyük) ya da referans adıyla (küçük) aranır. Etiketi sürükleyerek ya da Tab ile seçip Alt + ←/→ ile sıralanır. |

Seçilen tarih alanı kolonlara kendiliğinden eklenir. Seçimler kullanıcı başına saklanır (Extension Data Service, kullanıcı kapsamı) ve sonraki açılışta geri gelir. Artık var olmayan tür ya da alanlar atlanır. **Ayarları sıfırla** (Çalıştır satırının sağında, onay için iki kez tıklanır) her şeyi tek seferde temizler: tür, tarih alanı, aralık, state'ler, kolonlar, kural ve satır görünümü varsayılana döner, hatırlanan son seçimler silinir; kayıtlı sorgulara dokunulmaz.

### Kayıtlı sorgular

Filtre panelinin üstündeki **Kayıtlı sorgu** çubuğu:

- **Farklı kaydet**: formdaki ayarları (tür, tarih alanı, aralık, state'ler, kolonlar, kural) isim vererek kaydeder. Ad boş olamaz, en fazla 80 karakterdir ve aynı adda iki sorgu olamaz (büyük/küçük harf farkı gözetilmez).
- Listeden bir sorgu seçince ayarları forma yüklenir; rapor için **Çalıştır**'a basılır. Göreli aralıklar (örneğin "Geçen ay") açıldığı güne göre hesaplanır, özel aralık sabittir.
- Form seçili sorgudan farklılaşınca yanında **değişti** yazar; **Kaydet** sorguyu günceller. **Yeniden adlandır** ve **Sil** (onaylı) da buradadır.
- **Projeyle paylaş** (yalnızca kaydederken): işaretlenmezse sorgu kullanıcı kapsamında saklanır ve yalnızca size görünür. İşaretlenirse proje başına ayrı bir ortak koleksiyona yazılır ve projedeki herkes görür. Listede "Sorgularım" ve "Proje sorguları" ayrı gruplanır; başkasının sorgusunun yanında oluşturanın adı yazar.
- Paylaşılan bir sorguyu yalnızca oluşturan güncelleyip yeniden adlandırabilir ve silebilir; diğerleri **Farklı kaydet** ile kendi kopyasını alır. Bu bir **arayüz kısıtıdır**: Extension Data Service sahiplik denetlemez. Ortak listeden okunan her sorgu doğrulanır (beklenmedik alanlar atılır, kurallar ve alanlar normal denetimlerden geçer).
- İki kişi aynı sorguyu aynı anda kaydederse ikincisi uyarı alır ve liste yenilenir (belge sürümü, `__etag`).
- **Bağlantıyı kopyala** seçili sorgunun bağlantısını panoya koyar (tarayıcı engellerse bağlantı elle kopyalanmak üzere gösterilir). Bağlantıyı açan kişi için sorgu yüklenir ve rapor çalışır. Kişisel sorgunun bağlantısı yalnızca sahibi için çalışır; silinmiş ya da paylaşılmamış bir sorgunun bağlantısı bunu söyler.
- **Ayarları sıfırla** kayıtlı sorgulara dokunmaz.

### Kuralla türetilen kolon

**Kuralla türetilen kolon** bölümünde bir kaynak alan seçilir, bir kural (JavaScript düzenli ifadesi, regex) ve kolon adı yazılır.

- Yeni kolona, kaynak alanın **görünen** değerinde kurala uyan ilk kısım yazılır. Kişi (identity) alanlarında bu görünen addır.
- Eşleşmeyen değerler `(eşleşmedi)` olarak görünür, boş değerler boş kalır.
- Örnek: `\b(ABC|XY)\b.*` kuralı ABC ya da XY kelimesinden başlayıp sonuna kadar olan kısmı alır; "Deniz Arslan ABC Ödeme Hizmetleri" değeri "ABC Ödeme Hizmetleri" olur.
- Çalıştırdıktan sonra önizleme, kuralı en fazla altı gerçek değer üzerinde gösterir. Geçersiz kuralda hata yazılır ve kural düzelene kadar kolon raporda yer almaz. `(a+)+` gibi iç içe tekrarlar tarayıcıyı dondurabileceği için kabul edilmez; kural bir değerin yalnızca ilk 500 karakterine bakar.
- Kolon tarayıcıda hesaplanır (sunucudan kaynak alan istenir). Kolonda arama, filtre ve sıralama yapılabilir; kolon CSV'ye girer ve seçimlerle birlikte saklanır.

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
| **Özet** | Toplam ve önceki döneme göre fark. Kırılım alanı yoksa: state'lere bölünmüş, sayı ve yüzdeli halka. İsteğe bağlı **kırılım alanı** seçilirse: her değer için bir yatay çubuk, en büyük önce, her biri state'lere bölünmüş (boş değerler "(boş)", uzun listeler kayar). Kırılım önce bir kuraldan geçirilebilir (türetilen kolonla aynı yazım); ayarlarda canlı önizleme vardır | Göreli aralık ya da özel |
| **Aylık trend** | Her takvim ayı için yığılmış bir çubuk | Son 3 / 6 / 12 ay ya da özel |
| **Haftalık** | Her pazartesi–pazar haftası için `13–19.10` etiketli bir çubuk | Göreli aralık ya da özel |
| **Tarihe göre** | Kayıt olan her gün için tarihiyle etiketlenmiş bir çubuk | Göreli aralık ya da özel |
| **Yaklaşanlar** | Tarihi bugünden önümüzdeki 7 / 14 / 30 / 60 güne düşen kayıtlar, en yakın önce; en fazla 100 kayıt listelenir, ID kaydı açar | Her zaman bugünden itibaren |

- **Kaynak**: widget'ın kendi ayarları ya da projeyle paylaşılmış bir kayıtlı sorgu. Sorgu seçilirse projeler, tür, tarih alanı, state'ler, atanan ve (Özet, Haftalık, Tarihe göre için) aralık sorgudan gelir ve sorgu değiştikçe güncellenir; Aylık trend ay sayısını, Yaklaşanlar gün sayısını korur. Sorgu silinirse widget bunu yazar.
- Kendi ayarlarıyla diğer ayarlar work item türü, tarih alanı ve state'lerdir. State'ler önceden seçili gelmez, siz seçersiniz.
- Göreli aralıklar takvimle birlikte ilerler; "Geçen ay" ayarlı bir dashboard hep güncel kalır. Özel aralık sabittir.
- Widget 2–6 sütun genişliğinde, 1–4 satır yüksekliğinde olabilir ve grafikler boyuta göre ölçeklenir. Çubuklar daraldığında sayılar fareyle üzerine gelince çıkan ipucuna taşınır ve tarih etiketleri 45° çapraz yazılır. Etiketler yalnızca çubuklar çok daraldığında (uzun bir aralık, tarihe göre) aralıklı yazılır.
- **Raporu aç** bağlantısı Field Lens sayfasını açar. Kayıtlı sorguya bağlı widget'ta o sorguyu açıp çalıştırır; kendi ayarlı widget'ta filtreler sayfaya taşınmaz.

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
- Kayıtlı sorgular: ortak koleksiyonun ilk okumada boş liste vermesi, başka bir kullanıcının paylaşılan sorguyu görmesi ama düzenleyememesi, eşzamanlı kaydetmede uyarı.
- Gerçek tarih alanıyla ay sonuna denk gelen bir aralıkta bitiş gününün dahil olması.
- Saat dilimi: WIQL tarihleri sunucuda karşılaştırır, grafikler ise tarayıcının gününe göre gruplar. Gece yarısına yakın kayıtlar komşu güne düşebilir.
- Widget: katalogda görünmesi, ayar paneli, canlı önizleme ve Kaydet'ten sonra ayarların kalması.
- **Raporu aç** bağlantısı (`/<proje>/_apps/hub/turanemin.field-lens.hub`) ve sorgu bağlantıları (`…hub?query=<id>`): sayfa `query` parametresini alabilmeli.
- **Bana atananlar** (`@Me`) raporu çalıştıran kişiye çözülmeli.
- Proje-arası: proje listesi (`_apis/projects`), birleştirilen türler ve state'ler, başka projedeki kayıtlara bağlantılar.

## Lisans

[MIT](LICENSE). Sürüm notları: [CHANGELOG.tr.md](CHANGELOG.tr.md).
