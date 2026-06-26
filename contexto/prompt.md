# Prompt para Antigravity

## Objetivo General

Desarrolla un sistema web completo (SaaS) para la administración integral de un gimnasio. No debe ser una simple página web, sino una plataforma profesional, moderna, segura, responsive y escalable, capaz de adaptarse a cualquier gimnasio mediante personalización de colores, logotipo, nombre comercial y configuración de módulos.

El diseño debe ser minimalista, elegante, intuitivo y de alto rendimiento, similar a plataformas modernas como Notion, Stripe, Shopify o HubSpot.

---

# Requerimientos Generales

El sistema debe contar con:

* Panel administrativo.
* Base de datos robusta.
* Roles de usuario.
* Dashboard con estadísticas.
* Sistema de búsqueda.
* Exportación de datos a Excel.
* Diseño Responsive (PC, Tablet y Smartphone).
* Modo claro y modo oscuro.
* Seguridad mediante autenticación.
* Arquitectura modular para agregar nuevas funciones en el futuro.

---

# Personalización

Cada gimnasio debe poder personalizar:

* Nombre del negocio
* Logotipo
* Colores principales
* Tipografía
* Banner principal
* Redes sociales
* Información de contacto
* Dirección
* Horarios
* Moneda utilizada
* Idioma

---

# Módulo 1: Registro de Ventas

Crear un sistema completo de punto de venta.

Debe permitir:

## Registrar Clientes

Campos:

* Nombre
* Apellidos
* Edad
* Fecha de nacimiento
* Sexo
* Celular
* Teléfono
* Teléfono de contacto de emergencia
* Correo electrónico
* Dirección
* Fotografía
* Observaciones

Generar automáticamente un número de cliente consecutivo.

Ejemplo:

Cliente #0001

---

## Venta de Membresías

El sistema debe permitir crear, editar y eliminar membresías.

Las membresías iniciales serán:

* Mensual ($450)
* Parejas ($400 por persona)
* Estudiantes ($300)
* Quincenal ($250)
* Semanal ($150)
* Visita ($50)

Los precios deben ser totalmente editables desde el panel administrativo.

Cada venta debe registrar:

* Cliente
* Fecha
* Hora
* Método de pago
* Cajero
* Precio
* Descuento
* Total
* Estado del pago

---

# Caja

Registrar automáticamente:

Ingresos

Egresos

Cortes diarios

Cortes semanales

Cortes mensuales

Gráficas financieras

Exportación a Excel

---

# Estadísticas

Mostrar:

* Membresía más vendida
* Membresía menos vendida
* Ingresos por día
* Ingresos por semana
* Ingresos por mes
* Ingresos por año
* Clientes nuevos
* Clientes activos
* Clientes inactivos
* Ventas por empleado
* Horarios de mayor venta

Todo mediante gráficas interactivas.

---

# Base de Datos

Guardar absolutamente todo.

Permitir:

Buscar

Editar

Eliminar

Exportar a Excel

Exportar CSV

Filtrar por fechas

Filtrar por cliente

Filtrar por empleado

---

# Módulo 2: Administración de Clientes

Cada cliente tendrá una ficha completa.

Debe mostrar:

Número de cliente

Nombre completo

Fotografía

Fecha de registro

Historial completo

Membresías adquiridas

Fecha de inicio

Fecha de vencimiento

Días restantes

Estado:

* Activo
* Inactivo
* Vencido

Contador automático de días sin renovar.

También incluir:

Historial de compras

Historial de accesos

Historial de pagos

Notas

Documentos

Contacto de emergencia

---

# Recordatorios Automáticos

Enviar automáticamente:

WhatsApp

Correo electrónico

Notificaciones Push

Cuando:

Falten 7 días para vencer

Falten 3 días

El mismo día

7 días después del vencimiento

30 días después

Todo configurable.

---

# Módulo 3: Inventario

Crear un inventario profesional.

Categorías:

* Bebidas
* Proteínas
* Pre-entrenos
* Suplementos
* Ropa
* Toallas
* Accesorios
* Otros

Cada producto debe incluir:

Fotografía

Código

SKU

Categoría

Proveedor

Costo

Precio

Existencias

Stock mínimo

Entradas

Salidas

Historial

Código de barras

Lector QR

Alertas automáticas cuando el inventario esté bajo.

---

# Toallas

Las toallas podrán:

Venderse

Rentarse

Si se rentan:

Asignar cliente

Fecha

Hora

Estado

Devuelta

Pendiente

Generar alertas por devolución pendiente.

---

# Reportes de Inventario

Productos más vendidos

Productos menos vendidos

Ganancias

Utilidad

Existencias

Movimientos

Exportar Excel

---

# Módulo 4: Catálogo

Crear un catálogo visual.

Mostrar productos mediante tarjetas.

Cada producto tendrá:

Imagen

Nombre

Descripción

Precio

Existencias

Botón Comprar

Ejemplos:

Agua 1 litro

Agua 500 ml

Volt

Monster

Amper

Powerade

Gatorade

Proteínas

Pre-entrenos

Ropa

Toallas

Equipamiento

Todos los precios deben ser editables.

Opcional:

Carrito de compras.

Pago en línea.

---

# Módulo 5: Control de Acceso

Integrar el sistema con:

Huella digital

Face ID

Reconocimiento facial

Código QR

Código de barras

Tarjeta RFID

Torniquetes

Tablets

Al ingresar un cliente:

Registrar:

Hora

Fecha

Método de acceso

Empleado

Sucursal

Tiempo dentro del gimnasio

Mostrar personas actualmente dentro del gimnasio.

---

# Ocupación del Gimnasio

Crear un mapa de ocupación.

Mostrar:

Capacidad actual

Porcentaje de ocupación

Hora pico

Hora más vacía

Promedio semanal

Promedio mensual

Generar gráficas automáticas.

Esta información también será visible para los clientes desde su aplicación.

---

# Módulo 6: Portal del Cliente

Cada cliente tendrá un inicio de sesión.

Podrá consultar:

Nombre

Fotografía

Días restantes

Historial

Pagos

Compras

Facturas

Código QR personal

Estado de membresía

Nivel de ocupación del gimnasio

Horarios recomendados con menor afluencia

Recibir promociones

Renovar membresía

Comprar productos

Reservar clases

---

# Panel Administrativo

Dashboard con indicadores:

Ingresos

Clientes

Ventas

Inventario

Productos

Accesos

Horarios pico

Clientes activos

Clientes vencidos

Productos agotándose

Ventas del día

Ganancias

Todo mediante tarjetas y gráficas dinámicas.

---

# Seguridad

Implementar:

Roles:

* Administrador
* Gerente
* Recepcionista
* Instructor
* Cliente

Autenticación segura

Recuperación de contraseña

Registro de actividad (Logs)

Permisos personalizados

Protección contra SQL Injection

Protección XSS

Backups automáticos

Cifrado de contraseñas

Sesiones seguras

---

# Tecnologías Sugeridas

Frontend:

* React
* Next.js
* Tailwind CSS

Backend:

* Node.js
* Express

Base de datos:

* PostgreSQL

Autenticación:

* JWT
* OAuth

Almacenamiento:

* Supabase o Firebase Storage

Gráficas:

* Chart.js o Recharts

Exportación:

* Excel (XLSX)
* CSV
* PDF

---

# Diseño

Crear una interfaz premium.

Inspiración:

* Apple
* Stripe
* Shopify
* Notion
* Linear
* HubSpot

Debe ser:

* Moderna
* Minimalista
* Muy rápida
* Responsive
* Animaciones suaves
* Iconografía consistente
* Excelente experiencia de usuario (UX/UI)

---

# Escalabilidad

El sistema debe desarrollarse con arquitectura modular para permitir agregar fácilmente nuevos módulos en el futuro, como:

* App móvil (iOS y Android)
* Control de entrenadores
* Rutinas
* Nutrición
* Reservación de clases
* Facturación electrónica
* Multi sucursal
* Franquicias
* API pública
* Integraciones con dispositivos biométricos
* Pasarelas de pago (Stripe, Mercado Pago, PayPal)

El resultado final debe ser un software de administración de gimnasios profesional, comparable con plataformas comerciales líderes, con enfoque en rendimiento, seguridad, escalabilidad y excelente experiencia de usuario.