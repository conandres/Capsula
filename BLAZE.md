# Activar el plan Blaze (cuando lo pagues)

Todo lo de servidor ya está escrito y **apagado**. Mientras no hagas estos pasos, la app funciona exactamente igual.

## Qué incluye
- `functions/index.js`
  - `verifyPurchase`: comprueba con Google Play las compras de Cápsula Plus y concede el plan sola.
  - `notifyNewPost`: avisa a la cápsula cuando alguien cuenta algo (dice quién y dónde, nunca el contenido).
  - `streakReminder`: cada día a las 7:30 p. m. avisa a quien tiene racha de 3+ días y aún no ha contado nada.
  - `auditGains`: si alguien sube más de 1500 Lumis o 6000 XP en una hora, escribe una alerta en `flags/` para que la revises. No cambia nada del jugador.
- `storage.rules`: archivos de cápsulas (fotos grandes, audio, video corto de hasta 15 MB), solo para miembros; cada quien borra lo suyo.
- `cloud.js`: `CLOUD.saveToken` (guarda el token de avisos) y `CLOUD.uploadFile` (sube a Storage). Siguen sin usarse.
- `config.js`: `pushOn` y `storageOn`, en `false`.

## Pasos de activación
1. Firebase Console → Uso y facturación → Cambiar a **Blaze**. En el mismo lugar crea un **presupuesto con alerta de 5 USD** para que nada te sorprenda.
2. Storage → Comenzar (crea el bucket). Publica `storage.rules` ahí.
3. Firestore → Reglas: publica de nuevo `firestore.rules` (agrega `users/{uid}/tokens` y `flags`). Cambia `CORREO_ADMIN` por tu correo, como siempre.
4. Play Console → Usuarios y permisos → invita a la cuenta de servicio de las funciones (`<proyecto>@appspot.gserviceaccount.com`) con permiso de ver información financiera y administrar pedidos. Solo hace falta para las compras.
5. En una terminal con Node 20: `npm i -g firebase-tools`, `firebase login`, `cd functions && npm i`, y desde la raíz `firebase deploy --only functions`.
6. Avísame y activo en la app: el plugin de avisos de Capacitor, el registro del token (`pushOn`), el selector de audio/video (`storageOn`) y el botón de compra de Plus con Play Billing.

## Costos esperados
A este tamaño (cientos de usuarios) el uso suele quedar dentro de la capa gratuita de Blaze. Las compras y los avisos son los únicos con uso constante. Revisa el panel de facturación el primer mes.

## Pendiente que depende de ti
- Cuenta de Play Console y los productos de suscripción `plus_mensual` / `plus_anual` (el nombre debe empezar por `plus`).
- Revisión legal de los textos antes de cobrar.
