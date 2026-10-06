// 지출결의서 서식 — 화면 표시 및 인쇄용
export interface VoucherItem { name: string; amount: number; note?: string | null }

const DIGITS = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
const SMALL = ['', '십', '백', '천'];
const BIG = ['', '만', '억', '조'];

export function toKoreanAmount(n: number): string {
  if (!n || n <= 0) return '영';
  let result = '';
  let group = 0;
  while (n > 0) {
    const chunk = n % 10000;
    if (chunk > 0) {
      let s = '';
      let c = chunk;
      for (let i = 0; i < 4 && c > 0; i++) {
        const d = c % 10;
        if (d > 0) s = DIGITS[d] + SMALL[i] + s;
        c = Math.floor(c / 10);
      }
      result = s + BIG[group] + result;
    }
    n = Math.floor(n / 10000);
    group++;
  }
  return result;
}

interface Props {
  title: string;
  name: string;
  department?: string | null;
  position?: string | null;
  items: VoucherItem[];
  date: string; // YYYY-MM-DD
  approverLabels?: string[];
  approvedBy?: Record<string, string>;
}

export function ExpenseVoucherSheet({ title, name, department, position, items, date, approverLabels = ['담당', '대표'], approvedBy = {} }: Props) {
  const total = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const rows = [...items, ...Array(Math.max(0, 8 - items.length)).fill(null)];
  const [y, m, d] = (date || '').split('-');
  const cell = 'border border-foreground/70 px-2 py-1.5';
  const head = `${cell} bg-foreground/5 font-semibold text-center`;

  return (
    <div className="voucher-sheet bg-card text-foreground text-[13px] leading-snug w-[210mm] max-w-full min-h-[297mm] p-[12mm] mx-auto shadow-xl border border-border/60">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-2xl font-bold tracking-[0.5em] pt-4">지출결의서</h2>
        <table className="border-collapse text-center">
          <tbody>
            <tr>
              <td rowSpan={2} className={`${head} w-8`}>결<br />재</td>
              {approverLabels.map(l => <td key={l} className={`${head} w-16`}>{l}</td>)}
            </tr>
            <tr>
              {approverLabels.map((l, i) => (
                <td key={l} className={`${cell} h-12 text-xs`}>{i === 0 ? name : (approvedBy[l] || '')}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <table className="w-full border-collapse mb-4">
        <tbody>
          <tr>
            <td className={`${head} w-24`}>성 명</td>
            <td className={`${cell} text-center`}>{name}</td>
            <td className={`${head} w-20`}>부 서</td>
            <td className={`${cell} text-center`}>{department || ''}</td>
            <td className={`${head} w-20`}>직 책</td>
            <td className={`${cell} text-center`}>{position || ''}</td>
          </tr>
          <tr>
            <td className={head}>지출금액</td>
            <td colSpan={5} className={`${cell} text-center font-semibold`}>
              일금 {toKoreanAmount(total)} 원정 <span className="ml-6">(₩ {total.toLocaleString('ko-KR')})</span>
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse">
        <tbody>
          <tr>
            <td className={`${head} w-24`}>제 목</td>
            <td colSpan={3} className={cell}>{title}</td>
          </tr>
          <tr>
            <td rowSpan={rows.length + 2} className={head}>내 역</td>
            <td className={head}>적 요</td>
            <td className={`${head} w-32`}>금 액</td>
            <td className={`${head} w-32`}>비 고</td>
          </tr>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className={`${cell} h-8`}>{r?.name || ''}</td>
              <td className={`${cell} text-right tabular-nums`}>{r ? Number(r.amount || 0).toLocaleString('ko-KR') : ''}</td>
              <td className={cell}>{r?.note || ''}</td>
            </tr>
          ))}
          <tr>
            <td className={head}>합 계</td>
            <td className={`${cell} text-right font-bold tabular-nums`}>{total.toLocaleString('ko-KR')}</td>
            <td className={cell}></td>
          </tr>
          <tr>
            <td colSpan={4} className={`${cell} py-4`}>
              <p>위 금액을 청구 하오니 결재 바랍니다.</p>
              <div className="text-right mt-4 space-y-2">
                <p>{y ? `${y}년 ${m}월 ${d}일` : ''}</p>
                <p>영수인 : {name} (인)</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function printVoucher(el: HTMLElement | null) {
  if (!el) return;
  const w = window.open('', '_blank', 'width=820,height=1100');
  if (!w) return;
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(n => n.outerHTML).join('');
  w.document.write(`<html><head><title>지출결의서</title>${styles}<style>@page{size:A4;margin:12mm}body{background:#fff}.voucher-sheet{width:186mm!important;min-height:273mm!important;max-width:none!important;padding:0!important;margin:0!important;box-shadow:none!important;border:none!important}</style></head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 500);
}
