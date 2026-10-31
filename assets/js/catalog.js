/**
 * Everything the page lists. Add, remove or reorder items here; the page renders from this file.
 *
 * Course fields
 *   id          unique slug; also the image name: assets/img/courses/<id>-400.webp and -800.webp
 *   title       shown on the card
 *   category    one of COURSE_CATEGORIES[].id
 *   url         enrol page
 *   price       regular price in BDT from the course page; the card also shows the coupon price
 *   highlights  2–3 short facts printed on the banner (keep them true to the banner)
 *
 * Book fields (every book is sold on Rokomari; link straight to the product page)
 *   id, title, category (one of BOOK_CATEGORIES[].id), url
 *   Cover image: assets/img/books/<id>.webp (260x372). No field to set; the file name is the id.
 */

export const COURSE_CATEGORIES = [
  { id: 'varsity', label: 'ভার্সিটি' },
  { id: 'medical', label: 'মেডিকেল' },
  { id: 'engineering', label: 'ইঞ্জিনিয়ারিং' },
  { id: 'gst', label: 'GST ও কৃষি' },
  { id: 'nursing', label: 'নার্সিং' },
  { id: 'private', label: 'প্রাইভেট ভার্সিটি' },
];

export const COURSES = [
  // The five main complete courses come first (owner request, 2026-10-31).
  {
    id: 'varsity-a-complete',
    title: 'HulkenStein Varsity A Unit Admission Course',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/580',
    price: 3500,
    highlights: ['120+ ভার্সিটি ক অ্যাডমিশন স্ট্যান্ডার্ড Class', '৫০০+ টপিকভিত্তিক এক্সাম', 'ক ইউনিট অ্যানালাইসিস মেগাবুক (ই-বুক)'],
  },
  {
    id: 'varsity-b-complete',
    title: 'Varsity B UNIT Complete Admission Course 2026',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/576',
    price: 3500,
    highlights: ['১০০+ এডমিশন ক্লাস', '৪০+ একাডেমিক ক্লাস', 'B/D Unit Analysis Megabook (ই-বুক)'],
  },
  {
    id: 'varsity-c-complete',
    title: 'Varsity C UNIT Complete Admission Course 2026',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/577',
    price: 3500,
    highlights: ['২০০+ রেকর্ড ক্লাস', '100+ Chapter Exams', 'DU C Unit Analysis MegaBook (E-book)'],
  },
  {
    id: 'medical-complete',
    title: 'Hulkenstein Medical Admission Complete Preparation Course',
    category: 'medical',
    url: 'https://edgecoursebd.com/courses/579',
    price: 3500,
    highlights: ['৮৫+ বিষয়ভিত্তিক ক্লাস', '৫০০+ টোটাল এক্সাম', 'QnA Analysis Megabook'],
  },
  {
    id: 'engineering-complete',
    title: 'HulkCore Engineering Admission-26 + Varsity Biology Course',
    category: 'engineering',
    url: 'https://edgecoursebd.com/courses/578',
    price: 3500,
    highlights: ['80+ Engineering Standard Class', '10+ Varsity Standard Biology Class', 'QNA Engineering Analysis Megabook (PDF)'],
  },
  {
    id: 'du-a-unit-written',
    title: 'Varsity A Unit Written Special Course',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/596',
    price: 1900,
    highlights: ['75+ Written Special Class', 'Lecture Sheet + Written Megabook', 'Hand calculation ও shortcut'],
  },
  {
    id: 'sust-crash',
    title: 'SUST Crash Course 26',
    category: 'engineering',
    url: 'https://edgecoursebd.com/courses/605',
    price: 1999,
    highlights: ['60+ Class', '30+ SUST QB Solving', '100+ Exam'],
  },
  {
    id: 'mist-sprint',
    title: 'MIST Admission Sprint 2.0',
    category: 'engineering',
    url: 'https://edgecoursebd.com/courses/606',
    price: 1999,
    highlights: ['20+ Class', '100+ Exam', 'বিগত প্রশ্ন অ্যানালাইসিস'],
  },
  {
    id: 'architecture',
    title: 'Architecture Preparation Course 2026',
    category: 'engineering',
    url: 'https://edgecoursebd.com/courses/587',
    price: 2000,
    highlights: ['15+ Recorded Class', 'BUET-এর ইন্সট্রাক্টর', 'QNA Architecture Megabook (PDF)'],
  },
  {
    id: 'ju-a-unit-ace',
    title: 'JU A-Unit Ace Course 2.0',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/581',
    price: 2500,
    highlights: ['40+ Basic Class', '40+ QB Solving Class', '200+ A Unit Standard Exam'],
  },
  {
    id: 'ju-d-unit-optimus',
    title: 'JU D-Unit Optimus Course 2.0',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/582',
    price: 2500,
    highlights: ['40+ Basic Class', '30+ QB Solving Class', '100+ D Unit Standard Exam'],
  },
  {
    id: 'cu-a-unit-crash',
    title: 'CU A-Unit Crash Course',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/450',
    price: 2050,
    highlights: ['32+ QB Solving Class', '100+ Exam', 'CU A Unit Analysis Ebook'],
  },
  {
    id: 'ru-c-unit-crash',
    title: 'RU C-Unit Crash Course',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/417',
    price: 2050,
    highlights: ['32+ QB Solving Class', '100+ RU C Unit Standard Exam', 'RU Analysis Megabook'],
  },
  {
    id: 'jnu-a-unit-crash',
    title: 'JNU A-Unit Crash Course',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/436',
    price: 2050,
    highlights: ['30+ Typewise QB Solving', '32+ Written Analysis Class', 'Class Slides'],
  },
  {
    id: 'bup-fst-crash',
    title: 'BUP Crash Course (FST) 2026',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/409',
    price: 2050,
    highlights: ['50 Recorded Class + PDF', 'BUP Standard Model Test', 'Live Solving Class'],
  },
  {
    id: 'iba-bba',
    title: 'IBA BBA Preparation 2026',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/593',
    price: 3499,
    highlights: ['30+ IBA Standard Class', '10 Final Mock Test', '22 Mini Quiz'],
  },
  {
    id: 'last-hope-biology',
    title: 'Last Hope Biology 2.0',
    category: 'varsity',
    url: 'https://edgecoursebd.com/courses/444',
    price: 450,
    highlights: ['20 Class', 'Top 1200 MCQ PDF', 'ঢাবি রিটেন সাজেশন'],
  },
  {
    id: 'gst-crash',
    title: 'GST Crash Course',
    category: 'gst',
    url: 'https://edgecoursebd.com/courses/500',
    price: 2050,
    highlights: ['30+ Conceptual Class (PCMB)', '35+ QB Solving Class', '5+ Final Model Test'],
  },
  {
    id: 'agri-gst-crash',
    title: 'Agri + GST Crash Course',
    category: 'gst',
    url: 'https://edgecoursebd.com/courses/110',
    price: 3499,
    highlights: ['64+ QB Solving Class', '200+ Exam', '5 Final Model Test'],
  },
  {
    id: 'nursing-bsc',
    title: 'B.Sc. in Nursing Admission Preparation',
    category: 'nursing',
    url: 'https://edgecoursebd.com/courses/592',
    price: 4999,
    highlights: ['১৫০+ ঘণ্টা ক্লাস', '100+ Nursing Test Exam', 'Personal Mentorship'],
  },
  {
    id: 'nursing-diploma',
    title: 'Diploma in Nursing Science & Midwifery Admission Preparation',
    category: 'nursing',
    url: 'https://edgecoursebd.com/courses/591',
    price: 4499,
    highlights: ['120+ Topic-wise Class', '200+ Exam', 'One-to-one Mentorship'],
  },
  {
    id: 'nursing-qb',
    title: 'Nursing QB Solving Course',
    category: 'nursing',
    url: 'https://edgecoursebd.com/courses/589',
    price: 999,
    highlights: ['৪০ ঘণ্টা QB Class', '২৫০০ পেজের স্লাইড ফ্রি', '২০ সেট Exam'],
  },
  {
    id: 'all-private-university',
    title: 'All Private University Crash Course',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/602',
    price: 4199,
    highlights: ['English, Math, Science — সব বিষয়', 'Free Premium Exam Batch', 'BracU + NSU Model Question Book'],
  },
  {
    id: 'mission-nsu',
    title: 'Mission NSU Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/599',
    price: 3699,
    highlights: ['15+ English, 20+ Math Class', 'Free Premium Exam Batch', 'NSU Model Question Book'],
  },
  {
    id: 'mission-bracu',
    title: 'Mission BracU Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/594',
    price: 3699,
    highlights: ['English, Math, Science Class', 'Free Premium Exam Batch', 'BracU Model Question Book'],
  },
  {
    id: 'mission-ewu',
    title: 'Mission EWU Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/603',
    price: 3699,
    highlights: ['English, Math, Science Class', 'Free Premium Exam Batch', 'Private University Analysis Megabook'],
  },
  {
    id: 'target-pharmacy',
    title: 'Target Pharmacy Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/601',
    price: 2899,
    highlights: ['English, Math, Chem, Bio Class', 'Free Premium Exam Batch', 'Private University Analysis Megabook'],
  },
  {
    id: 'target-llb',
    title: 'Target LLB Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/600',
    price: 2899,
    highlights: ['15+ English Class', '5 Essay Writing Class', 'Free Premium Exam Batch'],
  },
  {
    id: 'target-engineering',
    title: 'Target Engineering Spring 27',
    category: 'private',
    url: 'https://edgecoursebd.com/courses/604',
    price: 2899,
    highlights: ['15+ Math, 12+ Physics Class', 'Free Premium Exam Batch', 'Private University Analysis Megabook'],
  },
];

export const BOOK_CATEGORIES = [
  { id: 'analysis', label: 'অ্যানালাইসিস মেগাবুক' },
  { id: 'highlights', label: 'হাইলাইটস' },
  { id: 'written', label: 'রিটেন বই' },
];

export const BOOKS = [
  // The five main analysis megabooks come first (owner request, 2026-10-31).
  { id: 'varsity-a-analysis', title: 'QNA Varsity ক ইউনিট Analysis Megabook Bundle', category: 'analysis', url: 'https://www.rokomari.com/book/568057' },
  { id: 'varsity-b-analysis', title: 'QNA Varsity খ ইউনিট Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/568068' },
  { id: 'varsity-c-analysis', title: 'QNA Varsity গ ইউনিট Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/568067' },
  { id: 'medical-analysis', title: 'QNA Medical Analysis Megabook Bundle', category: 'analysis', url: 'https://www.rokomari.com/book/568066' },
  { id: 'engineering-analysis', title: 'QNA Engineering Analysis Megabook Bundle', category: 'analysis', url: 'https://www.rokomari.com/book/568061' },
  { id: 'ju-ad-analysis', title: 'QNA JU A+D Unit Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571704' },
  { id: 'ru-c-analysis', title: 'QNA RU C Unit Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571706' },
  { id: 'cu-a-analysis', title: 'QNA CU A Unit Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571708' },
  { id: 'sust-analysis', title: 'QNA SUST Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571705' },
  { id: 'agriculture-analysis', title: 'QNA Agriculture Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571715' },
  { id: 'gst-analysis', title: 'QNA GST Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571716' },
  { id: 'hstu-analysis', title: 'QNA HSTU Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571718' },
  { id: 'iut-analysis', title: 'QNA IUT Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571713' },
  { id: 'du-highlights', title: 'QNA DU Highlights', category: 'highlights', url: 'https://www.rokomari.com/book/571698' },
  { id: 'ju-highlights', title: 'QNA JU Highlights', category: 'highlights', url: 'https://www.rokomari.com/book/571703' },
  { id: 'sust-highlights', title: 'QNA SUST Highlights', category: 'highlights', url: 'https://www.rokomari.com/book/571700' },
  { id: 'ru-highlights', title: 'QNA RU Highlights', category: 'highlights', url: 'https://www.rokomari.com/book/571699' },
  { id: 'ku-highlights', title: 'QNA KU Highlights', category: 'highlights', url: 'https://www.rokomari.com/book/571701' },
  { id: 'engineering-written-practice', title: 'QNAPlex Engineering Written Practice Book', category: 'written', url: 'https://www.rokomari.com/book/571710' },
  { id: 'varsity-a-written', title: 'QNA Varsity ক ইউনিট Written Megabook', category: 'written', url: 'https://www.rokomari.com/book/570540/qna-varsity-a-unit-written-megabook' },
  { id: 'varsity-b-written', title: 'QNA Varsity খ ইউনিট Written Megabook', category: 'written', url: 'https://www.rokomari.com/book/570543/qna-varsity-b-unit-written-megabook' },
  { id: 'varsity-c-written', title: 'QNA Varsity গ ইউনিট Written Megabook', category: 'written', url: 'https://www.rokomari.com/book/570542/qna-varsity-c-unit-written-megabook' },
  { id: 'architecture-analysis', title: 'QNA Architecture Analysis Megabook', category: 'analysis', url: 'https://www.rokomari.com/book/571712' },
];

/** Where the free live sessions are streamed. */
export const LIVE_CHANNELS = [
  { id: 'anas-ferdous', name: 'A.S.M. Anas Ferdous', kind: 'Facebook Page', url: 'https://www.facebook.com/asmanasferdousofficial' },
  { id: 'hulkenstein', name: 'HulkenStein', kind: 'Facebook Page', url: 'https://www.facebook.com/HulkenSteinGroupOfficial' },
  { id: 'hulkenstein-humanities', name: 'Hulkenstein Humanities', kind: 'Facebook Page', url: 'https://www.facebook.com/edgecourseartscommerce' },
  { id: 'qna-publication', name: 'QNA Publication', kind: 'Facebook Page', url: 'https://www.facebook.com/qnapublication' },
  { id: 'hulkenstein-hsc', name: 'HulkenStein HSC', kind: 'YouTube Channel', url: 'https://www.youtube.com/@hulkensteinhsc' },
  { id: 'hulkenstein-hum-bs', name: 'HulkenStein Humanities & Business Studies', kind: 'YouTube Channel', url: 'https://www.youtube.com/@hulkenstein_artscommerce' },
  { id: 'hulkenstein-26-group', name: 'Hulkenstein 26', kind: 'Facebook Group', url: 'https://www.facebook.com/groups/1108219213600139' },
];

/**
 * The three items pictured in the hero's two path tiles (ids from COURSES and BOOKS).
 * The middle one sits in front. Pick visually different, portrait-friendly covers.
 */
export const FEATURED = {
  courses: ['medical-complete', 'varsity-a-complete', 'engineering-complete'],
  books: ['varsity-b-analysis', 'varsity-a-analysis', 'varsity-c-analysis'],
};
