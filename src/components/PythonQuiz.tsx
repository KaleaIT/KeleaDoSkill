
'use client';
import { useEffect, useState } from 'react';
export default function PythonQuiz() {
  const [answer, setAnswer] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const correct = answer === 0;
  return <section className="python-quiz section" id="try-python"><div className="container quiz-grid"><div><div className="section-label"><span>↳</span> SYSTEM / LEARNING / 01</div><h2>Попробуй себя<br />в программировании</h2><p className="quiz-intro">Две строки. Твой первый шаг в Python.</p></div><div className="quiz-terminal"><div className="quiz-bar"><span>first_step.py</span><span>PYTHON / 01</span></div><pre><code><span className="code-keyword">name</span> = <span className="code-string">"KaleaDoSkill"</span>{'\n'}<span className="code-keyword">print</span>(<span className="code-string">"Привет, "</span> + name)</code></pre><fieldset><legend>Как думаешь, что выведет этот код?</legend><div className="quiz-options">{['Привет, KaleaDoSkill', 'Привет, name', 'Ошибка'].map((label, i) => <button type="button" disabled={!ready} key={label} aria-pressed={answer === i} onClick={() => setAnswer(i)} className={answer === i ? 'selected' : ''}><span>0{i + 1}</span>{label}</button>)}</div></fieldset><p className="quiz-feedback" role="status" aria-live="polite">{answer === null ? 'Выбери ответ — опыт не нужен.' : correct ? 'Верно! Именно так работает эта программа' : 'Почти! Попробуй ещё раз'}</p>{answer !== null && <button className="quiz-reset" type="button" onClick={() => setAnswer(null)}>Попробовать снова</button>}</div></div></section>;
}
