---
name: relevo
description: Pasa el trabajo a una sesión nueva sin perder nada. Guarda el estado en un archivo, comprueba con un lector en frío que se entiende solo y da la frase para seguir. Úsalo cuando el usuario diga «relevo» o vaya a dejar un trabajo a medias para otro día.
---
El usuario evita cambiar de sesión por miedo a que la nueva trabaje peor que esta, que lo tiene todo presente. Tu trabajo es que no se pierda nada y que él lo vea.

1. Busca el archivo de estado del proyecto (`ESTADO.md` o el que ya se use). Si no hay, crea `ESTADO.md` en la carpeta del proyecto.
2. Actualízalo sin borrar lo que siga siendo cierto, con estos apartados:
   - **Objetivo**: qué se quiere conseguir.
   - **Hecho**: lo terminado y comprobado, con rutas.
   - **Decisiones**: qué se decidió y por qué, y lo que se descartó.
   - **Cómo trabajar aquí**: correcciones y preferencias que el usuario ha dado en esta sesión, con sus palabras.
   - **Pendiente**: siguientes pasos en orden; el primero con detalle suficiente para empezar sin preguntar.
   - **Cómo comprobar**: comandos o pasos.
   - **Ojo**: trampas encontradas y cosas sin verificar.

   Escribe lo que una sesión nueva no puede deducir leyendo los archivos; lo largo va en su archivo y aquí solo su ruta. Sin relleno, pero sin dejarte nada que tú estés usando para trabajar bien.
3. Prueba en frío. Lanza un subagente en Haiku (el `buscador` de Peseta sirve) que lea solo ese archivo y responda: qué se quiere conseguir, qué está hecho, cuál es exactamente el siguiente paso y qué tendría que preguntar para poder seguir. Si falla en algo o tiene preguntas, el fallo está en el archivo: corrígelo y repite la prueba una vez.
4. Cuéntale al usuario en pocas líneas: dónde está el archivo, que un lector sin contexto ha sabido seguir leyendo solo eso (o qué hubo que corregir), y que esta sesión no se borra: si en la nueva echa algo en falta, puede volver aquí a preguntarlo.
5. Termina con la línea para pegar en la sesión nueva: «Lee `<ruta del archivo>` y dime en cinco líneas qué has entendido antes de seguir.»
