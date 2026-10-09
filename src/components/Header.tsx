'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, Menu, X } from 'lucide-react';
const links = [['Преимущества', '#benefits'], ['Курсы', '#courses'], ['Что входит', '#included'], ['Оплата', '#payment'], ['FAQ', '#faq'], ['Контакты', '#contacts']];
export function Brand({ footer = false }: { footer?: boolean }) {
  return <a className={`brand ${footer ? 'brand-footer' : ''}`} href="#home" title="На главную"><Image src="/brand/logo-ruby.webp" alt="" width={52} height={52} priority={!footer} /><span>KaleaDoSkill<small>Школа IT-профессий</small></span></a>;
}
export default function Header() {
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="container header-inner"><Brand /><nav aria-label="Основная навигация" className={open ? 'navigation is-open' : 'navigation'}>{links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}</nav><a className="button button-small header-cta" href="#apply">Оставить заявку</a><button className="menu-toggle" aria-label={open ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button></div></header>;
}
