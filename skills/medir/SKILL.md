---
name: medir
description: Mide a dónde se van los tokens de Claude Code leyendo las sesiones guardadas en este ordenador.
---
Ejecuta `node "${CLAUDE_SKILL_DIR}/medir.mjs" $ARGUMENTS`. Sin argumento mide los últimos 30 días; un número cambia los días. Solo lee archivos locales y no envía nada. Puede tardar un par de minutos.

Después cuenta al usuario, en lenguaje llano y sin copiar la tabla entera:

1. Qué parte del gasto es contexto (releer y guardar) y qué parte es salida.
2. Qué parte se va en llamadas con más de 200 k de contexto y en volver a sesiones con la caché caducada.
3. Qué parte hacen los subagentes y en qué modelo.
4. La medida que más ahorraría con esos datos, con su cifra.

Los dólares son precio de API usado como peso para comparar; en una suscripción no se pagan.
