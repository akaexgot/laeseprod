# LaeseProd S.L.

Web y panel de gestion para LaeseProd S.L., una productora audiovisual centrada en arte visual.

## Requisitos

- Node.js 20 o superior
- Un proyecto nuevo de Supabase
- Credenciales opcionales de Resend y Stripe para correo, contratos y pagos

## Puesta en marcha

1. Instala las dependencias con `npm install`.
2. Copia las variables de `.env.example` a `.env` y completa las credenciales.
3. Ejecuta una sola vez [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor de un proyecto vacio de Supabase.
4. Crea el primer usuario desde Supabase Authentication y sigue [`supabase/README.md`](supabase/README.md) para concederle acceso de administrador.
5. Arranca el entorno local con `npm run dev`.

La web publica estara en `http://localhost:4321` y el panel en `http://localhost:4321/admin/login`.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilacion de produccion |
| `npm run test -- --run` | Pruebas automatizadas |
| `npm exec astro check` | Comprobacion de Astro y TypeScript |

## Despliegue en Coolify con Nixpacks

`nixpacks.toml` fija el archivo de paquetes de Nixpkgs en
`338d3b462fc836d0673f068cbad1c8c1b471bc36`, que proporciona Node.js **22.23.4**.
La fase de instalacion comprueba esa version antes de ejecutar `npm ci` y falla
si se utiliza otra. El archivo tambien fija otras dependencias del sistema;
hay que probar la imagen completa al actualizarlo.

- Mantener el Build Pack **Nixpacks** y `NIXPACKS_NODE_VERSION=22` disponible
  durante la compilacion. Esa variable selecciona la rama, no el parche.
- Antes de desplegar, conservar la copia de la BD, la configuracion privada
  de Coolify y la imagen del despliegue anterior para poder volver atras.
- Subir el cambio a la rama que utiliza Coolify y probar primero en un entorno
  de pruebas. Si hay despliegue automatico, subirlo a esa rama puede desplegarlo.
- Reconstruir la imagen (no basta con reiniciar el contenedor). Comprobar
  `Node.js 22.23.4` en el registro de instalacion y ejecutar `node --version`
  en la terminal de la aplicacion despues del despliegue: debe dar `v22.23.4`.
- Verificar la web, el acceso al panel y los registros de la aplicacion.
  Si falla, restaurar la imagen anterior desde Coolify; revertir solo el codigo
  no sustituye el contenedor que ya esta ejecutandose.

La actualizacion no confirma la resolucion del error de Stripe. No reenviar
eventos ni iniciar cobros como prueba de esta actualizacion.

Para actualizar Node en el futuro, verificar la nueva version en
[`v22.nix`](https://github.com/NixOS/nixpkgs/blob/338d3b462fc836d0673f068cbad1c8c1b471bc36/pkgs/development/web/nodejs/v22.nix)
de la revision elegida y actualizar tanto `nixpkgsArchive` como la comprobacion
de version. Referencia: [versiones de Node en Coolify](https://coolify.io/docs/applications/builds/nixpacks/node-versioning).

## Contenido editable

Desde el panel se gestionan proyectos, los dos servicios fijos, FAQs independientes por servicio, contacto y resumen del estudio, videos, SEO, footer, portal de clientes, contratos, cartas, chat y usuarios.

Los recursos actuales son provisionales. El logotipo definitivo, los videos y los textos pueden sustituirse desde el panel sin tocar el codigo.
