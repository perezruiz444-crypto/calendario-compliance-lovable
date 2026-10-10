# Origen

Skill `security-audit` de Cloudflare, copiada sin modificaciones de:

- Repositorio: https://github.com/cloudflare/security-audit-skill
- Commit: c1c8a8c1471069fb0e188eeaff69b8e8db6564a8
- Licencia: MIT (ver `LICENSE`)

Revisada antes de instalarla: los scripts `.cjs` solo usan `fs`, `path` y `util` (sin red, procesos ni escritura de archivos) y `SKILL.md` exige sandbox sin red para ejecutar código del objetivo. Para actualizarla, vuelve a copiar `skills/security-audit/` del repositorio y cambia el commit de arriba.
