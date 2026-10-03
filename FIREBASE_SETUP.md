# Firebase 跨裝置同步設定

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立專案。
2. 在「專案總覽」新增 Web App，複製 `firebaseConfig`。
3. 複製 `.env.example` 為 `.env.local`，將 `firebaseConfig` 的值填入對應的
   `VITE_FIREBASE_*` 欄位。
4. 到「Authentication → Sign-in method」啟用 Google。
5. 到「Authentication → Settings → Authorized domains」加入：
   `peijinguo.github.io`。
6. 到「Firestore Database」建立資料庫。
7. 在 Firestore 的「Rules」貼上專案根目錄 `firestore.rules` 的內容並發布。
8. 重新執行 `npm run build` 與 `npm run deploy`。

登入同一個 Google 帳號後，行程內容、目前選取的 DAY，以及雪場體驗筆記
會儲存在該帳號自己的 Firestore 路徑中。未登入時仍使用原本的本機儲存。
# Google Routes API（大眾運輸時間）

行程表會優先透過 Firebase Callable Function 取得 Google Routes API 的大眾運輸時間，避免把 Web Service 金鑰暴露在瀏覽器。

1. 在同一個 Google Cloud 專案啟用 **Routes API**，並確認帳單已啟用。
2. 建立只允許 Routes API 的 API Key。
3. 將金鑰存成 Firebase Secret：

   ```bash
   firebase functions:secrets:set GOOGLE_MAPS_API_KEY
   ```

4. 部署 Function：

   ```bash
   firebase deploy --only functions:getTransitRoute
   ```

Function 部署於 `asia-northeast1`。若 Function 尚未部署或暫時失敗，前端會自動沿用 Maps JavaScript API 查詢與 Google Maps 連結。
