# Peseta

Claude Code que mira la peseta: mide a dónde se van tus tokens y recorta solo lo que sobra.

> Versión temprana. La ha probado una sola persona y las cifras de ahorro salen de una simulación, no de un resultado medido.

## Qué hace

- **Mide.** Lee tus sesiones guardadas, sin sacarlas de tu ordenador, y te dice qué parte del gasto es releer contexto, cuál es salida y cuánto pesan los subagentes y en qué modelo.
- **Se ajusta a ti.** Simula distintos topes de contexto con tus propios datos, te recomienda el tuyo y lo aplica solo si dices que sí.
- **Reparte el trabajo.** Cuatro agentes con el modelo fijado: `buscador` (Haiku), `programador` (Sonnet), `recadero` (Sonnet) y `segunda-opinion` (Fable, para cuando algo ya ha fallado una vez).
- **Avisa.** Te dice cuándo la sesión pesa, cuándo empiezas una tarea distinta en una sesión cargada y cuándo vuelves a una sesión que llevaba más de una hora parada.
- **Hace el relevo.** Deja un trabajo a medias en un archivo, comprueba con un lector sin contexto que se entiende solo y te da la frase para seguir en una sesión nueva.

## Por qué

En el uso que dio origen a Peseta, el 83 % del gasto era releer y guardar el contexto de sesiones enormes, y solo el 17 % era salida. Acortar las respuestas apenas cambiaba nada; el tamaño de la sesión, sí.

La simulación sobre 30 días de ese uso daba un 25 % de ahorro con un tope de contexto bien elegido y otro 10 % pasando los subagentes a Sonnet. Tu reparto será distinto: por eso Peseta mide antes de tocar nada.

## Instalar

Hace falta Claude Code al día y Node.

```bash
claude plugin marketplace add charliebusbus/peseta
```

```bash
claude plugin install peseta@peseta
```

Después abre una sesión nueva y di «ajusta Peseta».

Para quitarla:

```bash
claude plugin uninstall peseta@peseta
```

## Cómo se usa

| Dices | Qué pasa |
|---|---|
| «ajusta Peseta» | Mide tu uso, recomienda tu configuración y la aplica con tu permiso |
| «mide mis tokens» | Saca el reparto de tu gasto del último mes |
| «relevo» | Guarda el estado en un archivo y te da la frase para la sesión nueva |

Los agentes y los avisos funcionan solos.

## Lo que no está probado

- No hay evaluación de calidad: no puedo afirmar que el resultado sea igual de bueno con los subagentes en modelos más baratos.
- Los porcentajes usan los precios de la API como peso. Anthropic no publica cuánto cuenta cada modelo en el límite de una suscripción.
- La simulación supone lo que cuesta cada resumen de sesión y no cuenta lo que haya que releer después.

## Privacidad

Todo corre en tu ordenador. Peseta lee los archivos de sesión de Claude Code y tu `settings.json`, y no envía nada a ningún sitio. Antes de cambiar tus ajustes guarda una copia al lado, `settings.json.bak-peseta`.

## Licencia

MIT.
