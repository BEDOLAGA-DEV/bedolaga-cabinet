import {
  PlatformProvider,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from 'cabinet-frontend';

// Fixed full-bleed dark backdrop so the portaled dialog renders on the
// app's brand background inside the card.
const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
      }}
    />
    {children}
  </PlatformProvider>
);

export const Confirm = () => (
  <P>
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Отменить подписку?</DialogTitle>
          <DialogDescription>
            Доступ к VPN сохранится до конца оплаченного периода. Автопродление будет отключено.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost">Назад</Button>
          <Button variant="destructive">Отменить подписку</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </P>
);
