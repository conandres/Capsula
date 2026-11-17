<div align="center">

<img src="icons/icon-192.png" width="96" alt="Logo de Cápsula">

# Cápsula

**Un espacio privado para guardar y compartir las historias de tu familia, pareja o amigos, con una mascota que crece contigo.**

[![Abrir la app](https://img.shields.io/badge/Abrir%20la%20app-conandres.github.io%2FCapsula-6A4CD6?style=for-the-badge)](https://conandres.github.io/Capsula/)
![PWA](https://img.shields.io/badge/PWA-instalable-6A4CD6?style=flat-square)
![Android](https://img.shields.io/badge/Android-TWA-3DDC84?style=flat-square&logo=android&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Spark%20(gratis)-FFCA28?style=flat-square&logo=firebase&logoColor=black)
![Edad](https://img.shields.io/badge/edad-13%2B-B5336E?style=flat-square)

</div>

---

## ✨ Qué es

Cápsula convierte los recuerdos en un hábito diario y compartido. Cada persona tiene **Mi mundo** (su espacio personal, con su mascota) y puede unirse a varias **cápsulas** (familia, pareja o amigos) para compartir historias.

| | |
|---|---|
| 🏠 **Inicio** | Resumen del día, pregunta del día y "Primeros pasos" |
| 🐾 **Mi mundo** | Tu mascota en 3D, diario personal, accesorios, misiones y racha |
| 👨‍👩‍👧 **Mis cápsulas** | Espacios compartidos con portada, historias y miembros |
| 🔔 **Actividad** | Lo nuevo en tus cápsulas |
| 👤 **Perfil** | Tema (rosa, azul, negro), privacidad, descarga y eliminación de tu cuenta |

**Tipos de historia:** cartas, fotos, dibujos, notas de voz y recetas, con reacciones.
**Pregunta del día:** solo ves las respuestas de los demás después de responder la tuya.

## 🔒 Privacidad y menores

- Edad mínima **13 años**. Al entrar se piden nombre, mes y año de nacimiento y aceptar los términos.
- De 13 a 17 años se requiere autorización del representante legal. Menores de 13: la cuenta se elimina.
- Sin publicidad, sin perfiles y sin inteligencia artificial de terceros.
- Cada persona puede **descargar sus recuerdos** y **eliminar su cuenta y sus datos** desde la app.

📄 [Términos](https://conandres.github.io/Capsula/legal/terminos.html) · [Privacidad](https://conandres.github.io/Capsula/legal/privacidad.html) · [Eliminar cuenta](https://conandres.github.io/Capsula/legal/eliminar-cuenta.html)

> Los textos legales son un borrador pendiente de revisión por un abogado.

## 🧱 Cómo está hecha

- **Web:** un solo `index.html` (sin framework) + `cloud.js` (conexión con Firebase) + `sw.js` (funciona sin internet).
- **Mascotas 3D:** `lab3d/capsula-pets.js` con [Three.js](https://threejs.org/) 0.170; si falla el 3D, se muestra la mascota 2D.
- **Cuentas:** Firebase Authentication con Google Identity Services.
- **Datos:** Cloud Firestore con caché sin conexión. Todo en el plan gratuito (Spark).
- **Android:** app TWA `io.github.conandres.twa` que envuelve la PWA.
- **Alojamiento:** GitHub Pages publica la rama `main`.

```
├── index.html          La app completa
├── cloud.js            Firebase: sesión, cápsulas, historias, borrado de cuenta
├── sw.js               Service worker (caché y offline)
├── config.js           Configuración pública de Firebase
├── manifest.json       Manifiesto PWA
├── firestore.rules     Reglas de seguridad (se publican a mano)
├── lab3d/              Mascotas 3D
├── legal/              Términos, privacidad y eliminación de cuenta
├── icons/              Íconos
└── .well-known/        assetlinks.json para la app Android
```

## 🗄️ Datos en Firestore

| Ruta | Contenido |
|---|---|
| `users/{uid}` | Progreso personal: mascota, corazones, racha, edad (mes/año), aceptación legal |
| `users/{uid}/posts/{id}` | Diario personal |
| `families/{id}` | Nombre, código de invitación, dueño, tipo y portada |
| `families/{id}/members/{uid}` | Miembros: nombre, mascota, corazones |
| `families/{id}/posts/{id}` | Historias de la cápsula |
| `families/{id}/qa/{día}/answers/{uid}` | Respuestas a la pregunta del día |
| `familyCodes/{código}` | Código → cápsula (se consulta uno a uno) |

## 🚀 Puesta en marcha

1. Crea un proyecto en [Firebase](https://console.firebase.google.com), agrega una app Web y copia su configuración en `config.js`.
2. **Authentication → Google:** actívalo y copia el ID de cliente web en `googleClientId`. Añade tu dominio a los dominios autorizados.
3. **Google Cloud → Credenciales:** añade tu origen (por ejemplo `https://conandres.github.io`) a los orígenes de JavaScript del cliente web.
4. **Firestore:** crea la base de datos y pega `firestore.rules` en la pestaña **Reglas → Publicar**.
5. Sube los archivos a GitHub Pages. Los teléfonos se actualizan solos.

> ⚠️ Subir `firestore.rules` a GitHub **no** cambia las reglas publicadas: hay que pegarlas en la consola.

## 🔐 Seguridad

Las reglas validan el tipo y el tamaño de cada historia, que solo escribas a tu nombre, que solo añadas o quites tu propia reacción, y que solo el dueño cambie el nombre y la portada de una cápsula. Las claves de `config.js` son públicas por diseño; la protección real son las reglas.

**Límites conocidos:** sin videos (requieren Cloud Storage, plan Blaze); los corazones los calcula el teléfono; las reglas no pueden limitar cuántas cápsulas crea una cuenta; la edad es declarada, no verificada.

## 🎨 Diseño

Los colores salen de las variables `--color-*` al inicio del `<style>` de `index.html`. Hay tres temas (`rosa`, `azul` por defecto y `negro`) con `html[data-theme="..."]`. Cada persona elige el suyo y se guarda en su cuenta.

## 📱 App Android

`.well-known/assetlinks.json` contiene la huella del keystore. Si publicas con Play App Signing, añade también la huella SHA-256 de Play Console (Integridad de la app → Firma de la app) para ocultar la barra de URL.

## 🗺️ Próximos pasos

- Transferir la propiedad de una cápsula antes de eliminar la cuenta.
- Reportar y bloquear contenido.
- Conversaciones entre miembros.
- Revisión legal y publicación en Google Play.

---

<div align="center">Hecho con 💜 en Bogotá, Colombia</div>
