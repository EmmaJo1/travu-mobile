import type { ReflectionCardData } from '@/components/trip/ReflectionCard';
import type { QuestionCardData } from '@/components/trip/QuestionCard';

export interface ReflectionCardItem extends ReflectionCardData {
  id: string;
}

export interface ReflectionQuestionItem extends QuestionCardData {
  id: string;
}

/** Figma mypage-reflection — ReflectionCard mock */
export const MOCK_REFLECTION_CARDS: ReflectionCardItem[] = [
  {
    id: 'ref-1',
    country: 'Paris, France',
    date: '2025.8.25-9.1',
    reflection: '효율만 추구할수록 놓치는 행복이 있다는 걸 느꼈다. 비효율적인 순간이 오히려 여행의 핵심 장면으로 남았다.',
  },
  {
    id: 'ref-2',
    country: 'Sydney, Australia',
    date: '2025.3.5-3.15',
    reflection: '낯선 도시에서 혼자였지만, 오히려 그게 나를 더 자유롭게 만들었다. 이 여행이 오래 기억될 것 같다.',
  },
  {
    id: 'ref-3',
    country: 'Kyoto, Japan',
    date: '2025.3.30-4.3',
    reflection: '계획하지 않은 골목을 걷는 시간이 이번 여행의 가장 선명한 장면으로 남았다.',
  },
  {
    id: 'ref-4',
    country: 'Portugal',
    date: '2025.4.1-4.12',
    reflection: '느린 산책과 우연한 만남이 이번 여행의 핵심이었다.',
  },
  {
    id: 'ref-5',
    country: 'Bondi Beach',
    date: '2025.3.6',
    reflection: '파도 소리와 함께 하루를 마무리하며, 여행의 감각을 다시 깨웠다.',
  },
];

export const MOCK_QUESTION_CARDS: ReflectionQuestionItem[] = [
  {
    id: 'q-1',
    question: '이번 여행에서 새롭게 발견한 나는?',
    answer: '사진을 찍고 보정하는 과정 자체를 즐기는 사람이었다.',
    date: '2025.8.25-9.1',
    city: 'Paris, France',
  },
  {
    id: 'q-2',
    question: '오늘 가장 설렜던 순간은?',
    answer: '본다이 비치에서 파도를 맞으며 걸을 때 진짜 자유로움을 느꼈다.',
    date: '2025.3.6',
    city: 'Sydney, Australia',
  },
  {
    id: 'q-3',
    question: '다시 가고 싶은 장소는?',
    answer: '교토의 작은 골목 카페. 아침 햇살이 특히 좋았다.',
    date: '2025.3.30-4.3',
    city: 'Kyoto, Japan',
  },
];
