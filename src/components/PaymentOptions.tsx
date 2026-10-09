import PaymentTerms from './PaymentTerms';
import type { Content } from '@/lib/content';
export default function PaymentOptions({ payments, telegram, price }: { price: number; payments: Content['payments']; telegram: string }) {
  const connected = payments.filter(p => p.status === 'available');
  return <details className="course-payment"><summary><span>Способы оплаты<small>Оплата частями · Рассрочка · Кредит</small></span><span aria-hidden="true">+</span></summary><div className="payment-options"><PaymentTerms price={price} />{connected.length ? connected.map(p => <a className="text-link" key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">{p.name}: перейти к провайдеру</a>) : <p>Онлайн-оплата пока не подключена.</p>}<a className="text-link" href={telegram} target="_blank" rel="noopener noreferrer">Уточнить способы оплаты в Telegram</a></div></details>;
}
