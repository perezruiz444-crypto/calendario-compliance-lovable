import { z } from 'zod';

export const userSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email debe tener máximo 255 caracteres" }),
  password: z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .max(100, { message: "La contraseña debe tener máximo 100 caracteres" })
    .regex(/[A-Z]/, { message: "Debe contener al menos una mayúscula" })
    .regex(/[a-z]/, { message: "Debe contener al menos una minúscula" })
    .regex(/[0-9]/, { message: "Debe contener al menos un número" }),
  nombre_completo: z.string()
    .trim()
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .max(100, { message: "El nombre debe tener máximo 100 caracteres" }),
  role: z.enum(['administrador', 'consultor', 'cliente'], {
    errorMap: () => ({ message: "Rol inválido" })
  })
});

export const empresaSchema = z.object({
  razon_social: z.string()
    .trim()
    .min(2, { message: "La razón social debe tener al menos 2 caracteres" })
    .max(200, { message: "La razón social debe tener máximo 200 caracteres" }),
  rfc: z.string()
    .trim()
    .regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, { 
      message: "RFC inválido. Formato: AAA123456A12 o AAAA123456A12" 
    })
    .refine((val) => val.length === 12 || val.length === 13, {
      message: "RFC debe tener 12 o 13 caracteres"
    }),
  domicilio_fiscal: z.string()
    .trim()
    .min(10, { message: "El domicilio fiscal debe tener al menos 10 caracteres" })
    .max(500, { message: "El domicilio fiscal debe tener máximo 500 caracteres" }),
  telefono: z.string()
    .trim()
    .regex(/^[\d\s()+\-]{10,20}$/, { 
      message: "Teléfono inválido. Solo números, espacios, (), +, -" 
    })
    .optional()
    .or(z.literal(''))
});

export const tareaSchema = z.object({
  titulo: z.string()
    .trim()
    .min(3, { message: "El título debe tener al menos 3 caracteres" })
    .max(200, { message: "El título debe tener máximo 200 caracteres" }),
  descripcion: z.string()
    .trim()
    .max(2000, { message: "La descripción debe tener máximo 2000 caracteres" })
    .optional()
    .or(z.literal('')),
  prioridad: z.enum(['baja', 'media', 'alta'], {
    errorMap: () => ({ message: "Prioridad inválida" })
  }),
  empresa_id: z.string().uuid({ message: "Empresa inválida" }),
  consultor_asignado_id: z.string().uuid({ message: "Consultor inválido" }).optional().or(z.literal('')),
  fecha_vencimiento: z.string().optional().or(z.literal('')),
  categoria_id: z.string().uuid({ message: "Categoría inválida" }).optional().or(z.literal(''))
});

export type UserFormData = z.infer<typeof userSchema>;
export type EmpresaFormData = z.infer<typeof empresaSchema>;
export type TareaFormData = z.infer<typeof tareaSchema>;
