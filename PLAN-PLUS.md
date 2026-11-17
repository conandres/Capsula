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
