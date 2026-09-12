// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Link, MemoryRouter, Route, Routes, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { RemountOnParam } from './RemountOnParam';

let mounts = 0;

/** Страница с локальным состоянием, как карточка пользователя: без пересоздания оно переживает смену id. */
function Probe() {
  const { id } = useParams();
  const [seen] = useState(() => {
    mounts += 1;
    return id;
  });
  return (
    <div>
      <span data-testid="seen">{seen}</span>
      <Link to="/u/2">to-2</Link>
      <Link to="/u/2?tab=x">same-2</Link>
    </div>
  );
}

describe('RemountOnParam', () => {
  it('смена параметра адреса пересоздаёт страницу, тот же параметр — нет', () => {
    mounts = 0;
    render(
      <MemoryRouter initialEntries={['/u/1']}>
        <Routes>
          <Route
            path="/u/:id"
            element={
              <RemountOnParam name="id">
                <Probe />
              </RemountOnParam>
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByTestId('seen').textContent).toBe('1');
    fireEvent.click(screen.getByText('to-2'));
    // Жалоба: в карточке реферала показывались подключение, серверы и устройства прошлого
    // пользователя — состояние страницы жило дальше при смене id.
    expect(screen.getByTestId('seen').textContent).toBe('2');
    expect(mounts).toBe(2);
    fireEvent.click(screen.getByText('same-2'));
    expect(mounts).toBe(2);
  });

  it('карточки пользователя и партнёра в App подключены через пересоздание по id', () => {
    const app = readFileSync(join(__dirname, '..', 'App.tsx'), 'utf-8');
    const users = app.slice(app.indexOf('path="/admin/users/:id"'));
    expect(users.slice(0, users.indexOf('/>'))).toContain('<RemountOnParam name="id">');
    const partners = app.slice(app.indexOf('path="/admin/partners/:userId"'));
    expect(partners.slice(0, partners.indexOf('/>'))).toContain('<RemountOnParam name="userId">');
  });
});
