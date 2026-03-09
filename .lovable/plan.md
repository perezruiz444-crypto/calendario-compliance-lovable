

## Plan: Fix Recurring Tasks on Calendar + Improve Recurrence UX

### Problem 1: Recurring tasks not showing on calendar

The calendar's `generateRecurringDates` requires `fecha_inicio_recurrencia` OR `fecha_vencimiento` as a start date. If neither is set when creating a recurring task, it's completely invisible on the calendar. Additionally, the form doesn't auto-populate the recurrence start date, making it easy to leave blank.

**Fix in `DashboardCalendar.tsx`:**
- Fallback to `created_at` date if neither `fecha_inicio_recurrencia` nor `fecha_vencimiento` is set
- This ensures all recurring tasks always appear

**Fix in `CreateTareaSheet.tsx`:**
- When user enables recurrence, auto-fill `fecha_inicio_recurrencia` with `fecha_vencimiento` or today's date
- Validate that recurring tasks have at least a start date before saving

### Problem 2: Recurrence UX is poor

The recurrence section is buried under "Advanced options" > small checkbox. The date inputs use plain HTML `<input type="date">` instead of the Calendar picker used elsewhere. No feedback on when the next occurrences will be.

**Improvements in `CreateTareaSheet.tsx`:**
- Move recurrence toggle OUT of "Advanced options" — place it directly below the due date section as a visible toggle with `Switch` component
- Replace `<input type="date">` for start/end with proper `Popover` + `Calendar` pickers (matching the rest of the form)
- Add a small preview showing the next 3-5 occurrence dates below the recurrence settings so users can verify
- Add human-readable summary: "Se repite cada 2 semanas desde 10 Mar hasta 10 Jun"
- Add "days of week" selector for weekly frequency (e.g., "every Monday and Friday")

### Files to modify

| File | Change |
|---|---|
| `src/components/dashboard/DashboardCalendar.tsx` | Add `created_at` fallback for recurring tasks missing start date (line ~179) |
| `src/components/tareas/CreateTareaSheet.tsx` | Move recurrence UI up, use Calendar pickers, auto-fill start date, add occurrence preview |

No database changes needed.

