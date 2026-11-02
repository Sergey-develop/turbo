export interface NavItem { label: string; href: string }
export const nav: NavItem[] = [
  { label: 'О событии', href: '#about' }, { label: 'Программа', href: '#program' },
  { label: 'Спикеры', href: '#speakers' }, { label: 'Как добраться', href: '#location' }, { label: 'FAQ', href: '#faq' },
]
export interface ProgramItem { title: string; time: string }
export const program: ProgramItem[] = [
  { title: 'Сбор гостей', time: '14:00' }, { title: 'Открытие', time: '15:00' },
  { title: 'Деловая программа', time: '16:00' }, { title: 'Деловое общение', time: '17:00' }, { title: 'Турбо-рейв', time: '18:00' },
]
export interface Speaker { id: number; name: string; role: string; topic: string }
// Имена и повторяющиеся портреты сохранены как в предоставленном макете.
export const speakers: Speaker[] = Array.from({ length: 8 }, (_, id) => ({
  id, name: id === 2 ? 'Алексей Волков' : 'Артем Волков', role: 'Креативный директор',
  topic: 'Тема доклада спикера Тема доклада спикера Тема доклада спикера Тема доклада спикера Тема доклада спикера',
}))
export const routeUrl = 'https://yandex.ru/maps/?text=' + encodeURIComponent('Москва, 2-я Бауманская улица, 9/23, Суперметалл')
