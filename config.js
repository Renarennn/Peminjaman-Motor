// Salin nilai Project URL dan anon public key dari Supabase > Project Settings > API.
// Kunci anon boleh berada di frontend karena akses data tetap dibatasi oleh RLS di schema.sql.
window.MOTOR_DESK_CONFIG = Object.freeze({
  supabaseUrl: "GANTI_DENGAN_SUPABASE_URL",
  supabaseAnonKey: "GANTI_DENGAN_SUPABASE_ANON_KEY",
  notificationEmail: "Ftrwhyni15@gmail.com",
  staffEmails: Object.freeze({
    admin: "Ftrwhyni15@gmail.com",
    ray: "ftrmtch@gmail.com",
    harifah: "fitriwahyuni336@gmail.com"
  })
});
