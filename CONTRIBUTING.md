# Guía de Contribución - Jaguar Racing Engineering

Bienvenido al repositorio de ingeniería de Jaguar Racing. Estamos construyendo software de nivel profesional. Para mantener un estándar de calidad comparable a la industria (Microsoft, Google, Meta), aplicamos pautas de contribución estrictas.

Por favor lee este documento cuidadosamente. **Los Pull Requests (PRs) que no sigan estas reglas serán rechazados sin revisión.**

---

## 1. Reglas de Oro 

Aunque la documentación está en español, el código es universal:

1.  **Código en Inglés:** Todas las variables, funciones, clases, comentarios dentro del código y mensajes de commit deben estar estrictamente en **INGLÉS**.
2.  **Commits Atómicos:** Un commit por cambio lógico. No mezcles la solución de un bug con cambios de estilo o formateo.
3.  **Código Limpio:** Elimina todos los `console.log`, código comentado y librerías no utilizadas antes de hacer commit. El código sucio no entra a producción.

---

## 2. Flujo de Trabajo (Git Workflow)

Utilizamos un modelo de ramas simplificado pero estricto:

* **Ramas Protegidas:** Está prohibido hacer push directo a `main`.
* **Feature Branches:** Crea una rama nueva para cada tarea usando el formato en minúsculas:
    * `feature/nombre-de-la-feature` (ej: `feature/add-chat-widget`)
    * `fix/descripcion-del-bug` (ej: `fix/mobile-menu-overflow`)
* **Sincronización:** Asegúrate de que tu rama esté actualizada con `main` antes de solicitar un PR para evitar conflictos.

---

## 3. Convención de Commits

Seguimos la especificación **[Conventional Commits](https://www.conventionalcommits.org/)**. Esto es obligatorio para generar historiales legibles.

**Estructura:**
```text
<type>(<scope>): <description in English>
```
**Tipos permitidos:**

* `feat`: Una nueva funcionalidad (ej: `feat(chat): add openai api connection`).
* `fix`: Solución a un bug (ej: `fix(nav): correct z-index on mobile`).
* `docs`: Cambios solo en documentación.
* `style`: Formato, puntos y comas faltantes, etc. (no cambia lógica).
* `refactor`: Cambio de código que no arregla un bug ni añade funcionalidad (limpieza).

**Ejemplo correcto:**

> `feat(ui): implement dark mode toggle`

**Ejemplo incorrecto (Será rechazado):**

> `agregue el modo oscuro` (Mal idioma y formato)

---

## 4. Estándares de Desarrollo (Astro & JS)

### Componentes Astro

* Mantén la lógica de JavaScript (`<script>`) separada de la estructura HTML cuando sea posible.
* Usa TypeScript o JSDoc para tipar tus funciones. No queremos `any` implícitos.

### Estilos

* No uses estilos en línea (`style="..."`). Usa clases de CSS o Tailwind.
* Los archivos CSS deben estar en la carpeta `src/styles/` si son globales.

### Imágenes

* Todas las imágenes deben estar optimizadas (WebP) antes de subirlas.
* Usa la carpeta `src/assets/` para que Astro las optimice automáticamente.

---

## 5. Proceso de Pull Request (PR)

1. Asegúrate de que tu código compile localmente con `npm run build`.
2. Abre el PR apuntando a la rama `main` (o `dev` si está habilitada).
3. **Título:** Debe seguir la convención de commits.
4. **Descripción:** Explica *qué* cambiaste y *por qué*.
5. **Evidencia:** Si es un cambio visual, **DEBES** adjuntar una captura de pantalla.
6. Solicita revisión a por lo menos un miembro del equipo ("Reviewers").

---
**Al contribuir a este repositorio, aceptas que tu código pasa a formar parte de la propiedad intelectual del equipo Jaguar Racing ESIME Azcapotzalco.**

