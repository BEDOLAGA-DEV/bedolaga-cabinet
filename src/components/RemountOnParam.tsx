import { Fragment, type ReactNode } from 'react';
import { useParams } from 'react-router';

interface RemountOnParamProps {
  /** Имя параметра маршрута, по которому страница считается «другой»: `id`, `userId`. */
  name: string;
  children: ReactNode;
}

/**
 * Пересоздаёт вложенную страницу при смене параметра адреса (`/admin/users/1` → `/admin/users/2`).
 *
 * React Router оставляет элемент маршрута смонтированным, и страница со своим локальным состоянием
 * (выбранная подписка, зеркала ответов) показывала бы прошлого пользователя: карточка реферала
 * открывалась с подключением, серверами и устройствами того, от кого перешли, а запросы с прежним
 * id подписки отвечали 404 и ничего не обновляли. Новый ключ — новая страница, как при первом открытии.
 */
export function RemountOnParam({ name, children }: RemountOnParamProps) {
  const params = useParams();
  return <Fragment key={params[name] ?? ''}>{children}</Fragment>;
}
