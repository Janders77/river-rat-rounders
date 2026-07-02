export function getCurrentQuarter(date = new Date()) {
  return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
}

export function isDuesPaid(player, quarter = getCurrentQuarter()) {
  return !!player && player.dues_paid_quarter === quarter;
}

export const DUES_PAID_NAME_CLASS = "text-blue-400";
