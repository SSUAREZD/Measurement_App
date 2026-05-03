# Despliegue en instancia Linux

Esta app está preparada para correr como Angular SSR sobre Node.js y mantenerse arriba con `pm2`.

## Opción con Docker

Si prefieres no instalar Node ni `pm2` directo en la VM, puedes correrla en contenedor.

### Arquitectura simple

- Docker ejecuta la app SSR en `4000`
- `docker compose` la reinicia siempre
- opcionalmente `nginx` en la VM expone `80/443` y redirige `/api`

### 1. Instalar Docker

En Ubuntu:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

Luego cierra sesión y vuelve a entrar por SSH.

Verifica:

```bash
docker --version
docker compose version
```

### 2. Subir el proyecto

```bash
git clone <TU_REPO_GIT> measurement-app
cd measurement-app
```

### 3. Construir y levantar el contenedor

```bash
docker compose up -d --build
```

Verifica:

```bash
docker compose ps
docker compose logs -f measurement-app
curl http://127.0.0.1:4000/health
```

### 4. Dejarlo siempre arriba

Ya queda persistente porque `docker-compose.yml` usa:

```yaml
restart: always
```

Eso hace que:

- si el proceso falla, Docker lo reinicie
- si reinicia la VM, el contenedor vuelva a arrancar

### 5. Publicarlo

Si quieres la forma más simple, abre el puerto `4000` en la instancia y entra por:

```text
http://IP_DE_TU_INSTANCIA:4000
```

Si quieres algo más correcto, usa `nginx` en la VM con:

[deploy/nginx.measurement-app.docker.conf](./deploy/nginx.measurement-app.docker.conf)

Ahí:

- `/` va al contenedor SSR en `127.0.0.1:4000`
- `/api/` va al backend real

### 6. Actualizar cambios

```bash
git pull
docker compose up -d --build
```

### 7. Comandos útiles

```bash
docker compose ps
docker compose logs -f measurement-app
docker compose restart measurement-app
docker compose down
```

## Arquitectura recomendada

- `nginx` expone el sitio en `80/443`
- `pm2` mantiene vivo el proceso Node
- la app SSR escucha internamente en `127.0.0.1:4000`
- `nginx` envía `/` al frontend SSR
- `nginx` envía `/api/` al backend real

## 1. Preparar la instancia

Asumiendo Ubuntu 24.04:

```bash
sudo apt update
sudo apt install -y nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
sudo npm install -g pm2
```

Verifica versiones:

```bash
node -v
npm -v
pm2 -v
```

## 2. Subir el proyecto

Clona el repositorio en la instancia:

```bash
git clone <TU_REPO_GIT> measurement-app
cd measurement-app
```

Instala dependencias y compila:

```bash
npm ci
npm run build:prod
```

## 3. Levantar la app con pm2

Usa la configuración incluida:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Después de `pm2 startup`, ejecuta el comando adicional que `pm2` te muestre para registrar el arranque automático.

Revisa estado:

```bash
pm2 status
pm2 logs measurement-app
curl http://127.0.0.1:4000/health
```

## 4. Configurar nginx

Copia el ejemplo incluido:

```bash
sudo cp deploy/nginx.measurement-app.conf /etc/nginx/sites-available/measurement-app
```

Edita estas dos líneas del archivo:

- `server_name TU_DOMINIO_O_IP;`
- `proxy_pass https://TU_BACKEND_REAL;`

Si tu backend es HTTP interno, cambia `https://` por `http://`.

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/measurement-app /etc/nginx/sites-enabled/measurement-app
sudo nginx -t
sudo systemctl reload nginx
```

## 5. HTTPS real

Si vas a usar dominio, instala TLS con Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

## 6. Actualizar la app después de cambios

```bash
git pull
npm ci
npm run build:prod
pm2 restart measurement-app
```

## 7. Notas importantes

- La app en producción usa `apiUrl: '/api'`.
- Eso significa que `nginx` debe hacer reverse proxy al backend real en la ruta `/api/`.
- El frontend ya no queda amarrado a `api.thoth.com` o `thoth.com`; toma el host real de la instancia.
- El healthcheck queda en `/health`, útil para monitoreo y balanceadores.
