# Cápsula Plus — cómo está preparado y cómo se enciende

Todo está **apagado** para los usuarios (`plusOn: false` en `config.js`). Nadie ve límites, tienda ni anuncios.

## Qué hay construido
- **Plan gratis**: 3 cápsulas (creadas o unidas), 5 personas por cápsula, 40 fotos/dibujos/videos/audios por cápsula.
- **Plus**: cápsulas y personas ilimitadas, 400 archivos por cápsula, colores a gusto, accesorios Plus, sin anuncios.
- **Ropa**: gratis por logros (existente) · por anuncio (solo mayores de 18) · incluida en Plus · de pago suelto (próximamente).
- **Nunca se borra nada**: quien ya pasa un límite lo conserva; solo no puede añadir más.
- **Panel de pruebas** (solo administrador, Perfil → 7 toques en la versión): activar Plus solo en tu teléfono, simular tener Plus y dar/quitar Plus a una persona por su "código de ayuda".

## Para encenderlo de verdad
1. Publicar las reglas nuevas (`entitlements`, campo `plan` en cápsulas).
2. Cuenta de Google Play (25 USD) y Play Billing para cobrar la suscripción.
3. AdMob + consentimiento (UMP) y revisar la política de Familias: anuncios solo a adultos.
4. Verificar compras en servidor (Cloud Functions, requiere Blaze) para que el Plan no se pueda falsear. Hoy los límites se aplican en la app: son una barrera de producto, no de seguridad.
5. Actualizar Términos y Privacidad con precios, renovación y anuncios; subir `LEGAL_V`.
6. Poner `plusOn: true`.

## Piezas ya listas (solo falta conectar)
- **Anuncios (AdMob)**: `ADS` usa el plugin `@capacitor-community/admob` si está instalado y `admobRewardedId` está en `config.js`. Falta: cuenta AdMob, plugin en `package.json`, ID de app en el manifiesto (en `ci/patch-gradle.py`), marcar `tagForChildDirectedTreatment`/contenido para adultos y el mensaje de consentimiento (UMP).
- **Compras (Play Billing)**: `BILLING` usa un plugin de compras (`CapacitorPurchases`) cuando `billingOn: true`. Productos: `plus_mensual`, `plus_anual`, `accesorio_alas`. Cada compra se registra en `purchases`; en Perfil → panel de administrador → "Compras por verificar" confirmas el pago en Play Console y das Plus con un toque (verificación manual, sin Blaze).
- **Reglas**: `entitlements`, `purchases` y `plan` en cápsulas ya están en `firestore.rules`.

## Otras tiendas
- **Huawei AppGallery**: registro gratis (identidad + tarjeta, 1–2 días). Pero los Huawei nuevos no tienen servicios de Google: el inicio de sesión con Google y Play Billing no funcionan allí. Antes haría falta un inicio de sesión alternativo (correo y contraseña).

## Anuncios, correo y tiendas (actualización 21)
- AdMob ya está integrado (plugin `@capacitor-community/admob`, consentimiento de Google, inicio solo para mayores de 18). Usa IDs **de prueba** de Google. Para pasar a real: en `config.js` pon tu `admobRewardedId` y `admobProd: true`, y crea el secreto `ADMOB_APP_ID` en GitHub (Settings → Secrets → Actions).
- Inicio de sesión con correo y contraseña (activar "Correo electrónico/contraseña" en Firebase → Authentication → Método de acceso). Número de celular: no incluido (SMS con costo).
- Versión de tienda: con los secretos `RELEASE_KEYSTORE_B64` y `RELEASE_KEYSTORE_PASSWORD` el flujo Android también publica `Capsula-tienda.apk` y `.aab` firmados con la llave de tienda (release `android-tienda`). **Guarda la llave: sin ella no puedes actualizar la app en las tiendas.** Agrega su SHA-1 en Firebase para que Google funcione.
- Textos legales en versión 2 (publicidad, compras, correo). Todos deben aceptarlos de nuevo.
