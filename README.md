# Measurement App

Frontend Angular SSR para el flujo de medición de pies de Thoth.

## Desarrollo local

Instala dependencias:

```bash
npm install
```

Levanta la app en desarrollo:

```bash
npm start
```

Por defecto queda en `https://localhost:4202` cuando usas la configuración local con certificados LAN.

## Producción

Compila la app para producción:

```bash
npm run build:prod
```

Ejecuta el servidor SSR:

```bash
npm run start:prod
```

El servidor Express escucha en `PORT` y expone un healthcheck en `/health`.

## Despliegue en instancia

La guía completa para dejarla arriba en una VM Ubuntu con `pm2` y `nginx` está en:

[DEPLOY.md](./DEPLOY.md)
