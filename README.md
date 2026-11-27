<div align="center">

<img src="icons/icon-192.png" width="96" alt="Logo de Cápsula">

# Cápsula

**Tu diario privado y las historias de tu familia, pareja o amigos, con una mascota 3D que crece contigo.**

[![Abrir la app](https://img.shields.io/badge/Abrir%20la%20app-conandres.github.io%2FCapsula-6A4CD6?style=for-the-badge)](https://conandres.github.io/Capsula/)
![PWA](https://img.shields.io/badge/PWA-instalable-6A4CD6?style=flat-square)
![Android](https://img.shields.io/badge/Android-Capacitor-3DDC84?style=flat-square&logo=android&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20(gratis)-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Edad](https://img.shields.io/badge/edad-14%2B-B5336E?style=flat-square)

</div>

---

## Qué es

Cápsula convierte los recuerdos en un hábito diario. Cada persona tiene **Mi mundo** (su espacio personal, con su mascota y su diario) y puede unirse a hasta 3 **cápsulas** compartidas (una de familia, una de pareja y una de amigos).

| Sección | Qué hay |
|---|---|
| **Inicio** | Resumen del día, pregunta del día y primeros pasos |
| **Mi mascota** | Mascota 3D que se cuida con el dedo (caricias, comida, baño, sueño, voz), expediciones, minijuegos, tienda, armario, misiones semanales y racha |
| **Mi diario** | Espacio privado (solo tú): pregunta del día, historias, fotos, notas de voz y recetas; se puede bloquear con huella |
| **Cápsulas** | Espacios compartidos con portada, historias, reacciones, miembros y libro de recuerdos |
| **Chat** | Amigos 1 a 1 con código o QR, mensajes y reacciones |
| **Perfil** | Tema (rosa, azul, negro), privacidad, descarga de tus datos y eliminación de la cuenta |

**Tipos de historia:** cartas, fotos, dibujos, notas de voz y recetas.
**Pregunta del día:** en una cápsula solo ves las respuestas de los demás después de responder la tuya.

## Funciones nativas (Android)

- **Widget de inicio** con tu mascota 3D, el tema de la app, tu racha y la pregunta del día (al tocarla abre directo esa pantalla).
- **Bloqueo del diario** con huella o biometría.
- **Foto en el momento** desde la cámara.
- **Compartir hacia Cápsula** desde otras apps (fotos y texto).
- **Invitar** con el menú nativo de compartir.
- **Atajos** al mantener presionado el ícono (escribir, mascota, chat).
- **Vibración** táctil, modo sin conexión y pantalla en vertical sin zoom.

## Economía

- **Lumis**: moneda gastable. Se gana despacio (historias, cuidado, cofre, misiones, invitaciones, expediciones) con tope diario y se gasta en la tienda (fondos y accesorios) y en escudos de racha.
- **XP**: progreso que no se gasta; cada 100 XP es un nivel y los niveles hacen evolucionar a la mascota.

## Estructura del repositorio

```
index.html            App completa (interfaz y lógica)
cloud.js              Conexión con Firebase (cuentas, cápsulas, chat)
config.js             Datos públicos de conexión e interruptores (push y archivos apagados)
sw.js                 Service worker: caché y modo sin conexión (subir la versión en cada cambio)
manifest.json         Datos de la PWA
latest.json           Número de versión publicado (la app avisa si hay una nueva)
lab3d/                Mascotas 3D (Three.js)
img/, icons/          Imágenes e íconos de la app
legal/                Términos, privacidad y eliminación de cuenta
firestore.rules       Reglas de seguridad de la base de datos
storage.rules         Reglas de archivos grandes (apagado hasta activar Blaze)
functions/            Funciones de servidor (apagadas hasta activar Blaze, ver BLAZE.md)
ci/                   Código nativo de Android (widget, MainActivity, recursos) y parche de Gradle
capacitor.config.json Configuración del envoltorio Android
.github/workflows/    Compilación del APK y AAB firmados
```

## Publicar cambios

1. Sube `BUILD` en `index.html`, `VERSION` en `sw.js` y `build` en `latest.json`.
2. `git push` a `main`: GitHub Pages publica la web.
3. En Actions, ejecuta **Construir app Android**. Genera el APK y el AAB firmados y los deja como borrador privado en la versión `capsula-firmada`.
4. Si cambian las reglas de `firestore.rules`, pégalas a mano en Firebase Console > Firestore > Reglas y publícalas.

Los secretos (llave de firma, `google-services.json`) viven en los secretos del repositorio y nunca se suben.

## Pendiente

Activar el plan Blaze (avisos push, archivos grandes, compras verificadas): ver [BLAZE.md](BLAZE.md). Lanzamiento en Google Play y revisión legal de los textos.

---

<div align="center">Sebastián Barba</div>

<div align="center">Hecho con 💜 en Bogotá, Colombia</div>

## Derechos

Cápsula es software propietario. Todos los derechos reservados (ver LICENSE). Los datos de conexión de Firebase de `config.js` no son secretos; la seguridad la dan las reglas de `firestore.rules`.
