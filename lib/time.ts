
/**
 * Timezone-aware date utilities for Yunzhou system.
 * All operations are standardized to China Standard Time (UTC+8).
 */

const BEIJING_TIMEZONE = 'Asia/Shanghai';

/**
 * Gets the current date as a 'YYYY-MM-DD' string in Beijing time.
 */
export function getTodayInBeijingString(): string {
    const now = new Date();
    // Use Intl.DateTimeFormat to reliably get the date string in the desired timezone.
    // 'en-CA' locale produces 'YYYY-MM-DD' format.
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: BEIJING_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(now);
}

/**
 * Generates a range of date strings ('YYYY-MM-DD') ending on the given
 * end date. This function is timezone-agnostic at the calculation level
 * by using UTC methods, making it robust against local timezone/DST issues.
 * @param endStr The end date string for the range, e.g., "2024-01-30"
 * @param days The number of days in the range.
 */
export function generateDateRange(endStr: string, days: number): string[] {
    if (!endStr || days < 1) {
        return [];
    }
    const dates: string[] = [];
    const [year, month, day] = endStr.split('-').map(Number);
    // Create a date in UTC to avoid local timezone shifts during calculations.
    const endDate = new Date(Date.UTC(year, month - 1, day));

    for (let i = 0; i < days; i++) {
        // Subtract days safely in UTC. 86400000 is the number of milliseconds in a standard day.
        const currentDay = new Date(endDate.getTime() - i * 86400000);
        const y = currentDay.getUTCFullYear();
        const m = String(currentDay.getUTCMonth() + 1).padStart(2, '0');
        const d = String(currentDay.getUTCDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
    }
    return dates.reverse();
}
