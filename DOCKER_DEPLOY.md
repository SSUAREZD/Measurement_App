# Deployment con Docker en AWS

## Prerequisitos

- Docker instalado
- Docker Compose instalado

## Estructura de directorios esperada

```
proyecto/
├── Measurement_App/        (frontend Angular)
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── docker-compose.yml
│   └── ... (resto del proyecto)
└── Thoth_Back/             (backend Spring Boot)
    ├── Dockerfile
    ├── pom.xml
    └── ... (resto del proyecto)
```

## Pasos para desplegar en AWS

### 1. Copiar archivos de Docker al backend

En tu proyecto `Thoth_Back`, copia el contenido de `Dockerfile.backend` a un archivo llamado `Dockerfile`:

```bash
# En Thoth_Back/
cat > Dockerfile << 'DOCKERFILE'
# Build stage
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
DOCKERFILE
```

### 2. Actualizar `docker-compose.yml`

Si tienes los directorios lado a lado:

```
proyecto/
├── Measurement_App/
└── Thoth_Back/
```

Dentro de `Measurement_App/`, el `docker-compose.yml` ya está configurado correctamente.

### 3. Construir y ejecutar en LOCAL

```bash
cd Measurement_App

# Construir imágenes
docker-compose build

# Ejecutar contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener
docker-compose down
```

Accede a:
- **Frontend**: http://localhost:4202
- **Backend API**: http://localhost:8080
- **PostgreSQL**: localhost:5432

### 4. Desplegar en AWS EC2

#### a. Subir código a la VM

```bash
# Desde tu máquina local
scp -r Measurement_App ec2-user@YOUR_AWS_IP:/home/ec2-user/
scp -r Thoth_Back ec2-user@YOUR_AWS_IP:/home/ec2-user/
```

#### b. En la VM de AWS

```bash
# Conectar a EC2
ssh -i your-key.pem ec2-user@YOUR_AWS_IP

# Instalar Docker y Docker Compose (si no están)
sudo yum update -y
sudo yum install docker -y
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo usermod -a -G docker ec2-user

# Crear estructura de directorios
mkdir -p /home/ec2-user/thoth
cd /home/ec2-user/thoth
```

#### c. Copiar archivos (alternativa: sin SCP)

Si el código está en GitHub, simplemente clona:

```bash
git clone https://github.com/your-org/measurement-app.git Measurement_App
git clone https://github.com/your-org/thoth-back.git Thoth_Back
```

#### d. Ejecutar Docker Compose

```bash
cd Measurement_App

# Construir imágenes
docker-compose build

# Ejecutar en background
docker-compose up -d

# Verificar que todo está corriendo
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 5. Configurar Security Group en AWS

En AWS Console → EC2 → Security Groups:

Inbound rules:
- **HTTP (80)**: desde 0.0.0.0/0
- **HTTPS (443)**: desde 0.0.0.0/0 (si usas certificado)
- **SSH (22)**: desde tu IP
- **5432**: desde tu IP (si necesitas acceso directo a Postgres)

### 6. Acceder a la app en AWS

Una vez que `docker-compose up -d` está corriendo:

```
http://YOUR_AWS_EC2_PUBLIC_IP:4202
```

### Troubleshooting

```bash
# Ver logs de un servicio específico
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Detener y limpiar todo
docker-compose down -v

# Reconstruir una imagen específica
docker-compose build --no-cache backend

# Ejecutar comando en un contenedor
docker-compose exec backend bash
docker-compose exec postgres psql -U thot_user -d postgres
```

## Variables de entorno

Puedes editar `docker-compose.yml` para cambiar:
- `POSTGRES_PASSWORD`: Contraseña de BD
- `SPRING_DATASOURCE_PASSWORD`: Contraseña de BD en el backend
- Puertos (80, 4202, 8080, 5432)

## Notas importantes

1. **No clonar repositorios**: Solo necesitas copiar los archivos Dockerfile, nginx.conf y docker-compose.yml a tu VM
2. **Persistencia de datos**: Los datos de Postgres se guardan en un volumen Docker llamado `postgres_data`
3. **SSL/TLS**: Si necesitas HTTPS, configura un load balancer o reverse proxy (CloudFront + ALB)
4. **Escalado**: Puedes escalar con Amazon ECS o Kubernetes (EKS)
