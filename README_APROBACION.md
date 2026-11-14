# Cápsula Android — borrador para aprobación

Este proyecto es un **borrador independiente**. No se ha subido a GitHub ni se ha conectado a ninguna cuenta.

## Qué incluye
- App Android Kotlin con WebView que carga la PWA de Cápsula.
- Banner nativo anclado en la parte inferior.
- Google Mobile Ads **GMA Next-Gen SDK** (no el SDK heredado).
- Identificadores de anuncios de prueba de Google.
- Variante de paquete `io.github.conandres.twa.preview` para que la app de prueba no choque con la instalación TWA actual.

## Pendiente de confirmar antes de compilar
1. URL pública exacta de Cápsula. En `AppConfig.kt` dejé como valor provisional `https://conandres.github.io/Capsula/`.
2. Si Cápsula ya se publicó en Google Play.
3. Si la versión final debe reemplazar la TWA actual. Para eso habría que volver al ID original `io.github.conandres.twa` y firmar con la misma clave. **No compartas el archivo keystore ni sus contraseñas.**

## Anuncios
El proyecto usa el ID de aplicación de prueba y la unidad de banner de prueba de GMA Next-Gen. No genera ingresos. Los IDs reales se colocarán solo después de configurar y aprobar la app en AdMob.

## Arquitectura
Esta versión usa WebView + anuncio Android nativo. No modifica los archivos de la PWA alojada en GitHub Pages. Es una alternativa a la TWA de PWABuilder; no es una edición directa del APK/AAB que descargaste.

## Compilación
El proyecto está preparado como código fuente Android/Gradle. Aún no se ha compilado ni probado en un dispositivo. El workflow de GitHub Actions se añadirá solo después de tu aprobación.

## Automatización añadida para la rama `admob-preview`
Se añadió `.github/workflows/android-preview.yml`. Al subir cambios a esa rama o ejecutar manualmente el workflow, GitHub Actions instala JDK 17 y Gradle 8.11.1, ejecuta `:app:assembleDebug` y publica el APK como artefacto de Actions.

## Límites de esta entrega
- El APK todavía no está compilado ni probado en dispositivo.
- No se incluye Gradle Wrapper; el workflow instala Gradle directamente.
- La URL de `AppConfig.kt` sigue siendo provisional y debe confirmarse antes de instalar.
- Solo usa IDs de prueba de Google; no cambiar a IDs reales para pruebas.
- No incluye keystore, contraseñas ni secretos.
