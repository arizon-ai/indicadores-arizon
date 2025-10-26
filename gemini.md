Siempre sigue estos principios antes de comenzar a escribir o revisar código en este repositorio.

🧠 1. Principios Fundamentales

Siempre audita el código editado para determinar si la solución propuesta soluciona el problema planteado, aplicando los siguientes principios con un enfoque en nuestro stack tecnológico.

1.1. DRY (Don't Repeat Yourself - No te repitas)
JavaScript Modular: Crea funciones reutilizables y con un propósito claro en `dashboard.js`. Por ejemplo, en lugar de repetir la lógica para crear tarjetas de métricas, utiliza una función como `createMetricCard(kpiData)`. Abstrae la lógica compleja (cálculos, renderizado) en funciones específicas para maximizar su reutilización.

Tailwind CSS y Clases Reutilizables: Para estilos complejos o repetitivos que no se pueden componer fácilmente con utilidades de Tailwind, crea clases específicas en `dashboard.css` (como ya haces con `.metric-card`) y aplícalas en el HTML.

Generación de HTML: Para elementos repetitivos como las filas de la tabla de administración o las tarjetas de KPIs, utiliza JavaScript para generar el HTML dinámicamente a partir de los datos, en lugar de escribir el HTML a mano en `index.html`.

1.2. KISS (Keep It Simple, Stupid - Mantenlo Simple)
Funciones de JavaScript: Mantén las funciones simples y enfocadas. Por ejemplo, `recalculateMonthConsolidated` debe dedicarse solo a los cálculos, mientras que `renderAllKPIs` se encarga únicamente de la presentación en el DOM.

Manipulación del DOM: Utiliza selectores claros y directos. Prefiere `getElementById` para elementos únicos y `querySelector` o `getElementsByClassName` para grupos. Evita selectores excesivamente largos o complejos.

Estructura de Datos: Mantén el objeto global `dashboardData` con una estructura predecible y consistente. Evita anidar datos innecesariamente para facilitar su acceso y manipulación.

1.3. YAGNI (You Ain't Gonna Need It - No lo vas a necesitar)
Funcionalidades y Gráficas: No implementes una nueva gráfica de Chart.js o una nueva sección en el dashboard hasta que no exista una necesidad real y demostrada de visualizar esa métrica.

Optimización: No optimices prematuramente el rendimiento del código JavaScript. Solo si una función específica causa lentitud notable (por ejemplo, al filtrar o renderizar), enfócate en optimizarla.

1.4. Integridad del Contenido (No Omitir Código)
Al refactorizar o modificar archivos, es imperativo trabajar con el contenido completo. Está estrictamente prohibido usar comentarios como marcadores de posición (ej. `<!-- ... resto del código aquí ... -->`) en lugar del código real. Cada operación de escritura o reemplazo debe garantizar que la totalidad del contenido original se preserva y se reorganiza correctamente, para evitar la pérdida de funcionalidad o la corrupción de la estructura del archivo.

🛡️ 2. Principios SOLID
Aplica los principios SOLID para construir una arquitectura robusta y flexible.

S - Principio de Responsabilidad Única (SRP)
Funciones: Cada función debe tener una única responsabilidad. Por ejemplo, `validateFormData` solo valida, `saveUndoState` solo guarda el estado, y `showConfirmationModal` solo se encarga de la lógica del modal.

Archivos (Módulos): Separa las responsabilidades por archivos. `dashboard.js` contiene la lógica de la aplicación, mientras que `config.js` se encarga de la configuración de Tailwind. Si `dashboard.js` crece mucho, considera dividirlo en `ui.js` (manipulación del DOM), `data.js` (lógica de datos) y `charts.js` (configuración de gráficas).

O - Principio de Abierto/Cerrado (OCP)
Arquitectura de KPIs: Al añadir un nuevo KPI, debería ser posible hacerlo añadiendo nuevas funciones de cálculo y renderizado, sin tener que modificar la lógica central que recorre y muestra todos los KPIs. Una forma de lograrlo es tener un registro central de KPIs donde cada uno define su propia lógica.

L - Principio de Sustitución de Liskov (LSP)
Estilos CSS: Si tienes una clase base como `.btn`, cualquier variante (ej. `.btn-primary`) debe poder usarse en su lugar sin romper el layout o la funcionalidad esperada del botón.

I - Principio de Segregación de la Interfaz (ISP)
Manejo de Eventos: En lugar de una función gigante que gestione todos los eventos de la UI, asigna listeners específicos a cada elemento interactivo. Por ejemplo, `changeLogoBtn.addEventListener('click', ...)` y `exportBtn.addEventListener('click', ...)` son un buen ejemplo de esto.

D - Principio de Inversión de Dependencia (DIP)
Acceso a Datos: Las funciones de alto nivel (como las que renderizan vistas) no deberían depender directamente de la estructura interna del objeto global `dashboardData`. En su lugar, podrían depender de funciones "lectoras" que abstraigan el acceso. Por ejemplo, en lugar de `dashboardData.Enero.weeks[0].leadsAds`, usar una función como `getDataForWeek('Enero', 0, 'leadsAds')`.

⚙️ 3. Políticas de Flujo de Trabajo y Operaciones
3.1. Verificación Estática y Calidad del Código
Antes de cualquier revisión, asegúrate de que el código esté bien formateado y libre de errores evidentes. Utiliza herramientas como formateadores de código (ej. Prettier) y linters (ej. ESLint) en tu editor de código para mantener un estilo consistente y detectar problemas potenciales de forma automática.