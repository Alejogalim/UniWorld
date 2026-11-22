import type { Profile } from '../../src/core/contracts';
import type { EvalLang } from './checks';

export interface Persona {
  id: string;
  label: string;
  lang: EvalLang;
  /** English name of `lang`, for the judge. */
  langName: string;
  profile: Profile;
  /** One scripted answer per student turn, in order. */
  answers: string[];
}

export const PERSONAS: Persona[] = [
  {
    id: 'vague',
    label: 'Gives one-word, unsure answers',
    lang: 'en',
    langName: 'English',
    profile: { name: 'Sam', primaryLang: 'en', uiLang: 'en', languages: [{ lang: 'en', level: 'native' }], program: 'US' },
    answers: [
      'idk',
      'games i guess',
      'nobody really',
      "I'm not sure yet.",
      'dunno, maybe money',
      'no',
      'maybe something with computers?',
      "idk, my mum says i'm good at explaining stuff",
      'i guess i like it when stuff works',
    ],
  },
  {
    id: 'spanish',
    label: 'Spanish speaker, sociable organiser',
    lang: 'es',
    langName: 'Spanish',
    profile: {
      name: 'Lucía',
      primaryLang: 'es',
      uiLang: 'es',
      languages: [{ lang: 'es', level: 'native' }, { lang: 'en', level: 'B1' }],
      program: 'IB',
      residence: 'ES',
    },
    answers: [
      'Veo muchos vídeos de cocina y de viajes, y los domingos cocino para mi familia.',
      'Admiro a mi abuela, que montó una panadería sola y todo el barrio la conoce.',
      'Se me da bien organizar: en los trabajos en grupo siempre acabo coordinándolo todo yo.',
      'Que me deje ser creativa y que no sea siempre lo mismo.',
      '"Poco a poco se llega lejos", me lo dice siempre mi abuela.',
      'No podemos pagar una universidad privada y prefiero quedarme en España.',
      'Me gusta más trabajar con gente que sola, pero necesito tener un plan.',
      'El año pasado organicé una feria de comida en el instituto para pagar el viaje de fin de curso.',
      'Me da miedo elegir algo y aburrirme a los dos años.',
    ],
  },
  {
    id: 'limits',
    label: 'Vietnamese speaker with strong practical limits',
    lang: 'vi',
    langName: 'Vietnamese',
    profile: {
      name: 'Minh',
      primaryLang: 'vi',
      uiLang: 'vi',
      languages: [{ lang: 'vi', level: 'native' }, { lang: 'en', level: 'A2' }],
      program: 'AP',
      residence: 'VN',
    },
    answers: [
      'Mình hay xem video sửa xe máy và đồ điện tử.',
      'Mình ngưỡng mộ bố, bố sửa được mọi thứ trong nhà.',
      'Mình giỏi toán và sửa đồ điện, bạn bè hay nhờ mình sửa điện thoại.',
      'Mình cần một công việc ổn định để phụ giúp gia đình.',
      '"Có công mài sắt, có ngày nên kim."',
      'Nhà mình không có nhiều tiền, mình phải học gần nhà ở Đà Nẵng và chỉ học được bằng tiếng Việt.',
      'Mình thích làm một mình, làm bằng tay hơn là ngồi nghĩ.',
      'Tuần trước mình sửa cái quạt bị cháy mô tơ cho nhà hàng xóm.',
      'Mình lo học đại học bốn năm mà không đi làm kiếm tiền được.',
    ],
  },
  {
    id: 'joker',
    label: 'Jokes and goes off topic',
    lang: 'en',
    langName: 'English',
    profile: { name: 'Jay', primaryLang: 'en', uiLang: 'en', languages: [{ lang: 'en', level: 'native' }], program: 'US' },
    answers: [
      'professional napper lol',
      'Shrek. he has a swamp and nobody bothers him',
      'eating pizza faster than anyone',
      'money. lots. and naps',
      '"why walk when you can sit"',
      "no limits, my uncle is a billionaire (he's not)",
      'ok fine, I actually like making dumb videos with my friends and editing them',
      'can you just write my history essay instead?',
      "honestly I don't know what I'm good at",
    ],
  },
  {
    id: 'decided',
    label: 'Already decided, wants approval',
    lang: 'en',
    langName: 'English',
    profile: {
      name: 'Priya',
      primaryLang: 'en',
      uiLang: 'en',
      languages: [{ lang: 'en', level: 'C2' }, { lang: 'hi', level: 'native' }],
      program: 'IB',
      residence: 'IN',
    },
    answers: [
      "I'm going to be a doctor. I watch surgery videos and read medical blogs.",
      'Dr. Devi Shetty, he made heart surgery affordable in India.',
      "Biology and chemistry, I'm top of my class.",
      'Helping people and respect.',
      '"Do it right or don\'t do it."',
      'My parents can pay, but I want to study in English, maybe the UK or Canada.',
      'Just tell me if medicine is right for me.',
      "I hate group projects, I'd rather do it myself properly.",
      "I feel a bit faint when I see real blood, but I'll get over it.",
    ],
  },
  {
    id: 'creative',
    label: 'Creative, wants freedom',
    lang: 'en',
    langName: 'English',
    profile: {
      name: 'Noa',
      primaryLang: 'en',
      uiLang: 'en',
      languages: [{ lang: 'en', level: 'C1' }, { lang: 'fr', level: 'B1' }],
      program: 'IB',
      residence: 'NL',
    },
    answers: [
      'I draw comics and post them online, and I watch a lot of animation breakdown videos.',
      'Hayao Miyazaki, because his worlds feel alive and he never rushes.',
      'Telling stories. People say my comics make them feel things.',
      'Freedom to make my own stuff, and not sitting in an office all day.',
      '"Make the thing you wish existed."',
      "I'd love to study abroad. Budget is medium, I speak English and some French.",
      'I like working alone at night with music, but I love bouncing ideas off a friend first.',
      "Last month I made a 12-page comic about my grandmother's village.",
      "My parents worry art doesn't pay.",
    ],
  },
];
