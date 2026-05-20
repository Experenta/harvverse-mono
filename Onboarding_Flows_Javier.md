# HARVVERSE — FLUJOS DE ONBOARDING
## Resumen para Javier Puerto
**Fecha:** Mayo 2026
**De:** Jorge Lanza

---

## FLUJO 1 — FARMER ONBOARDING

### Punto de entrada
`harvverse.farm` → botón **[ Register Your Farm — Free ]**

### Paso 1 — Crear usuario (fuera del app, mínima fricción)
Campos requeridos:
- Nombre completo
- País
- Teléfono
- Email
- Contraseña

**Reglas:**
- Username = email (no crear username separado)
- Perfil tipo **Farmer por defecto** — no mostrar selector de tipo en este paso
- Sin KYC aquí — KYC se pide después cuando el farmer quiera recibir inversión
- Sin wallet aquí — wallet se conecta después cuando haya transacciones financieras
- Registro con Google también disponible

### Paso 2 — Dentro del app: crear finca
Después del login, el farmer ve su dashboard vacío con el mensaje:
> *"Your farm is waiting — Add your first farm"*

Botón: **[ + Add Your Farm ]**

Campos del formulario de finca:
- Nombre de la finca
- Departamento / municipio
- Variedad de café
- Upload polígono KML (o trazar en mapa)

**Al subir el polígono:**
- Copernicus auto-popula **altitud** desde el polígono
- Copernicus auto-popula **área** desde la geometría
- Se genera el **Risk Score 0–100** automáticamente
- La finca aparece en el directorio público **Open Farms**

### Lo que el farmer NO hace en este flujo
- ❌ No conecta wallet
- ❌ No hace KYC
- ❌ No elige plan de inversión
- ❌ No paga nada

Todo eso viene después, solo cuando el farmer quiere **recibir inversión**.

---

## FLUJO 2 — DIGITAL PARTNER (WAITING LIST)

### Punto de entrada
`harvverse.farm` → botón **[ Join as Digital Partner ]**

### Formulario de waiting list (no da acceso al app todavía)
Campos:
- Full name
- Email
- Country
- Investment range (dropdown):
  - $3,000–$5,000
  - $5,000–$15,000
  - $15,000–$50,000
  - $50,000+
- How did you hear about us? (opcional)

### Acción del sistema
- Guarda el registro en base de datos
- Envía email de confirmación: *"You're on the list. We'll notify you when Digital Partner access opens in your region."*
- **No crea usuario en el app**
- **No da acceso a ninguna funcionalidad**

---

## RESUMEN VISUAL DEL FLUJO

```
harvverse.farm
      │
      ├── [ Register Your Farm — Free ]
      │         │
      │    Crear usuario
      │    (nombre, país, tel, email, pass)
      │         │
      │    Dashboard farmer vacío
      │         │
      │    [ + Add Your Farm ]
      │         │
      │    Subir KML → Copernicus
      │    auto-popula altitud + área
      │         │
      │    Risk Score generado
      │         │
      │    Finca aparece en
      │    Open Farms Directory ✅
      │
      └── [ Join as Digital Partner ]
                │
          Waiting list form
          (nombre, email, país,
           rango de inversión)
                │
          Email de confirmación
          Sin acceso al app ✅
```

---

## NOTAS TÉCNICAS PARA JAVIER

1. **Copernicus auto-population** debe ocurrir automáticamente al subir el KML — el farmer no puede editar altitud ni área manualmente
2. **Risk Score** debe generarse y mostrarse en el dashboard del farmer inmediatamente después de crear la finca
3. **Open Farms Directory** es público — cualquier persona puede ver el perfil de una finca sin estar registrada
4. **Waiting list** es solo un formulario + email de confirmación — no requiere crear cuenta en el sistema

---

*Cualquier duda coordinar con Jorge directamente.*
