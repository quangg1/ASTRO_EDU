// Seed a set of astronomy tutorials (3 levels: Beginner, Explorer, Research)
// Run from services/api directory with: node features/courses/../scripts/seed-tutorials-astronomy.js

const mongoose = require('mongoose');
const { Tutorial, TutorialCategory } = require('../features/courses/models/Tutorial');
const TutorialTrack = require('../features/courses/models/TutorialTrack');

async function main() {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/galaxies';
  console.log('Connecting to', mongoUrl);
  await mongoose.connect(mongoUrl);

  // Ensure categories for 3 levels exist
  const categoriesData = [
    {
      slug: 'level-1-beginner',
      title: 'Level 1 — Beginner',
      description: 'Khái niệm cơ bản, nhiều hình minh họa, giải thích đơn giản.',
      icon: '🌱',
      order: 1,
    },
    {
      slug: 'level-2-explorer',
      title: 'Level 2 — Explorer',
      description: 'Kiến thức sâu hơn, có mô phỏng và toán cơ bản.',
      icon: '🛰️',
      order: 2,
    },
    {
      slug: 'level-3-research',
      title: 'Level 3 — Research',
      description: 'Astrophysics, dataset thực tế và hướng tới machine learning.',
      icon: '🧪',
      order: 3,
    },
  ];

  const catBySlug = {};
  for (const cat of categoriesData) {
    const existing = await TutorialCategory.findOne({ slug: cat.slug });
    if (existing) {
      catBySlug[cat.slug] = existing;
      continue;
    }
    const created = await TutorialCategory.create(cat);
    catBySlug[cat.slug] = created;
  }

  const tutorials = [
    // =========================
    // Level 1 — Beginner
    // =========================
    {
      title: 'Vũ trụ là gì? Từ Big Bang đến hôm nay',
      slug: 'vu-tru-la-gi',
      summary:
        'Giới thiệu trực giác về vũ trụ, Big Bang và các mốc phát triển lớn của vũ trụ – không công thức, nhiều ví dụ dễ hình dung.',
      categorySlug: 'level-1-beginner',
      readTime: 10,
      tags: ['beginner', 'cosmology', 'big-bang'],
      sections: [
        {
          type: 'text',
          title: 'Vũ trụ – chúng ta đang nói về cái gì?',
          content:
            'Khi nghe từ “vũ trụ”, nhiều người sẽ nghĩ đến bầu trời đầy sao vào ban đêm. Nhưng trên thực tế, vũ trụ (Universe) còn rộng hơn rất nhiều.\n\nNếu “nhà bạn” là điểm xuất phát, ta có thể đi qua các tầng sau:\n- Thành phố, quốc gia, Trái Đất – thế giới quen thuộc hằng ngày.\n- Hệ Mặt Trời – Mặt Trời, các hành tinh, vệ tinh, sao chổi, thiên thạch...\n- Thiên hà – “thành phố sao” chứa hàng trăm tỷ ngôi sao giống Mặt Trời.\n- Cụm thiên hà và cấu trúc lớn – nơi nhiều thiên hà liên kết với nhau.\n- Vũ trụ quan sát được – toàn bộ không gian mà ánh sáng đã kịp đi đến chúng ta kể từ Big Bang.\n\nVũ trụ là tập hợp *tất cả* những gì tồn tại: không gian, thời gian, vật chất, năng lượng, và các quy luật vật lý chi phối chúng.',
        },
        {
          type: 'text',
          title: 'Big Bang: vụ nổ hay sự giãn nở?',
          content:
            'Khi nghe “Big Bang”, ta dễ tưởng tượng ra một quả bom nổ tung trong không gian trống rỗng. Hình dung này dễ nhớ, nhưng không chính xác.\n\nTheo mô hình hiện đại, Big Bang không phải là “một vật nổ trong không gian”, mà là: chính bản thân không gian đang giãn nở.\n\nNếu bạn vẽ các chấm mực trên một quả bóng bay rồi thổi, bạn sẽ thấy khoảng cách giữa mọi cặp chấm đều tăng lên và không có “trung tâm nổ” nằm trên bề mặt bóng – mọi nơi đều đang giãn ra.\n\nVũ trụ cũng tương tự: theo thời gian, khoảng cách giữa các thiên hà xa nhau tăng dần, như bề mặt quả bóng ngày càng phồng to. Big Bang là thời điểm vũ trụ cực kỳ đặc, nóng và nhỏ, nơi quá trình giãn nở bắt đầu.',
        },
        {
          type: 'text',
          title: 'Timeline siêu rút gọn của vũ trụ',
          content:
            'Các nhà vũ trụ học đã xây dựng một bức tranh “dòng thời gian” (timeline) của vũ trụ. Dưới đây là phiên bản siêu rút gọn:\n\n1. 0 – 1 giây đầu tiên: vũ trụ cực kỳ nóng và đặc, các hạt cơ bản xuất hiện.\n2. Vài phút đầu tiên: hạt nhân của các nguyên tử nhẹ (hydrogen, helium) hình thành.\n3. ~380.000 năm sau Big Bang: vũ trụ nguội đủ để electron gắn với hạt nhân → nguyên tử trung hòa, ánh sáng bắt đầu lan truyền tự do (CMB).\n4. Hàng trăm triệu năm sau: khí hydrogen và helium co lại dưới hấp dẫn, hình thành những ngôi sao và thiên hà đầu tiên.\n5. Vài tỷ năm tiếp theo: thiên hà phát triển, sao sinh – chết, nguyên tố nặng được tạo ra.\n6. Khoảng 9 tỷ năm sau Big Bang: Hệ Mặt Trời hình thành, Trái Đất ra đời, sau đó là sự sống và con người.\n\nNgày nay, tuổi vũ trụ được ước lượng khoảng 13,8 tỷ năm.',
        },
        {
          type: 'text',
          title: 'Chúng ta biết điều này bằng cách nào?',
          content:
            'Bạn có thể hỏi: “Toàn là chuyện cách đây hàng tỷ năm, sao chúng ta biết được?”\n\nHai manh mối quan trọng:\n\n1. Ánh sáng từ các thiên hà xa: quang phổ của chúng bị “đỏ dần” (redshift), cho thấy khoảng cách đang tăng → vũ trụ đang giãn nở.\n2. Bức xạ phông vi ba vũ trụ (CMB): “ánh sáng còn sót lại” từ thời vũ trụ còn rất nóng và đặc, gần như đồng đều theo mọi hướng nhưng có gợn sóng nhỏ chứa thông tin về thời kỳ sơ khai.\n\nTừ các quan sát này (và nhiều phép đo khác), mô hình Big Bang được xây dựng và điều chỉnh dần để khớp với dữ liệu.',
        },
        {
          type: 'text',
          title: 'Vũ trụ hôm nay và những câu hỏi mở',
          content:
            'Hiện tại, chúng ta biết vũ trụ đang giãn nở với tốc độ tăng dần (năng lượng tối), các thiên hà tạo thành mạng lưới sợi khổng lồ, và Hệ Mặt Trời chỉ là một mảnh rất nhỏ.\n\nNhưng vẫn còn rất nhiều câu hỏi: bản chất của vật chất tối, năng lượng tối, số phận cuối cùng của vũ trụ, có bao nhiêu hành tinh giống Trái Đất...\n\nHọc về vũ trụ không chỉ là thuộc lòng con số, mà là tham gia vào một câu chuyện điều tra khoa học khổng lồ.',
        },
      ],
      relatedSlugs: ['light-year-la-gi', 'thien-ha-la-gi'],
      order: 1,
    },
    {
      title: 'Light-year là gì? Đơn vị đo khoảng cách trong vũ trụ',
      slug: 'light-year-la-gi',
      summary:
        'Giải thích đơn vị năm ánh sáng (light-year), so sánh với km và các đơn vị khác như AU, parsec, giúp người mới hình dung được khoảng cách trong vũ trụ.',
      categorySlug: 'level-1-beginner',
      readTime: 8,
      tags: ['beginner', 'distance', 'units'],
      sections: [
        {
          type: 'text',
          title: 'Tại sao không dùng km để đo khoảng cách trong vũ trụ?',
          content:
            'Trong đời sống hằng ngày, chúng ta quen với mét, kilomet (km). Nhưng khi nói về vũ trụ, khoảng cách trở nên khổng lồ: Trái Đất – Mặt Trời ~150 triệu km, Trái Đất – sao gần nhất ngoài Mặt Trời hơn 40 nghìn tỷ km.\n\nCác con số này rất dài, khó nhớ và không trực giác, nên thiên văn học dùng những đơn vị mới phù hợp hơn với quy mô vũ trụ.',
        },
        {
          type: 'text',
          title: 'Light-year: quãng đường ánh sáng đi trong một năm',
          content:
            'Năm ánh sáng (light-year) là đơn vị đo khoảng cách, không phải thời gian.\n\nĐịnh nghĩa: một năm ánh sáng = quãng đường mà ánh sáng đi được trong 1 năm (trong chân không). Tốc độ ánh sáng khoảng 300.000 km/s, đủ để đi hơn 7 vòng quanh Trái Đất chỉ trong 1 giây.\n\nNếu để ánh sáng “chạy” 1 năm, quãng đường đó cỡ 10 nghìn tỷ km. Bạn không cần nhớ con số chính xác, chỉ cần hiểu: 1 năm ánh sáng = rất, rất xa.',
        },
        {
          type: 'text',
          title: 'Ví dụ: khoảng cách gần trong vũ trụ',
          content:
            'Một vài ví dụ:\n\n- Trái Đất – Mặt Trời: ~1 AU, ánh sáng đi mất khoảng 8 phút 20 giây (8 phút ánh sáng).\n- Trái Đất – Mặt Trăng: ánh sáng đi mất hơn 1 giây (1 giây ánh sáng).\n- Trái Đất – Proxima Centauri: ~4,2 năm ánh sáng.\n\n“4,2 năm ánh sáng” nghe dễ hiểu hơn rất nhiều so với “40 nghìn tỷ km”.',
        },
        {
          type: 'text',
          title: 'Các đơn vị khác: AU, parsec',
          content:
            'Ngoài năm ánh sáng, thiên văn học dùng:\n\n- AU (Astronomical Unit): khoảng cách trung bình từ Trái Đất đến Mặt Trời; dùng nhiều trong Hệ Mặt Trời.\n- Parsecs (pc): xuất hiện khi tính khoảng cách từ thị sai; 1 pc ≈ 3,26 năm ánh sáng. Thiên hà Andromeda cách chúng ta khoảng 2,5 triệu năm ánh sáng (~780.000 pc).',
        },
        {
          type: 'text',
          title: 'Đọc tin khoa học: “thiên hà cách chúng ta 10 triệu năm ánh sáng”',
          content:
            'Câu “thiên hà X cách chúng ta 10 triệu năm ánh sáng” nghĩa là ánh sáng từ thiên hà đó đã mất 10 triệu năm để đến mắt bạn.\n\nBạn đang nhìn thấy hình ảnh của thiên hà trong quá khứ, giống như nhìn lại một bức ảnh cũ. Càng nhìn xa, ta càng nhìn ngược về quá khứ. Kính thiên văn giống như một cỗ máy thời gian quang học.',
        },
      ],
      relatedSlugs: ['vu-tru-la-gi', 'he-mat-troi-la-gi'],
      order: 2,
    },
    {
      title: 'Hệ Mặt Trời là gì? Hàng xóm quanh Mặt Trời',
      slug: 'he-mat-troi-la-gi',
      summary:
        'Tổng quan về Hệ Mặt Trời: Mặt Trời, tám hành tinh, hành tinh lùn, tiểu hành tinh, sao chổi và các thành phần chính khác.',
      categorySlug: 'level-1-beginner',
      readTime: 10,
      tags: ['beginner', 'solar-system'],
      sections: [
        {
          type: 'text',
          title: 'Từ Mặt Trời nhìn ra ngoài',
          content:
            'Hệ Mặt Trời là “nhà” của chúng ta trong vũ trụ. Ở trung tâm là Mặt Trời – một ngôi sao cỡ trung bình. Xung quanh nó là các hành tinh, vệ tinh, sao chổi, tiểu hành tinh và bụi khí.\n\nNếu phóng to Hệ Mặt Trời trên một mặt phẳng đơn giản, bạn sẽ thấy các quỹ đạo gần tròn của các hành tinh xoay quanh Mặt Trời ở các khoảng cách khác nhau.',
        },
        {
          type: 'text',
          title: 'Tám hành tinh chính',
          content:
            'Hệ Mặt Trời có 8 hành tinh chính, chia thành hai nhóm:\n\n- Hành tinh đá gần Mặt Trời: Thủy Tinh, Kim Tinh, Trái Đất, Hỏa Tinh.\n- Hành tinh khí khổng lồ xa hơn: Mộc Tinh, Thổ Tinh, Thiên Vương, Hải Vương.\n\nMỗi hành tinh có kích thước, bầu khí quyển, nhiệt độ và hệ vệ tinh riêng. Trái Đất là hành tinh duy nhất mà ta biết chắc hiện có sự sống.',
        },
        {
          type: 'text',
          title: 'Hành tinh lùn, tiểu hành tinh và vành đai Kuiper',
          content:
            'Ngoài 8 hành tinh, còn có các **hành tinh lùn** như Pluto, Ceres, Eris, v.v. Chúng đủ lớn để gần như tròn nhưng chưa “dọn sạch” quỹ đạo của mình.\n\nGiữa quỹ đạo Hỏa Tinh và Mộc Tinh là **vành đai tiểu hành tinh**, chứa hàng triệu khối đá nhỏ. Xa hơn nữa là **vành đai Kuiper** và đám mây Oort – kho chứa sao chổi dài hạn.',
        },
        {
          type: 'text',
          title: 'Sao chổi và thiên thạch',
          content:
            'Sao chổi là những “quả cầu bẩn” gồm băng, bụi và đá, xuất phát từ vùng xa của Hệ Mặt Trời. Khi đi gần Mặt Trời, băng bốc hơi tạo nên đuôi sáng đặc trưng.\n\nThiên thạch là những mảnh đá nhỏ hơn, đôi khi lao vào khí quyển Trái Đất tạo thành sao băng. Nếu một phần không cháy hết rơi xuống mặt đất, ta gọi đó là **mảnh thiên thạch**.',
        },
        {
          type: 'text',
          title: 'Vị trí đặc biệt của Trái Đất',
          content:
            'Trái Đất nằm trong “vùng ở được” quanh Mặt Trời – đủ gần để nước không luôn đóng băng, nhưng đủ xa để không bị sôi hoàn toàn.\n\nBầu khí quyển bảo vệ chúng ta khỏi bức xạ nguy hiểm, giữ nhiệt độ ổn định và cung cấp không khí để thở. Tất cả các yếu tố này kết hợp giúp Trái Đất trở thành một hành tinh đặc biệt.',
        },
      ],
      relatedSlugs: ['light-year-la-gi', 'mat-troi-la-gi', 'nhat-thuc-nguyet-thuc-la-gi'],
      order: 3,
    },
    {
      title: 'Mặt Trời là gì? Ngôi sao của Hệ Mặt Trời',
      slug: 'mat-troi-la-gi',
      summary:
        'Giới thiệu Mặt Trời như một ngôi sao: cấu trúc, nguồn năng lượng, vai trò với Hệ Mặt Trời và Trái Đất.',
      categorySlug: 'level-1-beginner',
      readTime: 9,
      tags: ['beginner', 'solar-system', 'stars'],
      sections: [
        {
          type: 'text',
          title: 'Mặt Trời – không phải “quả cầu lửa”',
          content:
            'Nhìn từ Trái Đất, Mặt Trời giống như một quả cầu lửa khổng lồ. Nhưng trên thực tế, nó là một khối plasma cực nóng, nơi các hạt ion và electron chuyển động hỗn loạn.\n\nMặt Trời không “cháy” như lửa trên Trái Đất. Thay vào đó, nó phát sáng nhờ các phản ứng nhiệt hạch trong lõi.',
        },
        {
          type: 'text',
          title: 'Cấu trúc cơ bản của Mặt Trời',
          content:
            'Mặt Trời có thể được chia thành vài lớp chính:\n\n- Lõi (core): nơi diễn ra phản ứng nhiệt hạch.\n- Vùng bức xạ (radiative zone).\n- Vùng đối lưu (convective zone).\n- Quang quyển (photosphere) – bề mặt “nhìn thấy được”.\n- Sắc quyển và nhật hoa (chromosphere, corona).\n\nMỗi lớp có nhiệt độ và mật độ khác nhau, góp phần vào hoạt động tổng thể của Mặt Trời.',
        },
        {
          type: 'text',
          title: 'Năng lượng từ đâu mà ra?',
          content:
            'Trong lõi Mặt Trời, các hạt hydrogen va chạm và kết hợp lại thành helium qua phản ứng nhiệt hạch. Một phần nhỏ khối lượng chuyển thành năng lượng theo công thức nổi tiếng E = mc².\n\nNăng lượng này dần dần truyền ra ngoài và cuối cùng thoát khỏi bề mặt dưới dạng ánh sáng và bức xạ.',
        },
        {
          type: 'text',
          title: 'Tác động của Mặt Trời tới Trái Đất',
          content:
            'Mặt Trời cung cấp ánh sáng và nhiệt, là nguồn gốc của hầu hết năng lượng trên Trái Đất. Ngoài ra, nó còn tạo ra gió Mặt Trời và bão Mặt Trời, có thể ảnh hưởng tới từ trường Trái Đất, gây ra cực quang và đôi khi làm nhiễu hệ thống vệ tinh, điện lưới.',
        },
        {
          type: 'text',
          title: 'Quan sát Mặt Trời an toàn',
          content:
            'Không bao giờ nhìn trực tiếp vào Mặt Trời bằng mắt thường hoặc ống nhòm/kính thiên văn không có lọc chuyên dụng – điều này có thể gây hỏng mắt vĩnh viễn.\n\nĐể quan sát Mặt Trời, hãy dùng kính lọc đạt chuẩn hoặc các phương pháp gián tiếp như chiếu ảnh Mặt Trời lên màn trắng.',
        },
      ],
      relatedSlugs: ['he-mat-troi-la-gi', 'cuc-quang-la-gi'],
      order: 4,
    },
    {
      title: 'Nhật thực và nguyệt thực là gì?',
      slug: 'nhat-thuc-nguyet-thuc-la-gi',
      summary:
        'Giải thích hình học đơn giản của nhật thực và nguyệt thực, tại sao không xảy ra mỗi tháng và cách quan sát an toàn.',
      categorySlug: 'level-1-beginner',
      readTime: 8,
      tags: ['beginner', 'eclipse', 'earth-moon-sun'],
      sections: [
        {
          type: 'text',
          title: 'Ba nhân vật chính: Mặt Trời – Trái Đất – Mặt Trăng',
          content:
            'Nhật thực và nguyệt thực là hai hiện tượng đặc biệt liên quan đến vị trí tương đối của Mặt Trời, Trái Đất và Mặt Trăng.\n\nKhi ba thiên thể này xếp gần thẳng hàng, bóng của một trong số chúng có thể che khuất ánh sáng của Mặt Trời theo những cách thú vị.',
        },
        {
          type: 'text',
          title: 'Nhật thực: Mặt Trăng che Mặt Trời',
          content:
            'Nhật thực xảy ra khi Mặt Trăng đi ngang qua giữa Trái Đất và Mặt Trời, che một phần hoặc toàn bộ đĩa Mặt Trời.\n\nTa có các loại nhật thực: toàn phần, một phần, hình khuyên – tùy vị trí người quan sát và khoảng cách tương đối giữa các thiên thể.',
        },
        {
          type: 'text',
          title: 'Nguyệt thực: Trái Đất che Mặt Trăng',
          content:
            'Nguyệt thực xảy ra khi Trái Đất nằm giữa Mặt Trời và Mặt Trăng. Bóng Trái Đất che khuất ánh sáng Mặt Trời chiếu lên Mặt Trăng.\n\nTrong nguyệt thực toàn phần, Mặt Trăng thường chuyển sang màu đỏ do ánh sáng Mặt Trời bị khúc xạ qua khí quyển Trái Đất.',
        },
        {
          type: 'text',
          title: 'Tại sao không có nhật/nguyệt thực mỗi tháng?',
          content:
            'Mặt Trăng quay quanh Trái Đất trên một quỹ đạo hơi nghiêng so với quỹ đạo Trái Đất quanh Mặt Trời. Vì vậy, phần lớn thời gian, bóng của các thiên thể không xếp thẳng hàng hoàn hảo.\n\nChỉ khi điều kiện hình học phù hợp, nhật thực hoặc nguyệt thực mới xảy ra.',
        },
        {
          type: 'text',
          title: 'Quan sát nhật thực an toàn',
          content:
            'Không bao giờ nhìn trực tiếp Mặt Trời trong nhật thực mà không có dụng cụ bảo vệ mắt chuyên dụng.\n\nĐể an toàn, hãy dùng kính lọc đạt chuẩn, hộp chiếu lỗ kim, hoặc theo dõi qua truyền hình/trực tuyến từ các đài quan sát.',
        },
      ],
      relatedSlugs: ['he-mat-troi-la-gi', 'quan-sat-bau-troi-bang-mat-thuong'],
      order: 5,
    },
    {
      title: 'Quan sát bầu trời đêm bằng mắt thường',
      slug: 'quan-sat-bau-troi-bang-mat-thuong',
      summary:
        'Hướng dẫn người mới bắt đầu quan sát bầu trời: chọn địa điểm, thời gian, nhận diện vài chòm sao và dùng ứng dụng bản đồ sao.',
      categorySlug: 'level-1-beginner',
      readTime: 8,
      tags: ['beginner', 'stargazing'],
      sections: [
        {
          type: 'text',
          title: 'Chọn địa điểm và thời gian',
          content:
            'Để thấy bầu trời đêm rõ hơn, hãy chọn nơi ít đèn đường, xa trung tâm thành phố nếu có thể. Bầu trời quang mây và không có trăng sáng sẽ giúp bạn nhìn thấy nhiều sao hơn.\n\nThời điểm sau hoàng hôn khoảng 1–2 giờ là lúc bầu trời khá tối nhưng bạn vẫn còn đủ tỉnh táo để quan sát.',
        },
        {
          type: 'text',
          title: 'Để mắt thích nghi với bóng tối',
          content:
            'Mắt người cần khoảng 15–30 phút để thích nghi hoàn toàn với bóng tối. Trong thời gian này, hãy hạn chế nhìn vào màn hình điện thoại quá sáng hoặc đèn mạnh.\n\nBạn có thể dùng chế độ ánh sáng đỏ trên app thiên văn để bảo vệ khả năng nhìn trời tối.',
        },
        {
          type: 'text',
          title: 'Nhận diện vài “mốc” lớn trên bầu trời',
          content:
            'Bắt đầu bằng việc tìm Dải Ngân Hà (nếu khu vực quan sát đủ tối) và một vài chòm sao nổi tiếng như Orion, Đại Hùng, Nam Thập Tự (tùy bán cầu).\n\nKhông cần nhớ hết ngay, chỉ cần mỗi đêm làm quen với 1–2 chòm sao mới.',
        },
        {
          type: 'text',
          title: 'Dùng ứng dụng và bản đồ sao',
          content:
            'Có nhiều ứng dụng miễn phí cho phép bạn giơ điện thoại lên trời và xem tên sao/chòm sao. Hãy dùng chúng như “bản đồ sống” để hỗ trợ, nhưng đừng phụ thuộc hoàn toàn.\n\nKhi đã quen, bạn sẽ dần nhận ra các hình dạng trên bầu trời mà không cần app.',
        },
        {
          type: 'text',
          title: 'Ghi chú và chụp ảnh đơn giản',
          content:
            'Hãy ghi lại ngày giờ, vị trí và những gì bạn quan sát được. Nếu có tripod và điện thoại, bạn có thể thử chụp phơi sáng vài giây để bắt được nhiều sao hơn.\n\nNhững ghi chú và bức ảnh đầu tiên sẽ là kỷ niệm quý giá trên hành trình khám phá bầu trời.',
        },
      ],
      relatedSlugs: ['nhat-thuc-nguyet-thuc-la-gi', 'thien-ha-la-gi'],
      order: 6,
    },
    {
      title: 'Thiên hà là gì? Dải Ngân Hà trông như thế nào?',
      slug: 'thien-ha-la-gi',
      summary:
        'Giới thiệu thiên hà như “thành phố sao”, mô tả Dải Ngân Hà – thiên hà của chúng ta – và các loại thiên hà khác nhau.',
      categorySlug: 'level-1-beginner',
      readTime: 9,
      tags: ['beginner', 'galaxies'],
      sections: [
        {
          type: 'text',
          title: 'Thiên hà – “thành phố sao” trong vũ trụ',
          content:
            'Một thiên hà là một tập hợp khổng lồ gồm các ngôi sao, khí, bụi và (theo các mô hình hiện tại) một lượng lớn vật chất tối.\n\nBạn có thể tưởng tượng thiên hà như một “thành phố” chứa hàng trăm tỷ ngôi sao – trong đó Mặt Trời chỉ là một cư dân nhỏ bé.',
        },
        {
          type: 'text',
          title: 'Dải Ngân Hà từ Trái Đất nhìn lên',
          content:
            'Trong những đêm trời tối và ít ô nhiễm ánh sáng, bạn có thể nhìn thấy một dải sáng mờ kéo dài trên bầu trời – đó chính là Dải Ngân Hà (Milky Way).\n\nThực chất, đó là hình ảnh ta nhìn dọc theo mặt phẳng thiên hà từ bên trong, nơi tập trung rất nhiều sao và bụi khí.',
        },
        {
          type: 'text',
          title: 'Hình dạng thiên hà của chúng ta',
          content:
            'Dải Ngân Hà được cho là một thiên hà xoắn ốc dạng thanh. Mặt Trời nằm ở một nhánh xoắn ốc cách tâm thiên hà khoảng 25–27 nghìn năm ánh sáng.\n\nChúng ta không thể “chụp” Dải Ngân Hà từ bên ngoài, nhưng có thể dựng lại hình dạng dựa trên quan sát sao, khí và chuyển động quay.',
        },
        {
          type: 'text',
          title: 'Các loại thiên hà khác',
          content:
            'Quan sát vũ trụ sâu cho thấy nhiều loại thiên hà:\n\n- Thiên hà xoắn ốc với các nhánh xoắn sáng.\n- Thiên hà elip có dạng bầu dục trơn.\n- Thiên hà bất thường không có hình dạng rõ ràng.\n\nMỗi loại mang theo những câu chuyện khác nhau về lịch sử hình thành và va chạm của chúng.',
        },
        {
          type: 'text',
          title: 'Khoảng cách giữa các thiên hà',
          content:
            'Các thiên hà thường tụ thành nhóm và cụm, nhưng khoảng cách giữa chúng vẫn rất lớn – thường là hàng triệu tới hàng chục triệu năm ánh sáng.\n\nThiên hà gần Dải Ngân Hà nhất có kích thước đáng kể là Andromeda, cách chúng ta khoảng 2,5 triệu năm ánh sáng.',
        },
      ],
      relatedSlugs: ['vu-tru-la-gi', 'light-year-la-gi'],
      order: 7,
    },

    // =========================
    // Level 2 — Explorer (sơ bộ)
    // =========================
    {
      title: 'Cơ học quỹ đạo cơ bản (phiên bản trực giác)',
      slug: 'co-hoc-quy-dao-co-ban',
      summary:
        'Giải thích trực giác tại sao các hành tinh có quỹ đạo, tại sao không rơi vào Mặt Trời và mối liên hệ giữa vận tốc, khoảng cách và chu kỳ quay.',
      categorySlug: 'level-2-explorer',
      readTime: 12,
      tags: ['explorer', 'orbits', 'gravity'],
      sections: [
        {
          type: 'text',
          title: 'Tại sao Trái Đất không rơi vào Mặt Trời?',
          content:
            'Nếu chỉ có lực hấp dẫn, ta có thể nghĩ rằng Trái Đất sẽ “rơi” thẳng vào Mặt Trời. Tuy nhiên, Trái Đất còn có vận tốc ngang rất lớn.\n\nKết quả là nó liên tục “rơi” quanh Mặt Trời – giống như việc bạn ném một vật rất nhanh theo phương ngang và nó mãi không chạm đất vì Trái Đất cong xuống dưới.',
        },
        {
          type: 'text',
          title: 'Quỹ đạo tròn và quỹ đạo ellipse (ý tưởng)',
          content:
            'Trong trường hợp lý tưởng với vận tốc và khoảng cách phù hợp, quỹ đạo có thể gần như tròn.\n\nTrong thực tế, quỹ đạo của các hành tinh là các ellipse hơi méo, như Kepler đã mô tả. Bạn có thể tưởng tượng chúng như những vòng tròn hơi kéo dẹt.',
        },
        {
          type: 'text',
          title: 'Chu kỳ quay và khoảng cách',
          content:
            'Các hành tinh xa Mặt Trời hơn thường có chu kỳ quay quanh Mặt Trời dài hơn. Điều này phù hợp với ý tưởng trực giác: đường đi dài hơn và lực hấp dẫn yếu hơn → quay chậm hơn.\n\nCác định luật Kepler mô tả mối quan hệ này chính xác bằng toán học, nhưng ở cấp này bạn chỉ cần nắm được xu hướng.',
        },
        {
          type: 'text',
          title: 'Quỹ đạo không chỉ có ở Hệ Mặt Trời',
          content:
            'Khái niệm quỹ đạo xuất hiện ở nhiều nơi: vệ tinh nhân tạo quay quanh Trái Đất, sao quay quanh tâm thiên hà, thậm chí cả các thiên hà quay quanh nhau.\n\nCơ học quỹ đạo là “ngôn ngữ” chung cho rất nhiều hệ thống trong vũ trụ.',
        },
      ],
      relatedSlugs: ['he-mat-troi-la-gi', 'nhat-thuc-nguyet-thuc-la-gi'],
      order: 1,
    },
    {
      title: 'Ánh sáng và phổ sao (phiên bản đơn giản)',
      slug: 'anh-sang-va-pho-sao-co-ban',
      summary:
        'Giới thiệu khái niệm phổ ánh sáng của sao, cách các vạch phổ tiết lộ nhiệt độ, thành phần hóa học và chuyển động.',
      categorySlug: 'level-2-explorer',
      readTime: 12,
      tags: ['explorer', 'light', 'spectrum'],
      sections: [
        {
          type: 'text',
          title: 'Ánh sáng chứa nhiều thông tin hơn ta tưởng',
          content:
            'Khi bạn nhìn ánh sáng trắng, thật ra đó là sự trộn lẫn của rất nhiều bước sóng khác nhau.\n\nBằng cách “trải” ánh sáng ra thành quang phổ (giống như cầu vồng), ta có thể đọc được nhiều thông tin về nguồn phát sáng.',
        },
        {
          type: 'text',
          title: 'Phổ liên tục, vạch phát xạ và vạch hấp thụ',
          content:
            'Trong thiên văn học, ta thường gặp ba kiểu phổ: liên tục, vạch phát xạ và vạch hấp thụ. Mỗi kiểu có hình dạng đặc trưng.\n\nCác nguyên tố hóa học tạo ra những “vân tay” là các vạch phổ tại những bước sóng nhất định.',
        },
        {
          type: 'text',
          title: 'Từ phổ đến nhiệt độ và thành phần sao',
          content:
            'Màu sắc và hình dạng phổ cho biết nhiệt độ bề mặt sao. Các vạch hấp thụ/ phát xạ tiết lộ các nguyên tố có mặt trong bầu khí quyển sao.\n\nNhờ đó, ta có thể “phân tích phòng thí nghiệm” cho một ngôi sao cách xa hàng trăm năm ánh sáng.',
        },
      ],
      relatedSlugs: ['tai-sao-sao-co-mau-khac-nhau', 'vu-tru-la-gi'],
      order: 2,
    },

    // =========================
    // Level 3 — Research (sơ bộ)
    // =========================
    {
      title: 'Dataset thiên văn là gì? Nhập môn survey hiện đại',
      slug: 'dataset-thien-van-la-gi',
      summary:
        'Giới thiệu khái niệm survey/dataset trong thiên văn hiện đại, các ví dụ như SDSS, Gaia, LSST và ý tưởng cơ bản về pipeline dữ liệu.',
      categorySlug: 'level-3-research',
      readTime: 12,
      tags: ['research', 'dataset', 'survey'],
      sections: [
        {
          type: 'text',
          title: 'Từ quan sát đơn lẻ đến survey lớn',
          content:
            'Thiên văn học ngày nay không chỉ là việc “chụp vài tấm ảnh đẹp”. Các kính thiên văn hiện đại liên tục quét bầu trời, tạo ra các bộ dữ liệu (dataset) khổng lồ.\n\nNhững chiến dịch quan sát có hệ thống này thường được gọi là **survey**.',
        },
        {
          type: 'text',
          title: 'Ví dụ về các survey nổi tiếng',
          content:
            'Một vài survey/dataset thường gặp:\n\n- SDSS: khảo sát quang học bầu trời, cung cấp ảnh và phổ cho hàng triệu thiên thể.\n- Gaia: đo vị trí và chuyển động của hơn một tỷ ngôi sao trong Dải Ngân Hà.\n- LSST (Rubin Observatory): dự kiến sẽ chụp lại toàn bộ bầu trời nhìn thấy mỗi vài ngày.\n\nCác dataset này là nền tảng cho nhiều nghiên cứu astrophysics và data science.',
        },
        {
          type: 'text',
          title: 'Pipeline dữ liệu cơ bản',
          content:
            'Một pipeline đơn giản trong thiên văn dữ liệu thường gồm:\n\n1. Thu thập ảnh hoặc tín hiệu từ kính thiên văn.\n2. Hiệu chỉnh thiết bị, trừ nhiễu nền, chuẩn hóa.\n3. Phát hiện nguồn (source detection) và trích xuất thông số (độ sáng, màu, hình dạng...).\n4. Lưu trữ trong catalog để truy vấn và phân tích sau.\n\nTừ catalog, các nhà khoa học có thể đặt câu hỏi và xây dựng mô hình thống kê hoặc machine learning.',
        },
      ],
      relatedSlugs: ['machine-learning-trong-phan-loai-thien-ha', 'thien-ha-la-gi'],
      order: 1,
    },
    {
      title: 'Machine learning trong phân loại thiên hà (tổng quan)',
      slug: 'machine-learning-trong-phan-loai-thien-ha',
      summary:
        'Tổng quan cách machine learning được dùng để phân loại hình dạng thiên hà từ ảnh và dữ liệu catalog, lấy cảm hứng từ các dự án như Galaxy Zoo.',
      categorySlug: 'level-3-research',
      readTime: 12,
      tags: ['research', 'machine-learning', 'galaxies'],
      sections: [
        {
          type: 'text',
          title: 'Bài toán: phân loại thiên hà',
          content:
            'Thiên hà có nhiều hình dạng: xoắn ốc, elip, bất thường. Việc phân loại hàng triệu thiên hà bằng mắt là bất khả thi.\n\nMachine learning cho phép huấn luyện mô hình dự đoán kiểu thiên hà dựa trên ảnh hoặc thông số trích xuất từ ảnh.',
        },
        {
          type: 'text',
          title: 'Galaxy Zoo và nhãn từ cộng đồng',
          content:
            'Dự án Galaxy Zoo đã huy động hàng trăm nghìn tình nguyện viên phân loại thiên hà bằng mắt. Kết quả được tổng hợp thành bộ nhãn chất lượng cao.\n\nNhững nhãn này sau đó được dùng để huấn luyện và kiểm tra các mô hình machine learning.',
        },
        {
          type: 'text',
          title: 'Từ ảnh đến feature và mô hình',
          content:
            'Một pipeline đơn giản có thể gồm:\n\n1. Thu thập ảnh thiên hà từ survey.\n2. Chuẩn hóa, cắt ảnh quanh thiên hà.\n3. Dùng CNN hoặc trích xuất feature truyền thống (độ tròn, độ dẹt, moment hình dạng...).\n4. Huấn luyện model (CNN, random forest, gradient boosting...) để dự đoán lớp.\n\nMục tiêu là tái hiện (hoặc vượt) chất lượng phân loại của con người trên quy mô lớn.',
        },
      ],
      relatedSlugs: ['dataset-thien-van-la-gi', 'thien-ha-la-gi'],
      order: 2,
    },
  ];

  // Seed tutorial tracks (tree-style lộ trình)
  const existingTracks = await TutorialTrack.find().lean();
  if (existingTracks.length === 0) {
    await TutorialTrack.create({
      title: 'Astronomy Tutorials',
      slug: 'astronomy-tutorials',
      description:
        'Lộ trình học thiên văn học: từ khái niệm cơ bản về vũ trụ, Hệ Mặt Trời đến astrophysics, dataset và machine learning.',
      icon: '🌌',
      level: 1,
      order: 1,
      topics: [
        {
          title: 'Level 1 — Beginner',
          description: 'Khởi động với vũ trụ, Hệ Mặt Trời và cách quan sát bầu trời.',
          order: 1,
          subtopics: [
            {
              title: 'Vũ trụ & khoảng cách',
              description: 'Khái niệm vũ trụ, Big Bang và đơn vị đo khoảng cách.',
              order: 1,
              items: [
                {
                  title: 'Vũ trụ là gì? Từ Big Bang đến hôm nay',
                  tutorialSlug: 'vu-tru-la-gi',
                  description: 'Bối cảnh lớn của vũ trụ và lịch sử phát triển.',
                  order: 1,
                },
                {
                  title: 'Light-year là gì? Đơn vị đo khoảng cách trong vũ trụ',
                  tutorialSlug: 'light-year-la-gi',
                  description: 'Cách đo khoảng cách cực lớn bằng năm ánh sáng, AU, parsec.',
                  order: 2,
                },
              ],
            },
            {
              title: 'Hệ Mặt Trời & Trái Đất',
              description: 'Hệ Mặt Trời, Mặt Trời, nhật thực/nguyệt thực.',
              order: 2,
              items: [
                {
                  title: 'Hệ Mặt Trời là gì? Hàng xóm quanh Mặt Trời',
                  tutorialSlug: 'he-mat-troi-la-gi',
                  description: 'Toàn cảnh Hệ Mặt Trời: hành tinh, hành tinh lùn, sao chổi, tiểu hành tinh.',
                  order: 1,
                },
                {
                  title: 'Mặt Trời là gì? Ngôi sao của Hệ Mặt Trời',
                  tutorialSlug: 'mat-troi-la-gi',
                  description: 'Cấu trúc, năng lượng và vai trò của Mặt Trời.',
                  order: 2,
                },
                {
                  title: 'Nhật thực và nguyệt thực là gì?',
                  tutorialSlug: 'nhat-thuc-nguyet-thuc-la-gi',
                  description: 'Hình học đơn giản của nhật thực/nguyệt thực và cách quan sát an toàn.',
                  order: 3,
                },
              ],
            },
            {
              title: 'Thiên hà & quan sát bầu trời',
              description: 'Thiên hà và hướng dẫn quan sát bầu trời đêm.',
              order: 3,
              items: [
                {
                  title: 'Thiên hà là gì? Dải Ngân Hà trông như thế nào?',
                  tutorialSlug: 'thien-ha-la-gi',
                  description: 'Thiên hà như “thành phố sao” và vị trí của chúng ta trong Dải Ngân Hà.',
                  order: 1,
                },
                {
                  title: 'Quan sát bầu trời đêm bằng mắt thường',
                  tutorialSlug: 'quan-sat-bau-troi-bang-mat-thuong',
                  description: 'Hướng dẫn chọn địa điểm, làm quen chòm sao và dùng app bản đồ sao.',
                  order: 2,
                },
              ],
            },
          ],
        },
        {
          title: 'Level 2 — Explorer',
          description: 'Hiểu sâu hơn về cơ học quỹ đạo và ánh sáng.',
          order: 2,
          subtopics: [
            {
              title: 'Quỹ đạo & hấp dẫn',
              description: 'Trực giác về chuyển động quỹ đạo.',
              order: 1,
              items: [
                {
                  title: 'Cơ học quỹ đạo cơ bản (phiên bản trực giác)',
                  tutorialSlug: 'co-hoc-quy-dao-co-ban',
                  description: 'Tại sao hành tinh không rơi vào Mặt Trời, quỹ đạo tròn/ellipse.',
                  order: 1,
                },
              ],
            },
            {
              title: 'Ánh sáng & phổ sao',
              description: 'Cách ánh sáng tiết lộ thông tin về sao.',
              order: 2,
              items: [
                {
                  title: 'Ánh sáng và phổ sao (phiên bản đơn giản)',
                  tutorialSlug: 'anh-sang-va-pho-sao-co-ban',
                  description: 'Cách đọc “vân tay” ánh sáng để hiểu nhiệt độ và thành phần sao.',
                  order: 1,
                },
              ],
            },
          ],
        },
        {
          title: 'Level 3 — Research',
          description: 'Dataset, survey và machine learning trong thiên văn.',
          order: 3,
          subtopics: [
            {
              title: 'Dataset & survey',
              description: 'Các survey lớn như SDSS, Gaia, LSST.',
              order: 1,
              items: [
                {
                  title: 'Dataset thiên văn là gì? Nhập môn survey hiện đại',
                  tutorialSlug: 'dataset-thien-van-la-gi',
                  description: 'Khái niệm survey và pipeline dữ liệu cơ bản.',
                  order: 1,
                },
              ],
            },
            {
              title: 'Machine Learning trong thiên văn',
              description: 'Ứng dụng ML để phân loại thiên hà.',
              order: 2,
              items: [
                {
                  title: 'Machine learning trong phân loại thiên hà (tổng quan)',
                  tutorialSlug: 'machine-learning-trong-phan-loai-thien-ha',
                  description: 'Sử dụng ML để phân loại thiên hà từ ảnh và catalog.',
                  order: 1,
                },
              ],
            },
          ],
        },
      ],
    });
    console.log('Created tutorial track: astronomy-tutorials');
  }

  for (const t of tutorials) {
    const cat = catBySlug[t.categorySlug];
    if (!cat) {
      console.warn('Missing category for tutorial', t.slug);
      continue;
    }
    const existing = await Tutorial.findOne({ slug: t.slug });
    if (existing) {
      console.log('Tutorial exists, skip:', t.slug);
      continue;
    }
    await Tutorial.create({
      title: t.title,
      slug: t.slug,
      summary: t.summary,
      categoryId: cat._id,
      readTime: t.readTime,
      tags: t.tags,
      sections: t.sections,
      relatedSlugs: t.relatedSlugs,
      published: true,
    });
    console.log('Created tutorial:', t.slug);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

