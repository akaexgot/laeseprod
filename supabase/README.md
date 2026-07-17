# Base de datos de LaesePROD

La instalación se realiza desde cero con un único archivo: `schema.sql`.

## Instalación

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor**, pega todo el contenido de `schema.sql` y ejecútalo una sola vez.
3. En **Authentication > Users**, crea el primer usuario administrador.
4. Ejecuta esta consulta sustituyendo el correo:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'tu-correo@dominio.com';
```

5. Copia la URL, la clave anónima y la clave `service_role` a las variables del proyecto descritas en `.env.example`.
6. Configura `PUBLIC_SITE_URL` con el dominio final de LaesePROD.

## Contenido inicial

El instalador crea los servicios fijos **Bodas** y **Videoclips**, una FAQ provisional para cada uno, dos proyectos provisionales y los textos básicos. Todo este contenido puede editarse desde el panel.

## Incluido

- Ajustes, navegación, proyectos, servicios y FAQ por servicio.
- Contactos, chat en vivo y portal privado de clientes.
- Usuarios y permisos de administración.
- Contratos, firmas, pagos de Stripe, facturas y bucket público de documentos.
- Cartas de servicios en formato imágenes, PDF o manual.
- SEO y datos del footer.

No se crean tablas de sectores, empresas ni premios.
