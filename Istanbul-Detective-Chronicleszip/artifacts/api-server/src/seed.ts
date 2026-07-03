import { db, casesTable, caseStepsTable, usersTable } from "@workspace/db";
import { count, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logger } from "./lib/logger";
import bcrypt from "bcryptjs";

interface Suspect {
  id: string;
  name: string;
  bio: string;
  motive: string;
  alibi: string;
  isCulprit: boolean;
  culpritClue?: string; // shown only to culprit at reveal
}

const SEED_CASES = [
  {
    id: "case-galata-001",
    codeTitle: "KS-001: Kule Altındaki Gölge",
    title: "Galata Kulesi'nin Sırrı",
    description: "Galata Kulesi'nin yakınında gizemli bir ölüm. Bir tüccarın cesedi kule eteklerinde bulundu. Tanıklar gece boyunca garip ışıklar gördüğünü söylüyor.",
    city: "İstanbul",
    district: "Galata",
    difficulty: "kolay",
    category: "cinayet",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 0,
    suspects: [
      { id: "s1", name: "Kemal Aydın", bio: "Antika tüccarı, maktulün iş ortağı", motive: "Sahte antika anlaşmazlığı", alibi: "Kapalıçarşı'daki dükkânında olduğunu iddia ediyor", isCulprit: false },
      { id: "s2", name: "Neslihan Çevik", bio: "Galata kulesi rehberi", motive: "Tarihi eserlerin kaçakçılığına karışmış", alibi: "Gece turunda müşterileriyle birlikte", isCulprit: false },
      { id: "s3", name: "Rıfat Doğan", bio: "Emekli polis, özel dedektif", motive: "Maktulün kara para aklamasını biliyordu", alibi: "Belirsiz", isCulprit: true, culpritClue: "Rıfat'ın parmak izi kule kapısında bulundu. Para transferleri onu işaret ediyor." },
      { id: "s4", name: "Ayşe Tunç", bio: "Yerel gazeteci", motive: "Büyük bir yolsuzluk haberini kapatmak", alibi: "Redaksiyonda çalışıyor", isCulprit: false },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "location",
        title: "Olay Yeri İncelemesi",
        description: "Galata Kulesi'nin önüne gidin ve çevreyi inceleyin. Dedektifin ilk görevi olay yerini fotoğraflamaktır.",
        targetLat: 41.025,
        targetLng: 28.9736,
        targetRadiusM: 300,
        requiredMatchPct: 60,
        hint: "Galata Kulesi, Bereketzade Mahallesi'nde yer almaktadır.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Tüccarın Son Notu",
        description: "Maktulün üzerinde şifreli bir not bulundu: 'Yedi tepeli şehirde, iki kıtayı birleştiren suların kalbinde, taşın ve zamanın tanığı yerde buluşalım.' Bu yer neresidir?",
        targetAnswer: "istanbul",
        requiredMatchPct: 100,
        hint: "Türkiye'nin en büyük şehri, Asya ve Avrupa'yı birbirine bağlar.",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "photo",
        title: "Gizli İşareti Bul",
        description: "Galata Köprüsü'nün altında gizlenmiş bir işaret var. O bölgeye gidin ve fotoğraf çekin.",
        targetLat: 41.0169,
        targetLng: 28.9742,
        targetRadiusM: 200,
        requiredMatchPct: 70,
        hint: "Köprünün kuzey tarafı, balıkçıların toplandığı yer.",
      },
    ],
  },
  {
    id: "case-bazaar-001",
    codeTitle: "KS-002: Çarşının Lanetli Taşı",
    title: "Kapalıçarşı'da Kayıp Elmas",
    description: "500 yıllık Kapalıçarşı'dan tarihi bir elmas çalındı. Hırsız hâlâ çarşı içinde saklanıyor olabilir. İzleri takip edin.",
    city: "İstanbul",
    district: "Fatih",
    difficulty: "orta",
    category: "hirsizlik",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 50,
    suspects: [
      { id: "s1", name: "Serdar Polat", bio: "Kuyumcu dükkanı sahibi, uzun süredir çarşıda", motive: "Sigorta dolandırıcılığı", alibi: "Kahvehanede müşterilerle birlikte", isCulprit: false },
      { id: "s2", name: "Leyla Kaya", bio: "Turizm rehberi, çarşıyı çok iyi biliyor", motive: "Borçlarını kapatmak için nakit ihtiyacı", alibi: "Tur grubunu gezdiriyor", isCulprit: false },
      { id: "s3", name: "Tarık Şimşek", bio: "Çarşı güvenlik görevlisi", motive: "İçeriden yardım etti, suç ortağı", alibi: "Güvenlik kamerası görüntüleri belirsiz", isCulprit: true, culpritClue: "Tarık kameralar kapanmadan hemen önce devriye noktasını terk etti. Cüzdanında elmasın satış planı bulundu." },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "photo",
        title: "Kapalıçarşı Girişi",
        description: "Kapalıçarşı'nın Nuruosmaniye Kapısı'na gidin. Kapının üzerindeki tarihi yazıtı fotoğraflayın.",
        targetLat: 41.0104,
        targetLng: 28.9684,
        targetRadiusM: 150,
        requiredMatchPct: 65,
        hint: "Nuruosmaniye Camii'ne en yakın kapı.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Kuyumcunun İfadesi",
        description: "Kuyumcu şunu söylüyor: 'Hırsız sabah 9'da geldi, 3 saat kaldı ve öğlen tam 12'de ortadan kayboldu. Kaç dakika çarşıdaydı?'",
        targetAnswer: "180",
        requiredMatchPct: 100,
        hint: "3 saat = kaç dakika?",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "location",
        title: "Hırsızın Kaçış Yolu",
        description: "Tanıklar hırsızın Beyazıt Meydanı'na doğru kaçtığını söylüyor. Meydana gidin.",
        targetLat: 41.0107,
        targetLng: 28.9641,
        targetRadiusM: 250,
        requiredMatchPct: 60,
        hint: "İstanbul Üniversitesi'nin önündeki meydan.",
      },
    ],
  },
  {
    id: "case-bosphorus-001",
    codeTitle: "KS-003: Boğazın Sessiz Şahidi",
    title: "Boğaz'ın Karanlık Sırrı",
    description: "Boğaz kıyısında bir gemi kaptanı gizli mesajlar bırakmış. Ölmeden önce büyük bir kaçakçılık operasyonunu ifşa etmeye çalışıyordu.",
    city: "İstanbul",
    district: "Beşiktaş",
    difficulty: "zor",
    category: "kacakcilik",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 30,
    suspects: [
      { id: "s1", name: "Mehmet Kaptan", bio: "Kaptanın eski denizcilik ortağı", motive: "Kaçakçılık gelirini bölüşememe", alibi: "Yatta uyuduğunu iddia ediyor", isCulprit: false },
      { id: "s2", name: "Deniz Arslan", bio: "Gümrük müdürü, liman kontrolünden sorumlu", motive: "Kaçakçılığı görmezden gelmesi için rüşvet aldı", alibi: "Gümrük ofisinde kayıt var", isCulprit: false },
      { id: "s3", name: "Yıldız Erdem", bio: "Antika ihracatçısı, şüpheli bağlantıları var", motive: "Ağını ele geçirmek istiyordu", alibi: "İstanbul dışında olduğunu söylüyor ama bilet yok", isCulprit: true, culpritClue: "Yıldız'ın telefonu o gece Ortaköy kulesiyle bağlantı kurdu. Kaptan ona karşı ifade verecekti." },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "location",
        title: "Dolmabahçe Sarayı Önü",
        description: "Kaptanın son görüldüğü yer Dolmabahçe Sarayı'nın deniz tarafıydı. O noktaya gidin.",
        targetLat: 41.0391,
        targetLng: 29.0005,
        targetRadiusM: 300,
        requiredMatchPct: 65,
        hint: "Osmanlı'nın son sarayı, Beşiktaş kıyısında.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Şifreli Harita",
        description: "Kaptanın günlüğünde şu not var: 'Büyük Boğaz köprüsü, 1973'te tamamlandı. Toplam uzunluğu 1560 metredir. İkinci köprü ise hangi yılda açıldı?'",
        targetAnswer: "1988",
        requiredMatchPct: 100,
        hint: "Fatih Sultan Mehmet Köprüsü'nün açılış yılı.",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "photo",
        title: "Gizli Depo",
        description: "Ortaköy Camii yakınında gizli bir depo var. O bölgeye gidin ve fotoğraf çekin.",
        targetLat: 41.0476,
        targetLng: 29.0274,
        targetRadiusM: 200,
        requiredMatchPct: 70,
        hint: "Boğaz manzaralı, küçük ama ikonik cami.",
      },
    ],
  },
  {
    id: "case-ankara-001",
    codeTitle: "KS-004: Cumhuriyetin Kırık Mühürü",
    title: "Anıtkabir'deki Şüpheli",
    description: "Ankara'da bir devlet sırrı çalındı. İzler Anıtkabir çevresine kadar uzanıyor.",
    city: "Ankara",
    district: "Çankaya",
    difficulty: "orta",
    category: "casusluk",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 0,
    suspects: [
      { id: "s1", name: "Cengiz Yılmaz", bio: "Bakanlık çalışanı, arşivlere erişimi var", motive: "Yabancı ülkeye bilgi satmak", alibi: "Bakanlık binasında çalışıyordu", isCulprit: false },
      { id: "s2", name: "Pervin Ak", bio: "Emekli istihbarat subayı", motive: "İdeolojik nedenler", alibi: "Evde hasta", isCulprit: true, culpritClue: "Pervin'in eski bağlantıları onu ortaya çıkardı. Evinde bulunmayan belgelerin kopyası teşkilata satıldı." },
      { id: "s3", name: "Hakan Demir", bio: "Güvenlik şirketi sahibi", motive: "Ekonomik çıkar", alibi: "Ankara dışında iş toplantısı", isCulprit: false },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "location",
        title: "Anıtkabir Girişi",
        description: "Anıtkabir'in aslan yolu girişine gidin.",
        targetLat: 39.9255,
        targetLng: 32.8368,
        targetRadiusM: 500,
        requiredMatchPct: 60,
        hint: "Atatürk'ün anıt mezarı, Çankaya'da.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Şüphelinin Mesajı",
        description: "Bırakılan notta: 'Türkiye Cumhuriyeti'nin kuruluş yılı nedir?'",
        targetAnswer: "1923",
        requiredMatchPct: 100,
        hint: "Cumhuriyet'in ilanı...",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "photo",
        title: "Kızılay'daki İz",
        description: "Şüpheli Kızılay Meydanı'ndan geçmiş. O noktaya gidin ve meydan fotoğrafı çekin.",
        targetLat: 39.9199,
        targetLng: 32.8543,
        targetRadiusM: 400,
        requiredMatchPct: 60,
        hint: "Ankara'nın kalbi, Güven Park yakınları.",
      },
    ],
  },
  {
    id: "case-izmir-001",
    codeTitle: "KS-005: Ege'nin Unutulmuş Vasiyeti",
    title: "İzmir'de Kayıp Miras",
    description: "İzmir'deki tarihi bir konaktan değerli bir miras belgesi çalındı.",
    city: "İzmir",
    district: "Konak",
    difficulty: "kolay",
    category: "hirsizlik",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 0,
    suspects: [
      { id: "s1", name: "Cem Güler", bio: "Mirasçının kuzeni, vasiyetten habersiz kalacaktı", motive: "Vasiyeti değiştirip payını artırmak", alibi: "İzmir dışındaydı", isCulprit: false },
      { id: "s2", name: "Suna Aydoğan", bio: "Konak ev sahibinin avukatı", motive: "Vasiyet belgesini değiştirmek için rüşvet teklif edildi", alibi: "Ofisinde çalışıyordu", isCulprit: true, culpritClue: "Suna'nın bilgisayarında değiştirilmiş vasiyetin taslağı bulundu. Müvekkilinin imzasını taklit etmiş." },
      { id: "s3", name: "Fuat Bey", bio: "Yaşlı komşu, her şeyi görüyor", motive: "Bilinmiyor — ihbarcı mı yoksa suç ortağı mı?", alibi: "Her zamanki gibi balkonda oturuyordu", isCulprit: false },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "location",
        title: "Saat Kulesi",
        description: "İzmir'in simgesi olan Saat Kulesi'ne gidin.",
        targetLat: 38.4192,
        targetLng: 27.1287,
        targetRadiusM: 300,
        requiredMatchPct: 60,
        hint: "Konak Meydanı'nın ortasında.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Eski Şehrin Kodu",
        description: "İzmir'in eski adı neydi?",
        targetAnswer: "smyrna",
        requiredMatchPct: 100,
        hint: "Antik Yunan dönemindeki adı.",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "photo",
        title: "Kemeraltı Çarşısı",
        description: "Tarihi Kemeraltı Çarşısı'na gidin. Eski Türk evlerinin fotoğrafını çekin.",
        targetLat: 38.4142,
        targetLng: 27.1353,
        targetRadiusM: 300,
        requiredMatchPct: 65,
        hint: "İzmir'in tarihi çarşısı, Konak yakınları.",
      },
    ],
  },
  {
    id: "case-sultanahmet-001",
    codeTitle: "KS-006: Yedi Kubbeli Gizem",
    title: "Sultanahmet'te Kayıp Hazine",
    description: "Sultanahmet Camii'nin altında Bizans döneminden kalma gizli bir geçit bulunduğu söyleniyor. Bir arkeolog bu geçidi araştırırken ortadan kayboldu.",
    city: "İstanbul",
    district: "Sultanahmet",
    difficulty: "zor",
    category: "kayip",
    thumbnailUrl: null,
    isActive: true,
    maxParticipants: 20,
    suspects: [
      { id: "s1", name: "Prof. Baran Işık", bio: "Rakip arkeolog, o bölgeye ilk girmek istiyordu", motive: "Akademik şöhret ve define", alibi: "Üniversite kütüphanesinde", isCulprit: false },
      { id: "s2", name: "Zeliha Hanım", bio: "Müze müdürü, gizli geçitten haberdardı", motive: "Tarihi eserleri kendi koleksiyonuna katmak", alibi: "Müzede sergi kuruyordu", isCulprit: false },
      { id: "s3", name: "Orhan Taş", bio: "Arkeologun asistanı, her şeyi biliyor", motive: "Hocasına ihanet ederek parayı tek başına almak", alibi: "Buluşma yerinde görülmedi", isCulprit: true, culpritClue: "Orhan'ın sırt çantasında gizli geçit haritası ve arkeologun kaybolan defteri bulundu. Gizli geçidi o kilitledi." },
    ] as Suspect[],
    steps: [
      {
        id: randomUUID(),
        order: 0,
        type: "location",
        title: "Sultanahmet Meydanı",
        description: "Sultanahmet Meydanı'na gidin. Hipodrom'un bulunduğu alana yaklaşın.",
        targetLat: 41.0054,
        targetLng: 28.9768,
        targetRadiusM: 250,
        requiredMatchPct: 65,
        hint: "Ayasofya ile Sultanahmet Camii'nin arasındaki meydan.",
      },
      {
        id: randomUUID(),
        order: 1,
        type: "riddle",
        title: "Arkeologun Notu",
        description: "Arkeologun bıraktığı notta şu yazıyor: 'Konstantinopolis'in efsanevi su sarnıcı, 336 sütunuyla binlerce yıldır ayakta. Adı nedir?'",
        targetAnswer: "yerebatan",
        requiredMatchPct: 80,
        hint: "Sultanahmet'in altındaki dev sarnıç.",
      },
      {
        id: randomUUID(),
        order: 2,
        type: "location",
        title: "Gizli Geçidin Girişi",
        description: "Yerebatan Sarnıcı yakınlarında eski bir yapı kalıntısı var. O noktaya gidin.",
        targetLat: 41.0085,
        targetLng: 28.9784,
        targetRadiusM: 200,
        requiredMatchPct: 70,
        hint: "Sarnıcın kuzeydoğusu.",
      },
    ],
  },
];

export async function seedIfEmpty() {
  // Seed cases
  const [{ count: caseCount }] = await db.select({ count: count() }).from(casesTable);
  if (Number(caseCount) === 0) {
    logger.info("Seeding initial cases...");
    for (const caseData of SEED_CASES) {
      const { steps, suspects, ...caseFields } = caseData;
      await db.insert(casesTable).values({ ...caseFields, suspects: JSON.stringify(suspects ?? []) });
      for (const step of steps) {
        await db.insert(caseStepsTable).values({
          id: step.id,
          caseId: caseData.id,
          order: step.order,
          type: step.type,
          title: step.title,
          description: step.description,
          targetImageUrl: null,
          targetLat: step.targetLat ?? null,
          targetLng: step.targetLng ?? null,
          targetRadiusM: step.targetRadiusM ?? null,
          targetAnswer: step.targetAnswer ?? null,
          requiredMatchPct: step.requiredMatchPct,
          hint: step.hint ?? null,
        });
      }
    }
    logger.info(`Seeded ${SEED_CASES.length} cases`);
  }

  // Seed admin user
  const [{ count: userCount }] = await db.select({ count: count() }).from(usersTable);
  if (Number(userCount) === 0) {
    logger.info("Seeding admin user...");
    const passwordHash = await bcrypt.hash("halilcan1514!", 10);
    await db.insert(usersTable).values({
      id: randomUUID(),
      username: "halilaisnc",
      passwordHash,
      displayName: "Halil Admin",
      city: "İstanbul",
      isAdmin: true,
      xp: "0",
      badge: "Efsane Dedektif",
    });
    logger.info("Admin user seeded (halilaisnc)");
  }
}
