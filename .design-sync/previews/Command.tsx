import {
  PlatformProvider,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div style={{ position: 'fixed', inset: 0, background: 'rgb(10,15,26)' }} />
    <div style={{ position: 'relative', padding: 24 }}>{children}</div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <div
      style={{
        width: 420,
        border: '1px solid rgba(51,65,85,0.5)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Command>
        <CommandInput placeholder="Введите команду или поиск..." />
        <CommandList>
          <CommandEmpty>Ничего не найдено</CommandEmpty>
          <CommandGroup heading="Действия">
            <CommandItem>
              Продлить подписку <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              Сменить локацию <CommandShortcut>⌘L</CommandShortcut>
            </CommandItem>
            <CommandItem>Скачать конфиг</CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Помощь">
            <CommandItem>Открыть поддержку</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  </P>
);
