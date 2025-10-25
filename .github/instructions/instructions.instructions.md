Siempre sigue estos principios antes de comenzar a escribir o revisar código en este repositorio.

🧠 1. Principios Fundamentales

Siempre audita el código editado para determinar si la solución propuesta soluciona el problema planteado, aplicando los siguientes principios con un enfoque en nuestro stack tecnológico.

1.1. DRY (Don't Repeat Yourself - No te repitas)
supabase-js & Tipos Autogenerados: Utiliza la CLI de Supabase para generar tipos de TypeScript a partir del esquema de tu base de datos (supabase gen types typescript > types/supabase.ts). Estos tipos deben ser la única fuente de verdad para las estructuras de datos en toda la aplicación, tanto en el frontend (Expo - React Native) como en el backend (Edge Functions).

React Native & NativeWind: Crea componentes de UI reutilizables (idealmente en packages/ui) y abstrae la lógica compleja de los componentes en custom hooks para maximizar su reutilización.

1.2. KISS (Keep It Simple, Stupid - Mantenlo Simple)
Supabase Edge Functions: Mantén las funciones simples. Su responsabilidad es recibir, validar y delegar la lógica de negocio a servicios o funciones separadas, no contenerla.

supabase-js: Utiliza el constructor de consultas (query builder) de supabase-js para todas las interacciones con la base de datos. Su sintaxis fluida y el uso de los tipos generados garantizan la seguridad y claridad del código. Evita escribir SQL crudo.

1.3. YAGNI (You Ain't Gonna Need It - No lo vas a necesitar)
API (Edge Functions): No implementes una Edge Function hasta que no exista una necesidad real y demostrada en la aplicación de Expo (React Native). Prioriza el uso de la API de PostgREST autogenerada por Supabase siempre que sea posible.

Optimización: No optimices prematuramente las consultas de base de datos ni añadas capas de caché complejas hasta que las métricas de rendimiento indiquen un cuello de botella claro.

🛡️ 2. Principios SOLID
Aplica los principios SOLID para construir una arquitectura robusta y flexible.

S - Principio de Responsabilidad Única (SRP)
Componentes (Expo - React Native): Un componente se encarga de su renderizado y estado visual. La lógica de obtención de datos (data fetching) se delega a custom hooks que utilizan el cliente de supabase-js.

Edge Functions: Una Edge Function debe gestionar una única acción (ej: processPayment). La lógica de negocio y el acceso a datos se delegan a otras capas si es necesario.

O - Principio de Abierto/Cerrado (OCP)
Backend (Supabase Edge Functions): Utiliza middlewares para extender la funcionalidad de las funciones (ej: logging, CORS, autenticación con Supabase Auth) sin modificar su código principal.

L - Principio de Sustitución de Liskov (LSP)
UI (Expo - React Native): Si creas un componente base (ej: <BaseButton>), cualquier componente derivado (ej: <PrimaryButton>) debe ser completamente sustituible sin romper la funcionalidad o la interfaz de usuario esperada.

I - Principio de Segregación de la Interfaz (ISP)
API (Supabase): La API se segrega de forma natural mediante Edge Functions individuales por dominio o a través de las APIs específicas de PostgREST para cada tabla. El frontend consume únicamente las funciones o tablas que necesita.

D - Principio de Inversión de Dependencia (DIP)
Backend (Edge Functions): Los servicios de negocio no deben crear sus propias instancias del cliente de Supabase. La instancia del cliente debe ser creada una vez y reutilizada, o inyectada si la arquitectura se vuelve más compleja. Los servicios dependen de la abstracción del cliente de Supabase, no de una conexión directa a la base de datos.

⚙️ 3. Políticas de Flujo de Trabajo y Operaciones
3.1. Verificación Estática y Calidad del Código
Antes de cualquier revisión, el código debe pasar las verificaciones automáticas. Ejecuta el script de verificación (`npm run lint` o similar) para garantizar el formato y la calidad. Los Git Hooks gestionados por Husky deben automatizar este proceso.