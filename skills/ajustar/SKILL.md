---
name: ajustar
description: Ajusta Peseta al uso real de quien la instala. Mide sus sesiones, simula los topes con sus datos, recomienda su configuración y la aplica si dice que sí. Úsalo al instalar Peseta y cuando el usuario pida ajustarla o revisarla.
---
Peseta trae las mismas reglas para todos; el tope de contexto y el modelo de los subagentes dependen de cómo trabaja cada persona. Aquí se eligen con sus datos.

1. Ejecuta `node "${CLAUDE_PLUGIN_ROOT}/skills/medir/medir.mjs" 30`. Solo lee archivos locales; con muchas sesiones tarda un par de minutos.
2. Lee el bloque «AJUSTE» y la línea `RECOMENDACION`. Cuéntale al usuario en lenguaje llano y con sus cifras: dónde se le va el gasto, qué tope le conviene y cada cuántas llamadas se resumiría la sesión, y si le conviene pasar los subagentes a Sonnet. Si sale «pocos datos», díselo: la recomendación vale poco hasta que tenga un par de semanas de uso.
3. Di también lo que cuesta cada cosa:
   - Con el tope, la sesión se resume sola al llegar y puede perder algún detalle. Para dejar trabajo a medias de un día para otro está «relevo».
   - Con los subagentes en Sonnet, los que necesiten criterio hay que pedirlos «con Opus».
   - Los porcentajes son una simulación que usa precios de API como peso. No son una promesa.
4. Pregunta si lo aplicas. Solo con su sí, ejecuta `node "${CLAUDE_SKILL_DIR}/aplicar.mjs" --tope <tokens> --subagentes sonnet`. Las dos opciones son independientes: omite la que no haya aceptado o no se recomiende. El programa guarda copia de los ajustes anteriores y enseña cómo quedan.
5. Recuérdale que el tope solo vale para las sesiones que abra a partir de ahora, y que se deshace con `node "${CLAUDE_SKILL_DIR}/aplicar.mjs" --quitar`.
