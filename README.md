# LaesePROD

Web y panel de gestion para LaesePROD, una productora audiovisual centrada en bodas y videoclips.

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

## Contenido editable

Desde el panel se gestionan proyectos, los dos servicios fijos, FAQs independientes por servicio, contacto y resumen del estudio, videos, SEO, footer, portal de clientes, contratos, cartas, chat y usuarios.

Los recursos actuales son provisionales. El logotipo definitivo, los videos y los textos pueden sustituirse desde el panel sin tocar el codigo.
