import type { ComponentProps } from 'react';
import { ResponsiveSheet } from '@/components/ui/ResponsiveSheet';
import { ServerDetails } from './ServerDetails';

type ServerSheetProps = Omit<ComponentProps<typeof ServerDetails>, 'withHeader'> & {
  isOpen: boolean;
};

/** Карточка сервера на телефоне и в Mini App: шит снизу; на широком экране без панели — окно. */
export function ServerSheet({ isOpen, onClose, ...props }: ServerSheetProps) {
  return (
    <ResponsiveSheet isOpen={isOpen} onClose={onClose} title={props.row.label}>
      <ServerDetails {...props} onClose={onClose} withHeader={false} />
    </ResponsiveSheet>
  );
}
