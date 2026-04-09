# Gastos del Mes

Aplicación web para control de gastos personales por categoría.

## Funcionalidades

- Título principal: **GASTOS DEL MES**
- Creación de categorías con presupuesto máximo (S/)
- Registro de gastos manual por categoría
- Registro de gastos por voz (Web Speech API)
  - Ejemplos:
    - `Gastar 20 en comida`
    - `Registrar 15 soles en transporte`
- Cálculo automático de porcentaje gastado
- Barra de progreso proporcional por categoría
- Visualización por categoría de:
  - nombre
  - presupuesto
  - gastado
  - restante
  - porcentaje
- Persistencia local con `localStorage`
- Validaciones de formularios
- Diseño responsive y minimalista

## Estructura del proyecto

```text
.
├── index.html
├── styles/
│   └── main.css
└── src/
    └── app.js
```

## Cómo ejecutar

1. Clona o descarga este repositorio.
2. Abre el archivo `index.html` en tu navegador.
3. Recomendado: usar Chrome o Edge para la función de reconocimiento de voz.

También puedes levantar un servidor estático local (opcional), por ejemplo:

```bash
python -m http.server 5500
```

Luego abre: `http://localhost:5500`

## Notas de voz

- El reconocimiento de voz usa la API del navegador.
- Si tu navegador no lo soporta, la app seguirá funcionando para registro manual.
