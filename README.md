# 🧪 LabVirtual — Laboratorio de Electrónica con Asistencia IA

Plataforma web para la gestión, simulación y diagnóstico de equipos de laboratorio de electrónica, con asistencia por Inteligencia Artificial (Gemini / Ollama).

---

## 📁 Estructura del Proyecto

```
laboratorio-IA/
├── app/                      # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── api/              # Cliente HTTP (Axios) y endpoints
│   │   ├── components/       # Componentes reutilizables (canvas, chat, diagnóstico, layout)
│   │   ├── pages/            # Páginas por rol (Admin, Docente, Estudiante)
│   │   ├── store/            # Estado global con Zustand (sesión, circuitos, diagnóstico)
│   │   └── types/            # Tipos TypeScript del dominio
│   └── package.json
│
├── lab-electronica/
│   └── backend/              # Backend (FastAPI + SQLAlchemy + SQLite)
│       ├── app/
│       │   ├── api/routes/   # Endpoints REST (auth, circuitos, equipos, diagnóstico, IA...)
│       │   ├── core/         # Configuración, base de datos, simulación nodal
│       │   ├── models/       # Modelos SQLAlchemy (User, Equipo, Circuito, etc.)
│       │   └── services/     # Servicios IA (Gemini, Ollama)
│       ├── db_setup.py       # Crea las tablas desde cero
│       ├── seed_users.py     # Genera usuarios base (admin, docente, estudiante)
│       ├── populate_test_data.py # Datos de prueba vinculados a los usuarios base
│       ├── seed_circuits.py  # Ejemplos de circuitos y laboratorios
│       ├── seed_massive.py   # Generación masiva de datos con Faker
│       └── requirements.txt
│
└── iniciar_proyecto.bat      # Script Windows para levantar frontend + backend
```

---

## 🚀 Instalación y Puesta en Marcha

### Requisitos

- **Python 3.10+**
- **Node.js 18+** y **npm**
- **Git**

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/Pdamg10/laboratorio-IA.git
cd laboratorio-IA
```

---

### 2. Configurar el Backend

```bash
cd lab-electronica/backend
pip install -r requirements.txt
```

#### Crear y poblar la base de datos

```bash
# Crear tablas
python db_setup.py

# Crear usuarios base (admin, docente, estudiante)
python seed_users.py

# (Opcional) Añadir datos de prueba
python populate_test_data.py

# (Opcional) Generar datos masivos con Faker (requiere: pip install faker)
python seed_massive.py
```

#### Iniciar el servidor

```bash
python run.py
```

El backend queda disponible en: **http://localhost:8000**
Documentación interactiva (Swagger): **http://localhost:8000/docs**

---

### 3. Configurar el Frontend

```bash
cd app
npm install
npm run dev
```

El frontend queda disponible en: **http://localhost:5173**

---

### 4. Inicio Rápido (Windows)

Ejecuta el script desde la raíz del proyecto:

```bash
iniciar_proyecto.bat
```

Esto levanta automáticamente el backend y el frontend en terminales separadas.

---

## 🔐 Usuarios de Prueba

| Rol        | Email                 | Contraseña     |
|------------|-----------------------|----------------|
| Admin      | admin@lab.com         | admin123       |
| Docente    | docente@lab.com       | docente123     |
| Estudiante | estudiante@lab.com    | estudiante123  |

> **Nota:** Si ejecutaste `seed_massive.py`, también están disponibles:
> - `admin1@lab.com` / `admin` (hasta `admin3`)
> - `docente1@lab.com` / `docente` (hasta `docente10`)
> - `estudiante1@lab.com` / `estudiante` (hasta `estudiante60`)

---

## 🎯 Funcionalidades por Rol

### 👤 Administrador
- Panel con métricas globales del sistema
- Gestión completa de usuarios (ver todos los roles)
- Acceso a inventario de equipos y componentes
- Visualización del flujo de aprobación de diagnósticos

### 👨‍🏫 Docente
- Dashboard con laboratorios y diagnósticos pendientes de revisión
- Validar o rechazar diagnósticos enviados por estudiantes
- Consultar listado de estudiantes registrados
- Acceso al tutor IA para consultas técnicas

### 👩‍🎓 Estudiante
- Acceso al banco de laboratorios virtuales de electrónica
- Simulador de circuitos con análisis nodal
- Crear y enviar diagnósticos de fallas de equipos
- Chat con el tutor IA (asistencia paso a paso)
- Historial personal de circuitos guardados

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología      | Uso                                      |
|-----------------|------------------------------------------|
| React 19        | Framework de UI                          |
| TypeScript      | Tipado estático                          |
| Vite            | Build tool y servidor de desarrollo      |
| Zustand         | Estado global (sesión, circuitos)        |
| Axios           | Comunicación con el backend              |
| TailwindCSS     | Estilos utilitarios                      |
| Radix UI        | Componentes accesibles                   |
| React Router    | Enrutamiento SPA                         |
| Recharts        | Gráficas y visualizaciones               |

### Backend
| Tecnología          | Uso                                  |
|---------------------|--------------------------------------|
| FastAPI             | Framework REST asíncrono             |
| SQLAlchemy          | ORM para la base de datos            |
| SQLite              | Base de datos (desarrollo)           |
| Alembic             | Migraciones de base de datos         |
| python-jose         | Autenticación JWT                    |
| bcrypt              | Hash seguro de contraseñas           |
| Gemini API          | Tutor IA y diagnóstico inteligente   |
| Ollama (opcional)   | IA local de respaldo                 |
| NumPy / NetworkX    | Simulación nodal de circuitos        |

---

## 🔌 API — Endpoints Principales

| Método | Ruta                      | Descripción                          | Roles              |
|--------|---------------------------|--------------------------------------|--------------------|
| POST   | `/api/auth/register`      | Registrar nuevo usuario              | Público            |
| POST   | `/api/auth/login`         | Iniciar sesión, retorna JWT          | Público            |
| GET    | `/api/auth/me`            | Obtener usuario actual               | Autenticado        |
| GET    | `/api/auth/users`         | Listar todos los usuarios            | Admin, Docente     |
| GET    | `/api/equipos`            | Listar equipos del laboratorio       | Admin, Docente     |
| POST   | `/api/equipos`            | Registrar nuevo equipo               | Admin              |
| GET    | `/api/circuits`           | Listar circuitos del usuario         | Estudiante         |
| POST   | `/api/circuits/simulate`  | Simular circuito (análisis nodal)    | Autenticado        |
| GET    | `/api/labs`               | Listar laboratorios disponibles      | Autenticado        |
| POST   | `/api/tutor/ask`          | Consultar al tutor IA                | Autenticado        |
| GET    | `/api/flujo`              | Ver flujo de aprobaciones            | Admin, Docente     |

---

## 🗄️ Modelos de Base de Datos

```
User          → id, nombre, email, password_hash, rol, created_at
Equipo        → id, codigo, nombre, categoria, estado
Componente    → id, nombre, categoria, stock, stock_minimo, ubicacion
Circuit       → id, id_usuario, titulo, data_netlist_json
Lab           → id, titulo, descripcion, dificultad, circuito_base_json, objetivos
Diagnostico   → id, id_equipo, id_estudiante, descripcion, estado
Medicion      → id, id_diagnostico, voltaje, corriente, resistencia
Reporte       → id, id_equipo, id_diagnostico, estado, id_docente_validador
Bitacora      → id, id_equipo, id_usuario, evento
```

---

## ⚙️ Variables de Entorno

Crea un archivo `.env` dentro de `lab-electronica/backend/`:

```env
DATABASE_URL=sqlite:///./lab_electronica_v2.db
SECRET_KEY=tu-clave-secreta-super-segura
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
GEMINI_API_KEY=tu-api-key-de-gemini
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos y educativos.

---

> Desarrollado por **Pdamg10** · [GitHub](https://github.com/Pdamg10/laboratorio-IA)
