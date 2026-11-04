export const locales = ['en','es','pt-BR','hi','id','ar','fr','de','ja','bn','vi','tr','ko','it','pl'] as const;
export type Locale = typeof locales[number];
export const languageNames: Record<Locale,string> = {en:'English',es:'Español','pt-BR':'Português (Brasil)',hi:'हिन्दी',id:'Bahasa Indonesia',ar:'العربية',fr:'Français',de:'Deutsch',ja:'日本語',bn:'বাংলা',vi:'Tiếng Việt',tr:'Türkçe',ko:'한국어',it:'Italiano',pl:'Polski'};
export const isLocale = (value:string):value is Locale => (locales as readonly string[]).includes(value);
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://rezan.space').replace(/\/$/,'');
export const localePath = (locale:Locale, path='') => `/${locale}/${path.replace(/^\/+|\/+$/g,'')}${path.replace(/^\/+|\/+$/g,'') ? '/' : ''}`;
export const absoluteUrl = (path:string) => `${siteUrl}${path}`;
export const direction = (locale:Locale) => locale==='ar' ? 'rtl' : 'ltr';
export const ogLocales:Record<Locale,string>={en:'en_US',es:'es_ES','pt-BR':'pt_BR',hi:'hi_IN',id:'id_ID',ar:'ar_AR',fr:'fr_FR',de:'de_DE',ja:'ja_JP',bn:'bn_BD',vi:'vi_VN',tr:'tr_TR',ko:'ko_KR',it:'it_IT',pl:'pl_PL'};
// Navigation, editorial headings and empty states are translated; stories retain their actual authored language.
const copy:Record<Locale,readonly string[]>={
 en:['Stories, ideas and perspectives','Read original stories about technology, business, science, culture and more.','Home','Write a story','Search stories','Read story','No stories in this language yet.','Choose another language or publish the first story.','Languages','Published','More stories','All topics'],
 es:['Historias, ideas y perspectivas','Lee historias originales sobre tecnología, negocios, ciencia, cultura y mucho más.','Inicio','Escribir una historia','Buscar historias','Leer historia','Todavía no hay historias en este idioma.','Elige otro idioma o publica la primera historia.','Idiomas','Publicado','Más historias','Todos los temas'],
 'pt-BR':['Histórias, ideias e perspectivas','Leia histórias originais sobre tecnologia, negócios, ciência, cultura e muito mais.','Início','Escrever uma história','Buscar histórias','Ler história','Ainda não há histórias neste idioma.','Escolha outro idioma ou publique a primeira história.','Idiomas','Publicado','Mais histórias','Todos os temas'],
 hi:['कहानियाँ, विचार और नज़रिए','तकनीक, व्यापार, विज्ञान, संस्कृति और अन्य विषयों पर मौलिक लेख पढ़ें।','मुखपृष्ठ','लेख लिखें','लेख खोजें','लेख पढ़ें','इस भाषा में अभी कोई लेख नहीं है।','दूसरी भाषा चुनें या पहला लेख प्रकाशित करें।','भाषाएँ','प्रकाशित','और लेख','सभी विषय'],
 id:['Cerita, ide, dan sudut pandang','Baca cerita orisinal tentang teknologi, bisnis, sains, budaya, dan lainnya.','Beranda','Tulis cerita','Cari cerita','Baca cerita','Belum ada cerita dalam bahasa ini.','Pilih bahasa lain atau terbitkan cerita pertama.','Bahasa','Diterbitkan','Cerita lainnya','Semua topik'],
 ar:['قصص وأفكار ووجهات نظر','اقرأ قصصًا أصلية عن التكنولوجيا والأعمال والعلوم والثقافة والمزيد.','الرئيسية','اكتب قصة','ابحث عن قصص','اقرأ القصة','لا توجد قصص بهذه اللغة بعد.','اختر لغة أخرى أو انشر القصة الأولى.','اللغات','تاريخ النشر','المزيد من القصص','كل المواضيع'],
 fr:['Histoires, idées et perspectives','Lisez des récits originaux sur la technologie, les affaires, les sciences, la culture et bien plus.','Accueil','Écrire une histoire','Rechercher des histoires','Lire l’histoire','Aucune histoire dans cette langue pour le moment.','Choisissez une autre langue ou publiez la première histoire.','Langues','Publié','Plus d’histoires','Tous les sujets'],
 de:['Geschichten, Ideen und Perspektiven','Lesen Sie originelle Beiträge über Technologie, Wirtschaft, Wissenschaft, Kultur und mehr.','Startseite','Beitrag schreiben','Beiträge suchen','Beitrag lesen','Noch keine Beiträge in dieser Sprache.','Wählen Sie eine andere Sprache oder veröffentlichen Sie den ersten Beitrag.','Sprachen','Veröffentlicht','Weitere Beiträge','Alle Themen'],
 ja:['物語、アイデア、視点','テクノロジー、ビジネス、科学、文化などのオリジナル記事を読もう。','ホーム','記事を書く','記事を検索','記事を読む','この言語の記事はまだありません。','別の言語を選ぶか、最初の記事を投稿してください。','言語','公開日','ほかの記事','すべてのトピック'],
 bn:['গল্প, ভাবনা ও দৃষ্টিভঙ্গি','প্রযুক্তি, ব্যবসা, বিজ্ঞান, সংস্কৃতিসহ নানা বিষয়ে মৌলিক লেখা পড়ুন।','প্রচ্ছদ','লেখা প্রকাশ করুন','লেখা খুঁজুন','লেখাটি পড়ুন','এই ভাষায় এখনও কোনো লেখা নেই।','অন্য ভাষা বেছে নিন অথবা প্রথম লেখাটি প্রকাশ করুন।','ভাষা','প্রকাশিত','আরও লেখা','সব বিষয়'],
 vi:['Câu chuyện, ý tưởng và góc nhìn','Đọc bài viết nguyên bản về công nghệ, kinh doanh, khoa học, văn hóa và hơn thế nữa.','Trang chủ','Viết bài','Tìm bài viết','Đọc bài','Chưa có bài viết bằng ngôn ngữ này.','Chọn ngôn ngữ khác hoặc đăng bài viết đầu tiên.','Ngôn ngữ','Ngày đăng','Bài viết khác','Tất cả chủ đề'],
 tr:['Hikâyeler, fikirler ve bakış açıları','Teknoloji, iş dünyası, bilim, kültür ve daha fazlası hakkında özgün yazılar okuyun.','Ana sayfa','Yazı yaz','Yazı ara','Yazıyı oku','Bu dilde henüz yazı yok.','Başka bir dil seçin veya ilk yazıyı yayımlayın.','Diller','Yayımlanma','Diğer yazılar','Tüm konular'],
 ko:['이야기, 아이디어와 관점','기술, 비즈니스, 과학, 문화 등 다양한 주제의 독창적인 글을 읽어 보세요.','홈','글쓰기','글 검색','글 읽기','아직 이 언어로 작성된 글이 없습니다.','다른 언어를 선택하거나 첫 글을 게시하세요.','언어','게시일','다른 글','모든 주제'],
 it:['Storie, idee e prospettive','Leggi storie originali su tecnologia, economia, scienza, cultura e molto altro.','Home','Scrivi una storia','Cerca storie','Leggi la storia','Non ci sono ancora storie in questa lingua.','Scegli un’altra lingua o pubblica la prima storia.','Lingue','Pubblicato','Altre storie','Tutti gli argomenti'],
 pl:['Historie, pomysły i perspektywy','Czytaj autorskie teksty o technologii, biznesie, nauce, kulturze i nie tylko.','Strona główna','Napisz artykuł','Szukaj artykułów','Czytaj artykuł','Nie ma jeszcze artykułów w tym języku.','Wybierz inny język lub opublikuj pierwszy artykuł.','Języki','Opublikowano','Więcej artykułów','Wszystkie tematy'],
};
export function dictionary(locale:Locale){const [title,description,home,write,search,read,empty,emptyHint,languages,published,more,allTopics]=copy[locale];return {title,description,home,write,search,read,empty,emptyHint,languages,published,more,allTopics};}
const topicNames:Record<Locale,readonly string[]>={
 en:['Technology','Business','Science','Health','Culture','Education','Lifestyle','Finance','Travel','Environment'],
 es:['Tecnología','Negocios','Ciencia','Salud','Cultura','Educación','Estilo de vida','Finanzas','Viajes','Medio ambiente'],
 'pt-BR':['Tecnologia','Negócios','Ciência','Saúde','Cultura','Educação','Estilo de vida','Finanças','Viagens','Meio ambiente'],
 hi:['तकनीक','व्यापार','विज्ञान','स्वास्थ्य','संस्कृति','शिक्षा','जीवनशैली','वित्त','यात्रा','पर्यावरण'],
 id:['Teknologi','Bisnis','Sains','Kesehatan','Budaya','Pendidikan','Gaya hidup','Keuangan','Perjalanan','Lingkungan'],
 ar:['التكنولوجيا','الأعمال','العلوم','الصحة','الثقافة','التعليم','نمط الحياة','التمويل','السفر','البيئة'],
 fr:['Technologie','Affaires','Sciences','Santé','Culture','Éducation','Mode de vie','Finance','Voyages','Environnement'],
 de:['Technologie','Wirtschaft','Wissenschaft','Gesundheit','Kultur','Bildung','Lebensstil','Finanzen','Reisen','Umwelt'],
 ja:['テクノロジー','ビジネス','科学','健康','文化','教育','ライフスタイル','金融','旅行','環境'],
 bn:['প্রযুক্তি','ব্যবসা','বিজ্ঞান','স্বাস্থ্য','সংস্কৃতি','শিক্ষা','জীবনযাপন','অর্থনীতি','ভ্রমণ','পরিবেশ'],
 vi:['Công nghệ','Kinh doanh','Khoa học','Sức khỏe','Văn hóa','Giáo dục','Lối sống','Tài chính','Du lịch','Môi trường'],
 tr:['Teknoloji','İş dünyası','Bilim','Sağlık','Kültür','Eğitim','Yaşam tarzı','Finans','Seyahat','Çevre'],
 ko:['기술','비즈니스','과학','건강','문화','교육','라이프스타일','금융','여행','환경'],
 it:['Tecnologia','Economia','Scienza','Salute','Cultura','Istruzione','Stile di vita','Finanza','Viaggi','Ambiente'],
 pl:['Technologia','Biznes','Nauka','Zdrowie','Kultura','Edukacja','Styl życia','Finanse','Podróże','Środowisko'],
};
const expandedTopicNames:Record<Locale,readonly string[]>={
 en:['Tech How-to & Troubleshooting','Food & Recipes','DIY, Crafts & Hobbies','Sports','Entertainment','Travel Planning'],
 bn:['প্রযুক্তি নির্দেশিকা ও সমস্যা সমাধান','খাবার ও রেসিপি','নিজে তৈরি, হস্তশিল্প ও শখ','খেলাধুলা','বিনোদন','ভ্রমণ পরিকল্পনা'],
 es:['Guías y solución de problemas técnicos','Comida y recetas','Bricolaje, manualidades y aficiones','Deportes','Entretenimiento','Planificación de viajes'],
 'pt-BR':['Guias e solução de problemas técnicos','Comida e receitas','Faça você mesmo, artesanato e hobbies','Esportes','Entretenimento','Planejamento de viagens'],
 hi:['तकनीकी मार्गदर्शिका और समस्या समाधान','खाना और रेसिपी','खुद बनाएँ, हस्तकला और शौक','खेल','मनोरंजन','यात्रा की योजना'],
 id:['Panduan teknologi dan pemecahan masalah','Makanan dan resep','DIY, kerajinan dan hobi','Olahraga','Hiburan','Perencanaan perjalanan'],
 ar:['إرشادات التقنية وحل المشكلات','الطعام والوصفات','الأعمال اليدوية والحرف والهوايات','الرياضة','الترفيه','تخطيط السفر'],
 fr:['Guides techniques et dépannage','Cuisine et recettes','Bricolage, loisirs créatifs et passions','Sports','Divertissement','Organisation de voyages'],
 de:['Technikanleitungen und Fehlerbehebung','Essen und Rezepte','Heimwerken, Basteln und Hobbys','Sport','Unterhaltung','Reiseplanung'],
 ja:['技術ガイドとトラブル対処','料理とレシピ','DIY・手芸・趣味','スポーツ','エンタメ','旅行計画'],
 vi:['Hướng dẫn công nghệ và khắc phục sự cố','Ẩm thực và công thức','Tự làm, thủ công và sở thích','Thể thao','Giải trí','Lập kế hoạch du lịch'],
 tr:['Teknoloji rehberleri ve sorun giderme','Yemek ve tarifler','Kendin yap, el işleri ve hobiler','Spor','Eğlence','Seyahat planlama'],
 ko:['기술 가이드 및 문제 해결','음식과 레시피','DIY, 공예 및 취미','스포츠','엔터테인먼트','여행 계획'],
 it:['Guide tecniche e risoluzione dei problemi','Cucina e ricette','Fai da te, artigianato e hobby','Sport','Intrattenimento','Pianificazione viaggi'],
 pl:['Poradniki techniczne i rozwiązywanie problemów','Jedzenie i przepisy','Majsterkowanie, rękodzieło i hobby','Sport','Rozrywka','Planowanie podróży'],
};
export function topicLabel(locale:Locale,topic:string){const index=topicNames.en.indexOf(topic);if(index>=0)return topicNames[locale][index];const extra=expandedTopicNames.en.indexOf(topic);return extra<0?topic:expandedTopicNames[locale][extra];}
const noMatches:Record<Locale,string>={en:'No matching stories.',es:'No se encontraron historias.', 'pt-BR':'Nenhuma história encontrada.',hi:'कोई मेल खाता लेख नहीं मिला।',id:'Tidak ada cerita yang cocok.',ar:'لم يتم العثور على قصص مطابقة.',fr:'Aucune histoire correspondante.',de:'Keine passenden Beiträge gefunden.',ja:'一致する記事はありません。',bn:'মিল আছে এমন কোনো লেখা পাওয়া যায়নি।',vi:'Không tìm thấy bài viết phù hợp.',tr:'Eşleşen yazı bulunamadı.',ko:'일치하는 글이 없습니다.',it:'Nessuna storia corrispondente.',pl:'Nie znaleziono pasujących artykułów.'};
export const noMatchesLabel=(locale:Locale)=>noMatches[locale];
