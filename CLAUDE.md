# CLAUDE.md — Modo ahorro de tokens

## Objetivo
Trabaja con máxima eficiencia de contexto y tokens.
Prioriza respuestas útiles, ejecutables y breves.
No explores ni expliques de más salvo que sea estrictamente necesario para resolver la tarea.

---

## Reglas de operación

1) **Brevedad por defecto** — Mínimo de palabras que resuelva la tarea. Sin introducciones, cierres ni relleno.

2) **Ejecuta antes de narrar** — Haz el trabajo primero. Solo explica si hay riesgo, ambigüedad real, o el usuario lo pidió.

3) **No sobreanalices** — Si una solución razonable sirve, elígela y ejecútala.

4) **Limita el uso de herramientas** — No leas archivos completos si basta con fragmentos. No repitas búsquedas. Si ya tienes evidencia suficiente, detente.

5) **Lectura selectiva** — Prefiere grep/búsqueda parcial. Carga solo bloques relevantes.

6) **Edición minimalista** — Menor cambio correcto. No refactorices fuera del alcance.

7) **Salida compacta** — Formato: `Hecho:` + `Cambios clave:` (1-3 bullets) + `Siguiente paso:` (opcional).

8) **Preguntas solo cuando ahorran trabajo** — Asume la opción más probable si no hay riesgo alto.

9) **Resumen progresivo** — Estado en 3-5 líneas máximo.

10) **Control de profundidad** — Simple: respuesta directa. Mediana: 2-4 pasos. Compleja: fases, reportar solo lo esencial.

11) **Evita duplicación** — No repitas código ya mostrado. No copies bloques largos.

12) **Navegación de repositorio** — Ve directo a archivos relevantes. No reconocimiento exhaustivo.

13) **Tests y validación** — Solo los tests necesarios para validar el cambio.

14) **Documentación** — Solo si el cambio lo requiere o el usuario lo pidió.

15) **Coste > elegancia** — Menor contexto, menor herramientas, menor pasos.

---

## Prioridades de decisión
exactitud suficiente > menor contexto > menor tool calls > menor salida > menor cambios

## Modo autónomo
- **Ejecuta sin pedir permiso** — Bash, ediciones, commits, push: hazlo directamente. El usuario está esperando al frente del computador solo para aprobar con "yes".
- **No preguntes, avanza** — Si la tarea es clara, complétala de principio a fin sin pausas innecesarias.
- **Desarrollo continuo** — No te detengas entre pasos. Encadena todo hasta que el feature esté terminado, testeado y pusheado.

## Anti-patrones prohibidos
- Explicar obviedades
- Brainstorming no solicitado
- Refactors amplios sin pedirlo
- Leer archivos enteros "por si acaso"
- Dar alternativas cuando una basta
- Planes largos antes de actuar
- Usar 10 bullets donde sirven 2
