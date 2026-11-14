# Laboratorio de mascotas 3D (prueba interna)

Página de prueba: `/lab3d/` (no está enlazada desde la app, no se indexa y no toca el Service Worker).
Base: paquete "Capsula-3D-Interactive 0.1.0" (ChatGPT), revisado y corregido.

## Qué hace
- 5 personajes procedurales: gato, perro, conejo, oso y la mascota central (nube con órbita).
- Respiración, flotación, **parpadeo** (cada 2–5 s, a veces doble), orejas y cola vivas.
- **Expresiones**: normal, feliz, sueño, sorpresa, triste (la cara se suaviza entre una y otra).
- **Acciones**: saludar, saltar, cariño (con corazones) y susto.
- **Tocar** = reacciona al azar. **Arrastrar** = gira y vuelve sola al soltar.
- Accesorios de prueba: corona, flor, lentes.
- Fondo transparente: se ve el tema de la app (azul, rosa, negro). Sombra suave en el piso.
- Se pausa solo si la pestaña está oculta o el visor sale de pantalla. Respeta "reducir movimiento".
- `destroy()` libera memoria y el contexto WebGL.

## Cambios frente al ZIP original
| Problema del ZIP | Corrección |
|---|---|
| Sin parpadeo ni expresiones | Añadidos |
| No respondía al tacto | Tocar y arrastrar |
| Las orejas se enderezaban con el tiempo (perro con orejas caídas quedaba con orejas rectas) | Se animan alrededor de su ángulo base |
| Fuga de memoria al cambiar de mascota | Se liberan geometrías y materiales |
| Fondo oscuro fijo | Transparente |
| Nombres fijos (Michi, Nube = conejo…) | Quitados: el usuario nombra a su mascota. Mapa de tipos: gato=cat, perro=dog, conejo=bunny, oso=bear, nube=capsule |
| Seguía dibujando oculto o fuera de pantalla | Se pausa |
| Reservaba objetos en cada cuadro | Sin reservas por cuadro |

## API
```js
import { CapsulaPetViewer, APP_KIND } from "./capsula-pets.js";
const v = new CapsulaPetViewer(el, { pet: "gato" });   // acepta "gato" o "cat"
v.setPet("conejo"); v.setExpression("happy"); v.play("hello");   // hello | happy | love | surprise
v.setAccessories(["corona", "lentes"]);
v.getState();   // { pet, expr, fps, ... }
v.destroy();
```
Three.js entra por import map (`"three"`). Hoy apunta a jsDelivr 0.170.0.

## Estado de las pruebas
- Probado con un Three.js simulado (lógica): 45 comprobaciones de construcción, expresiones, parpadeo,
  acciones, tocar/arrastrar, memoria, pausa, "reducir movimiento" y fallo de carga.
- **No verificado**: cómo se ven los modelos reales (luces, colores, proporciones, accesorios) ni la fluidez
  en el celular. Eso se juzga abriendo esta página en Android. El número de FPS sale en la esquina.

## Antes de integrarlo en la app
1. Alojar Three.js dentro del repo (o aceptar 3D solo con internet y volver al 2D sin conexión).
2. Añadir los archivos al precaché (`sw.js`) y subir `VERSION`.
3. Mantener el 2D como respaldo (sin WebGL, ahorro de batería, sin conexión).
4. Un solo visor a la vez: solo en Inicio y en el perfil.
5. Los accesorios del armario (corona, flor, lentes, gorro, bufanda, estrella, mono) hay que rehacerlos en 3D.
