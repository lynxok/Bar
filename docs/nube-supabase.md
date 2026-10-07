# LYNX BarOS · Copia en la nube con Supabase (cuenta del cliente)

La PC principal del bar sigue siendo la base de datos. La nube guarda una **copia que se actualiza sola cada 30 segundos**
para poder consultar ventas, caja, mesas y vasos desde afuera. Si se corta internet, el bar sigue funcionando y los cambios
se suben cuando vuelve la conexión. Los usuarios del sistema (PIN y contraseñas) **no** se suben.

## Lo que hace el cliente (una sola vez, ~10 minutos)

1. **Crear la cuenta y el proyecto**: en https://supabase.com crear una cuenta con el mail del negocio y un proyecto nuevo
   (región *South America (São Paulo)*). Guardar la contraseña de la base que pide Supabase.
2. **Cerrar el registro público**: *Authentication → Sign In / Providers* → desactivar **Allow new users to sign up**.
3. **Crear el usuario del bar**: *Authentication → Users → Add user → Create new user*, con mail y contraseña, marcando
   **Auto Confirm User**.

## Lo que se hace en BarOS (en la PC principal)

*Configuración → Actualizaciones → Copia en la nube*

1. Escribir el mail del usuario del bar y tocar **Copiar script SQL**.
2. En Supabase: *SQL Editor → New query* → pegar → **Run**. Crea las tablas, la seguridad (solo ese mail puede leer o
   escribir) y dos vistas de consulta (`lynx_ventas`, `lynx_recargas_vasos`). Se puede volver a ejecutar sin perder datos.
3. Completar **Project URL** (*Project Settings → Data API*) y la clave **publishable** o **anon public**
   (*Project Settings → API Keys*). **Nunca** la clave *secret* / *service_role*.
4. Poner la contraseña del usuario del bar y tocar **Conectar y verificar**. La contraseña no se guarda.
5. Tocar **Subir base completa**. Desde ahí la sincronización es automática.

## Cómo está guardado

- Tabla `lynx_records`: una fila por registro (`table_name`, `record_id`, `data` en JSON, `deleted`, `updated_at`).
  Al ser genérica, las versiones nuevas de BarOS no requieren cambiar la base de cada cliente.
- `lynx_members`: mails habilitados. Para sumar a otra persona (p. ej. el dueño desde el teléfono), crear su usuario en
  Authentication y ejecutar `insert into lynx_members (email) values ('mail@ejemplo.com');`.
- Borrados: se marcan con `deleted = true` (no se eliminan filas).

## Problemas comunes

| Mensaje | Qué hacer |
|---|---|
| Mail o contraseña incorrectos | Revisar el usuario en *Authentication → Users* (que esté confirmado). |
| Falta crear las tablas | Ejecutar el script SQL en el proyecto correcto. |
| El usuario no está habilitado | El script se generó con otro mail: generarlo de nuevo con el mail correcto y ejecutarlo. |
| La sesión de la nube venció | Volver a poner la contraseña y **Reconectar**. |
| Sin conexión con Supabase | Se reintenta solo; los cambios quedan pendientes en la PC. |

> Plan gratuito: Supabase puede pausar proyectos gratuitos sin actividad por varios días. Con el bar operando y la
> sincronización activa no debería pasar; si pasa, se reactiva desde el panel de Supabase.
