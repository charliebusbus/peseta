# Instalar Peseta en otro ordenador

Hace falta tener Claude Code al día y Node instalado. Para comprobar Node, escribe esto en una terminal; tiene que contestar con un número de versión:

```bash
node -v
```

1. Copia la carpeta `peseta` entera a un sitio fijo, por ejemplo Documentos. Después no la muevas: Claude Code la lee desde ahí. El archivo `ESTADO.md` no hace falta copiarlo; son notas de trabajo de quien la construyó.
2. En una terminal, ejecuta estos dos comandos, uno detrás de otro, cambiando la ruta por la tuya:

```bash
claude plugin marketplace add "C:\Users\TU_USUARIO\Documents\peseta"
```

```bash
claude plugin install peseta@peseta
```

3. Abre una sesión nueva de Claude Code y di: «ajusta Peseta». Medirá tu uso, te dirá qué te conviene a ti y lo aplicará solo si dices que sí.

Para quitarla:

```bash
claude plugin uninstall peseta@peseta
```
