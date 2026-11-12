import type { MoneyRegion } from '../lib/money-display';
import { MoneyRegionSelect } from './MoneyRegionSelect';
import type { Locale } from '../lib/i18n';
const help: Partial<Record<Locale, string>> = {
 en: 'Show amounts at the prices of the selected place. This browser preference changes the display, not your saved balances. These are fixed purchasing-power estimates, not live exchange rates.',
 'zh-hans': '按所选地区的物价显示金额。这只改变本浏览器中的显示，不会改变已保存的余额。数值为固定的购买力估算，不是实时汇率。',
 zh: '依所選地區的物價顯示金額。這只改變本瀏覽器中的顯示，不會改變已儲存的餘額。數值為固定的購買力估算，不是即時匯率。',
 ja: '選んだ場所の物価で金額を表示します。このブラウザでの表示だけが変わり、保存された残高は変わりません。固定の購買力推計で、リアルタイムの為替レートではありません。',
 ko: '선택한 곳의 물가로 금액을 표시합니다. 이 브라우저의 표시만 바뀌며 저장된 잔액은 바뀌지 않습니다. 고정된 구매력 추정치이며 실시간 환율이 아닙니다.',
 vi: 'Hiển thị số tiền theo mức giá của nơi đã chọn. Chỉ thay đổi cách hiển thị trên trình duyệt này, không đổi số dư đã lưu. Đây là ước tính sức mua cố định, không phải tỷ giá trực tiếp.',
 fr: 'Affiche les montants aux prix du lieu choisi. Cela ne change que l’affichage dans ce navigateur, pas vos soldes enregistrés. Ce sont des estimations fixes de pouvoir d’achat, pas des taux de change en direct.',
 th: 'แสดงจำนวนเงินตามระดับราคาของสถานที่ที่เลือก เปลี่ยนเฉพาะการแสดงผลในเบราว์เซอร์นี้ ไม่เปลี่ยนยอดเงินที่บันทึกไว้ เป็นค่าประมาณกำลังซื้อคงที่ ไม่ใช่อัตราแลกเปลี่ยนสด',
 es: 'Muestra los importes a los precios del lugar elegido. Solo cambia la visualización en este navegador, no tus saldos guardados. Son estimaciones fijas de poder adquisitivo, no tipos de cambio en directo.',
 de: 'Zeigt Beträge zu den Preisen des gewählten Ortes. Das ändert nur die Anzeige in diesem Browser, nicht deine gespeicherten Guthaben. Es sind feste Kaufkraftschätzungen, keine Live-Wechselkurse.',
 tr: 'Tutarları seçilen yerin fiyatlarıyla gösterir. Yalnızca bu tarayıcıdaki görünümü değiştirir, kayıtlı bakiyelerinizi değiştirmez. Bunlar sabit satın alma gücü tahminleridir, canlı döviz kurları değildir.',
 ru: 'Показывает суммы в ценах выбранного места. Меняется только отображение в этом браузере, а не сохранённые балансы. Это фиксированные оценки покупательной способности, а не текущие курсы валют.',
 pt: 'Mostra os valores aos preços do lugar escolhido. Isso muda só a exibição neste navegador, não seus saldos salvos. São estimativas fixas de poder de compra, não câmbio em tempo real.',
 id: 'Menampilkan jumlah uang dengan harga di tempat yang dipilih. Ini hanya mengubah tampilan di peramban ini, bukan saldo yang tersimpan. Ini perkiraan daya beli tetap, bukan kurs langsung.',
};
export function MoneyRegionPicker({value,onChange,locale='en',label='Amounts in'}:{value:MoneyRegion;onChange:(value:MoneyRegion)=>void;locale?:Locale;label?:string}) {
 return <><p>{help[locale]??help.en}</p><MoneyRegionSelect value={value} onChange={onChange} locale={locale} label={label}/></>;
}
