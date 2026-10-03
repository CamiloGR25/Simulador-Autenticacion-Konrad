# Simulador: Misión Acceso Seguro

Simulador web autocontenido para apoyar el tema "Autenticación y control de acceso" en Taller de Programación Web.

## Contenidos prácticos
1. Fallas de autenticación y controles preventivos.
2. Estructura de JSON Web Tokens (JWT) y verificación de firma.
3. Uso de `Authorization: Bearer <token>`.
4. Control de acceso por rol mediante un guard de Angular.
5. Gestión de sesión, logout, expiración e inactividad.
6. Configuración CORS y preflight `OPTIONS`.
7. Integración final del flujo Angular → Login → JWT → Guard → Ruta → HTTP → CORS → API.

## Ejecución

Opción recomendada para un entorno de desarrollo:
- Sirva la carpeta con cualquier servidor HTTP local.
- Ejemplos:
  - `python -m http.server 8000`
  - extensión Live Server de VS Code

## Nota de seguridad
El simulador contiene una clave HMAC embebida únicamente para demostrar la estructura y verificación de un JWT en un entorno didáctico. Una aplicación real no debe exponer secretos de firma en el frontend.

## Pistas
Cada misión incluye un botón flotante `Pista / Ayuda` con tres niveles progresivos.

## Archivos
- `index.html`: estructura de la aplicación.
- `styles.css`: interfaz visual y diseño adaptable.
- `script.js`: lógica de navegación, validaciones, JWT, misiones y ayudas.
