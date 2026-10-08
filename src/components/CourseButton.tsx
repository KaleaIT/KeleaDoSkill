import { ArrowUpRight } from 'lucide-react';
export default function CourseButton({ id }: { id: string }) { return <a className="button button-course" href={`/?course=${encodeURIComponent(id)}#apply`}>Выбрать курс <ArrowUpRight size={18} /></a>; }
