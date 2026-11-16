export type PauseInterval = {
  pausedAt: Date;
  resumedAt: Date | null;
};

export function calculateBillableSeconds(input: {
  startedAt: Date;
  endedAt: Date;
  pauses: PauseInterval[];
}) {
  const totalSeconds = Math.max(0, Math.floor((input.endedAt.getTime() - input.startedAt.getTime()) / 1000));
  const pausedSeconds = input.pauses.reduce((sum, pause) => {
    const pauseStart = Math.max(input.startedAt.getTime(), pause.pausedAt.getTime());
    const pauseEnd = Math.min(input.endedAt.getTime(), (pause.resumedAt ?? input.endedAt).getTime());
    return sum + Math.max(0, Math.floor((pauseEnd - pauseStart) / 1000));
  }, 0);

  return Math.max(0, totalSeconds - pausedSeconds);
}

export function calculateTableCharge(input: {
  billableSeconds: number;
  halfHourAmount: number;
  fullHourAmount: number;
}) {
  const fullHours = Math.floor(input.billableSeconds / 3600);
  const remainingSeconds = input.billableSeconds % 3600;
  const halfHourBlocks = remainingSeconds === 0 ? 0 : Math.ceil(remainingSeconds / 1800);

  return fullHours * input.fullHourAmount + halfHourBlocks * input.halfHourAmount;
}

export function calculateMinuteBasedTableCharge(input: {
  billableSeconds: number;
  hourlyRate: number;
}) {
  return calculateProratedTableCharge(input);
}

export function calculateProratedTableCharge(input: {
  billableSeconds: number;
  hourlyRate: number;
}) {
  const elapsedSeconds = Math.max(0, Math.floor(input.billableSeconds));
  const amountInPaise = Math.round((elapsedSeconds * input.hourlyRate * 100) / 3600);
  return Math.ceil(amountInPaise / 100);
}
