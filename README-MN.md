# MAFIA CS2 — суулгах заавар

## 1. Firebase project
1. https://console.firebase.google.com/ руу орж `MAFIA-CS2` нэртэй project үүсгэнэ.
2. Authentication → Sign-in method → Google → Enable.
3. Authentication → Settings → Authorized domains хэсэгт Vercel-ийн домэйнээ нэмнэ.
4. Firestore Database → Create database → Production mode.
5. Storage → Get started.
6. Project settings → General → Your apps → Web app (`</>`) үүсгээд Firebase config утгуудыг хуулна.

## 2. Security rules
- Firestore → Rules хэсэгт `firestore.rules` файлын агуулгыг бүхэлд нь тавьж Publish дар.
- Storage → Rules хэсэгт `storage.rules` файлын агуулгыг тавьж Publish дар.
- Админ эрх зөвхөн эдгээр имэйлд олгогдоно:
  - monholdeirobiz@gmail.com
  - tsenguunnnee@gmail.com
- Нууц үг асуухгүй; Google account-аар нэвтэрнэ.

## 3. Vercel-д байрлуулах
1. ZIP-ийг задлаад GitHub дээр шинэ repository үүсгэж бүх файлыг upload хийнэ.
2. https://vercel.com/new руу орж GitHub repository-гоо Import хийнэ.
3. Framework preset: Vite; Build command `npm run build`; Output directory `dist`.
4. Environment Variables хэсэгт `.env.example`-ийн 6 хувьсагчийг Firebase config-ийн бодит утгаар бөглөнө.
5. Deploy дарна.

## 4. Эхний хэрэглээ
- Google-ээр нэвтэрсэн хэрэглэгч өөрийн player profile үүсгэж, зөвхөн нэр, улс, Steam URL, зураг зэрэг өөрийн талбарыг засна.
- Зураг upload хийх бол админ эрхтэй аккаунт ашиглана.
- Баг, рейтинг, мэдээ, фон болон бусад хэрэглэгчийн профайлыг зөвхөн хоёр админ засна.

## Чухал
- Vercel болон Firebase-ийн бүртгэл/төлбөр/нууцлалын тохиргоо хэрэглэгчийн өөрийн аккаунтад хамаарна.
- `.env` файлыг GitHub руу upload хийж болохгүй. Vercel Environment Variables-д оруул.
- Firebase-ийн API key нь client config боловч өгөгдлийн хамгаалалт Firestore/Storage rules-ээр хийгдэнэ.
- Google sign-in нь хэрэглэгчийн жинхэнэ Google хаягийг Firebase token-оос шалгана. Имэйл бичээд дурын хүн админ болох боломжгүй.
