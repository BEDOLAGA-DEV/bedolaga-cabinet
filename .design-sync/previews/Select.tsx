import {
  PlatformProvider,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
  SelectSeparator,
} from 'cabinet-frontend';

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
    <div style={{ position: 'relative', padding: 24, width: 260 }}>{children}</div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <Select defaultValue="nl" open>
      <SelectTrigger placeholder="Выберите локацию" />
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Европа</SelectLabel>
          <SelectItem value="nl">Нидерланды</SelectItem>
          <SelectItem value="de">Германия</SelectItem>
          <SelectItem value="fi">Финляндия</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Америка</SelectLabel>
          <SelectItem value="us">США</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </P>
);
