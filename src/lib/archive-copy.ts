import type { Locale } from './i18n';
const en = {
  title: 'Manage records', remove: 'Delete', clear: 'Delete all',
  confirmOne: 'Delete this saved life?', confirmMany: 'Delete all {n} saved lives?',
  warning: 'Deleted local records, room settings and film edits cannot be restored. Export a backup first. Published memorials stay online, and you keep permission to manage them.',
  active: 'Your life in progress will be kept.', removed: 'Records deleted.',
};
type Copy = typeof en;
const translated = (title: string, remove: string, clear: string, confirmOne: string, confirmMany: string, warning: string, active: string, removed: string): Copy => ({title, remove, clear, confirmOne, confirmMany, warning, active, removed});
export const archiveCopy: Record<Locale, Copy> = {
  en,
  'zh-hans': translated('管理记录','删除','全部删除','删除这段已保存的人生？','删除全部 {n} 段已保存的人生？','删除的本地记录、房间设置和影片编辑无法恢复，请先导出备份。已发布的追思馆仍会保留，你也会保留其管理权限。','正在进行的人生会保留。','记录已删除。'),
  zh: translated('管理紀錄','刪除','全部刪除','刪除這段已儲存的人生？','刪除全部 {n} 段已儲存的人生？','刪除的本機紀錄、房間設定與影片編輯無法恢復，請先匯出備份。已發布的追思館仍會保留，你也會保留其管理權限。','正在進行的人生會保留。','紀錄已刪除。'),
  ko: translated('기록 관리','삭제','모두 삭제','저장된 이 삶을 삭제할까요?','저장된 삶 {n}개를 모두 삭제할까요?','삭제한 기기 내 기록, 방 설정과 영상 편집은 복구할 수 없습니다. 먼저 백업을 내보내세요. 공개 추모관과 관리 권한은 유지됩니다.','진행 중인 삶은 유지됩니다.','기록을 삭제했습니다.'),
  ja: translated('記録を整理','削除','すべて削除','この保存済みの人生を削除しますか？','保存済みの人生 {n} 件をすべて削除しますか？','端末の記録、部屋の設定、動画の編集は削除後に復元できません。先にバックアップを書き出してください。公開した追悼ページと管理権限は残ります。','進行中の人生は残ります。','記録を削除しました。'),
  vi: translated('Quản lý bản lưu','Xóa','Xóa tất cả','Xóa cuộc đời đã lưu này?','Xóa cả {n} cuộc đời đã lưu?','Không thể khôi phục bản lưu trên thiết bị, cài đặt phòng và chỉnh sửa phim đã xóa. Hãy xuất bản sao lưu trước. Trang tưởng niệm đã công khai và quyền quản lý vẫn được giữ lại.','Cuộc đời đang chơi sẽ được giữ lại.','Đã xóa bản lưu.'),
  fr: translated('Gérer les archives','Supprimer','Tout supprimer','Supprimer cette vie sauvegardée ?','Supprimer les {n} vies sauvegardées ?','Les archives locales, réglages des pièces et montages supprimés ne peuvent pas être restaurés. Exportez d’abord une sauvegarde. Les mémoriaux publiés et vos droits de gestion sont conservés.','La vie en cours sera conservée.','Archives supprimées.'),
  es: translated('Gestionar archivos','Eliminar','Eliminar todo','¿Eliminar esta vida guardada?','¿Eliminar las {n} vidas guardadas?','Los registros locales, ajustes de habitaciones y ediciones de vídeo eliminados no se pueden recuperar. Exporta primero una copia de seguridad. Los memoriales publicados y tus permisos de gestión se conservan.','Tu vida en curso se conservará.','Registros eliminados.'),
  de: translated('Aufzeichnungen verwalten','Löschen','Alle löschen','Dieses gespeicherte Leben löschen?','Alle {n} gespeicherten Leben löschen?','Gelöschte lokale Aufzeichnungen, Zimmereinstellungen und Filmbearbeitungen lassen sich nicht wiederherstellen. Exportiere zuerst ein Backup. Veröffentlichte Gedenkseiten und deine Verwaltungsrechte bleiben erhalten.','Dein laufendes Leben bleibt erhalten.','Aufzeichnungen gelöscht.'),
  th: translated('จัดการบันทึก','ลบ','ลบทั้งหมด','ลบชีวิตที่บันทึกไว้นี้หรือไม่?','ลบชีวิตที่บันทึกไว้ทั้งหมด {n} ชีวิตหรือไม่?','บันทึกในเครื่อง การตั้งค่าห้อง และการตัดต่อที่ลบแล้วกู้คืนไม่ได้ โปรดส่งออกข้อมูลสำรองก่อน หน้ารำลึกที่เผยแพร่แล้วและสิทธิ์จัดการจะยังอยู่','ชีวิตที่กำลังเล่นจะยังอยู่','ลบบันทึกแล้ว'),
  tr: translated('Kayıtları yönet','Sil','Tümünü sil','Bu kayıtlı yaşam silinsin mi?','Kayıtlı {n} yaşamın tümü silinsin mi?','Silinen yerel kayıtlar, oda ayarları ve film düzenlemeleri geri getirilemez. Önce yedek dışa aktar. Yayımlanmış anılar ve yönetim izinlerin korunur.','Devam eden yaşamın korunur.','Kayıtlar silindi.'),
  ru: translated('Управление записями','Удалить','Удалить всё','Удалить эту сохранённую жизнь?','Удалить все сохранённые жизни ({n})?','Удалённые локальные записи, настройки комнат и монтаж фильмов восстановить нельзя. Сначала экспортируйте резервную копию. Опубликованные мемориалы и ваши права управления сохранятся.','Текущая жизнь будет сохранена.','Записи удалены.'),
  pt: translated('Gerenciar registros','Excluir','Excluir tudo','Excluir esta vida salva?','Excluir todas as {n} vidas salvas?','Registros locais, configurações de salas e edições de filmes excluídos não podem ser restaurados. Exporte um backup primeiro. Memoriais publicados continuam online e você mantém a permissão para gerenciá-los.','Sua vida em andamento será mantida.','Registros excluídos.'),
  id: translated('Kelola catatan','Hapus','Hapus semua','Hapus kehidupan tersimpan ini?','Hapus semua {n} kehidupan tersimpan?','Catatan lokal, pengaturan ruangan, dan editan film yang dihapus tidak dapat dipulihkan. Ekspor cadangan terlebih dahulu. Memorial yang dipublikasikan tetap online, dan Anda tetap memiliki izin untuk mengelolanya.','Kehidupan Anda yang sedang berlangsung akan disimpan.','Catatan dihapus.'),
};
