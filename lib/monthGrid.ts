export type MonthCell = {
  date: Date;
  dateISO: string; // YYYY-MM-DD
  inMonth: boolean;
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getMonthGrid(year: number, monthIndex0: number): MonthCell[] {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const lastOfMonth = new Date(year, monthIndex0 + 1, 0);

  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay()); // Sunday start

  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const cells: MonthCell[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const cellDate = new Date(cursor);
    cells.push({
      date: cellDate,
      dateISO: toISODate(cellDate),
      inMonth: cellDate.getMonth() === monthIndex0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return cells;
}


