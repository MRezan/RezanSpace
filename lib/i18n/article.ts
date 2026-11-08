import type {Locale} from './locales';
const labels:Record<Locale,readonly string[]>={
 en:['On this page','Updated','min read','Back to the feed','Explore this topic','More from this writer','Breadcrumb','Continue exploring'],
 bn:['এই লেখায়','হালনাগাদ','মিনিটে পড়ুন','ফিডে ফিরুন','এই বিষয়ে আরও পড়ুন','লেখকের আরও লেখা','পথনির্দেশ','আরও খুঁজে দেখুন'],
 es:['En esta página','Actualizado','min de lectura','Volver al inicio','Explora este tema','Más de este autor','Ruta de navegación','Sigue explorando'],
 'pt-BR':['Nesta página','Atualizado','min de leitura','Voltar ao feed','Explore este tema','Mais deste autor','Navegação','Continue explorando'],
 hi:['इस लेख में','अपडेट किया गया','मिनट का पठन','फ़ीड पर लौटें','इस विषय पर और पढ़ें','इस लेखक के और लेख','पथ','और जानें'],
 id:['Di halaman ini','Diperbarui','menit baca','Kembali ke beranda','Jelajahi topik ini','Lainnya dari penulis','Navigasi','Terus menjelajah'],
 ar:['في هذه الصفحة','آخر تحديث','دقائق للقراءة','العودة إلى الرئيسية','استكشف هذا الموضوع','المزيد من هذا الكاتب','مسار التنقل','تابع الاستكشاف'],
 fr:['Sur cette page','Mis à jour','min de lecture','Retour au fil','Explorer ce sujet','Du même auteur','Fil d’Ariane','Continuez à explorer'],
 de:['Auf dieser Seite','Aktualisiert','Min. Lesezeit','Zurück zum Feed','Dieses Thema entdecken','Mehr von diesem Autor','Brotkrumennavigation','Weiter entdecken'],
 ja:['この記事の内容','更新日','分で読めます','フィードに戻る','このトピックを探す','この著者の記事','パンくずリスト','もっと探す'],
 vi:['Trong bài viết này','Cập nhật','phút đọc','Trở lại bảng tin','Khám phá chủ đề này','Cùng tác giả','Đường dẫn','Tiếp tục khám phá'],
 tr:['Bu sayfada','Güncellendi','dakika okuma','Akışa dön','Bu konuyu keşfet','Bu yazardan diğer yazılar','Gezinme yolu','Keşfetmeye devam et'],
 ko:['이 글의 내용','업데이트','분 읽기','피드로 돌아가기','이 주제 둘러보기','이 작가의 다른 글','탐색 경로','계속 둘러보기'],
 it:['In questa pagina','Aggiornato','min di lettura','Torna al feed','Esplora questo tema','Altri articoli dell’autore','Percorso','Continua a esplorare'],
 pl:['W tym artykule','Zaktualizowano','min czytania','Wróć do aktualności','Poznaj ten temat','Więcej tego autora','Nawigacja','Odkrywaj dalej'],
};
export function articleCopy(locale:Locale){const [contents,updated,minRead,back,topic,author,breadcrumb,explore]=labels[locale];return {contents,updated,minRead,back,topic,author,breadcrumb,explore};}
